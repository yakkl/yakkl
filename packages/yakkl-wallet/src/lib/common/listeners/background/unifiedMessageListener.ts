import { log } from '$lib/managers/Logger';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import type { SessionToken, StoreHashResponse } from '$lib/common/interfaces';
import type { YakklResponse } from '$lib/common/interfaces';
import { getSafeUUID } from '$lib/common/uuid';
import { requestManager } from '$contexts/background/extensions/chrome/requestManager';
import { getSigningManager } from '$contexts/background/extensions/chrome/signingManager';
import { getYakklCurrentlySelected } from '$lib/common/stores';
import { showEIP6963Popup } from '$contexts/background/extensions/chrome/eip-6963';
import type { BackgroundPendingRequest } from '$contexts/background/extensions/chrome/background';
import { decryptData } from '$lib/common/encryption';
import { isEncryptedData } from '$lib/common/misc';
import { showPopup } from '$contexts/background/extensions/chrome/ui';
import { startLockIconTimer, stopLockIconTimer } from '$contexts/background/extensions/chrome/iconTimer';
import { setIconLock, setIconUnlock } from '$lib/utilities';
import { isBackgroundContext } from '$lib/common/backgroundSecurity';
import { handleBrowserAPIMessage } from '$contexts/background/handlers/browser-api.handler';
import { handleMessage as handleMessageFromHandler } from '$contexts/background/handlers/MessageHandler';

// NOTE: This can only be used in the background context
// Simple in-memory session state for background context
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
let bgSessionToken: { token: string; expiresAt: number } | null = null;
let bgMemoryHash: string | null = null;

function generateSessionToken(): { token: string; expiresAt: number } {
  const token = getSafeUUID();
  const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
  return { token, expiresAt };
}

interface ActiveTab {
  tabId: number;
  windowId: number;
  windowType: string;
  url?: string;
  title?: string;
  favIconUrl?: string;
  dateTime: string;
}

// Message type constants
export const EIP6963_REQUEST = 'EIP6963_REQUEST';
export const EIP6963_RESPONSE = 'EIP6963_RESPONSE';
export const EIP6963_ANNOUNCE = 'EIP6963_ANNOUNCE';
export const SECURITY_MESSAGE = 'SECURITY_MESSAGE';
export const RUNTIME_MESSAGE = 'RUNTIME_MESSAGE';

// Session management
let isClientReady = false; // Flag to check if the client is ready before sending messages from background to client
// let sessionToken: SessionToken | null = null;
const sessionPorts = new Map<string, Runtime.Port>();
const memoryHashes = new Map<string, string>();

function clearSession(reason: string) {
  bgSessionToken = null;
  bgMemoryHash = null;
}

// Add port registration function
function registerSessionPort(port: Runtime.Port, requestId: string) {
  try {
    log.info('Attempting to register port', false, {
      requestId,
      portName: port?.name,
      portType: typeof port,
      hasOnDisconnect: !!port?.onDisconnect,
      hasOnMessage: !!port?.onMessage
    });

    if (!port || !requestId) {
      log.error('Invalid port or requestId', false, {
        port: port ? { name: port.name, type: typeof port } : null,
        requestId
      });
      return { success: false, error: 'Invalid port or requestId' };
    }

    // Check if port is already registered
    if (sessionPorts.has(requestId)) {
      const existingPort = sessionPorts.get(requestId);
      log.warn('Port already registered for requestId', false, {
        requestId,
        existingPortName: existingPort?.name,
        newPortName: port.name
      });
      return { success: false, error: 'Port already registered' };
    }

    // Store the port
    sessionPorts.set(requestId, port);
    log.info('Port registered successfully', false, {
      requestId,
      portName: port.name,
      totalPorts: sessionPorts.size
    });

    return { success: true };
  } catch (error) {
    log.error('Error registering port', false, {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      port: port ? { name: port.name, type: typeof port } : null,
      stack: error instanceof Error ? error.stack : undefined
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function validateSession(token: string, scope: string): void {
  try {
    if (!bgSessionToken || Date.now() > bgSessionToken.expiresAt) {
      log.warn('Session validation failed', false, {
        reason: !bgSessionToken ? 'No session token' : 'Token expired',
        expiresAt: bgSessionToken?.expiresAt,
        currentTime: Date.now()
      });
      clearSession('Token expired or missing');
      throw new Error('Session expired');
    }
    if (bgSessionToken.token !== token) {
      log.warn(`Unauthorized access to ${scope}`, false, {
        providedToken: token,
        expectedToken: bgSessionToken.token
      });
      throw new Error('Unauthorized');
    }
    if (!bgMemoryHash) {
      log.warn('Memory hash missing during session validation', false);
      throw new Error('Memory hash missing');
    }
  } catch (error) {
    log.error('Session validation error', false, {
      error: error instanceof Error ? error.message : 'Unknown error',
      scope,
      token
    });
    throw error;
  }
}

export async function decryptDataBackground(payload: any, token: string): Promise<any> {
  // Verify this is being called from the background context
  if (!isBackgroundContext()) {
    throw new Error('Unauthorized context');
  }

  validateSession(token, 'decryption');
  if (!isEncryptedData(payload)) {
    log.warn('Invalid encrypted data structure');
    throw new Error('Decryption failed');
  }
  return await decryptData(payload, bgMemoryHash!);
}

// Update handleRequestSessionPort to use the consolidated session ports
async function handleRequestSessionPort(requestId: string) {
  try {
    if (!requestId) {
      log.error('No request ID provided', false, { requestId });
      return { success: false, error: 'No request ID provided' };
    }

    const port = sessionPorts.get(requestId);
    if (!port) {
      log.warn('No port found for request ID', false, { requestId });
      return { success: false, error: 'No port found for request' };
    }

    // Check if the port is still connected
    if (!port.name) {
      log.warn('Port has no name, may be disconnected', false, { requestId });
      sessionPorts.delete(requestId);
      return { success: false, error: 'Port disconnected' };
    }

    log.debug('Session port found', false, { requestId, portName: port.name });
    return { success: true, portName: port.name };
  } catch (error) {
    log.error('Error handling request session port', false, { error, requestId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Unified message handler
export async function onUnifiedMessageListener(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    // Special logging for STORE_SESSION_HASH
    if (message?.type === 'STORE_SESSION_HASH') {
      console.log('[onUnifiedMessageListener] Top-level STORE_SESSION_HASH:', {
        message,
        sender,
        hasPayload: !!message.payload,
        payloadType: typeof message.payload
      });
    }

    const { id: requestId, method, type } = message;

    log.debug('Received message', false, { message, sender });

    // Popout messages
    if (message.type === 'popout') {
      return await handleRuntimeMessage(message, sender);
    }

    // Client ready messages
    if (message.type === 'clientReady') {
      return { success: true, message: 'Client ready acknowledged' };
    }

    // Security messages
    if (message.type === SECURITY_MESSAGE) {
      return await handleSecurityMessage(message, sender);
    }

    // EIP-6963 messages
    if (message.type === EIP6963_REQUEST ||
        message.type === EIP6963_RESPONSE ||
        message.type === EIP6963_ANNOUNCE ||
        message.type === 'YAKKL_REQUEST:EIP6963' ||
        message.type === 'YAKKL_RESPONSE:EIP6963' ||
        message.type === 'YAKKL_EVENT:EIP6963' ||
        message.type === 'YAKKL_REQUEST:EIP1193' ||
        message.type === 'YAKKL_RESPONSE:EIP1193' ||
        message.type === 'YAKKL_EVENT:EIP1193' ||
        message.method?.startsWith('eth_')) {
      return await handleEIP6963Message(message, sender);
    }

    // Internal wallet messages (never use eth_* format for internal messages)
    if (message.type === 'INTERNAL_TOKEN_REQUEST' ||
        message.type === 'INTERNAL_PRICE_REQUEST' ||
        message.type === 'INTERNAL_WALLET_MESSAGE') {
      return await handleInternalMessage(message, sender);
    }

    // Runtime messages
    if (message.type === RUNTIME_MESSAGE ||
        message.type === 'getActiveTab' ||
        message.type === 'YAKKL_STATE_CHANGE' ||
        message.type === 'SET_PANEL_BEHAVIOR' ||
        message.type === 'clipboard-timeout' ||
        message.type === 'lockdown' ||
        message.type === 'lockdownImminent' ||
        message.type === 'startPricingChecks' ||
        message.type === 'stopPricingChecks') {
      return await handleRuntimeMessage(message, sender);
    }

    // Session messages
    if (message.type === 'REQUEST_SESSION_PORT' ||
        message.type === 'REGISTER_SESSION_PORT' ||
        message.type === 'UNREGISTER_SESSION_PORT' ||
        message.type === 'STORE_SESSION_HASH' ||
        message.type === 'REFRESH_SESSION' ||
        message.type === 'SESSION_TOKEN_BROADCAST') {
      return await handleSecurityMessage(message, sender);
    }

    // Browser API messages
    if (message.type?.startsWith('BROWSER_API_')) {
      try {
        const result = await handleBrowserAPIMessage(message);
        // Ensure we always return something to prevent channel closing error
        return result !== undefined ? result : { success: true };
      } catch (error) {
        log.error('[UnifiedListener] Error handling browser API message', false, {
          messageType: message.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Return error response instead of throwing
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to handle browser API message'
        };
      }
    }

    // Signing messages
    if (message.type === 'SIGNING_RESPONSE' ||
        message.type?.includes('personal_sign') ||
        message.type?.includes('eth_signTypedData_v4')) {
      return await handleSigningMessage(message, sender);
    }

    // Security config messages
    if (message.type === 'YAKKL_SECURITY_CONFIG_UPDATE' ||
        message.type === 'SECURITY_CONFIG_UPDATE') {
      return await handleSecurityMessage(message, sender);
    }

    // Try to handle through the new MessageHandler system for blockchain and other service messages
    if (message.type?.startsWith('yakkl_')) {
      try {
        const response = await handleMessageFromHandler(message, sender);
        log.debug('Message handled by MessageHandler', false, { type: message.type, response });
        return response;
      } catch (error) {
        log.error('Error routing to MessageHandler', false, error);
      }
    }

    log.warn('Unknown message type', false, { message });
    return { success: false, error: 'Unknown message type' };
  } catch (error) {
    log.error('Error in unified message listener', false, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Security message handler
async function handleSecurityMessage(message: any, sender: Runtime.MessageSender & { port?: Runtime.Port }) {
  try {
    log.info('Security message received:', false, {
      type: message?.type,
      action: message?.action,
      hasPayload: !!message?.payload,
      hasToken: !!message?.token,
      requestId: message?.requestId
    });

    // Handle REQUEST_SESSION_PORT
    if (message?.type === 'REQUEST_SESSION_PORT') {
      const requestId = message.requestId;
      if (!requestId) {
        log.error('No requestId provided for REQUEST_SESSION_PORT', false);
        return { success: false, error: 'No requestId provided' };
      }

      // First check if the port is already registered
      const existingPort = sessionPorts.get(requestId);
      if (existingPort) {
        log.info('Found existing port for requestId', false, {
          requestId,
          portName: existingPort.name
        });
        return { success: true, portName: existingPort.name };
      }

      // If no existing port, try to register the sender's port
      if (sender.port) {
        const registrationResult = registerSessionPort(sender.port, requestId);
        if (registrationResult.success) {
          return { success: true, portName: sender.port.name };
        }
      }

      log.warn('No port found for request', false, { requestId });
      return { success: false, error: 'No port found for request' };
    }

    // Handle REGISTER_SESSION_PORT
    if (message?.type === 'REGISTER_SESSION_PORT') {
      if (!message.requestId || !message.port) {
        log.error('Invalid REGISTER_SESSION_PORT request', false, {
          requestId: message?.requestId,
          hasPort: !!message?.port
        });
        return { success: false, error: 'Invalid request' };
      }

      return registerSessionPort(message.port, message.requestId);
    }

    // Handle UNREGISTER_SESSION_PORT
    if (message?.type === 'UNREGISTER_SESSION_PORT') {
      if (!message.requestId) {
        log.error('No requestId provided for UNREGISTER_SESSION_PORT', false);
        return { success: false, error: 'No requestId provided' };
      }

      unregisterPort(message.requestId);
      return { success: true };
    }

    // Handle STORE_SESSION_HASH (delegated)
    // if (message?.type === 'STORE_SESSION_HASH') {
      // Delegate handling to the background service handler registered in
      // `contexts/background/index.ts` to avoid multiple responders.
      // log.debug('[unifiedMessageListener] Delegating STORE_SESSION_HASH to background/index handler', false);
      // return undefined;
    // }

    if (message?.type === 'STORE_SESSION_HASH') {
      try {
        log.info('[Background] Handling STORE_SESSION_HASH', false, {
          hasPayload: !!message?.payload,
          payloadType: typeof message?.payload,
          payloadLength: message?.payload?.length
        });

        if (!message?.payload || typeof message.payload !== 'string') {
          log.warn('[Background] Invalid payload for STORE_SESSION_HASH', false);
          return { success: false, error: 'Invalid payload' };
        }

        return await handleStoreSessionHash(message.payload);
      } catch (error) {
        log.error('[Background] Error handling STORE_SESSION_HASH', false, error);
        return { success: false, error: 'Failed to store session hash' };
      }
    }

    // Handle REFRESH_SESSION (delegated)
    if (message?.type === 'REFRESH_SESSION') {
      try {
        return await handleRefreshSession(message);
			} catch (error) {
				log.error('[Background] Error handling REFRESH_SESSION', false, error);
				return { success: false, error: 'Failed to refresh session' };
			}
    }

    // Handle SESSION_TOKEN_BROADCAST
    if (message?.type === 'SESSION_TOKEN_BROADCAST') {
      // This is handled by the client context
      return undefined;
    }

    // Handle other security messages
    if (message?.type === SECURITY_MESSAGE) {
      // Add handling for other security messages here
      return undefined;
    }

    // If no handler found, return undefined to let other listeners handle it
    return undefined;

  } catch (error) {
    log.error('Error handling security message', false, {
      error: error instanceof Error ? error.message : 'Unknown error',
      message: message?.type,
      requestId: message?.requestId
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// EIP-6963 message handler
async function handleEIP6963Message(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    const requestId = message.id || getSafeUUID();
    const origin = getRequestOrigin(message, sender);

    // Handle EIP-1193 methods
    if (message.method?.startsWith('eth_')) {
      return await handleEIP1193Method(message, sender, requestId);
    }

    // Handle EIP-6963 requests
    if (EIP6963_REQUEST === message.type) {
      return await handleEIP6963Request(message, sender, requestId, origin);
    }

    // Handle EIP-6963 responses
    if (EIP6963_RESPONSE === message.type) {
      return await handleEIP6963Response(message, sender, requestId, origin);
    }

    // Handle EIP-6963 events
    if (EIP6963_ANNOUNCE === message.type) {
      return await handleEIP6963Event(message, sender, requestId, origin);
    }

    return undefined;
  } catch (error) {
    log.error('Error handling EIP-6963 message:', false, error);
    return {
      type: EIP6963_RESPONSE,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'EIP-6963 error'
      }
    };
  }
}

// Signing message handler
async function handleSigningMessage(
  message: any,
  sender: Runtime.MessageSender
): Promise<YakklResponse> {
  try {
    if (!message || typeof message !== 'object') {
      log.warn('Invalid signing message', false, { message });
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: message?.requestId || 'unknown',
        error: {
          code: -32602,
          message: 'Invalid message format'
        }
      };
    }

    const { requestId, type, params, token } = message;
    if (!requestId || !type || !params || !token) {
      log.warn('Missing required fields in signing message', false, { message });
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: requestId || 'unknown',
        error: {
          code: -32602,
          message: 'Missing required fields'
        }
      };
    }

    // Validate session token
    try {
      validateSession(token, 'signing');
    } catch (error) {
      log.error('Session validation failed', false, { error });
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: requestId,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Session validation failed'
        }
      };
    }

    // Handle the signing request
    const signingManagerInstance = await getSigningManager();
    const result = await signingManagerInstance.handleSigningRequest(requestId, type, params, token);
    log.info('Signing request completed', false, { result });

    return {
      type: 'YAKKL_RESPONSE:EIP6963',
      id: requestId,
      method: type,
      result: result.result
    };

  } catch (error) {
    log.error('Error handling signing message', false, { error });
    return {
      type: 'YAKKL_RESPONSE:EIP6963',
      id: message?.requestId || 'unknown',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    };
  }
}

// Internal wallet message handler (for messages from our own components)
async function handleInternalMessage(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    // Verify the message is from our own extension
    if (sender.id !== browser.runtime.id) {
      log.warn('Rejected internal message from external source', false, { senderId: sender.id });
      return { success: false, error: 'Unauthorized sender' };
    }

    const { type, action } = message;
    log.debug('Handling internal message', false, { type, action });

    switch (type) {
      case 'INTERNAL_TOKEN_REQUEST': {
        if (action === 'getTokenData') {
          // Return cached token data or fetch if needed
          // This replaces the old eth_* style messaging for internal use
          try {
            // TODO: Implement actual token data fetching logic
            // For now, return empty success to prevent errors
            return { success: true, tokens: [] };
          } catch (error) {
            log.error('Failed to get token data', false, error);
            return { success: false, error: 'Failed to fetch token data' };
          }
        }
        break;
      }

      case 'INTERNAL_PRICE_REQUEST': {
        // Handle internal price requests without using eth_* format
        // Prices should be fetched from our price service, not via eth_ calls
        return { success: true, message: 'Price request handled' };
      }

      default:
        log.warn('Unknown internal message action', false, { type, action });
        return { success: false, error: 'Unknown internal action' };
    }
  } catch (error) {
    log.error('Error handling internal message', false, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Runtime message handler
async function handleRuntimeMessage(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    switch (message.type) {
      case 'getActiveTab': {
        try {
          let activeTab: ActiveTab | null = null;
          const tabs = await browser.tabs.query({ active: true });

          if (tabs.length > 0) {
            const realTab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
            if (realTab) {
              const win = await browser.windows.get(realTab.windowId);
              activeTab = {
                tabId: realTab.id,
                windowId: realTab.windowId,
                windowType: win.type,
                url: realTab.url,
                title: realTab.title,
                favIconUrl: realTab.favIconUrl,
                dateTime: new Date().toISOString()
              };
            }
          }

          if (activeTab && activeTab.tabId) {
            return { success: true, activeTab: activeTab };
          } else {
            log.error('No active tab found:', true);
            return { success: false, error: 'No active tab found.' };
          }
        } catch (err) {
          log.error('Error getting active tab:', true, err);
          return { success: false, error: err };
        }
      }

      case 'popout': {
        log.debug('popout:', false, message);
        showPopup('', '0');
        return { success: true };
      }

      case 'ping': {
        return { success: true, message: 'Pong' };
      }

      case 'clipboard-timeout': {
        // Start the timeout but return immediately
        setTimeout(async () => {
          try {
            browser.scripting.executeScript({
              target: { tabId: message.tabId },
              func: async () => {
                try {
                  await navigator.clipboard.writeText(message.redactText);
                } catch (error) {
                  log.error("Failed to write to clipboard:", false, error);
                }
              }
            });
          } catch (error) {
            log.error('Failed to write to clipboard:', false, error);
          }
        }, message.timeout);

        return { success: true, message: 'Clipboard timeout scheduled' };
      }

      case 'createNotification': {
        const { notificationId, title, messageText } = message.payload;

        // Testing to see where this may have come from
        if (title === 'Security Notification') {
          return { success: false, message: 'Security Notification canceled' };
        }

        await browser.notifications.create(notificationId as string, {
          type: 'basic',
          iconUrl: browser.runtime.getURL('/images/logoBullLock48x48.png'),
          title: title || 'Notification',
          message: messageText || 'Default message.',
        });

        return { success: true, message: 'Notification sent' };
      }

      case 'startLockIconTimer': {
        startLockIconTimer();
        return { success: true, message: 'Lock icon timer started.' };
      }

      case 'stopLockIconTimer': {
        stopLockIconTimer();
        return { success: true, message: 'Lock icon timer stopped.' };
      }

      case 'setIconLock': {
        await setIconLock();
        return { success: true, message: 'Lock icon set.' };
      }

      case 'setIconUnlock': {
        await setIconUnlock();
        return { success: true, message: 'Unlock icon set.' };
      }

      default: {
        // Not handled by this listener
        return undefined;
      }
    }
  } catch (error: any) {
    log.error('Error handling runtime message:', false, error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred.'
    };
  }
}

// Helper functions
function getRequestOrigin(request?: any, sender?: Runtime.MessageSender): string {
  try {
    if (request?.origin) return request.origin;
    if (sender?.url) return new URL(sender.url).origin;
    if (sender?.tab?.url) return new URL(sender.tab.url).origin;
    return '';
  } catch (error) {
    log.error('Error getting request origin:', false, error);
    return '';
  }
}

async function handleStoreSessionHash(payload: any) {
  try {
    if (!payload || typeof payload !== 'string') {
      log.warn('Invalid payload for session hash storage', false, { payload });
      return { success: false, error: 'Invalid payload' };
    }

    bgMemoryHash = payload;
    bgSessionToken = generateSessionToken();

    // Broadcast the new session token
    try {
      await browser.runtime.sendMessage({
        type: 'SESSION_TOKEN_BROADCAST',
        token: bgSessionToken.token,
        expiresAt: bgSessionToken.expiresAt
      });
    } catch (error) {
      log.warn('Failed to broadcast session token', false, { error });
    }

    log.info('Session hash stored and token generated', false, {
      token: bgSessionToken.token,
      expiresAt: bgSessionToken.expiresAt
    });

    return {
      success: true,
      token: bgSessionToken.token,
      expiresAt: bgSessionToken.expiresAt
    } as StoreHashResponse;
  } catch (error) {
    log.error('Error storing session hash', false, {
      error: error instanceof Error ? error.message : 'Unknown error',
      payload
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function handleRefreshSession(message: any) {
  try {
    const providedToken = message?.token as string | undefined;
    if (bgSessionToken && providedToken === bgSessionToken.token) {
      bgSessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;

      // Broadcast updated token expiry after responding
      setTimeout(async () => {
        try {
          await browser.runtime.sendMessage({
            type: 'SESSION_TOKEN_BROADCAST',
            token: bgSessionToken!.token,
            expiresAt: bgSessionToken!.expiresAt
          });
        } catch (error) {
          log.error('[Background] Failed to broadcast refreshed session token', false, error);
        }
      }, 0);

      return {
        success: true,
        token: bgSessionToken.token,
        expiresAt: bgSessionToken.expiresAt
      };
    } else {
      // Clear on invalid token
      bgSessionToken = null;
      bgMemoryHash = null;
      return { success: false, error: 'Unauthorized' };
    }
  } catch (error) {
    log.error('Error refreshing session', false, {
      error: error instanceof Error ? error.message : 'Unknown error',
      token: message?.token
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handleEIP1193Method(
  message: any,
  sender: Runtime.MessageSender,
  requestId: string
): Promise<any> {
  try {
    const { method, params } = message;
    const origin = getRequestOrigin(message, sender);

    const request: BackgroundPendingRequest = {
      resolve: () => {},
      reject: () => {},
      port: sender as Runtime.Port,
      data: {
        id: requestId,
        method,
        params,
        timestamp: Date.now(),
        type: EIP6963_REQUEST,
        origin
      }
    };

    // Add request to request manager
    requestManager.addRequest(requestId, request);

    // Show EIP-6963 popup for user interaction
    await showEIP6963Popup(method, params);

    // Wait for response from request manager
    const response = await requestManager.getRequest(requestId);

    if (response?.error) {
      throw new Error(response.error.message);
    }

    return {
      type: EIP6963_RESPONSE,
      id: requestId,
      result: response?.result
    };
  } catch (error) {
    log.error('Error handling EIP-1193 method:', false, error);
    return {
      type: EIP6963_RESPONSE,
      id: requestId,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'EIP-1193 method error'
      }
    };
  }
}

async function handleEIP6963Request(
  message: any,
  sender: Runtime.MessageSender,
  requestId: string,
  origin: string
): Promise<any> {
  try {
    const { type, payload } = message;

    const request: BackgroundPendingRequest = {
      resolve: () => {},
      reject: () => {},
      port: sender as Runtime.Port,
      data: {
        id: requestId,
        method: type,
        params: [payload],
        timestamp: Date.now(),
        type,
        origin
      }
    };

    // Add request to request manager
    requestManager.addRequest(requestId, request);

    // Show EIP-6963 popup for user interaction
    await showEIP6963Popup(type, [payload]);

    // Wait for response from request manager
    const response = await requestManager.getRequest(requestId);

    if (response?.error) {
      throw new Error(response.error.message);
    }

    return {
      type: EIP6963_RESPONSE,
      id: requestId,
      result: response?.result
    };
  } catch (error) {
    log.error('Error handling EIP-6963 request:', false, error);
    return {
      type: EIP6963_RESPONSE,
      id: requestId,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'EIP-6963 request error'
      }
    };
  }
}

async function handleEIP6963Response(
  message: any,
  sender: Runtime.MessageSender,
  requestId: string,
  origin: string
): Promise<any> {
  try {
    const { type, result, error } = message;

    // Update request in request manager
    requestManager.updateRequest(requestId, {
      data: {
        id: requestId,
        method: type,
        params: [],
        timestamp: Date.now(),
        type
      },
      result,
      error
    });

    return {
      type: EIP6963_RESPONSE,
      id: requestId,
      success: true
    };
  } catch (error) {
    log.error('Error handling EIP-6963 response:', false, error);
    return {
      type: EIP6963_RESPONSE,
      id: requestId,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'EIP-6963 response error'
      }
    };
  }
}

async function handleEIP6963Event(
  message: any,
  sender: Runtime.MessageSender,
  requestId: string,
  origin: string
): Promise<any> {
  try {
    const { type, event, data } = message;

    // Handle different event types
    switch (event) {
      case 'accountsChanged':
        // Handle accounts changed event
        const accounts = await getYakklCurrentlySelected();
        return {
          type: EIP6963_ANNOUNCE,
          event: 'accountsChanged',
          data: accounts
        };

      case 'chainChanged':
        // Handle chain changed event
        return {
          type: EIP6963_ANNOUNCE,
          event: 'chainChanged',
          data: data
        };

      case 'disconnect':
        // Handle disconnect event
        return {
          type: EIP6963_ANNOUNCE,
          event: 'disconnect',
          data: data
        };

      default:
        return undefined;
    }
  } catch (error) {
    log.error('Error handling EIP-6963 event:', false, error);
    return {
      type: EIP6963_RESPONSE,
      id: requestId,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'EIP-6963 event error'
      }
    };
  }
}

export function unregisterPort(requestId: string) {
  // Verify this is being called from the background context
  if (!isBackgroundContext()) {
    return { success: false, error: 'Unauthorized context' };
  }

  log.info('Unregistering port', false, { requestId });
  sessionPorts.delete(requestId);
  return { success: true };
}

/**
 * Safely retrieves the current session token from the background context.
 * This function can only be called from the background context and will
 * return null if called from any other context.
 *
 * @returns The current session token or null if not available or if called from wrong context
 */
export function getBackgroundSessionToken(): SessionToken | null {
  try {
    // Verify this is being called from the background context
    if (!isBackgroundContext()) {
      throw new Error('Unauthorized context');
    }


    if (!bgSessionToken) {
      log.debug('No active session token found');
      return null;
    }

    // Verify the token hasn't expired
    if (Date.now() > bgSessionToken.expiresAt) {
      log.debug('Session token has expired');
      clearSession('Token expired');
      return null;
    }

    return bgSessionToken;
  } catch (error) {
    log.error('Error accessing session token:', false, error);
    return null;
  }
}

// content.ts
import { Duplex } from 'readable-stream';
import { YAKKL_PROVIDER_EIP6963, WALLET_SECURITY_CONFIG } from '$lib/common/constants';
import type { SecurityLevel } from '$lib/permissions/types';
import { SecurityLevel as SecurityLevelEnum } from '$lib/permissions/types';
import { SECURITY_LEVEL_DESCRIPTIONS } from '$lib/common/constants';
import type { Runtime } from 'webextension-polyfill';
import { log } from '$lib/plugins/Logger';
import browser from 'webextension-polyfill';
import { getWindowOrigin, isValidOrigin, getTargetOrigin, safePostMessage } from '$lib/common/origin';
import { SecurityLevel as PermissionsSecurityLevel } from '$lib/permissions/types';
import { isFrameAccessible } from '$lib/common/frameInspector';
import { ProviderRpcError } from "$lib/common";

// Chrome types
declare namespace chrome {
  export namespace runtime {
    interface Port {
      name: string;
      onMessage: {
        addListener: (callback: (message: any) => void) => void;
      };
      onDisconnect: {
        addListener: (callback: () => void) => void;
      };
      postMessage: (message: any) => void;
    }
    function connect(connectInfo?: { name: string }): Port;
  }
}

type RuntimePort = Runtime.Port;

// We only want to receive events from the inpage script
const windowOrigin = getWindowOrigin();
let portEIP6963: RuntimePort | undefined = undefined;
let contentStream: PortDuplexStream | undefined = undefined;
let reconnectAttempts = 0;
let isConnecting = false;  // Add connection state tracking
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

// Add a flag to track extension context validity
let isExtensionContextValid = true;

// Security configuration state
let securityLevel: SecurityLevel = SecurityLevelEnum.MEDIUM; // Default to medium security
let injectIframes: boolean = true; // Default to true for backward compatibility

// Track pending messages for CSP-blocked frames
const pendingMessages = new Map<string, {
  message: any;
  timestamp: number;
  attempts: number;
}>();

const MAX_RETRY_ATTEMPTS = 3;
// const RETRY_DELAY = 1000; // 1 second

// Add port state tracking
let isPortOpen = false;

// Initialize connection to background script
let port: chrome.runtime.Port | null = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;
const RECONNECT_DELAY = 1000;

// Track pending requests
interface PendingRequest {
  id: number | string;
  method: string;
  type: string;
  timestamp: number;
}

// Message interfaces
interface YakklRequest {
  type: string;
  id: number | string;
  method: string;
  params: unknown[];
  requiresApproval?: boolean;
}

interface YakklResponse {
  type: string;
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface YakklEvent {
  type: string;
  event: string;
  data: unknown;
}

type YakklMessage = YakklRequest | YakklResponse | YakklEvent;

const pendingRequests: Map<string | number, PendingRequest> = new Map();

class PortDuplexStream extends Duplex {
  private port: RuntimePort;

  constructor(port: RuntimePort) {
    super({ objectMode: true });
    this.port = port;
    this.port.onMessage.addListener(this._onMessage.bind(this));
    this.port.onDisconnect.addListener(() => this.destroy());
  }

  _read() {
    // No-op
  }

  _write(message: any, _encoding: string, callback: () => void) {
    try {
      log.debug('PortDuplexStream: Writing to port', false, message);
      this.port.postMessage(message);
      callback();
    } catch (error) {
      log.error('Failed to write to port', false, error);
      callback();
    }
  }

  _onMessage(message: any) {
    try {
      this.push(message);
    } catch (error) {
      log.error('Error in _onMessage', false, error);
    }
  }

  _destroy(err: Error | null, callback: (error: Error | null) => void) {
    try {
      this.port.disconnect();
      callback(err);
    } catch (error: unknown) {
      log.error('Error in _destroy', false, error);
      if (error instanceof Error) {
        callback(error);
      } else {
        callback(new Error('Failed to destroy port'));
      }
    }
  }
}

// Modify setupEIP6963Connection to track port state
function setupEIP6963Connection() {
  try {
    if (!browser?.runtime) {
      log.error('Content: Browser extension API not available', false);
      isExtensionContextValid = false;
      isPortOpen = false;
      return null;
    }

    // Check if the extension context is still valid
    if (browser.runtime.id === undefined) {
      log.error('Content: Extension context invalidated', false);
      isExtensionContextValid = false;
      isPortOpen = false;
      // Clean up existing connection
      cleanupConnection();
      return null;
    }

    // Reset context validity flag since we can access the runtime
    isExtensionContextValid = true;

    log.info('Content: setupEIP6963Connection - isConnecting, portEIP6963?.name, contentStream', false, isConnecting, portEIP6963?.name, contentStream);

    // If we already have an active connection or are in the process of connecting, don't create a new one
    if (isConnecting || (portEIP6963?.name === YAKKL_PROVIDER_EIP6963 && contentStream)) {
      isPortOpen = true;
      return contentStream;
    }

    isConnecting = true;

    // Create a port for EIP-6963 communication
    try {
      portEIP6963 = browser.runtime.connect({ name: YAKKL_PROVIDER_EIP6963 });
      log.debug('Created EIP-6963 port connection', false, { portName: YAKKL_PROVIDER_EIP6963, portEIP6963 });
      isPortOpen = true;
    } catch (error) {
      log.error('Failed to create port connection:', false, error);
      isConnecting = false;
      isPortOpen = false;
      // Check if this was due to invalid context
      if (browser.runtime.id === undefined) {
        isExtensionContextValid = false;
      }
      return null;
    }

    contentStream = new PortDuplexStream(portEIP6963);
    // log.debug('Created PortDuplexStream for EIP-6963', false, contentStream);

    // Single disconnect handler with exponential backoff
    let disconnectHandled = false;
    portEIP6963.onDisconnect.addListener(() => {
      if (disconnectHandled) return;
      disconnectHandled = true;

      const lastError = browser.runtime.lastError;
      // log.debug('EIP-6963 port disconnected', false, { lastError });
      isPortOpen = false;

      // Clean up existing connection
      cleanupConnection();

      // Check if extension context is still valid before attempting reconnection
      if (browser.runtime.id === undefined) {
        log.error('Extension context invalidated during disconnect', false);
        return;
      }

      // Implement exponential backoff for reconnection
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
        log.debug(`Content: Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`, false);

        setTimeout(() => {
          // Double-check extension context before reconnecting
          if (browser.runtime.id !== undefined) {
            disconnectHandled = false;
            reconnectAttempts++;
            const newStream = setupEIP6963Connection();
            if (newStream) {
              reconnectAttempts = 0; // Reset on successful connection
            }
          } else {
            log.error('Content: Extension context invalid, skipping reconnection attempt', false);
          }
        }, delay);
      } else {
        log.error('Max reconnection attempts reached', false);
      }
    });

    // Setup message handling for the stream
    setupMessageHandling(contentStream);

    log.debug('Content: EIP-6963 connection established', false);
    isConnecting = false;
    return contentStream;
  } catch (error) {
    log.error('Failed to setup EIP-6963 connection:', false, error);
    // Check if this was due to invalid context
    if (browser?.runtime?.id === undefined) {
      isExtensionContextValid = false;
    }
    isPortOpen = false;
    cleanupConnection();
    return null;
  }
}

// Modify cleanupConnection to update port state
function cleanupConnection() {
  if (contentStream) {
    try {
      contentStream.destroy();
    } catch (e) {
      log.error('Error destroying content stream:', false, e);
    }
  }
  contentStream = undefined;
  portEIP6963 = undefined;
  isConnecting = false;
  isPortOpen = false;
  reconnectAttempts = 0; // Reset reconnect attempts on cleanup
}

// Add port state check function
function ensurePortConnection(): boolean {
  if (!isPortOpen || !contentStream) {
    log.debug('Content: Port not open, attempting to establish connection', false);
    const newStream = setupEIP6963Connection();
    if (!newStream) {
      log.error('Content: Failed to establish port connection', false);
      return false;
    }
  }
  return true;
}

// Setup message handling for the stream
function setupMessageHandling(stream: PortDuplexStream) {
  if (!stream) {
    log.error('Content: No stream provided for message handling', false);
    return;
  }

  // Listen for messages from the background script
  stream.on('data', (data: any) => {
    try {
      log.debug('Content: Received message from background:', false, {
        data,
        timestamp: new Date().toISOString(),
        targetOrigin: getTargetOrigin(),
        windowOrigin: getWindowOrigin(),
        isFrameAccessible: isFrameAccessible(window)
      });

      // Format the response properly
      let message: {
        type: string;
        id: any;
        method?: string;
        result?: any;
        error?: any;
        event?: string;
      } = {
        type: 'YAKKL_RESPONSE:EIP6963',
        id: data.id || data.requestId || data.messageId,
        method: data.method
      };

      // Handle array responses (like eth_accounts)
      if (Array.isArray(data)) {
        message.result = data;
      }
      // Handle string responses
      else if (typeof data === 'string') {
        // For chainId, ensure hex format
        if (message.method === 'eth_chainId') {
          message.result = data.startsWith('0x') ? data : `0x${parseInt(data).toString(16)}`;
        }
        // For net_version, ensure string format
        else if (message.method === 'net_version') {
          message.result = String(data);
        }
        // For other string responses, pass through
        else {
          message.result = data;
        }
      }
      // Handle object responses with result field
      else if (data.result !== undefined) {
        message.result = data.result;
      }
      // Handle error responses
      else if (data.error) {
        message.error = data.error;
      }
      // Handle raw object responses
      else if (typeof data === 'object') {
        message.result = data;
      }

      // Ensure we have a result or error
      if (!message.result && !message.error) {
        message.result = data;
      }

      log.debug('Content: Formatted message for sending to inpage:', false, {
        originalData: data,
        formattedMessage: message,
        timestamp: new Date().toISOString()
      });

      // Forward the response to the inpage script
      safePostMessage(message, getTargetOrigin(), {
        context: 'content',
        allowRetries: true,
        retryKey: `${message.type}-${message.id || 'event'}`
      });
    } catch (error) {
      log.error('Error handling message from background:', false, {
        error,
        data,
        timestamp: new Date().toISOString(),
        targetOrigin: getTargetOrigin(),
        windowOrigin: getWindowOrigin()
      });
    }
  });

  // Listen for messages from the inpage script
  window.addEventListener('message', async (event) => {
    // Only accept messages from valid origins
    if (!isValidOrigin(event.origin)) {
      log.debug('Content: Message from invalid origin:', true, {
        origin: event.origin,
        expectedOrigin: getWindowOrigin(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const message = event.data;
    if (!message || typeof message !== 'object') {
      log.debug('Content: Invalid message format:', true, {
        message,
        timestamp: new Date().toISOString()
      });
      return;
    }

    log.debug('Content: Received message in content script:', true, {
      message,
      origin: event.origin,
      timestamp: new Date().toISOString(),
      portState: {
        isPortOpen,
        hasContentStream: !!contentStream,
        portName: portEIP6963?.name
      }
    });

    // Handle requests from inpage script
    if (message.type === 'YAKKL_REQUEST:EIP6963') {
      try {
        // Forward the request to the background script
        log.debug('Content: Forwarding request to background script:', true, {
          message,
          timestamp: new Date().toISOString(),
          portState: {
            isPortOpen,
            hasContentStream: !!contentStream,
            portName: portEIP6963?.name
          }
        });

        // Use port connection instead of sendMessage
        if (contentStream) {
          contentStream.write({
            type: 'YAKKL_REQUEST:EIP6963',
            id: message.id,
            method: message.method,
            params: message.params,
            requiresApproval: message.requiresApproval
          });
          log.debug('Content: Request written to contentStream:', true, {
            method: message.method,
            id: message.id,
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error('No active port connection');
        }
      } catch (error) {
        log.error('Error handling request:', true, {
          error,
          message,
          timestamp: new Date().toISOString(),
          portState: {
            isPortOpen,
            hasContentStream: !!contentStream,
            portName: portEIP6963?.name
          }
        });

        // Format error response properly
        const errorResponse = {
          type: 'YAKKL_RESPONSE:EIP6963',
          id: message.id,
          error: {
            code: error instanceof ProviderRpcError ? error.code : 4001,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        };

        log.debug('Content: Sending error response to inpage:', true, {
          errorResponse,
          timestamp: new Date().toISOString()
        });

        // Send the formatted error response back to the inpage script
        window.postMessage(errorResponse, event.origin);
      }
    }
  });
}

function cleanupPendingMessages() {
  const now = Date.now();
  for (const [key, value] of pendingMessages.entries()) {
    // Remove messages older than 30 seconds or that have exceeded max attempts
    if (now - value.timestamp > 30000 || value.attempts >= MAX_RETRY_ATTEMPTS) {
      pendingMessages.delete(key);
    }
  }
}

// Add cleanup interval
const cleanupInterval = setInterval(cleanupPendingMessages, 10000); // Clean up every 10 seconds

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(cleanupInterval);
  pendingMessages.clear();
});

// Modify the message handling to check port state
function handleInpageMessage(event: MessageEvent) {
  log.debug('Content script received message:', false, {
    event,
    timestamp: new Date().toISOString()
  });

  if (event.source !== window) {
    log.debug('Message source is not window, ignoring', false);
    return;
  }
  if (!event.data?.type) {
    log.debug('Message has no type, ignoring', false);
    return;
  }
  if (!isValidOrigin(event.origin)) {
    log.debug('Invalid origin, ignoring message', false, {
      origin: event.origin,
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    // Handle both EIP-6963 and EIP-1193 requests
    if (event.data.type === 'YAKKL_REQUEST:EIP6963' || event.data.type === 'YAKKL_REQUEST:EIP1193') {
      log.debug('Content: Processing request from inpage:', false, {
        data: event.data,
        timestamp: new Date().toISOString()
      });

      // Ensure we have an active connection
      if (!ensurePortConnection()) {
        log.error('Failed to establish port connection for message:', false, {
          data: event.data,
          timestamp: new Date().toISOString()
        });
        // Send error response back to inpage script
        safePostMessage({
          type: 'YAKKL_RESPONSE:EIP6963',
          id: event.data.id,
          method: event.data.method,
          error: {
            code: 4900,
            message: 'Failed to establish connection'
          }
        }, getTargetOrigin());
        return;
      }

      // Forward all requests to background without special handling
      log.debug('Forwarding request to background:', false, {
        data: event.data,
        timestamp: new Date().toISOString()
      });
      contentStream.write({
        type: 'YAKKL_REQUEST:EIP6963',
        method: event.data.method,
        params: event.data.params,
        requiresApproval: event.data.requiresApproval,
        id: event.data.id
      });
    }
  } catch (error) {
    log.error('Error processing message from inpage:', false, {
      error,
      data: event.data,
      timestamp: new Date().toISOString()
    });
    // Send error response back to inpage script
    if (event.data?.id) {
      safePostMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        id: event.data.id,
        method: event.data.method,
        error: {
          code: -32603,
          message: 'Internal error processing request'
        }
      }, getTargetOrigin());
    }
  }
}

// Listen for EIP-6963 events from background
browser.runtime.onMessage.addListener((message: unknown) => {
  const yakklEvent = message as { type: string; event: string; data: unknown };
  if (yakklEvent.type === 'YAKKL_EVENT:EIP6963') {
    log.debug('Content: Received EIP-6963 event from background:', false, {
      event: yakklEvent.event,
      data: yakklEvent.data,
      yakklEvent
    });
    // Forward EIP-6963 events to inpage
    safePostMessage({
      type: 'YAKKL_EVENT:EIP6963',
      event: yakklEvent.event,
      data: yakklEvent.data
    }, getTargetOrigin());
  }
  return true;
});

// Listen for security configuration updates from background
browser.runtime.onMessage.addListener((message: unknown) => {
  const configMessage = message as {
    type: string;
    securityLevel?: PermissionsSecurityLevel;
    injectIframes?: boolean;
  };

  if (configMessage.type === 'YAKKL_SECURITY_CONFIG_UPDATE') {
    if (configMessage.securityLevel !== undefined) {
      securityLevel = configMessage.securityLevel;
      log.debug('Security level updated:', false, {
        level: securityLevel,
        description: getSecurityLevelDescription(securityLevel)
      });
    }
    if (configMessage.injectIframes !== undefined) {
      injectIframes = configMessage.injectIframes;
      log.debug('Iframe injection setting updated:', false, { injectIframes });
    }
  }
  return true;
});

// Helper function to get security level description
function getSecurityLevelDescription(level: SecurityLevel): string {
  switch (level) {
    case SecurityLevelEnum.HIGH:
      return 'High security - No iframe injection';
    case SecurityLevelEnum.MEDIUM:
      return 'Medium security - Trusted domains only';
    case SecurityLevelEnum.STANDARD:
      return 'Standard security - All non-null origin frames';
    default:
      return 'Unknown security level';
  }
}

// Helper function to check if a frame is safe to inject into
function isFrameSafe(frame: Window): boolean {
  try {
    // Basic safety checks
    if (!frame) {
      log.debug('Frame is null or undefined', false);
      return false;
    }

    // Check for null origin
    if (frame.location.origin === 'null') {
      log.debug('Frame has null origin, skipping injection', false);
      return false;
    }

    // For other frames, check if we can access the frame's location
    try {
      frame.location.href;
    } catch (e) {
      log.debug('Cannot access frame location, skipping injection', false);
      return false;
    }

    return true;
  } catch (error) {
    log.debug('Error checking frame safety:', false, error);
    return false;
  }
}

// Helper function to inject script into a frame
function injectScriptIntoFrame(frame: Window) {
  try {
    // Additional safety check before injection
    if (!isFrameSafe(frame)) {
      log.debug('Frame failed safety checks, skipping injection', false);
      return;
    }

    if (!frame || !frame.document) return;

    const container = frame.document.head || frame.document.documentElement;
    const script = frame.document.createElement("script");
    script.setAttribute("async", "false");
    script.src = browser.runtime.getURL("/ext/inpage.js");
    script.id = YAKKL_PROVIDER_EIP6963;
    script.onload = () => {
      log.debug('Inpage script loaded in frame:', false, {
        origin: frame.location.origin,
        timestamp: new Date().toISOString()
      });
      script.remove();
    };
    container.prepend(script);
  } catch (error) {
    log.debug('Error injecting script into frame:', false, error);
  }
}

// Helper function to check if we should inject into a frame
function shouldInjectIntoFrame(frame: Window): boolean {
  try {
    // Don't inject if the frame is not accessible
    if (!frame) {
      return false;
    }

    // Check if iframe injection is enabled
    if (!injectIframes) {
      log.debug('Iframe injection is disabled', false);
      return false;
    }

    // Special handling for test dapp
    if (frame.location.hostname === 'metamask.github.io') {
      log.debug('Allowing injection into test dapp frame', false);
      return true;
    }

    // Check security level
    switch (securityLevel) {
      case SecurityLevelEnum.HIGH:
        log.debug('High security level - no iframe injection', false);
        return false;

      case SecurityLevelEnum.MEDIUM:
        // Check if the frame has a null origin
        if (frame.location.origin === 'null') {
          log.debug('Skipping injection into null origin frame', false);
          return false;
        }

        // Check if the frame is from a trusted domain
        const frameOrigin = frame.location.origin;
        const isTrustedDomain = WALLET_SECURITY_CONFIG.TRUSTED_DOMAINS.some(
          domain => frameOrigin.includes(domain)
        );

        if (!isTrustedDomain) {
          log.debug('Skipping injection into untrusted frame:', false, {
            origin: frameOrigin,
            securityLevel: SecurityLevelEnum.MEDIUM
          });
          return false;
        }
        break;

      case SecurityLevelEnum.STANDARD:
        // Only check for null origin
        if (frame.location.origin === 'null') {
          log.debug('Skipping injection into null origin frame', false);
          return false;
        }
        break;
    }

    return true;
  } catch (error) {
    log.debug('Error checking frame injection:', false, {
      error,
      securityLevel,
      injectIframes
    });
    return false;
  }
}

// Modify the periodic health check
let healthCheckInterval: number | undefined;

function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = window.setInterval(() => {
    // If context was previously invalid, check if it's been restored
    if (!isExtensionContextValid) {
      if (browser?.runtime?.id !== undefined) {
        log.debug('Extension context restored, resuming normal operation', false);
        isExtensionContextValid = true;
        reconnectAttempts = 0;
      } else {
        // Context still invalid, skip health check
        return;
      }
    }

    // Only attempt reconnection if context is valid
    if (isExtensionContextValid && (!portEIP6963 || !contentStream)) {
      log.debug('EIP-6963 connection lost, attempting to restore...', false);
      reconnectAttempts = 0; // Reset attempts for periodic checks
      setupEIP6963Connection();
    }
  }, 60000); // Check every minute

  // Cleanup on page beforeunload
  window.addEventListener('beforeunload', () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    cleanupConnection();
  });
}

// This is the main entry point for the content script
try {
  log.debug('Content script starting...', false);
  if (browser) {
    // Always inject into the main window
    if (document.contentType === "text/html") {
      log.debug('Injecting inpage script into main window...', false);
      const container = document.head || document.documentElement;
      const script = document.createElement("script");
      script.setAttribute("async", "false");
      script.src = browser.runtime.getURL("/ext/inpage.js");
      script.id = YAKKL_PROVIDER_EIP6963;
      script.onload = () => {
        log.debug('Inpage script loaded in main window', false);
        script.remove();
      };
      container.prepend(script);
    }

    // Setup initial EIP-6963 connection
    setupEIP6963Connection();

    // Start the health check
    startHealthCheck();

    // Handle iframe injection more selectively
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLIFrameElement) {
            // Wait for the iframe to load
            node.addEventListener('load', () => {
              try {
                const frame = node.contentWindow;
                // First check if the frame is safe
                if (frame && isFrameSafe(frame)) {
                  // Then check if we should inject based on security settings
                  if (shouldInjectIntoFrame(frame)) {
                    injectScriptIntoFrame(frame);
                  }
                }
              } catch (error) {
                log.debug('Error handling iframe:', false, error);
              }
            });
          }
        });
      });
    });

    // Observe DOM changes for new iframes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Clean up observer on page unload
    window.addEventListener('beforeunload', () => {
      observer.disconnect();
    });
  }
} catch (e) {
  log.error('Content script initialization failed:', false, e);
}

// Connect to background script
function connectToBackground() {
  if (isConnected) return;

  try {
    connectionAttempts++;
    log.debug('Content script connecting to background...', false, {
      attempt: connectionAttempts,
      maxAttempts: MAX_CONNECTION_ATTEMPTS
    });

    port = chrome.runtime.connect({ name: 'yakkl-wallet-content' });

    // Set up message listener from background
    port.onMessage.addListener((message) => {
      handleBackgroundMessage(message);
    });

    // Handle disconnection
    port.onDisconnect.addListener(() => {
      log.warn('Disconnected from background script', false);
      isConnected = false;
      port = null;

      // Attempt to reconnect if under max attempts
      if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
        setTimeout(connectToBackground, RECONNECT_DELAY);
      } else {
        log.error('Failed to connect to background after max attempts', false);
      }
    });

    isConnected = true;
    connectionAttempts = 0;
    log.debug('Connected to background script', false);
  } catch (error) {
    log.error('Error connecting to background script', false, error);
    isConnected = false;
    port = null;

    // Attempt to reconnect if under max attempts
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      setTimeout(connectToBackground, RECONNECT_DELAY);
    }
  }
}

// Handle messages from background script
function handleBackgroundMessage(message: YakklMessage) {
  if (!message || typeof message !== 'object') {
    log.warn('Invalid message from background', false, message);
    return;
  }

  log.debug('Received message from background', false, {
    message,
    timestamp: new Date().toISOString()
  });

  // Forward response to webpage
  if (message.type === 'YAKKL_RESPONSE:EIP6963' || message.type === 'YAKKL_RESPONSE:EIP1193') {
    const response = message as YakklResponse;
    const { id } = response;
    const pendingRequest = pendingRequests.get(id);

    if (pendingRequest) {
      log.debug('Forwarding response to webpage', false, {
        id,
        method: pendingRequest.method,
        type: message.type,
        timestamp: new Date().toISOString()
      });

      // Remove from pending requests
      pendingRequests.delete(id);

      // Forward to webpage
      safePostMessage(message, getTargetOrigin(), {
        context: 'content',
        allowRetries: true,
        retryKey: `response-${id}`
      });
    } else {
      log.warn('No pending request found for response', false, {
        id,
        message,
        pendingRequests: Array.from(pendingRequests.keys())
      });
    }
  }

  // Forward events to webpage
  if (message.type === 'YAKKL_EVENT:EIP6963' || message.type === 'YAKKL_EVENT:EIP1193') {
    const event = message as YakklEvent;
    log.debug('Forwarding event to webpage', false, {
      event: event.event,
      type: message.type,
      timestamp: new Date().toISOString()
    });

    // Forward to webpage
    safePostMessage(message, getTargetOrigin(), {
      context: 'content',
      allowRetries: true,
      retryKey: `event-${event.event}-${Date.now()}`
    });
  }
}

// Handle messages from webpage
function handleWebpageMessage(event: MessageEvent) {
  // Validate origin
  if (!isValidOrigin(event.origin)) {
    return;
  }

  const message = event.data;
  if (!message || typeof message !== 'object') {
    return;
  }

  // Handle requests from webpage
  if (message.type === 'YAKKL_REQUEST:EIP6963' || message.type === 'YAKKL_REQUEST:EIP1193') {
    const { id, method, params } = message;

    log.debug('Received request from webpage', false, {
      id,
      method,
      type: message.type,
      timestamp: new Date().toISOString()
    });

    // Ensure connection to background
    if (!isConnected) {
      connectToBackground();

      // If still not connected, send error response
      if (!isConnected) {
        const errorResponse = {
          type: message.type.replace('REQUEST', 'RESPONSE'),
          id,
          error: {
            code: 4900,
            message: 'Provider not connected'
          }
        };

        safePostMessage(errorResponse, getTargetOrigin(), {
          context: 'content',
          allowRetries: true,
          retryKey: `error-${id}`
        });

        return;
      }
    }

    // Track the request
    pendingRequests.set(id, {
      id,
      method,
      type: message.type,
      timestamp: Date.now()
    });

    // Forward to background
    if (port) {
      port.postMessage(message);
    }
  }
}

// Initialize content script
function initialize() {
  // Connect to background script
  connectToBackground();

  // Set up listener for messages from webpage
  window.addEventListener('message', handleWebpageMessage);

  // Clean up old pending requests periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, request] of pendingRequests.entries()) {
      // Remove requests older than 30 seconds
      if (now - request.timestamp > 30000) {
        log.warn('Removing stale request', false, {
          id,
          method: request.method,
          age: now - request.timestamp
        });
        pendingRequests.delete(id);
      }
    }
  }, 10000);

  log.debug('Content script initialized', false);
}

// Start the content script
initialize();

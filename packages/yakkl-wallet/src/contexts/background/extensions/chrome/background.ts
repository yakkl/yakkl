/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Background actions for the extension...
import { initializeEIP6963, handleRequestAccounts } from './eip-6963';

import { addBackgroundListeners } from '$lib/common/listeners/background/backgroundListeners';
import { globalListenerManager } from '$lib/managers/GlobalListenerManager';
import { log } from '$lib/managers/Logger';
import { onAlarmListener } from '$lib/common/listeners/background/alarmListeners';

import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { safePortPostMessage } from '$lib/common/safePortMessaging';

import { activeTabBackgroundStore, activeTabUIStore, backgroundUIConnectedStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import { type ActiveTab } from '$lib/common';
import { initializePermissions } from '$lib/permissions';
import { initializeStorageDefaults, watchLockedState } from '$lib/common/backgroundUtils';
import { KeyManager } from '$lib/managers/KeyManager';
import { SecurityLevel } from '$lib/permissions/types';
import { getAlchemyProvider } from '$lib/managers/providers/network/ethereum_provider/alchemy';
import type { PendingRequestData, RequestMetadata, YakklMessage, YakklRequest, YakklResponse } from '$lib/common/interfaces';
// import { openPopups } from '$lib/common/reload';
import { showPopup } from './ui';
import { extractSecureDomain } from '$lib/common/security';
import { getAddressesForDomain, verifyDomainConnected } from './verifyDomainConnectedBackground';
import { onDappListener } from './dapp';
import { getCurrentlySelectedData } from '$lib/common/shortcuts';

type RuntimeSender = Runtime.MessageSender;
type RuntimePort = Runtime.Port;

// NOTE: This can only be used in the background context

// NOTE: This is a workaround for how Chrome handles alarms, listeners, and state changes in the background
//  It appears that if the extension is suspended, the idle listener may not be triggered
//  This workaround sets up a periodic check to ensure the state is updated
//  If the devtools are open, the extension is not suspended and works as expected but, Chrome seems to be
//  more aggressive when devtools is not open

// UPDATE: Moved idle timer to the IdleManager plugin and for anything needed to always be active while the UI is active
// IdleManager is UI context only and is not used in the background context

// Export KeyManager for console debugging
// Use globalThis instead of window to support Service Workers
(globalThis as any).debugKeyManager = KeyManager.getInstance();

// Track connected ports
const ports: Map<string, RuntimePort> = new Map();
let isProcessingQueue = false;

// Add port state tracking
const activePorts = new Map<string, {
  port: RuntimePort;
  lastActivity: number;
  pendingMessages: number;
}>();

// Define the type for pending requests
export type BackgroundPendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  port: RuntimePort;
  data: PendingRequestData;
  error?: {
    code: number;
    message: string;
  };
  result?: any;
};

// Export the pendingRequests Map
export const pendingRequests = new Map<string, BackgroundPendingRequest>();

// Store for request metadata
const requestMetadata: Map<string, RequestMetadata> = new Map();

// Flag to check if the client is ready so that we can send messages to the client correctly
// let isClientReady = false;

// browser.runtime.onMessage.addListener((message: any): any => {
//   if (message.type === 'clientReady') {
//     isClientReady = true;
//   }
//   return false;
// });

// Add at the top with other imports
const processedBackgroundRequests = new Set<string>();

// Add message queue system
interface QueuedMessage {
  message: YakklMessage;
  port: RuntimePort;
  timestamp: number;
}

const messageQueue: QueuedMessage[] = [];
const MESSAGE_QUEUE_TIMEOUT = 5000; // 5 seconds timeout for queued messages
const PORT_CLEANUP_DELAY = 2000; // 2 seconds delay before port cleanup

// Process message queue
async function processMessageQueue() {
  log.debug('Background: Start - Processing message queue:', false, {
    messageQueueLength: messageQueue.length,
    timestamp: new Date().toISOString()
  });

  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (messageQueue.length > 0) {
      const { message, port, timestamp } = messageQueue[0];

      // Process the message
      await handlePortMessage(message, port);

      // Update port state
      const portId = port.name || `port-${Date.now()}`;
      const portState = activePorts.get(portId);
      if (portState) {
        portState.pendingMessages--;
        portState.lastActivity = Date.now();
      }

      // Remove processed message
      messageQueue.shift();
    }
  } finally {
    isProcessingQueue = false;
  }
}

interface DappRequest {
  type: 'YAKKL_REQUEST:EIP6963';
  id: string;
  method: string;
  params?: any[];
  requiresApproval?: boolean;
}

// Handle port connections
browser.runtime.onConnect.addListener((port: RuntimePort) => {
  const portId = port.name || `port-${Date.now()}`;

  log.debug('Background: Port connected:', false, {
    portId,
    portName: port.name,
    sender: port.sender,
    timestamp: new Date().toISOString()
  });

  // Store the port with state tracking
  activePorts.set(portId, {
    port,
    lastActivity: Date.now(),
    pendingMessages: 0
  });

  // Set up message listener
  port.onMessage.addListener(async (message, port: RuntimePort) => {
    log.debug('Background: Message received:', false, {
      message,
      portId,
      timestamp: new Date().toISOString()
    });

    const portState = activePorts.get(portId);
    if (portState) {
      portState.lastActivity = Date.now();
      portState.pendingMessages++;
    }

    // Process the message immediately
    try {
      if (message && typeof message === 'object') {
        const msg = message as DappRequest;

        if (msg.type === 'YAKKL_REQUEST:EIP6963') {


          try {
            // Handle the request
            // If successful, send a response via the port from onDappListener deeper in the stack

            await handleDappRequest(msg, port);

          } catch (error) {
            log.error('Error handling dapp request:', false, error);
            safePortPostMessage(port, {
              type: 'YAKKL_RESPONSE:EIP6963',
              id: msg.id,
              method: msg.method,
              error: {
                code: -32603,
                message: 'Internal error processing request'
              }
            }, {
              context: 'background-dapp-error',
              onError: (error) => {
                log.warn('[Background] Failed to send dapp error response:', false, { 
                  messageId: msg.id, 
                  method: msg.method,
                  error: error instanceof Error ? error.message : error 
                });
              }
            });
          }


        }

      }
    } catch (error) {
      log.error('Error processing message:', false, error);
      if (message && typeof message === 'object') {
        const msg = message as DappRequest;
        safePortPostMessage(port, {
          type: 'YAKKL_RESPONSE:EIP6963',
          id: msg.id,
          method: msg.method,
          error: {
            code: -32603,
            message: 'Internal error processing request'
          }
        }, {
          context: 'background-message-error',
          onError: (error) => {
            log.warn('[Background] Failed to send message error response:', false, { 
              messageId: msg.id, 
              method: msg.method,
              error: error instanceof Error ? error.message : error 
            });
          }
        });
      }
    } finally {
      if (portState) {
        portState.pendingMessages--;
      }
    }
  });

  // Handle disconnection with delay and cleanup
  port.onDisconnect.addListener(() => {
    log.debug('Port disconnect initiated', false, {
      portId,
      timestamp: new Date().toISOString()
    });

    // Clean up immediately if there are no pending messages
    const portState = activePorts.get(portId);
    if (!portState || portState.pendingMessages === 0) {
      cleanupPort(portId);
    } else {
      // Wait for pending messages to complete
      setTimeout(() => {
        cleanupPort(portId);
      }, 1000); // 1 second delay
    }
  });
});

// Add port cleanup function
function cleanupPort(portId: string) {
  const portState = activePorts.get(portId);
  if (!portState) return;

  log.debug('Port cleanup executing', false, {
    portId,
    pendingMessages: portState.pendingMessages,
    timestamp: new Date().toISOString()
  });

  // Clean up any pending requests for this port
  for (const [id, request] of pendingRequests.entries()) {
    if (request.port === portState.port) {
      pendingRequests.delete(id);
    }
  }

  // Remove the port
  activePorts.delete(portId);
}

// Modify handlePortMessage to track message completion
async function handlePortMessage(message: YakklMessage, port: RuntimePort) {
  const portId = port.name || `port-${Date.now()}`;
  const portState = activePorts.get(portId);

  try {
    // Skip if we've already processed this request
    if (message && typeof message === 'object' && 'id' in message) {
      const messageId = (message as any).id;
      if (processedBackgroundRequests.has(messageId)) {
        log.debug('Background: Skipping duplicate request:', false, {
          requestId: messageId,
          method: (message as any).method
        });
        return;
      }
      processedBackgroundRequests.add(messageId);
    }

    if (!message || typeof message !== 'object') {
      log.warn('Invalid message from port', false, message);
      return;
    }

    // Handle responses from popups
    if (message.type === 'YAKKL_RESPONSE:EIP6963') {
      const { id, result, method, error } = message as YakklResponse;
      const originalRequest = pendingRequests.get(id);

      if (!originalRequest) {
        log.warn('No original request found for response', false, { id });
        return;
      }

      // Forward the response to the original requester safely
      if (originalRequest.port) {
        safePortPostMessage(originalRequest.port, {
          ...message,
          id,
          method: method || originalRequest.data.method,
          jsonrpc: '2.0'
        }, {
          context: 'background-response-forward',
          onError: (error) => {
            log.warn('[Background] Failed to forward response to original requester:', false, { 
              requestId: id,
              method: method || originalRequest.data.method,
              error: error instanceof Error ? error.message : error 
            });
          }
        });
        pendingRequests.delete(id);
      }
      return;
    }

    // Handle requests
    if (message.type === 'YAKKL_REQUEST:EIP6963' || message.type === 'YAKKL_REQUEST:EIP1193') {
      const request = message as YakklRequest;
      const { id, method, params, requiresApproval } = request;
      const origin = port.sender?.url || '';

      try {
        if (requiresApproval) {
          const { showEIP6963Popup } = await import('./eip-6963');
          const activeTab = get(activeTabBackgroundStore);
          const url = activeTab?.url || '';
          const domain = url ? extractSecureDomain(url) : 'NO DOMAIN - NOT ALLOWED';
          const typedParams = Array.isArray(params) ? params : [params];
          const message = method === 'personal_sign' && typedParams[0] ? String(typedParams[0]) : 'Not Available';

          const requestData = {
            id,
            method,
            params: typedParams,
            requiresApproval: true,
            timestamp: Date.now(),
            metaData: {
              method,
              params: typedParams,
              metaData: {
                domain,
                isConnected: await verifyDomainConnected(domain),
                icon: activeTab?.favIconUrl || '/images/failIcon48x48.png',
                title: activeTab?.title || 'Not Available',
                origin: url,
                message
              }
            }
          };

          const fullRequest = {
            resolve: (result: unknown) => {
              safePortPostMessage(port, {
                type: 'YAKKL_RESPONSE:EIP6963',
                jsonrpc: '2.0',
                id,
                result
              }, {
                context: 'background-approval-resolve',
                onError: (error) => {
                  log.warn('[Background] Failed to send approval resolve response:', false, { 
                    requestId: id,
                    error: error instanceof Error ? error.message : error 
                  });
                }
              });
              // if (portState) portState.pendingMessages--;
            },
            reject: (error: Error) => {
              safePortPostMessage(port, {
                type: 'YAKKL_RESPONSE:EIP6963',
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32603,
                  message: error?.message || 'Internal error'
                }
              }, {
                context: 'background-approval-reject',
                onError: (sendError) => {
                  log.warn('[Background] Failed to send approval reject response:', false, { 
                    requestId: id,
                    originalError: error?.message,
                    sendError: sendError instanceof Error ? sendError.message : sendError 
                  });
                }
              });
              if (portState) portState.pendingMessages--;
            },
            port,
            data: requestData
          };

          pendingRequests.set(id, fullRequest);
          const result = await showEIP6963Popup(method, params || []);
          safePortPostMessage(port, {
            type: 'YAKKL_RESPONSE:EIP6963',
            jsonrpc: '2.0',
            method,
            id,
            result
          }, {
            context: 'background-popup-result',
            onError: (error) => {
              log.warn('[Background] Failed to send popup result response:', false, { 
                requestId: id,
                method,
                error: error instanceof Error ? error.message : error 
              });
            }
          });
          if (portState) portState.pendingMessages--;
          return;
        }

        // For non-approval methods, handle directly
        const result = await handleRequest(method, params || [], origin, port, id);
        safePortPostMessage(port, {
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          method,
          id,
          result
        }, {
          context: 'background-direct-result',
          onError: (error) => {
            log.warn('[Background] Failed to send direct result response:', false, { 
              requestId: id,
              method,
              error: error instanceof Error ? error.message : error 
            });
          }
        });
        if (portState) portState.pendingMessages--;
      } catch (error) {
        log.error('Error processing request:', false, error);
        safePortPostMessage(port, {
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: 'Internal error processing request'
          }
        }, {
          context: 'background-request-error',
          onError: (sendError) => {
            log.warn('[Background] Failed to send request error response:', false, { 
              requestId: id,
              originalError: error instanceof Error ? error.message : error,
              sendError: sendError instanceof Error ? sendError.message : sendError 
            });
          }
        });
        if (portState) portState.pendingMessages--;
      }
    }
  } catch (error) {
    log.error('Error in handlePortMessage:', false, error);
    if (portState) portState.pendingMessages--;
  }
}

// Helper function to check if method requires approval
function requiresApproval(method: string): boolean {
  const approvalMethods = [
    'eth_requestAccounts',
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sign',
    'personal_sign',
    'eth_signTypedData_v4',
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_watchAsset'
  ];
  return approvalMethods.includes(method);
}

// Get provider instance
async function getProvider() {
  return getAlchemyProvider(); // Add other providers here
}

async function handleRequest(method: string, params: any[], origin: string, port?: Runtime.Port, requestId?: string) {
  try {
    const yakklCurrentlySelectedData = await getCurrentlySelectedData();

  log.debug('Processing request:', false, {
    method,
    params,
    origin,
    yakklCurrentlySelectedData,
    timestamp: new Date().toISOString()
  });

  // Handle methods that should be handled by YAKKL directly
  switch (method) {
    case 'eth_chainId':
      return yakklCurrentlySelectedData?.chainId || '0x1';
    case 'eth_accounts': // TODO: This is a hack to get the accounts for the current domain. We should not be doing this.
      // For eth_accounts, use the original implementation

      // Check if the domain is connected
      const domain = extractSecureDomain(origin);
      const isConnected = await verifyDomainConnected(domain);
      if (!isConnected) {
        return [];
      }

      return await getAddressesForDomain(domain);
    case 'eth_requestAccounts': {
      try {
        return await handleRequestAccounts(port, requestId);
      } catch (error) {
        log.error('Error using EIP-6963 implementation for eth_requestAccounts:', false, error);
        throw error;
      }
    }

    case 'net_version': {
      const chainId = yakklCurrentlySelectedData?.chainId;
      if (!chainId) return '1';

      // Handle both string and number chainId formats
      const chainIdStr = typeof chainId === 'string' ? chainId : `0x${chainId.toString(16)}`;
      return parseInt(chainIdStr.replace('0x', ''), 16).toString();
    }
  }

    // For other methods, delegate to the network provider
    const provider = await getProvider();
    return provider.request({ method, params });
  } catch (error) {
    log.error('Error handling request:', false, error);
    throw error;
  }
}

// Helper function to get a user-friendly description of a method
function getMethodDescription(method: string): string {
  switch (method) {
    case 'eth_requestAccounts':
      return 'connect to your wallet';
    case 'eth_sendTransaction':
      return 'send a transaction';
    case 'eth_sign':
    case 'personal_sign':
    case 'eth_signTypedData_v4':
      return 'sign a message';
    case 'wallet_switchEthereumChain':
      return 'switch networks';
    case 'wallet_addEthereumChain':
      return 'add a new network';
    case 'wallet_watchAsset':
      return 'add a token to your wallet';
    default:
      return 'perform an action';
  }
}

// Send events to all connected ports
function broadcastEvent(eventName: string, data: any, type: string = 'YAKKL_EVENT:EIP6963') {
  const event = {
    type,
    event: eventName,
    data
  };
  // Send to all ports safely
  for (const port of ports.values()) {
    safePortPostMessage(port, event, {
      context: `broadcast-${eventName}`,
      onError: (error) => {
        log.warn('[Background] Failed to broadcast event:', false, { 
          eventName,
          type,
          portName: port.name,
          error: error instanceof Error ? error.message : error 
        });
      }
    });
  }
}

// When we get ready to add other providers, we can use this function to setup the events for each provider
// function setupAllProviderEvents() {
//   const providers = [getAlchemyProvider(), getInfuraProvider(), getCustomProvider()];
//   for (const provider of providers) {
//     provider.on('accountsChanged', ...);
//     // ... other events
//   }
// }

// Set up event listeners for provider events
function setupProviderEvents() {
  const provider = getAlchemyProvider(); // Add other providers here

  // Listen for account changes
  provider.on('accountsChanged', (accounts: string[]) => {
    broadcastEvent('accountsChanged', accounts);
    broadcastEvent('accountsChanged', accounts, 'YAKKL_EVENT:EIP1193');
  });

  // Listen for chain changes
  provider.on('chainChanged', (chainId: string) => {
    broadcastEvent('chainChanged', chainId);
    broadcastEvent('chainChanged', chainId, 'YAKKL_EVENT:EIP1193');
  });

  // Listen for connect events
  provider.on('connect', (connectInfo: { chainId: string }) => {
    broadcastEvent('connect', connectInfo);
    broadcastEvent('connect', connectInfo, 'YAKKL_EVENT:EIP1193');
  });

  // Listen for disconnect events
  provider.on('disconnect', (error: { code: number; message: string }) => {
    broadcastEvent('disconnect', error);
    broadcastEvent('disconnect', error, 'YAKKL_EVENT:EIP1193');
  });

  // Listen for message events
  provider.on('message', (message: { type: string; data: unknown }) => {
    broadcastEvent('message', message);
    broadcastEvent('message', message, 'YAKKL_EVENT:EIP1193');
  });
}

// Initialize background script
function initialize() {
  // Set up provider events
  setupProviderEvents();

  // Clean up old pending requests periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, request] of pendingRequests.entries()) {
      // Remove requests older than 45 seconds
      if (now - request?.data?.timestamp > 45000) {
        log.warn('Removing stale request', false, {
          id,
          method: request.data.method,
          age: now - request.data.timestamp
        });
        pendingRequests.delete(id);
      }
    }
  }, 20000);
}

// Start the background script
initialize();

// Initialize on startup
async function initializeOnStartup() {
  try {
    // Add extension listeners
    addBackgroundListeners();
    browser.alarms.onAlarm.addListener(onAlarmListener);

    // Initialize default storage values first
    initializeStorageDefaults();

    // Initialize KeyManager first
    // await initializeKeyManager(); // Will come back to this when focusing on security

    // Initialize permissions system
    initializePermissions();

    // Initialize EIP-6963 handler
    initializeEIP6963();

    await watchLockedState(2 * 60 * 1000);

    // Migrate legacy storage to secure storage test
    // const store = new SecureStore('wallet', await getMemoizedKey(tmp_getMemoizedKey));

    // await migrateToSecureStorage<YakklCurrentlySelectedInterface>(
    //   'yakklCurrentlySelected',
    //   store,
    //   'yakklCurrentlySelected.secure',
    //   [
    //     'shortcuts.address',
    //     'shortcuts.smartContract',
    //     'preferences.locale',
    //     'shortcuts.networks.*.chainId'
    //   ]
    // );
  } catch (error) {
    log.error('Failed to initialize background script', true, error);
  }
}

await initializeOnStartup(); // Initial setup on load or reload. Alarm and State need to be set up quickly so they are here

try {
  if (browser) {
    // Set the active tab on startup
    const tabs = await browser.tabs.query({ active: true }); //, currentWindow: true });
    if (tabs.length > 0) {
      const realTab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
      const win = await browser.windows.get(realTab.windowId);
      let activeTab: ActiveTab | null = {
        tabId: realTab.id,
        windowId: realTab.windowId,
        windowType: win.type,
        url: realTab.url,
        title: realTab.title,
        favIconUrl: realTab.favIconUrl,
        dateTime: new Date().toISOString()
      };

      if (activeTab.tabId === 0) activeTab = null;
      if (activeTab?.windowType === 'normal') {
        activeTabBackgroundStore.set(activeTab);
        activeTabUIStore.set(activeTab);
        await browser.storage.local.set({['activeTabBackground']: activeTab});
      }

      try {
        const backgroundUIConnected = get(backgroundUIConnectedStore);
      } catch (error) {
        // silent
        log.error('Error setting active tab 1:', false, error);
      }
    }
  } else {
    activeTabBackgroundStore.set(null);
    activeTabUIStore.set(null);
  }
} catch (error) {
  log.error('Error setting active tab 2:', false, error);
}

// Moved here for now
export async function onRuntimeMessageBackgroundListener(
  message: any,
  sender: RuntimeSender
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
          log.error('Error opening side panel:', true, err);
          return { success: false, error: err };
        }
      }

      case 'popout': {
        log.debug('popout:', false, message);
        showPopup('');
        return { success: true };
      }

      default: {
        // Not handled by this listener
        return undefined;
      }
    }
  } catch (error: any) {
    log.error('Error handling message:', true, error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred.'
    };
  }
}

// unused at the moment
export async function onSuspendListener() {
  try {
    log.info('onSuspendListener');
    globalListenerManager.removeAll();
  } catch (error) {
    log.error('Background: onSuspendListener:', false, error);
  }
}

/**
 * Determine if we're in a development environment
 * This method checks multiple possible indicators since NODE_ENV might be inconsistent
 */
function isDevelopmentEnvironment(): boolean {
  // Check multiple possible indicators for development mode
  return (
    // Standard NODE_ENV check
    (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') ||
    // Vite-specific development indicator
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === true) ||
    // Check for DEV_MODE flag that might be set in your build process
    (typeof process !== 'undefined' && process.env && process.env.DEV_MODE === 'true')
  );
}

/**
 * Initialize the KeyManager
 */
async function initializeKeyManager(): Promise<void> {
  try {
    const keyManager = await KeyManager.getInstance();

    // Log environment details for debugging
    log.info('Environment details:', false, {
      NODE_ENV: process.env.NODE_ENV,
      isDev: isDevelopmentEnvironment(),
      availableEnvKeys: process.env ? Object.keys(process.env).filter(key =>
        key.includes('API_KEY') || key.includes('ALCHEMY') || key.includes('INFURA') || key.includes('BLOCKNATIVE')
      ) : []
    });

    // Skip direct key setup - it's better to allow empty keys than to use incorrect values
    // KeyManager.getKey will now return empty strings instead of undefined for missing keys

    // Log available keys for debugging
    const keyStatus = keyManager.getKeyStatus();

    // Explicitly log full key details (development only)
    if (isDevelopmentEnvironment()) {
      try {
        log.info('Logging detailed key information...');
        keyManager.debugLogKeys();
      } catch (error) {
        log.error('Failed to log key details', false, error);
      }
    }
  } catch (error) {
    log.error('Failed to initialize KeyManager', false, error);
  }
}

// Map security levels to iframe injection settings
const SECURITY_LEVEL_IFRAME_SETTINGS = {
  [SecurityLevel.HIGH]: {
    injectIframes: false,
    description: 'No iframe injection (highest security)'
  },
  [SecurityLevel.MEDIUM]: {
    injectIframes: true,
    description: 'Inject into trusted domains only (balanced security)'
  },
  [SecurityLevel.STANDARD]: {
    injectIframes: true,
    description: 'Inject into all non-null origin frames (dApp compatible)'
  }
} as const;

async function updateSecurityConfig(securityLevel: SecurityLevel) {
  try {
    // Get all tabs
    const tabs = await browser.tabs.query({});

    // Get iframe settings based on security level
    const iframeSettings = SECURITY_LEVEL_IFRAME_SETTINGS[securityLevel];

    // Send the update to each tab
    for (const tab of tabs) {
      if (tab.id) {
        await browser.tabs.sendMessage(tab.id, {
          type: 'YAKKL_SECURITY_CONFIG_UPDATE',
          securityLevel,
          injectIframes: iframeSettings.injectIframes
        });
      }
    }

    log.debug('Security configuration updated across all tabs', false, {
      securityLevel,
      iframeSettings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    log.error('Failed to update security configuration:', false, error);
  }
}

// browser.tabs.sendMessage(tabId, {
//   type: 'YAKKL_SECURITY_CONFIG_UPDATE',
//   securityLevel: 2, // Change to strict mode
//   injectIframes: false // Disable iframe injection
// });

// Helper function to handle dapp requests
async function handleDappRequest(msg: DappRequest, port: RuntimePort) {
  try {
    // Process the request based on the method
    switch (msg.method) {
      // case 'get_params':
      //   // Handle get_params request
      //   const request = requestManager.getRequest(msg.id);
      //   if (request) {
      //     port.postMessage({
      //       type: 'YAKKL_RESPONSE:EIP6963',
      //       id: msg.id,
      //       method: msg.method,
      //       result: request
      //     });
      //   } else {
      //     port.postMessage({
      //       type: 'YAKKL_RESPONSE:EIP6963',
      //       id: msg.id,
      //       method: msg.method,
      //       result: { params: [] }
      //     });
      //   }
      //   break;
      default:

        // Forward other requests to the appropriate handler
        await onDappListener(msg, port);

        break;
    }
  } catch (error) {
    log.error('Error in handleDappRequest:', false, error);
    throw error;
  }
}

// Export types that are needed by other modules
export type { RuntimePort };

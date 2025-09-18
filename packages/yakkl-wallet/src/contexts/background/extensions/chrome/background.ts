/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Background actions for the extension...

// Import the index to register all handlers properly
// This ensures STORE_SESSION_HASH and other handlers work correctly
import '../../index';

import { initializeEIP6963, handleRequestAccounts, showEIP6963Popup } from './eip-6963';

import { 
  addBackgroundListeners,
  backgroundListenerManager,
  onInstalledUpdatedListener,
  onYakklPageListener,
  onExternalMessageListener
} from '$lib/common/listeners/background/backgroundListeners';
import { 
  onPortConnectListener, 
  onPortDisconnectListener 
} from '$lib/common/listeners/background/portListeners';
import {
  onTabActivatedListener,
  onTabRemovedListener,
  onTabUpdatedListener,
  onWindowsFocusChangedListener
} from '$lib/common/listeners/background/tabListeners';
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
import { BackgroundIntervalService } from '$lib/services/background-interval.service';
import { BackgroundPriceService } from '$lib/services/background/BackgroundPriceService';
import { BackgroundTransactionService } from '$lib/services/background-transaction.service';
import { IdleManager } from '$lib/managers/IdleManager';
import { backgroundManager } from '$lib/managers/BackgroundManager';
import { getYakklSettings } from '$lib/common/stores';
import { AuthHandler } from '../../handlers/auth.handler';

type RuntimeSender = Runtime.MessageSender;
type RuntimePort = Runtime.Port;

// NOTE: This can only be used in the background context

// CRITICAL: Register a basic message listener IMMEDIATELY to ensure messages can be received
// This runs synchronously at module load time - EXACTLY like the test that worked
// Use chrome directly since that's what worked in the test
// REMOVED: This listener was causing duplicate popups
// The 'popout' message is already handled by unifiedMessageListener.ts
// Having two handlers for the same message type was causing two popup windows
// All message handling should go through the unified message handling system

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
if (browser?.runtime?.onConnect) {
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
}

// Add port cleanup function
function cleanupPort(portId: string) {
  const portState = activePorts.get(portId);
  if (!portState) return;

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

    // Handle refresh requests
    if (message.type === 'YAKKL_REFRESH_REQUEST') {
      const { refreshType = 'all' } = message as any;

      log.info('[Background] Handling refresh request:', false, refreshType);

      try {
        const intervalService = BackgroundIntervalService.getInstance();
        await intervalService.handleManualRefresh(refreshType);

        // Send success response
        safePortPostMessage(port, {
          type: 'YAKKL_REFRESH_RESPONSE',
          success: true,
          refreshType
        }, {
          context: 'refresh-response',
          onError: (error) => {
            log.warn('[Background] Failed to send refresh response:', false, error);
          }
        });
      } catch (error) {
        log.error('[Background] Error handling refresh request:', false, error);

        // Send error response
        safePortPostMessage(port, {
          type: 'YAKKL_REFRESH_RESPONSE',
          success: false,
          error: error instanceof Error ? error.message : 'Refresh failed',
          refreshType
        }, {
          context: 'refresh-error-response'
        });
      }

      return;
    }

    // Handle force price update requests
    if (message.type === 'FORCE_PRICE_UPDATE') {
      log.info('[Background] Force price update requested');

      try {
        const priceService = BackgroundPriceService.getInstance();
        await priceService.updatePricesAndValues();

        // Send success response
        safePortPostMessage(port, {
          type: 'PRICE_UPDATE_RESPONSE',
          success: true
        }, {
          context: 'price-update-response',
          onError: (error) => {
            log.error('[Background] Failed to send price update response:', false, error);
          }
        });
      } catch (error) {
        log.error('[Background] Error handling price update request:', false, error);

        // Send error response
        safePortPostMessage(port, {
          type: 'PRICE_UPDATE_RESPONSE',
          success: false,
          error: error instanceof Error ? error.message : 'Price update failed'
        }, {
          context: 'price-update-error'
        });
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
          // Use statically imported showEIP6963Popup
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
  const provider = getAlchemyProvider(); // TODO: Add other providers here

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
    // Listeners will be added in main initialization after all APIs are ready
    // Don't add them here as browser APIs may not be fully available yet
    if (browser?.alarms?.onAlarm) {
      browser.alarms.onAlarm.addListener(onAlarmListener);
    }

    // Initialize default storage values first
    initializeStorageDefaults();

    // Initialize KeyManager first
    // await initializeKeyManager(); // Will come back to this when focusing on security

    // Initialize permissions system
    initializePermissions();

    // Initialize AuthHandler for JWT management
    try {
      AuthHandler.initialize();
      log.info('[Background] AuthHandler initialized');
    } catch (error) {
      log.error('[Background] Failed to initialize AuthHandler:', false, error);
    }

    // EIP-6963 will be initialized in the async startup block when all APIs are ready

    // Initialize BackgroundManager for port communication
    try {
      await backgroundManager.initialize();
    } catch (error) {
      log.error('[Background] Failed to initialize BackgroundManager:', false, error);
    }

    // Initialize background interval service for data fetching
    try {
      const intervalService = BackgroundIntervalService.getInstance();
      await intervalService.initialize();
    } catch (error) {
      log.error('[Background] Failed to initialize interval service:', false, error);
    }

    // BackgroundPriceService is initialized by BackgroundIntervalService
    // No separate initialization needed - it's coordinated through the interval service

    // Initialize background transaction service for fetching transaction history
    try {
      const transactionService = BackgroundTransactionService.getInstance();
      await transactionService.start();
    } catch (error) {
      log.error('[Background] Failed to start transaction service:', false, error);
    }

    // Initialize IdleManager with system-wide monitoring
    // Wrap in setTimeout to avoid blocking initial startup
    setTimeout(async () => {
      try {
        const settings = await getYakklSettings();
        if (settings?.idleSettings?.enabled !== false) { // Default to enabled
          const idleManager = IdleManager.initialize({
            width: 'system-wide',
            threshold: (settings?.idleSettings?.detectionMinutes || 2) * 60 * 1000,
            lockDelay: (settings?.idleSettings?.graceMinutes || 1) * 60 * 1000,
            checkInterval: 15000
          });
        }
      } catch (error) {
        log.error('[Background] Failed to initialize IdleManager (non-blocking):', false, error);
        // Don't throw - let the extension continue working
      }
    }, 1000); // Delay by 1 second to let everything else initialize first

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

// Browser APIs are guaranteed to be available immediately with static imports
// No need for waitForBrowserAPIs function - webextension-polyfill is loaded synchronously

// Handle extension action button clicks
if (browser?.action?.onClicked) {
  browser.action.onClicked.addListener(async () => {
    log.info('[Background] Extension action button clicked');
    try {
      await showPopup('', '0', 'internal');
    } catch (error) {
      log.error('[Background] Failed to show popup on action click:', false, error);
    }
  });
}

// Initialization is handled at the end of the file
// Removed duplicate initialization block

// Function to set active tab - will be called after initialization
async function setActiveTabOnStartup() {
  try {
    if (browser?.tabs?.query) {
      // Set the active tab on startup
      const tabs = await browser.tabs.query({ active: true }); //, currentWindow: true });
      if (tabs.length > 0) {
        const realTab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
        if (realTab && browser?.windows?.get) {
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
            if (browser?.storage?.local) {
              await browser.storage.local.set({['activeTabBackground']: activeTab});
            }
          }
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

      // Removed duplicate popout handler - handled in unifiedMessageListener

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
  try {
    // Check for webpack-defined DEV_MODE
    // @ts-ignore
    if (typeof DEV_MODE !== 'undefined') {
      // @ts-ignore
      return DEV_MODE === true || DEV_MODE === 'true';
    }

    // Check for __DEV__ flag
    // @ts-ignore
    if (typeof __DEV__ !== 'undefined') {
      // @ts-ignore
      return __DEV__ === true;
    }

    // Standard NODE_ENV check
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Fallback: check if we're in a local extension environment
    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getManifest) {
      const manifest = browser.runtime.getManifest();
      return !!(manifest.name && (manifest.name.includes('dev') || manifest.name.includes('Dev')));
    }

    return false;
  } catch (e) {
    // If any check fails, assume production
    return false;
  }
}

/**
 * Initialize the KeyManager
 */
async function initializeKeyManager(): Promise<void> {
  try {
    const keyManager = await KeyManager.getInstance();

    // Log environment details for debugging
    // log.info('Environment details:', false, {
    //   NODE_ENV: process.env.NODE_ENV,
    //   isDev: isDevelopmentEnvironment(),
    //   availableEnvKeys: process.env ? Object.keys(process.env).filter(key =>
    //     key.includes('API_KEY') || key.includes('ALCHEMY') || key.includes('INFURA') || key.includes('BLOCKNATIVE')
    //   ) : []
    // });

    // Skip direct key setup - it's better to allow empty keys than to use incorrect values
    // KeyManager.getKey will now return empty strings instead of undefined for missing keys

    // Log available keys for debugging
    const keyStatus = keyManager.getKeyStatus();

    // Explicitly log full key details (development only)
    if (isDevelopmentEnvironment()) {
      try {
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


// Initialize the background script
(async () => {
  try {
    // Browser APIs are guaranteed to be available with static imports of webextension-polyfill
    // No need to wait or check - they're available immediately
    // Initialize core services first
    await initializeOnStartup();

    // Initialize background listeners
    // IMPORTANT: We need some background listeners BUT we must avoid duplicate message handling
    // The safeMessageHandler in index.ts already handles browser.runtime.onMessage
    // So we'll add the other listeners manually without the duplicate onMessage handler
    
    // Add only the non-conflicting listeners from backgroundListeners
    // DO NOT add browser.runtime.onMessage listener (already handled by index.ts)
    if (browser?.runtime?.onMessageExternal) {
      backgroundListenerManager.add(browser.runtime.onMessageExternal, onYakklPageListener);
      backgroundListenerManager.add(browser.runtime.onMessageExternal, onExternalMessageListener);
    }
    
    if (browser?.runtime?.onInstalled) {
      backgroundListenerManager.add(browser.runtime.onInstalled, onInstalledUpdatedListener);
    }
    
    if (browser?.runtime?.onConnect) {
      backgroundListenerManager.add(browser.runtime.onConnect, onPortConnectListener);
      backgroundListenerManager.add(browser.runtime.onConnect, onPortDisconnectListener);
    }
    
    if (browser?.tabs?.onActivated) {
      backgroundListenerManager.add(browser.tabs.onActivated, onTabActivatedListener);
    }
    
    if (browser?.tabs?.onUpdated) {
      backgroundListenerManager.add(browser.tabs.onUpdated, onTabUpdatedListener);
    }
    
    if (browser?.tabs?.onRemoved) {
      backgroundListenerManager.add(browser.tabs.onRemoved, onTabRemovedListener);
    }
    
    if (browser?.windows?.onFocusChanged) {
      backgroundListenerManager.add(browser.windows.onFocusChanged, onWindowsFocusChangedListener);
    }

    // Initialize other services
    await initializeStorageDefaults();
    initializePermissions();
    await watchLockedState(30000); // Check every 30 seconds
    await initializeKeyManager();

    // Initialize EIP-6963 support (safe to call - will check for API availability)
    try {
      initializeEIP6963();
    } catch (error) {
      log.warn('[Background] EIP-6963 initialization deferred:', false, error);
    }

    // Set up alarm listener
    if (browser?.alarms?.onAlarm) {
      browser.alarms.onAlarm.addListener(onAlarmListener);
    }

    // Set the active tab after initialization
    await setActiveTabOnStartup();
  } catch (error) {
    log.error('[Background] Initialization failed:', false, error);
  }
})();

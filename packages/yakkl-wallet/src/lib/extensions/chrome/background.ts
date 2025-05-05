/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Background actions for the extension...
import { ensureProcessPolyfill } from '$lib/common/process';
ensureProcessPolyfill();

import { initializeEIP6963, handleRequestAccounts, getCurrentlySelectedData } from './eip-6963';
import { addBackgroundListeners } from '$lib/common/listeners/background/backgroundListeners';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { log } from '$lib/plugins/Logger';
import browser from 'webextension-polyfill';
import { onAlarmListener } from '$lib/common/listeners/background/alarmListeners';
import type { Runtime } from 'webextension-polyfill';
import { activeTabBackgroundStore, activeTabUIStore, backgroundUIConnectedStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import { type ActiveTab, type YakklCurrentlySelected } from '$lib/common';
import { initializePermissions } from '$lib/permissions';
import { initializeStorageDefaults, watchLockedState } from '$lib/common/backgroundUtils';
import { KeyManager } from '$lib/plugins/KeyManager';
import { getObjectFromLocalStorage } from '$lib/common/backgroundSecuredStorage';
import { SecurityLevel } from '$lib/permissions/types';
import { getAlchemyProvider } from '$lib/plugins/providers/network/ethereum_provider/alchemy';
import type { PendingRequestData, RequestMetadata, YakklMessage, YakklRequest, YakklResponse } from '$lib/common/interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from '$lib/common/constants';
import { showPopup } from './ui';
import { ensureEipId } from '$lib/common/id-generator';
import { extractSecureDomain } from '$lib/common/security';
import { verifyDomainConnected } from '$lib/extensions/chrome/verifyDomainConnected';
import { yakklCurrentlySelected } from '$lib/models/dataModels';

type RuntimeSender = Runtime.MessageSender;
type RuntimePort = Runtime.Port;

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

// Handle port connections
browser.runtime.onConnect.addListener((port: RuntimePort) => {
  const portId = port.name || `port-${Date.now()}`;
  // Store the port
  ports.set(portId, port);

  // Set up message listener
  port.onMessage.addListener((message, port: RuntimePort) => {
    handlePortMessage(message as YakklMessage, port);
  });

  // Handle disconnection
  port.onDisconnect.addListener(() => {
    log.debug('Port disconnected', false, {
      portId,
      timestamp: new Date().toISOString()
    });

    // Remove the port
    ports.delete(portId);

    // Clean up any pending requests for this port
    for (const [id, request] of pendingRequests.entries()) {
      if (request.port === port) {
        pendingRequests.delete(id);
      }
    }
  });
});

// Handle messages from ports
async function handlePortMessage(message: YakklMessage, port: RuntimePort) {
  if (!message || typeof message !== 'object') {
    log.warn('Invalid message from port', false, message);
    return;
  }

  // Handle responses from popups
  if (message.type === 'YAKKL_RESPONSE:EIP6963') {
    const { id, result, method, error } = message as YakklResponse;

    log.debug('Processing response from popup', false, {
      id,
      result,
      method,
      error,
      timestamp: new Date().toISOString()
    });

    // Find the original request
    const originalRequest = pendingRequests.get(id);
    if (!originalRequest) {
      log.warn('No original request found for response', false, { id });
      return;
    }

    log.info('----------- Background (handlePortMessage): Original request: ------------', false, {
      originalRequest: originalRequest
    });

    // Forward the response to the original requester
    if (originalRequest.port) {
      log.debug('Forwarding response to original requester', false, {
        id,
        message: message,
        method: method,
        port: originalRequest.port.name,
        timestamp: new Date().toISOString()
      });

      // Ensure the response includes the method from the original request
      const responseMethod = method || originalRequest.data.method;
      originalRequest.port.postMessage({
        ...message,
        id,
        method: responseMethod,
        jsonrpc: '2.0'
      });

      log.debug('----------- Background (handlePortMessage): Pending requests: ------------', false, {
        pendingRequests: pendingRequests,
        id,
        originalRequest: originalRequest
      });

      pendingRequests.delete(id);
    } else {
      log.warn('Original request port not found', false, { id });
    }
    return;
  }

  // Handle requests
  if (message.type === 'YAKKL_REQUEST:EIP6963' || message.type === 'YAKKL_REQUEST:EIP1193') {
    const request = message as YakklRequest;
    const { id, method, params, requiresApproval } = request;

    // Get the origin from the port sender if available
    const origin = port.sender?.url || '';

    log.debug('Processing request', false, {
      id,
      method,
      params,
      port,
      requiresApproval,
      origin,
      timestamp: new Date().toISOString()
    });

    try {
      // For methods that require approval, use the EIP-6963 implementation
      if (requiresApproval) {
        try {
          // Import the showEIP6963Popup function from eip-6963.ts
          const { showEIP6963Popup } = await import('./eip-6963');

          const activeTab = get(activeTabBackgroundStore);
          const url = activeTab?.url || '';
          const domain = url ? extractSecureDomain(url) : 'NO DOMAIN - NOT ALLOWED';

          // Ensure params is an array and properly typed
          const typedParams = Array.isArray(params) ? params : [params];
          const message = method === 'personal_sign' && typedParams[0] ? String(typedParams[0]) : 'Not Available';

          // Create the request data without non-serializable properties
          const requestData: Omit<PendingRequestData, 'resolve' | 'reject' | 'port'> = {
            id,
            method,
            params: typedParams,
            requiresApproval: true,
            timestamp: Date.now(),
            metaData: {
              method: method,
              params: typedParams,
              metaData: {
                domain: domain,
                isConnected: await verifyDomainConnected(domain),
                icon: activeTab?.favIconUrl || '/images/failIcon48x48.png',
                title: activeTab?.title || 'Not Available',
                origin: url,
                message: message
              }
            }
          };

          log.debug('----------- Background (handlePortMessage): Request data: ------------', false, {
            requestData: requestData
          });

          // Create the full request with non-serializable properties
          const fullRequest: BackgroundPendingRequest = {
            resolve: (result) => {
              port.postMessage({
                type: 'YAKKL_RESPONSE:EIP6963',
                jsonrpc: '2.0',
                id,
                result
              });
            },
            reject: (error) => {
              port.postMessage({
                type: 'YAKKL_RESPONSE:EIP6963',
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32603,
                  message: error?.message || 'Internal error'
                }
              });
            },
            port: port as Runtime.Port,
            data: requestData as PendingRequestData
          };

          pendingRequests.set(id, fullRequest);

          log.debug('----------- Background (handlePortMessage): Pending requests: ------------', false, {
            pendingRequests: pendingRequests,
            id,
            fullRequest: fullRequest
          });

          // Use the EIP-6963 implementation to handle the request
          const result = await showEIP6963Popup(method, params || [], port, id);

          log.debug('----------- Background (handlePortMessage): Result: ------------', false, {
            result: result,
            id,
            port: port
          });

          // Send the response back to the port
          port.postMessage({
            type: 'YAKKL_RESPONSE:EIP6963',
            jsonrpc: '2.0',
            method: method,
            id,
            result
          });
          return;
        } catch (error) {
          log.error('Error handling EIP-6963 request:', false, error);
          throw error;
        }
      }

      // For non-approval methods, handle directly
      const result = await handleRequest(method, params || [], origin, port, id);
      port.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        method: method,
        id,
        result
      });
    } catch (error) {
      log.error('Error handling request:', false, error);
      port.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        method: method,
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      });
    }
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
  // const yakklCurrentlySelected = await getObjectFromLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED) as YakklCurrentlySelected;
  const yakklCurrentlySelectedData = await getCurrentlySelectedData();

  log.debug('Processing request:', false, {
    method,
    params,
    origin,
    yakklCurrentlySelected,
    timestamp: new Date().toISOString()
  });

  // Handle methods that should be handled by YAKKL directly
  switch (method) {
    case 'eth_chainId':
      return yakklCurrentlySelectedData?.chainId || '0x1';
    case 'eth_accounts':
      // For eth_accounts, use the original implementation
      const address = yakklCurrentlySelectedData?.address;
      if (address && address !== '0x0000000000000000000000000000000000000000') {
        return [address];
      }
      // Return empty array if no valid address
      return [];

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
  // Send to all ports
  for (const port of ports.values()) {
    port.postMessage(event);
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

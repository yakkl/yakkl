/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Background actions for the extension...

import { initializeEIP6963 } from './eip-6963';

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
import { getMemoizedKey, migrateToSecureStorage, SecureStore, getObjectFromLocalStorage } from '$lib/common/backgroundSecuredStorage';
import { SecurityLevel } from '$lib/permissions/types';
import { getAlchemyProvider } from '$lib/plugins/providers/network/ethereum_provider/alchemy';
import { ProviderRpcError } from '$lib/common';
import type { PendingRequest, RequestMetadata, YakklCurrentlySelected as YakklCurrentlySelectedInterface, YakklMessage, YakklRequest, YakklResponse } from '$lib/common/interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from '$lib/common/constants';
import { browser_ext } from '$lib/common/environment';
import { openPopups } from '$lib/common/reload';
import { showExtensionPopup } from '$lib/extensions/chrome/ui';
import { showPopup } from './ui';
import { generateEipId, ensureEipId } from '$lib/common/id-generator';

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
type BackgroundPendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  method: string;
  params: any[];
  timestamp: number;
  port: RuntimePort;
};

// Export the pendingRequests Map
export const pendingRequests = new Map<string, BackgroundPendingRequest>();

// Store for request metadata
const requestMetadata: Map<string, RequestMetadata> = new Map();

// Handle port connections
browser.runtime.onConnect.addListener((port: RuntimePort) => {
  const portId = port.name || `port-${Date.now()}`;

  log.debug('New port connection', false, {
    portId,
    timestamp: new Date().toISOString()
  });

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

  log.debug('Received message from port', false, {
    message,
    timestamp: new Date().toISOString()
  });

  // Handle responses from popups
  if (message.type === 'YAKKL_RESPONSE:EIP6963') {
    const { id, result, error } = message as YakklResponse;
    const requestId = ensureEipId(id);

    log.debug('Processing response from popup', false, {
      id: requestId,
      result,
      error,
      timestamp: new Date().toISOString()
    });

    // Find the original request
    const originalRequest = pendingRequests.get(requestId);
    if (!originalRequest) {
      log.warn('No original request found for response', false, { id: requestId });
      return;
    }

    // Forward the response to the original requester
    if (originalRequest.port) {
      log.debug('Forwarding response to original requester', false, {
        id: requestId,
        port: originalRequest.port.name,
        timestamp: new Date().toISOString()
      });
      originalRequest.port.postMessage({ ...message, id: requestId });
      pendingRequests.delete(requestId);
    } else {
      log.warn('Original request port not found', false, { id: requestId });
    }
    return;
  }

  // Handle requests
  if (message.type === 'YAKKL_REQUEST:EIP6963' || message.type === 'YAKKL_REQUEST:EIP1193') {
    const request = message as YakklRequest;
    const { id, method, params, requiresApproval } = request;
    const requestId = ensureEipId(id);

    // Get the origin from the port sender if available
    const origin = port.sender?.url || '';

    log.debug('Processing request', false, {
      id: requestId,
      method,
      params,
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

          // Use the EIP-6963 implementation to handle the request
          const result = await showEIP6963Popup(method, params || [], requestId);

          log.debug('handlePortMessage - EIP-6963 popup result', false, { result, requestId, method, params });

          // Send the response back to the port
          port.postMessage({
            type: 'YAKKL_RESPONSE:EIP6963',
            jsonrpc: '2.0',
            id: requestId,
            result
          });
          log.info('handlePortMessage - Posted');
          return;
        } catch (error) {
          log.error('Error using EIP-6963 implementation for request:', false, error);

          // Fallback to the original implementation if the EIP-6963 implementation fails
          const result = await handleRequest(method, params || [], origin);

          // Send the response back to the port
          port.postMessage({
            type: 'YAKKL_RESPONSE:EIP6963',
            jsonrpc: '2.0',
            id: requestId,
            result
          });
          return;
        }
      } else {
        // For methods that don't require approval, use the original implementation
        const result = await handleRequest(method, params || [], origin);

        // Send the response back to the port
        port.postMessage({
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          id: requestId,
          result
        });
      }
    } catch (error: any) {
      log.error('Error processing request', false, error);

      // Send the error back to the port
      port.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        id: requestId,
        error: {
          code: -32603,
          message: error?.message || 'Internal error'
        }
      });
    }
  }
}

// Helper function to get request origin
// function getRequestOrigin(request: any, sender?: Runtime.MessageSender): string {
//   try {
//     if (sender?.url) {
//       return new URL(sender.url).origin;
//     }
//     if (request?.origin) {
//       return request.origin;
//     }
//     return 'unknown-origin';
//   } catch (error) {
//     log.error('Error getting request origin:', false, error);
//     return 'unknown-origin';
//   }
// }

// Helper function to check if method requires approval

function requiresApproval(method: string): boolean {
  const approvalMethods = [
    'eth_requestAccounts',
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'wallet_addEthereumChain',
    'wallet_switchEthereumChain',
    'wallet_watchAsset'
  ];
  return approvalMethods.includes(method);
}

// Get provider instance
async function getProvider() {
  return getAlchemyProvider();
}

async function handleRequest(method: string, params: any[], origin: string) {
  const yakklCurrentlySelected = await getObjectFromLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED) as YakklCurrentlySelected;

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
      return yakklCurrentlySelected?.shortcuts?.chainId || '0x1';
    case 'eth_accounts':
      // For eth_accounts, use the original implementation
      const address = yakklCurrentlySelected?.shortcuts?.address;
      log.debug('eth_accounts:', false, {
        address,
        yakklCurrentlySelected,
        timestamp: new Date().toISOString()
      });
      if (address && address !== '0x0000000000000000000000000000000000000000') {
        return [address];
      }
      // Return empty array if no valid address
      return [];

    case 'eth_requestAccounts': {
      // Use the EIP-6963 implementation for handling eth_requestAccounts
      if (method === 'eth_requestAccounts') {
        try {
          log.debug('background - Processing eth_requestAccounts request', false, { method, params });
          // Import the handleRequestAccounts function from eip-6963.ts
          const { handleRequestAccounts } = await import('./eip-6963');

          // Use the EIP-6963 implementation to handle the request
          return await handleRequestAccounts();
        } catch (error) {
          log.error('Error using EIP-6963 implementation for eth_requestAccounts:', false, error);
          throw error; // Let the error propagate to the caller
        }
      }
      return [];
    }

    case 'net_version': {
      const chainId = yakklCurrentlySelected?.shortcuts?.chainId;
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
// function getMethodDescription(method: string): string {
//   switch (method) {
//     case 'eth_requestAccounts':
//       return 'connect to your wallet';
//     case 'eth_sendTransaction':
//       return 'send a transaction';
//     case 'eth_sign':
//     case 'personal_sign':
//     case 'eth_signTypedData_v4':
//       return 'sign a message';
//     case 'wallet_switchEthereumChain':
//       return 'switch networks';
//     case 'wallet_addEthereumChain':
//       return 'add a new network';
//     case 'wallet_watchAsset':
//       return 'add a token to your wallet';
//     default:
//       return 'perform an action';
//   }
// }

// Send events to all connected ports
function broadcastEvent(eventName: string, data: any, type: string = 'YAKKL_EVENT:EIP6963') {
  const event = {
    type,
    event: eventName,
    data
  };

  log.debug('Broadcasting event', false, {
    event: eventName,
    type,
    data,
    ports: ports.size,
    timestamp: new Date().toISOString()
  });

  // Send to all ports
  for (const port of ports.values()) {
    port.postMessage(event);
  }
}

// Set up event listeners for provider events
function setupProviderEvents() {
  const provider = getAlchemyProvider();

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

  log.debug('Background script initialized', false);
}

// Start the background script
initialize();

// Initialize on startup
async function initializeOnStartup() {
  try {
    log.info('Initializing background script...');

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

    log.info('Background script initialized successfully');
  } catch (error) {
    log.error('Failed to initialize background script', true, error);
  }
}

await initializeOnStartup(); // Initial setup on load or reload. Alarm and State need to be set up quickly so they are here

try {
  if (browser) {
    // Set the active tab on startup
    const tabs = await browser.tabs.query({ active: true }); //, currentWindow: true });
    log.debug('Active tabs:', false, tabs);

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

      log.debug('Added active tab:', false, get(activeTabBackgroundStore));
      try {
        const backgroundUIConnected = get(backgroundUIConnectedStore);
        log.debug('Background UI connected:', false, backgroundUIConnected);
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

try {
  if (browser) {
    if (!browser.runtime.onMessage.hasListener(onRuntimeMessageBackgroundListener)) {
      browser.runtime.onMessage.addListener(onRuntimeMessageBackgroundListener);
    }
    // if (!browser.runtime.onConnect.hasListener(onConnectBackgroundUIListener)) {
    //   browser.runtime.onConnect.addListener(onConnectBackgroundUIListener);
    // }
    // if (!browser.runtime.onConnect.hasListener(onDisconnectBackgroundUIListener)) {
    //   browser.runtime.onConnect.addListener(onDisconnectBackgroundUIListener);
    // }
  }
} catch (error) {
  log.error('background - onMessage error', true, error);
}


// Moved here for now
export async function onRuntimeMessageBackgroundListener(
  message: any,
  sender: RuntimeSender,
  sendResponse: (response?: any) => void
): Promise<boolean | void> {
  try {
    // NOTE: There is another one that addresses specific UI related messages

    log.debug('onRuntimeMessageBackgroundListener:', false, message);
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
                windowType: win.type, // 'normal', 'popup', etc.
                url: realTab.url,
                title: realTab.title,
                favIconUrl: realTab.favIconUrl,
                dateTime: new Date().toISOString()
              };
            }
          }

          log.debug('getActiveTab - Active tab:', false, activeTab);

          if (activeTab && activeTab.tabId) {
            sendResponse({ success: true, activeTab: activeTab });
          } else {
            log.error('No active tab found:', true);
            sendResponse({ success: false, error: 'No active tab found.' });
          }
        } catch (err) {
          log.error('Error opening side panel:', true, err);
          sendResponse({ success: false, error: err });
        }
        return true;
      }
      case 'popout': {
        log.debug('popout:', false, message);
        showPopup('');
        return true;
      }
      default: {
        sendResponse({ success: false, error: 'Unknown message type.' });
        return true;
      }
    }
  } catch (error: any) {
    log.error('Error handling message:', true, error);
    sendResponse({ success: false, error: error?.message || 'Unknown error occurred.' });
    return true; // Indicate asynchronous response
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
    const keyManager = KeyManager.getInstance();

    // Log environment details for debugging
    log.info('Environment details:', false, {
      NODE_ENV: process.env.NODE_ENV,
      isDev: isDevelopmentEnvironment(),
      availableEnvKeys: process.env ? Object.keys(process.env).filter(key =>
        key.includes('API_KEY') || key.includes('ALCHEMY') || key.includes('INFURA') || key.includes('BLOCKNATIVE')
      ) : []
    });

    // Try normal initialization
    try {
      log.info('Initializing KeyManager...');
      await keyManager.initialize();
      log.info('KeyManager initialized successfully');
    } catch (error: any) {
      if (error?.message?.includes('background context')) {
        log.warn('Forcing background initialization as fallback');
        // Force initialize using reflection to bypass the check for testing
        (keyManager as any)._forceInitializeInBackground();
      } else {
        throw error;
      }
    }

    // Skip direct key setup - it's better to allow empty keys than to use incorrect values
    // KeyManager.getKey will now return empty strings instead of undefined for missing keys

    // Log available keys for debugging
    const keyStatus = keyManager.getKeyStatus();
    log.info('KeyManager initialized with keys:', false, keyStatus);

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

// Add message listener for side panel content updates
browser.runtime.onMessage.addListener((
  message: unknown,
  sender: Runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => {
  const typedMessage = message as { type: string; url: string };
  if (typedMessage.type === 'UPDATE_SIDEPANEL_CONTENT') {
    // Get all views of type 'side_panel'
    browser_ext.extension.getViews({ type: 'tab' }).forEach((view: Window) => {
      // Send the update message to each side panel view
      view.postMessage({
        type: 'UPDATE_CONTENT',
        url: typedMessage.url
      }, '*');
    });
  }
  return true; // Keep the message channel open for async response
});

export async function showDappPopupWithFavicon(request: string) {
  try {
    const height = request.includes('approve.html') ? 620 :
                   request.includes('transactions.html') ? 620 :
                   request.includes('accounts.html') ? 550 : 500;

    log.info('showDappPopup <<< - 186 (ui-inside):', false, {request, height});

    // Get the active tab to get the favicon
    const tabs = await browser.tabs.query({ active: true });
    const activeTab = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
    const favicon = activeTab?.favIconUrl;

    // Add favicon to the request URL if available
    if (favicon) {
      const url = new URL(request, 'chrome-extension://' + browser.runtime.id);
      url.searchParams.set('favicon', favicon);
      request = url.pathname + url.search;
    }

    showExtensionPopup(360, height, request).then(async (window) => {
      if (window?.id) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        browser_ext.windows.update(window.id, {drawAttention: true});
        openPopups.set('popupId', window.id);
      }
    }).catch((error) => {
      log.error('Background - YAKKL:', false, error);
    });
  } catch (error) {
    log.error('Background - showDappPopup:', false, error);
  }
}

// Update the showDappPopup function to use showDappPopupWithFavicon
export async function showDappPopup(request: string) {
  return showDappPopupWithFavicon(request);
}

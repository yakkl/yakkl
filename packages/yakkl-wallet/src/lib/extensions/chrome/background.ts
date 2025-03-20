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

import { activeTabBackgroundStore, backgroundUIConnectedStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import { type ActiveTab } from '$lib/common';
import { initializePermissions } from '$lib/permissions';
import { initializeStorageDefaults, watchLockedState } from '$lib/common/backgroundUtils';
import { KeyManager } from '$lib/plugins/KeyManager';

type RuntimeSender = Runtime.MessageSender;

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

// Initialize on startup
async function initialize() {
  try {
    log.info('Initializing background script...');

    // Add extension listeners
    addBackgroundListeners();
    browser.alarms.onAlarm.addListener(onAlarmListener);

    // Initialize default storage values first
    initializeStorageDefaults();

    // log.warn('Alchemy API Key:', false, process.env.VITE_ALCHEMY_API_KEY_PROD);
    // log.warn('Infura API Key:', false, process.env.VITE_INFURA_API_KEY_WEB3P);
    // log.warn('Etherscan API Key:', false, process.env.VITE_ETHERSCAN_API_KEY);

    // Initialize KeyManager first
    // await initializeKeyManager(); // Will come back to this when focusing on security

    // Initialize permissions system
    initializePermissions();

    // Initialize EIP-6963 handler
    initializeEIP6963();

    await watchLockedState(5 * 60 * 1000);

    log.info('Background script initialized successfully');
  } catch (error) {
    log.error('Failed to initialize background script', true, error);
  }
}

await initialize(); // Initial setup on load or reload. Alarm and State need to be set up quickly so they are here

try {
  if (browser) {
    // Set the active tab on startup
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    log.debug('Active tabs:', false, tabs);

    if (tabs.length > 0) {
      const window = await browser.windows.get(tabs[0].windowId);
      let activeTab: ActiveTab | null = {
        tabId: tabs[0].id ?? 0,
        windowId: tabs[0].windowId ?? 0,
        windowType: window.type ?? '',
        url: tabs[0].url ?? '',
        title: tabs[0].title ?? '',
        favIconUrl: tabs[0].favIconUrl ?? ''
      };

      if (activeTab.tabId === 0) activeTab = null;

      if (activeTab.windowType === 'normal') {
        activeTabBackgroundStore.set(activeTab);
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

// Just an example that needs to go on account changes and network changes: Just the broadcastToEIP6963Ports functions
// Update state in storage
// Update UI
// Notify legacy providers

// Also notify EIP-6963 providers
// broadcastToEIP6963Ports('accountsChanged', [address]);
// broadcastToEIP6963Ports('chainChanged', `0x${chainId.toString(16)}`);


// Moved here for now
export async function onRuntimeMessageBackgroundListener(
  message: any,
  sender: RuntimeSender,
  sendResponse: (response?: any) => void
): Promise<boolean | void> {
  try {
    // NOTE: There is another one that addresses specific UI related messages

    switch (message.type) {
      case 'getActiveTab': {
        try {
          const activeTab = get(activeTabBackgroundStore);
          log.debug('getActiveTab - Active tabs:', false, activeTab);
          sendResponse({ success: true, activeTab: activeTab }); // GetActiveTabResponse format
        } catch (err) {
          log.error('Error querying tabs:', true, err);
          sendResponse({ success: false, error: err });
        }
        return true; // Keep this line to signal async sendResponse
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
    // Check for DEV_DEBUG flag that might be set in your build process
    (typeof process !== 'undefined' && process.env && process.env.DEV_DEBUG === 'true')
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

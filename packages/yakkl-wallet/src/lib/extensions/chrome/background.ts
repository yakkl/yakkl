/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// Background actions for the extension...

import { initializeEIP6963 } from './eip-6963';
import { initializeApiKeys } from './legacy';
// import { BackgroundStorageHandler } from './background-storage-handler';

import { addBackgroundListeners } from '$lib/common/listeners/background/backgroundListeners';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { log } from '$lib/plugins/Logger';
import browser from 'webextension-polyfill';
import { onAlarmListener } from '$lib/common/listeners/background/alarmListeners';
import type { Runtime } from 'webextension-polyfill';

import { activeTabBackgroundStore, backgroundUIConnectedStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import { getObjectFromLocalStorage, STORAGE_YAKKL_CURRENTLY_SELECTED, type ActiveTab } from '$lib/common';
import type { YakklCurrentlySelected } from '$lib/common/interfaces';
import { initializePermissions } from '$lib/permissions';
import { keyManager } from '$lib/plugins/KeyManager';

const browser_ext = browser;

type RuntimeSender = Runtime.MessageSender;

// NOTE: This is a workaround for how Chrome handles alarms, listeners, and state changes in the background
//  It appears that if the extension is suspended, the idle listener may not be triggered
//  This workaround sets up a periodic check to ensure the state is updated
//  If the devtools are open, the extension is not suspended and works as expected but, Chrome seems to be
//  more aggressive when devtools is not open

// UPDATE: Moved idle timer to the IdleManager plugin and for anything needed to always be active while the UI is active
// IdleManager is UI context only and is not used in the background context

// Initialize on startup
async function initialize() {
  try {
    // Initialize storage handler
    // BackgroundStorageHandler.getInstance();

    if (browser_ext) {
      if (!browser_ext.alarms.onAlarm.hasListener(onAlarmListener)) {
        browser_ext.alarms.onAlarm.addListener(onAlarmListener);
      }
    }

    // Chrome specific
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

    if (browser_ext) {
      // Ensure initialization happens at key points
      browser_ext.runtime.onStartup.addListener(initialize);
      browser_ext.runtime.onInstalled.addListener(initialize);
    }

    // Initialize KeyManager first
    await keyManager.initialize();

    // Initialize API keys first
    initializeApiKeys();

    // Initialize permissions system
    await initializePermissions();

    // Initialize EIP-6963 handler
    initializeEIP6963();

    log.info('Background script initialized successfully');
  } catch (error) {
    log.error('Failed to initialize background script', true, error);
  }
}

initialize(); // Initial setup on load or reload. Alarm and State need to be set up quickly so they are here

addBackgroundListeners();

try {
  if (browser_ext) {
    // Set the active tab on startup
    const tabs = await browser_ext.tabs.query({ active: true, currentWindow: true });
    log.debug('Active tabs:', false, tabs);

    if (tabs.length > 0) {
      const window = await browser_ext.windows.get(tabs[0].windowId);
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
        await browser_ext.storage.local.set({['activeTabBackground']: activeTab});
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
  if (browser_ext) {
    if (!browser_ext.runtime.onMessage.hasListener(onRuntimeMessageBackgroundListener)) {
      browser_ext.runtime.onMessage.addListener(onRuntimeMessageBackgroundListener);
    }

    // if (!browser_ext.runtime.onConnect.hasListener(onConnectBackgroundUIListener)) {
    //   browser_ext.runtime.onConnect.addListener(onConnectBackgroundUIListener);
    // }
    // if (!browser_ext.runtime.onConnect.hasListener(onDisconnectBackgroundUIListener)) {
    //   browser_ext.runtime.onConnect.addListener(onDisconnectBackgroundUIListener);
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

// Define safe methods that can work with defaults
const SAFE_METHODS = new Set([
  'eth_chainId',
  'eth_accounts',
  'eth_requestAccounts', // Initially returns empty array if wallet locked
  'net_version', // Can work with default chainId
]);

// Get current wallet state
async function getWalletState(): Promise<YakklCurrentlySelected | null> {
  return await getObjectFromLocalStorage<YakklCurrentlySelected>(STORAGE_YAKKL_CURRENTLY_SELECTED);
}

// Handle wallet-specific requests
async function handleWalletRequest(method: string, params: unknown[]): Promise<unknown> {
  // This should be implemented based on your wallet's capabilities
  throw new Error('Method not implemented: ' + method);
}

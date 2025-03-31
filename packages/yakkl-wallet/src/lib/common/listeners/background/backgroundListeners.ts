// listeners/backgroundListeners.ts
import { ListenerManager } from '$lib/plugins/ListenerManager';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { openPopups, openWindows } from '$lib/common/reload';
import { initializeDatabase } from '$lib/extensions/chrome/database';
import { yakklStoredObjects } from '$lib/models/dataModels';
import { setObjectInLocalStorage } from '$lib/common/storage';
import { setLocalObjectStorage } from '$lib/extensions/chrome/storage';
import { loadDefaultTokens } from '$lib/plugins/tokens/loadDefaultTokens';
import { VERSION } from '$lib/common/constants';
import { onRuntimeMessageListener } from './runtimeListeners';
import { onPortConnectListener, onPortDisconnectListener } from './portListeners';
import { onTabActivatedListener, onTabRemovedListener, onTabUpdatedListener, onWindowsFocusChangedListener } from './tabListeners';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { log } from '$lib/plugins/Logger';

const browser_ext = browser;

type RuntimePlatformInfo = Runtime.PlatformInfo;

export const backgroundListenerManager = new ListenerManager();

export async function onInstalledUpdatedListener( details: Runtime.OnInstalledDetailsType ): Promise<void> {
  try {
    if (!browser_ext) return;
    if (typeof chrome !== "undefined" && chrome.sidePanel) {
      // Set the panel behavior to NOT open on action click
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }); // Default to false
      const isSidepanel = process.env.VITE_IS_SIDEPANEL === 'true' ? true : false;
      // const isPopup = process.env.VITE_IS_POPUP === 'true' ? true : false;
      if (isSidepanel) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); // Override default to true
      }

      chrome.runtime.onMessage.addListener((message: any, _sender: any, _sendResponse: any  ) => {
      if (message.type === "SET_PANEL_BEHAVIOR") {
        chrome.sidePanel.setPanelBehavior({
          openPanelOnActionClick: !!message.open
        });
      }
      });
    }

    const platform: RuntimePlatformInfo = await browser_ext.runtime.getPlatformInfo();

    openWindows.clear();
    openPopups.clear();

    if ( details && details.reason === "install") {
      // This only happens on initial install to set the defaults
      yakklStoredObjects.forEach(async (element) => {
        try {
          await setObjectInLocalStorage(element.key, element.value);
        } catch (error) {
          log.error(`Error setting default for ${element.key}:`, false, error);
        }
      });

      await initializeDatabase(false);

      await browser_ext.runtime.setUninstallURL(encodeURI("https://yakkl.com?userName=&utm_source=yakkl&utm_medium=extension&utm_campaign=uninstall&utm_content=" + `${VERSION}` + "&utm_term=extension"));
      await setLocalObjectStorage(platform, false);
    }

    if (details && details.reason === "update") {
      if (details.previousVersion !== browser_ext.runtime.getManifest().version) {
        await initializeDatabase(true); // This will clear the db and then import again
        await setLocalObjectStorage(platform, false); // After 1.0.0, upgrades will be handled.
      }
    }

    // Add default tokens
    loadDefaultTokens();
  } catch (e) {
    log.error(e);
  }
}

export function onEthereumListener(event: any) {
  try {
    // log.debug('Background:', `yakkl-eth port: ${event}`);
  } catch (error) {
    log.error('Background: onEthereumListener', false, error);
  }
}

// Register backgroundListenerManager globally
globalListenerManager.registerContext('background', backgroundListenerManager);

// TODO: Review these against background.ts
export function addBackgroundListeners() {
  if (!browser_ext) return;

  // These check to see if already added and if so, remove and re-add
  backgroundListenerManager.add(browser_ext.runtime.onMessage, onRuntimeMessageListener);
  backgroundListenerManager.add(browser_ext.runtime.onInstalled, onInstalledUpdatedListener);
  backgroundListenerManager.add(browser_ext.runtime.onConnect, onPortConnectListener);
  backgroundListenerManager.add(browser_ext.runtime.onConnect, onPortDisconnectListener);

  backgroundListenerManager.add(browser_ext.tabs.onActivated, onTabActivatedListener);
  backgroundListenerManager.add(browser_ext.tabs.onUpdated, onTabUpdatedListener);
  backgroundListenerManager.add(browser_ext.tabs.onRemoved, onTabRemovedListener);
  backgroundListenerManager.add(browser_ext.windows.onFocusChanged, onWindowsFocusChangedListener);

  // These are now handled in the UI due to the new architecture
  // backgroundListenerManager.add(browser_ext.alarms.onAlarm, onAlarmListener);
  // backgroundListenerManager.add(browser_ext.idle.onStateChanged, onStateChangedListener);
}

export function removeBackgroundListeners() {
  backgroundListenerManager.removeAll();
}

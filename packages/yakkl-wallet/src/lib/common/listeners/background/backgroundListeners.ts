// listeners/backgroundListeners.ts
import { ListenerManager } from '$lib/plugins/ListenerManager';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { openWindows } from '$lib/common/reload';
import { initializeBlacklistDatabase } from '$lib/extensions/chrome/database';
import { yakklStoredObjects } from '$lib/models/dataModels';
import { setObjectInLocalStorage } from '$lib/common/storage';
import { setLocalObjectStorage } from '$lib/extensions/chrome/storage';
import { loadDefaultTokens } from '$lib/plugins/tokens/loadDefaultTokens';
import { VERSION } from '$lib/common/constants';
import { onPortConnectListener, onPortDisconnectListener } from './portListeners';
import { onTabActivatedListener, onTabRemovedListener, onTabUpdatedListener, onWindowsFocusChangedListener } from './tabListeners';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { log } from '$lib/plugins/Logger';
import { openPopups } from '$lib/extensions/chrome/ui';
import { onUnifiedMessageListener} from './unifiedMessageListener';

type RuntimePlatformInfo = Runtime.PlatformInfo;

export const backgroundListenerManager = new ListenerManager('background');

export async function onInstalledUpdatedListener( details: Runtime.OnInstalledDetailsType ): Promise<void> {
  try {
    // Add default tokens
    try {
      await loadDefaultTokens();
    } catch (error) {
      log.warn('Background: loading default tokens:', false, error);
    }

    // This portion only works in Chrome
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
        return false;
      });
    }

    const platform: RuntimePlatformInfo = await browser.runtime.getPlatformInfo();

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

      await initializeBlacklistDatabase(false);

      await browser.runtime.setUninstallURL(encodeURI("https://yakkl.com?userName=&utm_source=yakkl&utm_medium=extension&utm_campaign=uninstall&utm_content=" + `${VERSION}` + "&utm_term=extension"));
      await setLocalObjectStorage(platform, false);
    }

    if (details && details.reason === "update") {
      if (details.previousVersion !== browser.runtime.getManifest().version) {
        await initializeBlacklistDatabase(true); // This will clear the db and then import again
        await setLocalObjectStorage(platform, false); // After 1.0.0, upgrades will be handled.
      }
    }

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

export function addBackgroundListeners() {
  // These check to see if already added and if so, remove and re-add
  backgroundListenerManager.add(browser.runtime.onMessage, onUnifiedMessageListener);

  backgroundListenerManager.add(browser.runtime.onInstalled, onInstalledUpdatedListener);
  backgroundListenerManager.add(browser.runtime.onConnect, onPortConnectListener);
  backgroundListenerManager.add(browser.runtime.onConnect, onPortDisconnectListener);

  backgroundListenerManager.add(browser.tabs.onActivated, onTabActivatedListener);
  backgroundListenerManager.add(browser.tabs.onUpdated, onTabUpdatedListener);
  backgroundListenerManager.add(browser.tabs.onRemoved, onTabRemovedListener);
  backgroundListenerManager.add(browser.windows.onFocusChanged, onWindowsFocusChangedListener);
}

// Decide if this is needed
// browser.runtime.onMessage.addListener((
//   message: unknown,
//   sender: Runtime.MessageSender,
//   sendResponse: (response?: unknown) => void
// ): any => {
//   const typedMessage = message as { type: string; url: string };
//   if (typedMessage.type === 'UPDATE_SIDEPANEL_CONTENT') {
//     // Get all views of type 'side_panel'
//     browser.extension.getViews({ type: 'tab' }).forEach((view: Window) => {
//       // Send the update message to each side panel view
//       view.postMessage({
//         type: 'UPDATE_CONTENT',
//         url: typedMessage.url
//       }, '*');
//     });
//   }
//   return false;
// });

export function removeBackgroundListeners() {
  backgroundListenerManager.removeAll();
}

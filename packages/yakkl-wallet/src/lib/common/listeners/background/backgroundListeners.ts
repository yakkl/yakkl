// listeners/backgroundListeners.ts
import { ListenerManager } from '$lib/managers/ListenerManager';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { initializeBlacklistDatabase } from '$contexts/background/extensions/chrome/database';
import { yakklStoredObjects } from '$lib/models/dataModels';
import { setObjectInLocalStorage } from '$lib/common/storage';
import { setLocalObjectStorage } from '$contexts/background/extensions/chrome/storage';
import { loadDefaultTokens } from '$lib/managers/tokens/loadDefaultTokens';
import { VERSION } from '$lib/common/constants';
import { onPortConnectListener, onPortDisconnectListener } from './portListeners';
import {
	onTabActivatedListener,
	onTabRemovedListener,
	onTabUpdatedListener,
	onWindowsFocusChangedListener
} from './tabListeners';
import { globalListenerManager } from '$lib/managers/GlobalListenerManager';
import { log } from '$lib/managers/Logger';
import { openWindows } from '$contexts/background/extensions/chrome/ui';
import { onUnifiedMessageListener } from './unifiedMessageListener';
import { isYakklPage } from '$lib/common/isYakklPage';
import { browser_ext } from '$lib/common/environment';

type RuntimePlatformInfo = Runtime.PlatformInfo;

export const backgroundListenerManager = new ListenerManager('background');

export async function onInstalledUpdatedListener(
	details: Runtime.OnInstalledDetailsType
): Promise<void> {
	try {
		// Add default tokens
		try {
			await loadDefaultTokens();
		} catch (error) {
			log.warn('Background: loading default tokens:', false, error);
		}

		// This portion only works in Chrome
		if (typeof chrome !== 'undefined' && chrome.sidePanel) {
			log.info('Background: chrome.sidePanel is defined');
			// Set the panel behavior to NOT open on action click
			// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }); // Default to false
			const isSidepanel = process.env.VITE_IS_SIDEPANEL === 'true' ? true : false;
			// const isPopup = process.env.VITE_IS_POPUP === 'true' ? true : false;
			// if (isSidepanel) {
			chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); // Override default to true
			// }

			// chrome.runtime.onMessage.addListener((message: any, _sender: any, _sendResponse: any  ) => {
			//   if (message.type === "SET_PANEL_BEHAVIOR") {
			//     chrome.sidePanel.setPanelBehavior({
			//       openPanelOnActionClick: !!message.open
			//     });
			//   }
			//   return false;
			// });
		}

		const platform: RuntimePlatformInfo = await browser.runtime.getPlatformInfo();

		openWindows.clear();
		// openPopups.clear();

		if (details && details.reason === 'install') {
			// This only happens on initial install to set the defaults
			yakklStoredObjects.forEach(async (element) => {
				try {
					await setObjectInLocalStorage(element.key, element.value);
				} catch (error) {
					log.error(`Error setting default for ${element.key}:`, false, error);
				}
			});

			await initializeBlacklistDatabase(false);

			await browser.runtime.setUninstallURL(
				encodeURI(
					'https://yakkl.com?userName=&utm_source=yakkl&utm_medium=extension&utm_campaign=uninstall&utm_content=' +
						`${VERSION}` +
						'&utm_term=extension'
				)
			);
			await setLocalObjectStorage(platform, false);
		}

		if (details && details.reason === 'update') {
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

// Example on how to open the side panel from an external message
// On your website - the site will need to be whitelisted in the manifest.json AND the user will need to have the extension installed. The site will need to use MDN browser APIs or chrome.* APIs to send messages to the extension.
// function openSidePanelViaExtension() {
//   const extensionId = 'extension-id-here';
//   / You can also use browser.runtime.sendMessage(extensionId, {
//   /   action: 'openSidePanel'
//   / }, (response) => {
//   /   if (response?.success) {
//   /     console.log('Sidepanel opened!');
//   /   } else {
//   /     console.log('Failed to open sidepanel:', response?.error);
//   /   }
//   / });
//   chrome.runtime.sendMessage(extensionId, {
//     action: 'openSidePanel'
//   }, (response) => {
//     if (response?.success) {
//       console.log('Sidepanel opened!');
//     } else {
//       console.log('Failed to open sidepanel:', response?.error);
//     }
//   });
// }

// / Must be triggered by user interaction
// document.getElementById('openPanelBtn').addEventListener('click', openSidePanelViaExtension);

export async function onYakklPageListener(
	message: any,
	sender: Runtime.MessageSender & { port?: Runtime.Port }
): Promise<any> {
	try {
		switch (message.type) {
			case 'openSidePanel': {
				// Can only open if user gesture triggered this message - opens the side panel
				chrome.sidePanel
					.open({
						tabId: sender.tab.id
					})
					.then(() => {
						log.debug('Background: onYakklPageListener: openSidePanel', false);
					})
					.catch((error) => {
						log.error('Background: onYakklPageListener: openSidePanel', false, error);
					});
				return true;
			}

			case 'CLEAR_ALL_ENHANCED_ALERTS': {
				// Clear all notifications at once
				if (browser_ext?.notifications) {
					await browser_ext.notifications.getAll().then((notifications: Record<string, any>) => {
						Object.keys(notifications).forEach((id) => {
							browser_ext.notifications.clear(id);
						});
					});
				}

				// Clear badge and icon
				if (browser_ext?.action) {
					await browser_ext.action.setBadgeText({ text: '' });
					await browser_ext.action.setIcon({
						path: {
							16: '/images/logoBullFav16x16.png',
							32: '/images/logoBullFav32x32.png',
							48: '/images/logoBullFav48x48.png',
							96: '/images/logoBullFav96x96.png',
							128: '/images/logoBullFav128x128.png'
						}
					});
				}

				return true;
			}

			default: {
				return false;
			}
		}
	} catch (error) {
		console.error('Error handling Yakkl page message:', error);
		return false;
	}
}

export async function onExternalMessageListener(
	message: any,
	sender: Runtime.MessageSender & { port?: Runtime.Port }
): Promise<any> {
	try {
		if (isYakklPage()) {
			log.debug('Background: onExternalMessageListener: isYakklPage', false);
			return onYakklPageListener(message, sender);
		}

		log.debug('Background: onExternalMessageListener', false, { message, sender });
	} catch (error) {
		log.error('Background: onExternalMessageListener', false, error);
	}
}

// Register backgroundListenerManager globally
globalListenerManager.registerContext('background', backgroundListenerManager);

export function addBackgroundListeners() {
	// These check to see if already added and if so, remove and re-add
	backgroundListenerManager.add(browser.runtime.onMessage, onUnifiedMessageListener);

	backgroundListenerManager.add(browser.runtime.onMessageExternal, onYakklPageListener);
	backgroundListenerManager.add(browser.runtime.onMessageExternal, onExternalMessageListener);

	backgroundListenerManager.add(browser.runtime.onInstalled, onInstalledUpdatedListener);
	backgroundListenerManager.add(browser.runtime.onConnect, onPortConnectListener);
	backgroundListenerManager.add(browser.runtime.onConnect, onPortDisconnectListener);

	backgroundListenerManager.add(browser.tabs.onActivated, onTabActivatedListener);
	backgroundListenerManager.add(browser.tabs.onUpdated, onTabUpdatedListener);
	backgroundListenerManager.add(browser.tabs.onRemoved, onTabRemovedListener);
	backgroundListenerManager.add(browser.windows.onFocusChanged, onWindowsFocusChangedListener);
}

// Originally used to update the side panel content from the background script triggered by the wallet popup.
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

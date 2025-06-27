// import { isBrowserEnv, browser_ext } from '$lib/common/environment';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { startLockIconTimer, stopLockIconTimer } from '$lib/extensions/chrome/iconTimer';
import { setIconLock, setIconUnlock } from '$lib/utilities/utilities';
import { log } from '$lib/managers/Logger';

type RuntimeSender = Runtime.MessageSender;

// These functions are used to add and remove listeners for the extension EXCEPT for the window listeners and any other listeners that may be specific to a given component or whatever.

export async function onRuntimeMessageListener(message: any, sender: RuntimeSender): Promise<any> {
	try {
		if (!browser) {
			return { success: false, error: 'Browser API not available' };
		}

		log.info('runtimeListeners - onRuntimeMessageListener:', false, message);

		switch (message.type) {
			case 'ping': {
				return { success: true, message: 'Pong' };
			}

			case 'clipboard-timeout': {
				// Start the timeout but return immediately
				setTimeout(async () => {
					try {
						browser.scripting.executeScript({
							target: { tabId: message.tabId },
							func: async () => {
								try {
									await navigator.clipboard.writeText(message.redactText);
								} catch (error) {
									log.error('Failed to write to clipboard:', false, error);
								}
							}
						});
					} catch (error) {
						log.error('Failed to write to clipboard:', false, error);
					}
				}, message.timeout);

				return { success: true, message: 'Clipboard timeout scheduled' };
			}

			case 'createNotification': {
				const { notificationId, title, messageText } = message.payload;

				// Testing to see where this may have come from
				if (title === 'Security Notification') {
					return { success: false, message: 'Security Notification canceled' };
				}

				await browser.notifications.create(notificationId as string, {
					type: 'basic',
					iconUrl: browser.runtime.getURL('/images/logoBullLock48x48.png'),
					title: title || 'Notification',
					message: messageText || 'Default message.'
				});

				return { success: true, message: 'Notification sent' };
			}

			case 'startLockIconTimer': {
				startLockIconTimer();
				return { success: true, message: 'Lock icon timer started.' };
			}

			case 'stopLockIconTimer': {
				stopLockIconTimer();
				return { success: true, message: 'Lock icon timer stopped.' };
			}

			case 'setIconLock': {
				await setIconLock();
				return { success: true, message: 'Lock icon set.' };
			}

			case 'setIconUnlock': {
				await setIconUnlock();
				return { success: true, message: 'Unlock icon set.' };
			}

			default: {
				return undefined;
			}
		}
	} catch (error: any) {
		log.error('Error handling message:', false, error);
		return {
			success: false,
			error: error?.message || 'Unknown error occurred.'
		};
	}
}

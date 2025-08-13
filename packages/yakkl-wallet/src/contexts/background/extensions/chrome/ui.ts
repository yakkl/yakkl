import { STORAGE_YAKKL_PREFERENCES, STORAGE_YAKKL_SETTINGS } from '$lib/common/constants';
import type { Preferences, YakklSettings } from '$lib/common/interfaces';
import type { Windows } from 'webextension-polyfill';
import browser from 'webextension-polyfill';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { log } from '$lib/common/logger-wrapper';
// import type { ExtendedBrowser } from '$lib/common/types/browser-extensions';
import { SingletonWindowManager } from '$lib/managers/SingletonWindowManager';
import { quickAuthCheck } from '$lib/common/authValidation';
import { getYakklSettings } from '$lib/common/stores';
import { popupSecurityManager } from '$lib/managers/PopupSecurityManager';

// NOTE: For background usage
type WindowsWindow = Windows.Window;

export const openWindows = new Map();

// export const openPopups = new Map();

export async function showExtensionPopup(
	popupWidth = 428,
	popupHeight = 926,
	url: string, // This should be undefined, null or ''
	pinnedLocation: string = '0'
): Promise<WindowsWindow> {
	try {
		// Uses the default 'get' here
		const pref = (await browser.storage.local.get(STORAGE_YAKKL_PREFERENCES)) as {
			yakklPreferences: Preferences;
		};
		const yakkl = pref['yakklPreferences'] as Preferences;
		// eslint-disable-next-line prefer-const, @typescript-eslint/no-unused-vars
		let { left, top } = await browser.windows.getCurrent();

		// Pull from settings and get pin information...
		if (yakkl && yakkl.wallet) {
			popupWidth = yakkl.wallet.popupWidth;
			popupHeight = yakkl.wallet.popupHeight;

			const screenWidth = yakkl.screenWidth;
			const screenHeight = yakkl.screenHeight;

			try {
				// eslint-disable-next-line no-constant-condition
				if (yakkl.wallet.pinned) {
					switch (
						pinnedLocation === '0' || !pinnedLocation ? yakkl.wallet.pinnedLocation : pinnedLocation
					) {
						case 'TL':
							top = 0;
							left = 0;
							break;
						case 'TR':
							top = 0;
							left = screenWidth <= popupWidth ? 0 : screenWidth - popupWidth;
							break;
						case 'BL':
							top = screenHeight <= popupWidth ? 0 : screenHeight - popupHeight;
							left = 0;
							break;
						case 'BR':
							top = screenHeight <= popupWidth ? 0 : screenHeight - popupHeight;
							left = yakkl.screenWidth - popupWidth;
							break;
						case 'M':
							top = screenHeight <= popupHeight ? 0 : screenHeight / 2 - popupHeight / 2;
							left = screenWidth <= popupWidth ? 0 : screenWidth / 2 - popupWidth / 2;
							break;
						default:
							// x,y specific location
							// eslint-disable-next-line no-case-declarations
							const coord = yakkl.wallet.pinnedLocation.split(',');
							if (coord) {
								left = parseInt(coord[0]) <= 0 ? 0 : parseInt(coord[0]);
								top = parseInt(coord[1]) <= 0 ? 0 : parseInt(coord[1]);
							} else {
								left = 0;
								top = 0;
							}
							break;
					}
				}
			} catch (error) {
				log.error('Error setting pinned location', false, error);
				left = 0;
				top = 0;
			}
		} else {
			top = 0;
			left = 0;
		}

		// Use the URL as-is
		let finalUrl = url || 'index.html';
		const fullUrl = browser.runtime.getURL(finalUrl);

		log.info('showExtensionPopup: Creating window', false, {
			finalUrl,
			fullUrl,
			type: 'popup',
			left,
			top,
			width: popupWidth,
			height: popupHeight,
			focused: true
		});

		try {
			const window = await browser.windows.create({
				url: fullUrl,
				type: 'popup',
				left: left,
				top: top,
				width: popupWidth,
				height: popupHeight,
				focused: true
			});

			log.info('showExtensionPopup: Window created successfully', false, {
				windowId: window?.id,
			});

			return window;
		} catch (error) {
			log.error('showExtensionPopup: Failed to create window', false, {
				error: error instanceof Error ? error.message : error,
				errorStack: error instanceof Error ? error.stack : undefined,
				finalUrl,
				fullUrl
			});
			throw error;
		}
	} catch (error) {
		log.error('Error in showExtensionPopup', false, error);
		return Promise.reject(); // May want to do something else here.
	}
}

// export async function showPopupOld(url: string = '', pinnedLocation: string = '0'): Promise<void> {
// 	try {
// 		// Perform comprehensive authentication validation
// 		const isAuthenticated = await quickAuthCheck();

// 		// If not authenticated, redirect to appropriate page
// 		if (!isAuthenticated) {
// 			// const settings = await getSettings();
//       const settings = await getObjectFromLocalStorage<Settings>(STORAGE_YAKKL_SETTINGS);
// 			log.info('showPopup: settings =', false, settings);
// 			log.info('showPopup: settings.init =', false, settings?.init);
// 			log.info('showPopup: settings.legal =', false, settings?.legal);

// 			// Only go to register if settings.init is explicitly false or undefined (very first time)
// 			// If settings.init is true, user has already registered and should go to login
// 			if (settings?.init === true) {
// 				// User has already initialized, check if they need to agree to terms
// 				if (!settings?.legal?.termsAgreed) {
// 					url = 'legal.html';
// 				} else {
// 					url = 'login.html';
// 				}
// 			} else {
// 				// settings.init is false/undefined - first time user
// 				url = 'register.html';
// 			}

// 			log.info('showPopup: User not authenticated, redirecting to:', false, url);
// 		} else if (!url || url === '') {
// 			// For authenticated users, use home.html
// 			url = 'home.html';
// 			log.info('showPopup: User authenticated, opening main wallet interface');
// 		}

// 		const windowManager = SingletonWindowManager.getInstance();
// 		log.info('showPopup: About to call windowManager.showPopup', false, { url, pinnedLocation });
// 		await windowManager.showPopup(url, pinnedLocation);
// 		log.info('showPopup: windowManager.showPopup completed successfully');

//   } catch (error) {
//     log.error('Background - showPopup', false, error);
//   }
// }



		// showExtensionPopup(428, 926, url, pinnedLocation).then(async (result) => {
		//   browser.windows.update(result.id, {drawAttention: true});
		//   await browser.storage.session.set({windowId: result.id});

		//   openWindows.set(result.id, result);
		// }).catch((error) => {
		//   log.error('Background - YAKKL: ' + false, error);  // need to send these area back to content.ts to inpage.ts to dapp so they can respond properly
		// });

// Check the lastlogin date - todays date = days hash it using dj2 then use as salt to encrypt and send to here and send back on request where it is reversed or else login again

export async function showPopup(url: string = '', pinnedLocation: string = '0', source: 'internal' | 'external' = 'external'): Promise<void> {
	try {
		// Use the PopupSecurityManager (now statically imported)
		log.info('showPopup: Using enhanced session-based security', false, { url, pinnedLocation, source });

		// Use the enhanced popup security flow
		await popupSecurityManager.handlePopupRequest(url, pinnedLocation, source);

		log.info('showPopup: Enhanced popup security completed successfully');
	} catch (error) {
		log.error('Background - showPopup', false, error);

		// Fallback to basic popup creation if enhanced security fails
		try {
			const windowManager = SingletonWindowManager.getInstance();
			await windowManager.showPopup(url || 'login.html', pinnedLocation);
			log.info('showPopup: Fallback popup creation completed');
		} catch (fallbackError) {
			log.error('Background - showPopup fallback failed', false, fallbackError);
		}
	}
}

// export async function showDappPopup(request: string, requestId: string, method: string = '', pinnedLocation: string = 'M') {
//   try {
//     if (openPopups.has(requestId)) {
//       log.warn('[PopupGuard] Duplicate popup for requestId. This request will be ignored.', false, {requestId, method});
//       return;
//     }

//     openPopups.set(requestId, {request, method, createdAt: Date.now()});

//     log.info('[APPROVE] New popup received request:', false, {request, requestId, method});

//     showExtensionPopup(428, 620, request, pinnedLocation).then(async (result) => {
//       browser.windows.update(result.id, {drawAttention: true});
//       await browser.storage.session.set({windowId: result.id});
//     }).catch((error) => {
//       log.error('Background - YAKKL: ' + false, error);
//     });
//   } catch (error) {
//     log.error('Background - showDappPopup:', false, error);
//   }
// }

export async function updateScreenPreferences(event: any): Promise<void> {
	if (typeof browser === 'undefined') {
		log.error('Browser extension API is not available.', false);
		return;
	}

	try {
		const yakklPreferences = await getObjectFromLocalStorage<any>('yakklPreferences');

		if (yakklPreferences) {
			yakklPreferences.preferences.screenWidth = event.data.availWidth;
			yakklPreferences.preferences.screenHeight = event.data.availHeight;

			await setObjectInLocalStorage('preferences', yakklPreferences);
		} else {
			log.error('yakklPreferences not found.', false);
		}
	} catch (error) {
		log.error('Error updating yakklPreferences:', false, error);
	}
}

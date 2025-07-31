/* eslint-disable @typescript-eslint/no-explicit-any */
import { log } from '$lib/managers/Logger';
import { getBrowserExtFromGlobal } from './environment';
import type { Browser } from 'webextension-polyfill';

// Try to get browser API directly for service worker context
let browserApi: Browser | null = await getBrowserExtFromGlobal();

// Check if we're in a service worker or extension context
// declare const browser: any;
// declare const chrome: any;

// try {
// 	if (typeof browser !== 'undefined' && browser?.storage) {
// 		// In service worker or extension context, browser is available globally
// 		browserApi = browser;
// 	} else if (typeof chrome !== 'undefined' && chrome?.storage) {
// 		// Fallback to chrome API if available
// 		browserApi = chrome;
// 	}
// } catch (e) {
// 	// Keep using browser_ext
// }

export const clearObjectsFromLocalStorage = async (): Promise<void> => {
	if (!browserApi) return;

	try {
		await browserApi.storage.local.clear();
	} catch (error) {
		log.error('Error clearing local storage', false, error);
		throw error;
	}
};

// This had two arguments, but I removed the second one since we only want to return objects
// export const getObjectFromLocalStorage = async <T>(key: string): Promise<T | null> => {
//   try {
//     if (!browser_ext) {
//       console.log('Browser extension is not available. Returning null.');
//       return null;
//     }
//     const result = await browser_ext.storage.local.get(key);
//     return result[key] as T;
//   } catch (error) {
//     console.log('Error getting object from local storage', false, error);
//     throw error;
//   }
// };

export const getObjectFromLocalStorage = async <T>(
	key: string,
	timeoutMs = 1000
): Promise<T | null> => {
	try {
		if (!browserApi) {
      return null;
		}

		const storagePromise = browserApi.storage.local.get(key);

		// Set a timeout to prevent infinite hangs
		const timeoutPromise = new Promise<null>((resolve) =>
			setTimeout(() => {
				resolve(null);
			}, timeoutMs)
		);

		const result = await Promise.race([storagePromise, timeoutPromise]);

		if (!result || !(key in result)) {
			return null;
		}

		return result[key] as T;
	} catch (error) {
		log.error('Error getting object from local storage', false, error);
		return null;
	}
};

export const setObjectInLocalStorage = async <T extends Record<string, any>>(
	key: string,
	obj: T | string
): Promise<void> => {
	if (!browserApi) return;

	try {
		await browserApi.storage.local.set({ [key]: obj });
	} catch (error) {
		log.error('Error setting object in local storage', false, error);
		throw error;
	}
};

export const removeObjectFromLocalStorage = async (keys: string): Promise<void> => {
	if (!browserApi) return;

	try {
		await browserApi.storage.local.remove(keys);
	} catch (error) {
		log.error('Error removing object from local storage', false, error);
		throw error;
	}
};

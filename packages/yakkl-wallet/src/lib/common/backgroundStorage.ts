/* eslint-disable @typescript-eslint/no-explicit-any */
import { log } from '$lib/managers/Logger';
// import { browser_ext as browser } from './environment';
import type { Browser } from 'webextension-polyfill';

let browser: Browser;

if (typeof window === 'undefined') {
  browser = await import ('webextension-polyfill');
} else {
  browser = await import ('./environment').then(m => m.browser_ext);
}

// Note: This file is used for background contexts.
// With the unified browser polyfill, browser_ext now works consistently in all contexts.

export const clearObjectsFromLocalStorage = async (): Promise<void> => {
	try {
		await browser.storage.local.clear();
	} catch (error) {
		log.error('Error clearing local storage', false, error);
		throw error;
	}
};

export const getObjectFromLocalStorage = async <T>(
	key: string,
	timeoutMs = 2000
): Promise<T | null> => {
	try {
		const storagePromise = browser.storage.local.get(key);

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
	try {
		await browser.storage.local.set({ [key]: obj });
	} catch (error) {
		log.error('Error setting object in local storage', false, error);
		throw error;
	}
};

export const removeObjectFromLocalStorage = async (keys: string): Promise<void> => {
	try {
		await browser.storage.local.remove(keys);
	} catch (error) {
		log.error('Error removing object from local storage', false, error);
		throw error;
	}
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import { log } from '$lib/managers/Logger';
import { browserAPI } from '$lib/services/browser-api.service';
import { browser_ext as browser } from './environment';

// Note: This file is used for client contexts only.
// Background contexts use the backgroundStorage.ts file.
// With the unified browser polyfill, browser_ext now works consistently in all contexts.

// Storage functions CAN use the browserAPI service for client contexts if needed

export const clearObjectsFromLocalStorage = async (useBrowserAPI = false): Promise<void> => {
	try {
    // if (!useBrowserAPI && browser_ext?.storage?.local) {
    if (browser) {
      await browser.storage.local.clear();
    } else if (useBrowserAPI) {
      await browserAPI.storageClear();
    }
	} catch (error) {
		log.warn('Error clearing local storage', false, error);
		throw error;
	}
};

export const getObjectFromLocalStorage = async <T>(
	key: string,
  useBrowserAPI = false,
	timeoutMs = 1000
): Promise<T | null> => {
	try {
		console.log('[getObjectFromLocalStorage] Getting key:', key, 'useBrowserAPI:', useBrowserAPI);
		console.log('[getObjectFromLocalStorage] Browser available:', !!browser, 'storage:', !!browser?.storage?.local);
		
    // if (!useBrowserAPI && browser_ext?.storage?.local) {
    if (browser) {
      const result = await browser.storage.local.get(key);
      console.log('[getObjectFromLocalStorage] Result for', key, ':', result);
      return result[key] as T;
    } else if (useBrowserAPI) {
      let storagePromise = browserAPI.storageGet(key);

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
    }
	} catch (error) {
		log.warn('Error getting object from local storage', false, error);
		return null;
	}
};

export const setObjectInLocalStorage = async <T extends Record<string, any>>(
	key: string,
	obj: T | string,
  useBrowserAPI = false
): Promise<void> => {
	try {
    // if (!useBrowserAPI && browser_ext?.storage?.local) {
    if (browser) {
      await browser.storage.local.set({ [key]: obj });
    } else if (useBrowserAPI) {
      await browserAPI.storageSet({ [key]: obj });
    }
	} catch (error) {
		log.warn('Error setting object in local storage', false, error);
		throw error;
	}
};

export const removeObjectFromLocalStorage = async (keys: string, useBrowserAPI = false): Promise<void> => {
	try {
    // if (!useBrowserAPI && browser_ext?.storage?.local) {
    if (browser) {
      await browser.storage.local.remove(keys);
    } else if (useBrowserAPI) {
      await browserAPI.storageRemove(keys);
    }
	} catch (error) {
		log.warn('Error removing object from local storage', false, error);
		throw error;
	}
};

// Direct storage access for critical initialization paths (sidepanel, popups)
// With unified polyfill, this now just uses browser_ext directly
export const getObjectFromLocalStorageDirect = async <T>(key: string): Promise<T | null> => {
	try {
		if (browser) {
			const result = await browser.storage.local.get(key);
			return result[key] as T || null;
		}

		// Fallback to browserContext for edge cases
		const { fastStorageGet } = await import('./browserContext');
		const result = await fastStorageGet<T>(key);
		return result[key] || null;
	} catch (error) {
		log.warn('Error getting object from local storage (direct)', false, error);
		return null;
	}
};

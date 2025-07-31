/* eslint-disable @typescript-eslint/no-explicit-any */
import { log } from '$lib/managers/Logger';
import { browserAPI } from '$lib/services/browser-api.service';
import { browserSvelte, browser_ext } from './environment';
import type { Browser } from 'webextension-polyfill';

// Storage functions CAN now use the browserAPI service for client contexts

export const clearObjectsFromLocalStorage = async (useBrowserAPI = false): Promise<void> => {
	if (!browserSvelte) return;

	try {
    if (!useBrowserAPI) {
      await browser_ext.storage.local.clear();
    } else {
      await browserAPI.storageClear();
    }
	} catch (error) {
		log.warn('Error clearing local storage', false, error);
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
  useBrowserAPI = false,
	timeoutMs = 1000
): Promise<T | null> => {
	try {
		if (!browserSvelte) {
			return null;
		}

    if (!useBrowserAPI) {
      let storagePromise = browser_ext.storage.local.get(key);
      const result = await storagePromise;
      return result[key] as T;
    } else {
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
	if (!browserSvelte) return;

	try {
    if (!useBrowserAPI) {
      await browser_ext.storage.local.set({ [key]: obj });
    } else {
      await browserAPI.storageSet({ [key]: obj });
    }
	} catch (error) {
		log.warn('Error setting object in local storage', false, error);
		throw error;
	}
};

export const removeObjectFromLocalStorage = async (keys: string, useBrowserAPI = false): Promise<void> => {
	if (!browserSvelte) return;

	try {
    if (!useBrowserAPI) {
      await browser_ext.storage.local.remove(keys);
    } else {
      await browserAPI.storageRemove(keys);
    }
	} catch (error) {
		log.warn('Error removing object from local storage', false, error);
		throw error;
	}
};

// Direct storage access for critical initialization paths (sidepanel, popups)
// This bypasses browserAPI message passing for immediate data access
export const getObjectFromLocalStorageDirect = async <T>(key: string): Promise<T | null> => {
	try {
		if (!browserSvelte) {
			return null;
		}

		// Use the optimized fastStorageGet which automatically detects context
		const { fastStorageGet } = await import('./browserContext');
		const result = await fastStorageGet<T>(key);
		return result[key] || null;
	} catch (error) {
		log.warn('Error getting object from local storage (direct)', false, error);
		return null;
	}
};

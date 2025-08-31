/**
 * Storage functions for client contexts
 * Uses @yakkl/browser-extension for all storage operations
 */

import {
  clearObjectsFromLocalStorage as clearStorage,
  getObjectFromLocalStorage as getStorage,
  setObjectInLocalStorage as setStorage,
  removeObjectFromLocalStorage as removeStorage,
  getObjectFromLocalStorageDirect as getStorageDirect
} from '@yakkl/browser-extension';

import { log } from '$lib/managers/Logger';

// Re-export functions with the same names for backward compatibility
export const clearObjectsFromLocalStorage = async (useBrowserAPI = false): Promise<void> => {
  try {
    await clearStorage(useBrowserAPI);
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
    const result = await getStorage<T>(key, useBrowserAPI, timeoutMs);
    console.log('[getObjectFromLocalStorage] Result for', key, ':', result);
    return result;
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
    await setStorage(key, obj, useBrowserAPI);
  } catch (error) {
    log.warn('Error setting object in local storage', false, error);
    throw error;
  }
};

export const removeObjectFromLocalStorage = async (keys: string, useBrowserAPI = false): Promise<void> => {
  try {
    await removeStorage(keys, useBrowserAPI);
  } catch (error) {
    log.warn('Error removing object from local storage', false, error);
    throw error;
  }
};

// Direct storage access for critical initialization paths (sidepanel, popups)
export const getObjectFromLocalStorageDirect = async <T>(key: string): Promise<T | null> => {
  try {
    const result = await getStorageDirect<T>(key);
    return result;
  } catch (error) {
    log.warn('Error getting object from local storage (direct)', false, error);
    return null;
  }
};
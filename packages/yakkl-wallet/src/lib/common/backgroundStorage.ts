/**
 * Storage functions for background contexts
 * Uses @yakkl/browser-extension for all storage operations
 */

import {
  clearObjectsFromLocalStorage as clearStorage,
  getObjectFromLocalStorage as getStorage,
  setObjectInLocalStorage as setStorage,
  removeObjectFromLocalStorage as removeStorage
} from '@yakkl/browser-extension';

import { log } from '$lib/managers/Logger';

// Re-export functions with background context flag
export const clearObjectsFromLocalStorage = async (): Promise<void> => {
  try {
    await clearStorage(true); // Use background context
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
    const result = await getStorage<T>(key, true, timeoutMs); // Use background context
    return result;
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
    await setStorage(key, obj, true); // Use background context
  } catch (error) {
    log.error('Error setting object in local storage', false, error);
    throw error;
  }
};

export const removeObjectFromLocalStorage = async (keys: string): Promise<void> => {
  try {
    await removeStorage(keys, true); // Use background context
  } catch (error) {
    log.error('Error removing object from local storage', false, error);
    throw error;
  }
};
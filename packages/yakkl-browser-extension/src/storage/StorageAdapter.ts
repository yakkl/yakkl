/**
 * Storage Adapter for backward compatibility
 * Provides the same API as the legacy storage functions
 * but uses the ExtensionStorage class internally
 */

import { ExtensionStorage } from './ExtensionStorage';
import type { StorageOptions } from './ExtensionStorage';

// Create singleton instances for different contexts
let clientStorage: ExtensionStorage | null = null;
let backgroundStorage: ExtensionStorage | null = null;

/**
 * Get storage instance based on context
 */
function getStorage(isBackground = false): ExtensionStorage {
  if (isBackground) {
    if (!backgroundStorage) {
      backgroundStorage = new ExtensionStorage({
        area: 'local',
        prefix: ''
      });
    }
    return backgroundStorage;
  } else {
    if (!clientStorage) {
      clientStorage = new ExtensionStorage({
        area: 'local',
        prefix: ''
      });
    }
    return clientStorage;
  }
}

/**
 * Clear all objects from local storage
 */
export const clearObjectsFromLocalStorage = async (isBackground = false): Promise<void> => {
  try {
    const storage = getStorage(isBackground);
    await storage.clear();
  } catch (error) {
    console.error('Error clearing local storage', error);
    throw error;
  }
};

/**
 * Get object from local storage with timeout
 */
export const getObjectFromLocalStorage = async <T>(
  key: string,
  useBrowserAPI = false,
  timeoutMs = 1000
): Promise<T | null> => {
  try {
    const storage = getStorage(useBrowserAPI);
    // Use direct access to bypass prefix
    const result = await storage.getDirect<T>(key, timeoutMs);
    return result;
  } catch (error) {
    console.warn('Error getting object from local storage', error);
    return null;
  }
};

/**
 * Set object in local storage
 */
export const setObjectInLocalStorage = async <T extends Record<string, any>>(
  key: string,
  obj: T | string,
  useBrowserAPI = false
): Promise<void> => {
  try {
    const storage = getStorage(useBrowserAPI);
    // Use direct access to bypass prefix
    await storage.setDirect(key, obj);
  } catch (error) {
    console.warn('Error setting object in local storage', error);
    throw error;
  }
};

/**
 * Remove object from local storage
 */
export const removeObjectFromLocalStorage = async (keys: string, useBrowserAPI = false): Promise<void> => {
  try {
    const storage = getStorage(useBrowserAPI);
    // Use direct access to bypass prefix
    await storage.removeDirect(keys);
  } catch (error) {
    console.warn('Error removing object from local storage', error);
    throw error;
  }
};

/**
 * Direct storage access for critical initialization paths
 * This is used in sidepanel and popup contexts
 */
export const getObjectFromLocalStorageDirect = async <T>(key: string): Promise<T | null> => {
  try {
    const storage = getStorage(false);
    const result = await storage.getDirect<T>(key);
    return result;
  } catch (error) {
    console.warn('Error getting object from local storage (direct)', error);
    return null;
  }
};

/**
 * Create a typed storage instance with prefix support
 */
export function createTypedStorage<T extends Record<string, any>>(
  options?: StorageOptions
): ExtensionStorage<T> {
  return new ExtensionStorage<T>(options);
}

// Export the ExtensionStorage class for advanced usage
export { ExtensionStorage } from './ExtensionStorage';
export type { StorageOptions, StorageArea, StorageChange, StorageChangeHandler } from './ExtensionStorage';
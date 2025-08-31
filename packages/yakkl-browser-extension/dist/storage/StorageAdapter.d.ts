/**
 * Storage Adapter for backward compatibility
 * Provides the same API as the legacy storage functions
 * but uses the ExtensionStorage class internally
 */
import { ExtensionStorage } from './ExtensionStorage';
import type { StorageOptions } from './ExtensionStorage';
/**
 * Clear all objects from local storage
 */
export declare const clearObjectsFromLocalStorage: (isBackground?: boolean) => Promise<void>;
/**
 * Get object from local storage with timeout
 */
export declare const getObjectFromLocalStorage: <T>(key: string, useBrowserAPI?: boolean, timeoutMs?: number) => Promise<T | null>;
/**
 * Set object in local storage
 */
export declare const setObjectInLocalStorage: <T extends Record<string, any>>(key: string, obj: T | string, useBrowserAPI?: boolean) => Promise<void>;
/**
 * Remove object from local storage
 */
export declare const removeObjectFromLocalStorage: (keys: string, useBrowserAPI?: boolean) => Promise<void>;
/**
 * Direct storage access for critical initialization paths
 * This is used in sidepanel and popup contexts
 */
export declare const getObjectFromLocalStorageDirect: <T>(key: string) => Promise<T | null>;
/**
 * Create a typed storage instance with prefix support
 */
export declare function createTypedStorage<T extends Record<string, any>>(options?: StorageOptions): ExtensionStorage<T>;
export { ExtensionStorage } from './ExtensionStorage';
export type { StorageOptions, StorageArea, StorageChange, StorageChangeHandler } from './ExtensionStorage';

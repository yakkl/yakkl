/**
 * Storage Module Exports
 */
export { ExtensionStorage, createExtensionStorage } from './ExtensionStorage';
export type { StorageArea, StorageOptions, StorageChange, StorageChangeHandler } from './ExtensionStorage';
export { clearObjectsFromLocalStorage, getObjectFromLocalStorage, setObjectInLocalStorage, removeObjectFromLocalStorage, getObjectFromLocalStorageDirect, createTypedStorage } from './StorageAdapter';

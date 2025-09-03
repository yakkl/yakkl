/**
 * Storage Module Exports
 */

// Main storage class
export { ExtensionStorage, createExtensionStorage } from './ExtensionStorage';
export type {
  StorageArea,
  StorageOptions,
  StorageChange,
  StorageChangeHandler
} from './ExtensionStorage';

// Storage adapter for backward compatibility
export {
  clearObjectsFromLocalStorage,
  getObjectFromLocalStorage,
  setObjectInLocalStorage,
  removeObjectFromLocalStorage,
  getObjectFromLocalStorageDirect,
  createTypedStorage
} from './StorageAdapter';
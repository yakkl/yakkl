/**
 * Advanced store factory with additional features
 */

import type { Writable, StoreConfig } from '../types';
import { writable } from './writable';

/**
 * Create a store with advanced configuration options - made createstore to avoid conflict with createStore
 */
export function createstore<T>(config: StoreConfig<T>): Writable<T> {
  const { initial, equals, name, persist } = config;
  
  // Create base store
  let store = writable(initial);
  
  // Add persistence if configured
  if (persist) {
    const persistConfig = typeof persist === 'object' ? persist : { key: name || 'store' };
    const { key, storage = globalThis.localStorage, serializer } = persistConfig;
    
    // Try to load persisted value
    if (storage && typeof storage.getItem === 'function') {
      try {
        const stored = storage.getItem(key);
        if (stored !== null) {
          const value = serializer ? serializer.deserialize(stored) : JSON.parse(stored);
          store.set(value);
        }
      } catch (error) {
        console.warn(`Failed to load persisted value for store "${key}":`, error);
      }
    }
    
    // Subscribe to changes and persist
    if (storage && typeof storage.setItem === 'function') {
      store.subscribe((value) => {
        try {
          const serialized = serializer ? serializer.serialize(value) : JSON.stringify(value);
          storage.setItem(key, serialized);
        } catch (error) {
          console.warn(`Failed to persist value for store "${key}":`, error);
        }
      });
    }
  }
  
  // Add custom equality check if provided
  if (equals) {
    const originalSet = store.set;
    store.set = (value: T) => {
      const current = store.get();
      if (!equals(current, value)) {
        originalSet(value);
      }
    };
  }
  
  // Add name for debugging
  if (name) {
    (store as any).__name = name;
  }
  
  return store;
}

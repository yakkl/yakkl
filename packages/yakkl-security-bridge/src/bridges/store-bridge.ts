/**
 * Store Bridge
 * 
 * Synchronizes @yakkl/reactive stores with wallet-specific stores.
 * This allows security components to use framework-neutral stores
 * while the wallet maintains its own store implementations.
 */

import type { Writable, Readable } from '@yakkl/reactive';

export interface StoreBridge {
  /**
   * Sync a reactive store with a wallet store
   * @param reactiveStore - The reactive store to sync
   * @param walletStore - The wallet store to sync with
   * @returns Unsubscribe function
   */
  syncStores<T>(
    reactiveStore: Writable<T> | Readable<T>,
    walletStore: any
  ): () => void;
  
  /**
   * Bridge multiple stores at once
   * @param storePairs - Array of store pairs to sync
   * @returns Unsubscribe function for all syncs
   */
  bridgeStores(storePairs: Array<{
    reactive: Writable<any> | Readable<any>;
    wallet: any;
  }>): () => void;
}

/**
 * Create a store bridge instance
 */
export function createStoreBridge(): StoreBridge {
  const subscriptions: Array<() => void> = [];
  
  return {
    syncStores<T>(reactiveStore: Writable<T> | Readable<T>, walletStore: any): () => void {
      // Subscribe to reactive store and update wallet store
      const unsubReactive = reactiveStore.subscribe((value: T) => {
        if (walletStore.set && typeof walletStore.set === 'function') {
          walletStore.set(value);
        }
      });
      
      // If wallet store is writable, sync back to reactive store
      if (walletStore.subscribe && typeof walletStore.subscribe === 'function') {
        const unsubWallet = walletStore.subscribe((value: T) => {
          if ('set' in reactiveStore && typeof reactiveStore.set === 'function') {
            (reactiveStore as Writable<T>).set(value);
          }
        });
        
        // Return combined unsubscribe
        return () => {
          unsubReactive();
          unsubWallet();
        };
      }
      
      return unsubReactive;
    },
    
    bridgeStores(storePairs) {
      const unsubscribers = storePairs.map(pair => 
        this.syncStores(pair.reactive, pair.wallet)
      );
      
      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }
  };
}

/**
 * Helper to create a synchronized store pair
 */
export function createSyncedStore<T>(
  initialValue: T,
  walletStore?: any
): {
  reactive: Writable<T>;
  sync: () => void;
} {
  // Import will be resolved at build time
  const { writable } = await import('@yakkl/reactive');
  const reactiveStore = writable(initialValue);
  
  const sync = walletStore 
    ? createStoreBridge().syncStores(reactiveStore, walletStore)
    : () => {};
  
  return {
    reactive: reactiveStore,
    sync
  };
}
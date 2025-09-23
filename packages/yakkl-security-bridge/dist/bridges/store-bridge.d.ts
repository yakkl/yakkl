/**
 * Store Bridge
 *
 * Synchronizes @yakkl/reactive stores with wallet-specific stores.
 * This allows security components to use framework-neutral stores
 * while the wallet maintains its own store implementations.
 */
import { type Writable, type Readable } from '@yakkl/reactive';
export interface StoreBridge {
    /**
     * Sync a reactive store with a wallet store
     * @param reactiveStore - The reactive store to sync
     * @param walletStore - The wallet store to sync with
     * @returns Unsubscribe function
     */
    syncStores<T>(reactiveStore: Writable<T> | Readable<T>, walletStore: any): () => void;
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
export declare function createStoreBridge(): StoreBridge;
/**
 * Helper to create a synchronized store pair
 */
export declare function createSyncedStore<T>(initialValue: T, walletStore?: any): {
    reactive: Writable<T>;
    sync: () => void;
};
//# sourceMappingURL=store-bridge.d.ts.map
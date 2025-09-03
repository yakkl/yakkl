/**
 * State Synchronization
 * Cross-context state synchronization (tabs, workers, etc.)
 */
import type { IStateSync, IState, StateSubscriber, StateUnsubscriber } from '../interfaces/state.interface';
/**
 * State synchronization using BroadcastChannel API
 */
export declare class BroadcastStateSync implements IStateSync {
    private channels;
    private sourceId;
    constructor();
    /**
     * Get or create broadcast channel
     */
    private getChannel;
    /**
     * Sync state across contexts
     */
    sync<T>(state: IState<T>, channel: string): StateUnsubscriber;
    /**
     * Broadcast state change
     */
    broadcast<T>(channel: string, value: T): void;
    /**
     * Listen for state changes
     */
    listen<T>(channel: string, callback: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Close all channels
     */
    close(): void;
}
/**
 * State synchronization using storage events (fallback for older browsers)
 */
export declare class StorageStateSync implements IStateSync {
    private listeners;
    private prefix;
    private sourceId;
    constructor();
    /**
     * Get storage key
     */
    private getKey;
    /**
     * Sync state across contexts
     */
    sync<T>(state: IState<T>, channel: string): StateUnsubscriber;
    /**
     * Broadcast state change
     */
    broadcast<T>(channel: string, value: T): void;
    /**
     * Listen for state changes
     */
    listen<T>(channel: string, callback: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Clean up
     */
    close(): void;
}
/**
 * Create state sync instance based on available APIs
 */
export declare function createStateSync(): IStateSync;
/**
 * Synchronized state wrapper
 */
export declare class SynchronizedState<T> implements IState<T> {
    private state;
    private sync;
    private unsubscribe?;
    constructor(state: IState<T>, channel: string, sync?: IStateSync);
    get(): T;
    set(value: T | ((prev: T) => T)): void;
    update(updater: (value: T) => T): void;
    subscribe(subscriber: (value: T) => void): StateUnsubscriber;
    /**
     * Stop syncing
     */
    disconnect(): void;
}
/**
 * Create a synchronized state
 */
export declare function synchronized<T>(initial: T, channel: string, options?: {
    sync?: IStateSync;
}): SynchronizedState<T>;
//# sourceMappingURL=StateSync.d.ts.map
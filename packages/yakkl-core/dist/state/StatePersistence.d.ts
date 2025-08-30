/**
 * State Persistence Layer
 * Automatic state persistence to storage
 */
import type { IStatePersistence, IState, StateUnsubscriber } from '../interfaces/state.interface';
import type { IStorage } from '../interfaces/storage.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';
/**
 * State persistence implementation
 */
export declare class StatePersistence implements IStatePersistence {
    private storage;
    private prefix;
    constructor(storage?: IStorage, prefix?: string);
    /**
     * Get storage key with prefix
     */
    private getKey;
    /**
     * Load state from storage
     */
    load<T>(key: string): Promise<T | null>;
    /**
     * Save state to storage
     */
    save<T>(key: string, value: T): Promise<void>;
    /**
     * Remove state from storage
     */
    remove(key: string): Promise<void>;
    /**
     * Clear all persisted state
     */
    clear(): Promise<void>;
}
/**
 * Persisted state wrapper
 */
export declare class PersistedState<T> implements IState<T> {
    private state;
    private persistence;
    private key;
    private saveDebounceTimer?;
    private saveDebounceMs;
    constructor(state: IState<T>, key: string, persistence?: IStatePersistence, saveDebounceMs?: number);
    /**
     * Load value from storage
     */
    private loadFromStorage;
    /**
     * Save value to storage (debounced)
     */
    private saveToStorage;
    /**
     * Get current value
     */
    get(): T;
    /**
     * Set new value
     */
    set(value: T | ((prev: T) => T)): void;
    /**
     * Update value
     */
    update(updater: (value: T) => T): void;
    /**
     * Subscribe to changes
     */
    subscribe(subscriber: (value: T) => void): StateUnsubscriber;
    /**
     * Force save to storage immediately
     */
    flush(): Promise<void>;
    /**
     * Clear persisted value
     */
    clearPersisted(): Promise<void>;
}
/**
 * Create a persisted state
 */
export declare function persisted<T>(initial: T, key: string, options?: {
    storage?: IStorage;
    storageType?: StorageType;
    prefix?: string;
    debounceMs?: number;
}): PersistedState<T>;
/**
 * Session storage persisted state
 */
export declare function sessionPersisted<T>(initial: T, key: string, options?: {
    prefix?: string;
    debounceMs?: number;
}): PersistedState<T>;
/**
 * Local storage persisted state
 */
export declare function localPersisted<T>(initial: T, key: string, options?: {
    prefix?: string;
    debounceMs?: number;
}): PersistedState<T>;
//# sourceMappingURL=StatePersistence.d.ts.map
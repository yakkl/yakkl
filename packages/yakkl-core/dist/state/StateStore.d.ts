/**
 * State Store Implementation
 * Centralized state management with key-based access
 */
import type { IStateStore, StateOptions, StateUpdater, StateSubscriber, StateUnsubscriber } from '../interfaces/state.interface';
/**
 * State store for managing multiple states
 */
export declare class StateStore<T extends Record<string, any>> implements IStateStore<T> {
    private states;
    private storeObservable;
    private initialState;
    private options;
    constructor(initial: T, options?: StateOptions<T>);
    /**
     * Initialize states for each key
     */
    private initializeStates;
    /**
     * Handle individual state change
     */
    private handleStateChange;
    /**
     * Get state slice
     */
    get<K extends keyof T>(key: K): T[K];
    /**
     * Set state slice
     */
    set<K extends keyof T>(key: K, value: T[K]): void;
    /**
     * Update state slice
     */
    update<K extends keyof T>(key: K, updater: StateUpdater<T[K]>): void;
    /**
     * Subscribe to specific key
     */
    subscribe<K extends keyof T>(key: K, subscriber: StateSubscriber<T[K]>): StateUnsubscriber;
    /**
     * Subscribe to entire store
     */
    subscribeAll(subscriber: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Get entire state
     */
    getState(): T;
    /**
     * Set entire state
     */
    setState(state: Partial<T>): void;
    /**
     * Reset store to initial state
     */
    reset(): void;
    /**
     * Select a value from the store
     */
    select<R>(selector: (state: T) => R): R;
    /**
     * Subscribe to selected value
     */
    subscribeSelect<R>(selector: (state: T) => R, subscriber: StateSubscriber<R>): StateUnsubscriber;
    /**
     * Destroy the store
     */
    destroy(): void;
}
/**
 * Create a state store
 */
export declare function createStore<T extends Record<string, any>>(initial: T, options?: StateOptions<T>): IStateStore<T>;
/**
 * Combine multiple stores into one
 */
export declare function combineStores<T extends Record<string, IStateStore>>(stores: T): IStateStore<{
    [K in keyof T]: T[K] extends IStateStore<infer U> ? U : never;
}>;
//# sourceMappingURL=StateStore.d.ts.map
/**
 * State Management Interfaces
 * Framework-agnostic reactive state system
 */
/**
 * State value type
 */
export type StateValue = any;
/**
 * State update function
 */
export type StateUpdater<T> = (value: T) => T;
/**
 * State setter - can be value or updater function
 */
export type StateSetter<T> = T | StateUpdater<T>;
/**
 * Subscription callback
 */
export type StateSubscriber<T> = (value: T) => void;
/**
 * Unsubscribe function
 */
export type StateUnsubscriber = () => void;
/**
 * State options
 */
export interface StateOptions<T = any> {
    initial?: T;
    persist?: boolean;
    persistKey?: string;
    validator?: (value: T) => boolean;
    transformer?: (value: T) => T;
    equals?: (a: T, b: T) => boolean;
}
/**
 * Core state interface
 */
export interface IState<T = any> {
    /**
     * Get current value
     */
    get(): T;
    /**
     * Set new value
     */
    set(value: StateSetter<T>): void;
    /**
     * Subscribe to changes
     */
    subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Update value using updater function
     */
    update(updater: StateUpdater<T>): void;
}
/**
 * Readable state (read-only)
 */
export interface IReadableState<T = any> {
    /**
     * Get current value
     */
    get(): T;
    /**
     * Subscribe to changes
     */
    subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber;
}
/**
 * Writable state
 */
export interface IWritableState<T = any> extends IState<T> {
    /**
     * Reset to initial value
     */
    reset(): void;
}
/**
 * Derived state (computed from other states)
 */
export interface IDerivedState<T = any> extends IReadableState<T> {
    /**
     * Dependencies this state derives from
     */
    readonly dependencies: IReadableState[];
}
/**
 * State store interface
 */
export interface IStateStore<T extends Record<string, any> = any> {
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
}
/**
 * State manager interface
 */
export interface IStateManager {
    /**
     * Create writable state
     */
    writable<T>(initial: T, options?: StateOptions<T>): IWritableState<T>;
    /**
     * Create readable state
     */
    readable<T>(initial: T, options?: StateOptions<T>): IReadableState<T>;
    /**
     * Create derived state
     */
    derived<T>(dependencies: IReadableState | IReadableState[], fn: (...values: any[]) => T, initial?: T): IDerivedState<T>;
    /**
     * Create state store
     */
    store<T extends Record<string, any>>(initial: T, options?: StateOptions<T>): IStateStore<T>;
    /**
     * Get all states
     */
    getAllStates(): Map<string, IReadableState>;
    /**
     * Clear all states
     */
    clearAll(): void;
}
/**
 * State persistence interface
 */
export interface IStatePersistence {
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
 * State synchronization interface
 */
export interface IStateSync {
    /**
     * Sync state across contexts (e.g., tabs, workers)
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
}
/**
 * State middleware
 */
export interface IStateMiddleware<T = any> {
    /**
     * Called before state change
     */
    beforeChange?(oldValue: T, newValue: T): T | false;
    /**
     * Called after state change
     */
    afterChange?(oldValue: T, newValue: T): void;
    /**
     * Called on subscription
     */
    onSubscribe?(subscriber: StateSubscriber<T>): void;
    /**
     * Called on unsubscribe
     */
    onUnsubscribe?(subscriber: StateSubscriber<T>): void;
}
/**
 * State history interface
 */
export interface IStateHistory<T = any> {
    /**
     * Current state
     */
    current: T;
    /**
     * History stack
     */
    past: T[];
    /**
     * Future stack (for redo)
     */
    future: T[];
    /**
     * Push new state
     */
    push(state: T): void;
    /**
     * Undo to previous state
     */
    undo(): T | undefined;
    /**
     * Redo to next state
     */
    redo(): T | undefined;
    /**
     * Clear history
     */
    clear(): void;
    /**
     * Can undo
     */
    canUndo(): boolean;
    /**
     * Can redo
     */
    canRedo(): boolean;
}
/**
 * State selector
 */
export type StateSelector<T, R> = (state: T) => R;
/**
 * State action
 */
export interface IStateAction<T = any> {
    type: string;
    payload?: any;
    meta?: Record<string, any>;
}
/**
 * State reducer
 */
export type StateReducer<T> = (state: T, action: IStateAction) => T;
/**
 * State enhancer
 */
export type StateEnhancer<T> = (state: IState<T>) => IState<T>;
/**
 * State plugin interface
 */
export interface IStatePlugin {
    /**
     * Plugin name
     */
    name: string;
    /**
     * Initialize plugin
     */
    init(manager: IStateManager): void;
    /**
     * Enhance state
     */
    enhance?<T>(state: IState<T>): IState<T>;
    /**
     * Middleware
     */
    middleware?<T>(): IStateMiddleware<T>;
    /**
     * Cleanup
     */
    destroy?(): void;
}
//# sourceMappingURL=state.interface.d.ts.map
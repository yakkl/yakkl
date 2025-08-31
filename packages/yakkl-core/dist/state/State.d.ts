/**
 * State Implementation
 * Writable, Readable, and Derived states
 */
import type { IState, IReadableState, IWritableState, IDerivedState, StateOptions, StateSetter, StateUpdater, StateSubscriber, StateUnsubscriber } from '../interfaces/state.interface';
import { Observable } from './Observable';
/**
 * Base state implementation
 */
export declare class State<T> implements IState<T> {
    protected observable: Observable<T>;
    protected options: StateOptions<T>;
    constructor(initial: T, options?: StateOptions<T>);
    /**
     * Get current value
     */
    get(): T;
    /**
     * Set new value
     */
    set(value: StateSetter<T>): void;
    /**
     * Update value using updater function
     */
    update(updater: StateUpdater<T>): void;
    /**
     * Subscribe to changes
     */
    subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Destroy the state
     */
    destroy(): void;
}
/**
 * Readable state (read-only)
 */
export declare class ReadableState<T> implements IReadableState<T> {
    protected observable: Observable<T>;
    constructor(initial: T, options?: StateOptions<T>);
    /**
     * Get current value
     */
    get(): T;
    /**
     * Subscribe to changes
     */
    subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Destroy the state
     */
    destroy(): void;
}
/**
 * Writable state with reset capability
 */
export declare class WritableState<T> extends State<T> implements IWritableState<T> {
    private initialValue;
    constructor(initial: T, options?: StateOptions<T>);
    /**
     * Reset to initial value
     */
    reset(): void;
}
/**
 * Derived state computed from other states
 */
export declare class DerivedState<T> implements IDerivedState<T> {
    private computedObservable;
    readonly dependencies: IReadableState[];
    constructor(dependencies: IReadableState | IReadableState[], fn: (...values: any[]) => T, initial?: T);
    /**
     * Get current value
     */
    get(): T;
    /**
     * Subscribe to changes
     */
    subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Destroy the state
     */
    destroy(): void;
}
/**
 * Create a writable state
 */
export declare function writable<T>(initial: T, options?: StateOptions<T>): IWritableState<T>;
/**
 * Create a readable state
 */
export declare function readable<T>(initial: T, options?: StateOptions<T>): IReadableState<T>;
/**
 * Create a derived state
 */
export declare function derived<T>(dependencies: IReadableState | IReadableState[], fn: (...values: any[]) => T, initial?: T): IDerivedState<T>;
/**
 * Get value from state-like object
 */
export declare function get<T>(state: IReadableState<T> | T): T;
//# sourceMappingURL=State.d.ts.map
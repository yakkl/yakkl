/**
 * Observable Pattern Implementation
 * Core reactive state system
 */
import type { StateSubscriber, StateUnsubscriber } from '../interfaces/state.interface';
/**
 * Observable class for reactive state
 */
export declare class Observable<T> {
    private subscribers;
    private value;
    private isDestroyed;
    constructor(initial: T);
    /**
     * Get current value
     */
    get(): T;
    /**
     * Set new value and notify subscribers
     */
    set(value: T): void;
    /**
     * Subscribe to value changes
     */
    subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber;
    /**
     * Notify all subscribers
     */
    protected notify(oldValue: T, newValue: T): void;
    /**
     * Check equality (can be overridden)
     */
    protected equals(a: T, b: T): boolean;
    /**
     * Check if destroyed
     */
    protected checkDestroyed(): void;
    /**
     * Get subscriber count
     */
    getSubscriberCount(): number;
    /**
     * Clear all subscribers
     */
    clearSubscribers(): void;
    /**
     * Destroy the observable
     */
    destroy(): void;
}
/**
 * Computed observable that derives from other observables
 */
export declare class ComputedObservable<T> extends Observable<T> {
    private dependencies;
    private compute;
    private unsubscribers;
    constructor(dependencies: Observable<any> | Observable<any>[], compute: (...values: any[]) => T, initial?: T);
    /**
     * Subscribe to all dependencies
     */
    private subscribeToDependencies;
    /**
     * Recompute value when dependencies change
     */
    private recompute;
    /**
     * Override set to make it read-only
     */
    set(value: T): void;
    /**
     * Destroy and cleanup
     */
    destroy(): void;
}
/**
 * Batch updates to prevent multiple notifications
 */
export declare class BatchedObservable<T> extends Observable<T> {
    private isBatching;
    private pendingValue;
    /**
     * Start batching updates
     */
    startBatch(): void;
    /**
     * End batch and apply pending updates
     */
    endBatch(): void;
    /**
     * Set value (batched if in batch mode)
     */
    set(value: T): void;
    /**
     * Execute function with batched updates
     */
    batch(fn: () => void): void;
}
/**
 * Observable with history support
 */
export declare class HistoryObservable<T> extends Observable<T> {
    private past;
    private future;
    private maxHistory;
    constructor(initial: T, maxHistory?: number);
    /**
     * Set value and record in history
     */
    set(value: T): void;
    /**
     * Undo to previous value
     */
    undo(): boolean;
    /**
     * Redo to next value
     */
    redo(): boolean;
    /**
     * Check if can undo
     */
    canUndo(): boolean;
    /**
     * Check if can redo
     */
    canRedo(): boolean;
    /**
     * Clear history
     */
    clearHistory(): void;
    /**
     * Get history info
     */
    getHistoryInfo(): {
        past: number;
        future: number;
    };
}
//# sourceMappingURL=Observable.d.ts.map
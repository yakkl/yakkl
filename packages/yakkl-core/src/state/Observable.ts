/**
 * Observable Pattern Implementation
 * Core reactive state system
 */

import type { StateSubscriber, StateUnsubscriber } from '../interfaces/state.interface';

/**
 * Observable class for reactive state
 */
export class Observable<T> {
  private subscribers: Set<StateSubscriber<T>> = new Set();
  private value: T;
  private isDestroyed = false;

  constructor(initial: T) {
    this.value = initial;
  }

  /**
   * Get current value
   */
  get(): T {
    this.checkDestroyed();
    return this.value;
  }

  /**
   * Set new value and notify subscribers
   */
  set(value: T): void {
    this.checkDestroyed();
    
    if (this.equals(this.value, value)) {
      return;
    }

    const oldValue = this.value;
    this.value = value;
    this.notify(oldValue, value);
  }

  /**
   * Subscribe to value changes
   */
  subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber {
    this.checkDestroyed();
    
    this.subscribers.add(subscriber);
    
    // Call subscriber immediately with current value
    subscriber(this.value);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Notify all subscribers
   */
  protected notify(oldValue: T, newValue: T): void {
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(newValue);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }

  /**
   * Check equality (can be overridden)
   */
  protected equals(a: T, b: T): boolean {
    return Object.is(a, b);
  }

  /**
   * Check if destroyed
   */
  protected checkDestroyed(): void {
    if (this.isDestroyed) {
      throw new Error('Observable has been destroyed');
    }
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Destroy the observable
   */
  destroy(): void {
    this.clearSubscribers();
    this.isDestroyed = true;
  }
}

/**
 * Computed observable that derives from other observables
 */
export class ComputedObservable<T> extends Observable<T> {
  private dependencies: Observable<any>[];
  private compute: (...values: any[]) => T;
  private unsubscribers: StateUnsubscriber[] = [];

  constructor(
    dependencies: Observable<any> | Observable<any>[],
    compute: (...values: any[]) => T,
    initial?: T
  ) {
    const deps = Array.isArray(dependencies) ? dependencies : [dependencies];
    const initialValue = initial !== undefined 
      ? initial 
      : compute(...deps.map(d => d.get()));
    
    super(initialValue);
    
    this.dependencies = deps;
    this.compute = compute;
    
    // Subscribe to dependencies
    this.subscribeToDependencies();
  }

  /**
   * Subscribe to all dependencies
   */
  private subscribeToDependencies(): void {
    this.dependencies.forEach((dep, index) => {
      const unsubscribe = dep.subscribe(() => {
        this.recompute();
      });
      this.unsubscribers.push(unsubscribe);
    });
  }

  /**
   * Recompute value when dependencies change
   */
  private recompute(): void {
    const values = this.dependencies.map(d => d.get());
    const newValue = this.compute(...values);
    super.set(newValue);
  }

  /**
   * Override set to make it read-only
   */
  set(value: T): void {
    throw new Error('Cannot set value on computed observable');
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    // Unsubscribe from all dependencies
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    super.destroy();
  }
}

/**
 * Batch updates to prevent multiple notifications
 */
export class BatchedObservable<T> extends Observable<T> {
  private isBatching = false;
  private pendingValue: T | undefined;

  /**
   * Start batching updates
   */
  startBatch(): void {
    this.isBatching = true;
  }

  /**
   * End batch and apply pending updates
   */
  endBatch(): void {
    this.isBatching = false;
    
    if (this.pendingValue !== undefined) {
      const value = this.pendingValue;
      this.pendingValue = undefined;
      super.set(value);
    }
  }

  /**
   * Set value (batched if in batch mode)
   */
  set(value: T): void {
    if (this.isBatching) {
      this.pendingValue = value;
    } else {
      super.set(value);
    }
  }

  /**
   * Execute function with batched updates
   */
  batch(fn: () => void): void {
    this.startBatch();
    try {
      fn();
    } finally {
      this.endBatch();
    }
  }
}

/**
 * Observable with history support
 */
export class HistoryObservable<T> extends Observable<T> {
  private past: T[] = [];
  private future: T[] = [];
  private maxHistory: number;

  constructor(initial: T, maxHistory = 100) {
    super(initial);
    this.maxHistory = maxHistory;
  }

  /**
   * Set value and record in history
   */
  set(value: T): void {
    const current = this.get();
    
    // Add current to past
    this.past.push(current);
    
    // Limit history size
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    
    // Clear future on new change
    this.future = [];
    
    super.set(value);
  }

  /**
   * Undo to previous value
   */
  undo(): boolean {
    if (this.past.length === 0) {
      return false;
    }

    const current = this.get();
    const previous = this.past.pop()!;
    
    this.future.unshift(current);
    super.set(previous);
    
    return true;
  }

  /**
   * Redo to next value
   */
  redo(): boolean {
    if (this.future.length === 0) {
      return false;
    }

    const current = this.get();
    const next = this.future.shift()!;
    
    this.past.push(current);
    super.set(next);
    
    return true;
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.past.length > 0;
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.past = [];
    this.future = [];
  }

  /**
   * Get history info
   */
  getHistoryInfo(): { past: number; future: number } {
    return {
      past: this.past.length,
      future: this.future.length
    };
  }
}
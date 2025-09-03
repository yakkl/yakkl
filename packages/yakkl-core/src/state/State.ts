/**
 * State Implementation
 * Writable, Readable, and Derived states
 */

import type {
  IState,
  IReadableState,
  IWritableState,
  IDerivedState,
  StateOptions,
  StateSetter,
  StateUpdater,
  StateSubscriber,
  StateUnsubscriber
} from '../interfaces/state.interface';
import { Observable, ComputedObservable } from './Observable';

/**
 * Base state implementation
 */
export class State<T> implements IState<T> {
  protected observable: Observable<T>;
  protected options: StateOptions<T>;

  constructor(initial: T, options: StateOptions<T> = {}) {
    this.options = options;
    
    // Apply transformer if provided
    const value = options.transformer ? options.transformer(initial) : initial;
    
    // Create observable with custom equality if provided
    this.observable = new Observable(value);
    
    if (options.equals) {
      (this.observable as any).equals = options.equals;
    }
  }

  /**
   * Get current value
   */
  get(): T {
    return this.observable.get();
  }

  /**
   * Set new value
   */
  set(value: StateSetter<T>): void {
    const newValue = typeof value === 'function'
      ? (value as StateUpdater<T>)(this.get())
      : value;

    // Validate if validator provided
    if (this.options.validator && !this.options.validator(newValue)) {
      console.warn('State validation failed for value:', newValue);
      return;
    }

    // Apply transformer if provided
    const transformedValue = this.options.transformer
      ? this.options.transformer(newValue)
      : newValue;

    this.observable.set(transformedValue);
  }

  /**
   * Update value using updater function
   */
  update(updater: StateUpdater<T>): void {
    this.set(updater);
  }

  /**
   * Subscribe to changes
   */
  subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber {
    return this.observable.subscribe(subscriber);
  }

  /**
   * Destroy the state
   */
  destroy(): void {
    this.observable.destroy();
  }
}

/**
 * Readable state (read-only)
 */
export class ReadableState<T> implements IReadableState<T> {
  protected observable: Observable<T>;

  constructor(initial: T, options: StateOptions<T> = {}) {
    // Apply transformer if provided
    const value = options.transformer ? options.transformer(initial) : initial;
    
    this.observable = new Observable(value);
    
    if (options.equals) {
      (this.observable as any).equals = options.equals;
    }
  }

  /**
   * Get current value
   */
  get(): T {
    return this.observable.get();
  }

  /**
   * Subscribe to changes
   */
  subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber {
    return this.observable.subscribe(subscriber);
  }

  /**
   * Destroy the state
   */
  destroy(): void {
    this.observable.destroy();
  }
}

/**
 * Writable state with reset capability
 */
export class WritableState<T> extends State<T> implements IWritableState<T> {
  private initialValue: T;

  constructor(initial: T, options: StateOptions<T> = {}) {
    super(initial, options);
    this.initialValue = initial;
  }

  /**
   * Reset to initial value
   */
  reset(): void {
    this.set(this.initialValue);
  }
}

/**
 * Derived state computed from other states
 */
export class DerivedState<T> implements IDerivedState<T> {
  private computedObservable: ComputedObservable<T>;
  readonly dependencies: IReadableState[];

  constructor(
    dependencies: IReadableState | IReadableState[],
    fn: (...values: any[]) => T,
    initial?: T
  ) {
    const deps = Array.isArray(dependencies) ? dependencies : [dependencies];
    this.dependencies = deps;

    // Convert IReadableState to Observable
    const observables = deps.map(dep => {
      // Access the internal observable
      return (dep as any).observable || new Observable(dep.get());
    });

    this.computedObservable = new ComputedObservable(
      observables,
      fn,
      initial
    );
  }

  /**
   * Get current value
   */
  get(): T {
    return this.computedObservable.get();
  }

  /**
   * Subscribe to changes
   */
  subscribe(subscriber: StateSubscriber<T>): StateUnsubscriber {
    return this.computedObservable.subscribe(subscriber);
  }

  /**
   * Destroy the state
   */
  destroy(): void {
    this.computedObservable.destroy();
  }
}

/**
 * Create a writable state
 */
export function writable<T>(initial: T, options?: StateOptions<T>): IWritableState<T> {
  return new WritableState(initial, options);
}

/**
 * Create a readable state
 */
export function readable<T>(initial: T, options?: StateOptions<T>): IReadableState<T> {
  return new ReadableState(initial, options);
}

/**
 * Create a derived state
 */
export function derived<T>(
  dependencies: IReadableState | IReadableState[],
  fn: (...values: any[]) => T,
  initial?: T
): IDerivedState<T> {
  return new DerivedState(dependencies, fn, initial);
}

/**
 * Get value from state-like object
 */
export function get<T>(state: IReadableState<T> | T): T {
  if (state && typeof state === 'object' && 'get' in state) {
    return (state as IReadableState<T>).get();
  }
  return state as T;
}
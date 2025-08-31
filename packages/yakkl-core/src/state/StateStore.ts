/**
 * State Store Implementation
 * Centralized state management with key-based access
 */

import type {
  IStateStore,
  StateOptions,
  StateUpdater,
  StateSubscriber,
  StateUnsubscriber
} from '../interfaces/state.interface';
import { WritableState } from './State';
import { BatchedObservable } from './Observable';

/**
 * State store for managing multiple states
 */
export class StateStore<T extends Record<string, any>> implements IStateStore<T> {
  private states: Map<keyof T, WritableState<any>> = new Map();
  private storeObservable: BatchedObservable<T>;
  private initialState: T;
  private options: StateOptions<T>;

  constructor(initial: T, options: StateOptions<T> = {}) {
    this.initialState = { ...initial };
    this.options = options;
    this.storeObservable = new BatchedObservable(initial);

    // Initialize individual states
    this.initializeStates(initial);
  }

  /**
   * Initialize states for each key
   */
  private initializeStates(initial: T): void {
    Object.keys(initial).forEach(key => {
      const state = new WritableState(initial[key], {
        ...this.options,
        persistKey: this.options.persistKey ? `${this.options.persistKey}.${key}` : undefined
      });

      // Subscribe to individual state changes
      state.subscribe((value: any) => {
        this.handleStateChange(key as keyof T, value);
      });

      this.states.set(key as keyof T, state);
    });
  }

  /**
   * Handle individual state change
   */
  private handleStateChange<K extends keyof T>(key: K, value: T[K]): void {
    const currentState = this.storeObservable.get();
    const newState = { ...currentState, [key]: value };
    
    this.storeObservable.batch(() => {
      this.storeObservable.set(newState);
    });
  }

  /**
   * Get state slice
   */
  get<K extends keyof T>(key: K): T[K] {
    const state = this.states.get(key);
    if (!state) {
      throw new Error(`State key "${String(key)}" not found`);
    }
    return state.get();
  }

  /**
   * Set state slice
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    const state = this.states.get(key);
    if (!state) {
      // Create new state if it doesn't exist
      const newState = new WritableState(value, {
        ...this.options,
        persistKey: this.options.persistKey ? `${this.options.persistKey}.${String(key)}` : undefined
      });
      
      newState.subscribe((val: any) => {
        this.handleStateChange(key, val);
      });
      
      this.states.set(key, newState);
    } else {
      state.set(value);
    }
  }

  /**
   * Update state slice
   */
  update<K extends keyof T>(key: K, updater: StateUpdater<T[K]>): void {
    const currentValue = this.get(key);
    const newValue = updater(currentValue);
    this.set(key, newValue);
  }

  /**
   * Subscribe to specific key
   */
  subscribe<K extends keyof T>(
    key: K,
    subscriber: StateSubscriber<T[K]>
  ): StateUnsubscriber {
    const state = this.states.get(key);
    if (!state) {
      throw new Error(`State key "${String(key)}" not found`);
    }
    return state.subscribe(subscriber);
  }

  /**
   * Subscribe to entire store
   */
  subscribeAll(subscriber: StateSubscriber<T>): StateUnsubscriber {
    return this.storeObservable.subscribe(subscriber);
  }

  /**
   * Get entire state
   */
  getState(): T {
    return this.storeObservable.get();
  }

  /**
   * Set entire state
   */
  setState(state: Partial<T>): void {
    this.storeObservable.batch(() => {
      Object.entries(state).forEach(([key, value]) => {
        this.set(key as keyof T, value);
      });
    });
  }

  /**
   * Reset store to initial state
   */
  reset(): void {
    this.storeObservable.batch(() => {
      this.states.forEach((state, key) => {
        state.reset();
      });
    });
  }

  /**
   * Select a value from the store
   */
  select<R>(selector: (state: T) => R): R {
    return selector(this.getState());
  }

  /**
   * Subscribe to selected value
   */
  subscribeSelect<R>(
    selector: (state: T) => R,
    subscriber: StateSubscriber<R>
  ): StateUnsubscriber {
    let previousValue = selector(this.getState());
    
    return this.subscribeAll((state) => {
      const newValue = selector(state);
      if (!Object.is(previousValue, newValue)) {
        previousValue = newValue;
        subscriber(newValue);
      }
    });
  }

  /**
   * Destroy the store
   */
  destroy(): void {
    this.states.forEach(state => state.destroy());
    this.states.clear();
    this.storeObservable.destroy();
  }
}

/**
 * Create a state store
 */
export function createStore<T extends Record<string, any>>(
  initial: T,
  options?: StateOptions<T>
): IStateStore<T> {
  return new StateStore(initial, options);
}

/**
 * Combine multiple stores into one
 */
export function combineStores<T extends Record<string, IStateStore>>(
  stores: T
): IStateStore<{ [K in keyof T]: T[K] extends IStateStore<infer U> ? U : never }> {
  type CombinedState = { [K in keyof T]: T[K] extends IStateStore<infer U> ? U : never };
  
  const initial: any = {};
  Object.keys(stores).forEach(key => {
    initial[key] = stores[key].getState();
  });

  const combinedStore = new StateStore<CombinedState>(initial);

  // Subscribe to individual stores and update combined store
  Object.keys(stores).forEach(key => {
    stores[key].subscribeAll(state => {
      combinedStore.set(key as any, state);
    });
  });

  return combinedStore;
}
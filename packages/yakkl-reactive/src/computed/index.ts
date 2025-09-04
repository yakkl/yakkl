/**
 * Computed values - Automatically derived reactive values
 */

import type { Readable, ComputedOptions } from '../types';
import { writable } from '../store/writable';

/**
 * Create a computed value that automatically updates when its dependencies change
 * Simplified implementation - in production would need dependency tracking
 */
export function computed<T>(
  fn: () => T,
  options: ComputedOptions = {}
): Readable<T> {
  const { lazy = false } = options;
  
  let cachedValue: T;
  let isDirty = true;
  
  // Create a writable store with the computed value
  const store = writable(fn());
  
  // For now, just return a store that computes on access
  // In a real implementation, this would track dependencies
  store.get = () => {
    if (lazy && !isDirty) {
      return cachedValue;
    }
    
    const value = fn();
    cachedValue = value;
    isDirty = false;
    store.set(value);
    
    return value;
  };
  
  return {
    subscribe: store.subscribe,
    get: store.get
  };
}

/**
 * Create a memoized computed value with custom equality check
 */
export function memo<T>(
  fn: () => T,
  deps: Readable<any>[],
  equals?: (a: T, b: T) => boolean
): Readable<T> {
  let lastValue: T;
  let hasValue = false;
  
  // Create derived value from dependencies
  const store = writable<T>(undefined as any);
  
  // Subscribe to all dependencies
  deps.forEach(dep => 
    dep.subscribe(() => {
      const newValue = fn();
      
      if (!hasValue || (equals ? !equals(lastValue, newValue) : lastValue !== newValue)) {
        lastValue = newValue;
        hasValue = true;
        store.set(newValue);
      }
    })
  );
  
  // Initial computation
  const initialValue = fn();
  lastValue = initialValue;
  hasValue = true;
  store.set(initialValue);
  
  // Override subscribe to clean up
  const originalSubscribe = store.subscribe;
  store.subscribe = (subscriber) => {
    const unsubscribe = originalSubscribe(subscriber);
    return () => {
      unsubscribe();
      // Clean up dependency subscriptions when last subscriber leaves
      // (simplified - in production would track subscriber count)
    };
  };
  
  return store;
}
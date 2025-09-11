/**
 * Effects - Side effects that run when reactive values change
 */

import type { Readable, EffectOptions, WatchOptions, Unsubscriber } from '../types';

/**
 * Create an effect that runs when its dependencies change
 */
export function effect(
  fn: () => void | (() => void),
  options: EffectOptions = {}
): Unsubscriber {
  const { immediate = true } = options;
  // flush option reserved for future scheduler integration
  
  let cleanup: (() => void) | void;
  let isRunning = false;
  
  const run = () => {
    if (isRunning) return;
    
    isRunning = true;
    
    // Clean up previous effect
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
    
    // Run the effect
    try {
      cleanup = fn();
    } finally {
      isRunning = false;
    }
  };
  
  // Run immediately if requested
  if (immediate) {
    run();
  }
  
  // For future: schedule effects based on flush timing
  // This would integrate with a scheduler system
  // Currently simplified to always run synchronously
  
  // Return cleanup function
  return () => {
    if (cleanup) {
      cleanup();
    }
  };
}

/**
 * Watch a reactive value and run a callback when it changes
 */
export function watch<T>(
  source: Readable<T> | (() => T),
  callback: (value: T, oldValue: T | undefined) => void,
  options: WatchOptions<T> = {}
): Unsubscriber {
  const { immediate = false, deep = false } = options;
  
  let oldValue: T | undefined = options.oldValue;
  let unsubscribe: Unsubscriber | undefined;
  
  const handleChange = (value: T) => {
    if (deep ? !deepEqual(value, oldValue) : value !== oldValue) {
      callback(value, oldValue);
      oldValue = deep ? deepClone(value) : value;
    }
  };
  
  if (typeof source === 'function') {
    // Watch a getter function
    let currentValue = source();
    
    if (immediate) {
      callback(currentValue, oldValue);
    }
    
    oldValue = deep ? deepClone(currentValue) : currentValue;
    
    // Re-run the getter periodically (simplified for now)
    const interval = setInterval(() => {
      const newValue = source();
      handleChange(newValue);
    }, 100);
    
    return () => clearInterval(interval);
  } else {
    // Watch a store
    unsubscribe = source.subscribe((value) => {
      if (immediate || oldValue !== undefined) {
        handleChange(value);
      } else {
        oldValue = deep ? deepClone(value) : value;
      }
    });
    
    return unsubscribe;
  }
}

/**
 * Watch effect - Automatically track dependencies and re-run
 */
export function watchEffect(
  fn: () => void | (() => void),
  options: EffectOptions = {}
): Unsubscriber {
  return effect(fn, { ...options, immediate: true });
}

// Helper functions
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

function deepClone<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as any;
  if (value instanceof Array) return value.map(item => deepClone(item)) as any;
  if (value instanceof Set) return new Set(Array.from(value).map(item => deepClone(item))) as any;
  if (value instanceof Map) return new Map(Array.from(value.entries()).map(([k, v]) => [deepClone(k), deepClone(v)])) as any;
  
  const cloned: any = {};
  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      cloned[key] = deepClone(value[key]);
    }
  }
  return cloned;
}
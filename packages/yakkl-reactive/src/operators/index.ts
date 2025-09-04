/**
 * Operators for transforming reactive values
 */

import type { Readable, OperatorFunction, MonoTypeOperatorFunction } from '../types';
import { writable } from '../store/writable';
import { debounce as debounceUtil, throttle as throttleUtil } from '../utils/timing';

/**
 * Map values from a source store
 */
export function map<T, R>(
  project: (value: T) => R
): OperatorFunction<T, R> {
  return (source: Readable<T>) => {
    const output = writable<R>(undefined as any);
    
    source.subscribe((value) => {
      output.set(project(value));
    });
    
    return output;
  };
}

/**
 * Filter values from a source store
 */
export function filter<T>(
  predicate: (value: T) => boolean
): MonoTypeOperatorFunction<T> {
  return (source: Readable<T>) => {
    let hasValue = false;
    let lastValue: T;
    const output = writable<T>(undefined as any);
    
    source.subscribe((value) => {
      if (predicate(value)) {
        hasValue = true;
        lastValue = value;
        output.set(value);
      } else if (hasValue) {
        output.set(lastValue);
      }
    });
    
    return output;
  };
}

/**
 * Debounce values from a source store
 */
export function debounce<T>(
  wait: number
): MonoTypeOperatorFunction<T> {
  return (source: Readable<T>) => {
    const output = writable<T>(undefined as any);
    const debounced = debounceUtil((value: T) => output.set(value), wait);
    
    source.subscribe((value) => {
      debounced(value);
    });
    
    return output;
  };
}

/**
 * Throttle values from a source store
 */
export function throttle<T>(
  limit: number
): MonoTypeOperatorFunction<T> {
  return (source: Readable<T>) => {
    const output = writable<T>(undefined as any);
    const throttled = throttleUtil((value: T) => output.set(value), limit);
    
    source.subscribe((value) => {
      throttled(value);
    });
    
    return output;
  };
}

/**
 * Take only the first n values
 */
export function take<T>(
  count: number
): MonoTypeOperatorFunction<T> {
  return (source: Readable<T>) => {
    let taken = 0;
    let completed = false;
    const output = writable<T>(undefined as any);
    
    source.subscribe((value) => {
      if (!completed && taken < count) {
        taken++;
        if (taken >= count) {
          completed = true;
        }
        output.set(value);
      }
    });
    
    return output;
  };
}

/**
 * Skip the first n values
 */
export function skip<T>(
  count: number
): MonoTypeOperatorFunction<T> {
  return (source: Readable<T>) => {
    let skipped = 0;
    const output = writable<T>(undefined as any);
    
    source.subscribe((value) => {
      if (skipped >= count) {
        output.set(value);
      } else {
        skipped++;
      }
    });
    
    return output;
  };
}

/**
 * Distinct values only (no consecutive duplicates)
 */
export function distinctUntilChanged<T>(
  equals?: (a: T, b: T) => boolean
): MonoTypeOperatorFunction<T> {
  return (source: Readable<T>) => {
    let hasValue = false;
    let lastValue: T;
    const output = writable<T>(undefined as any);
    
    source.subscribe((value) => {
      if (!hasValue) {
        hasValue = true;
        lastValue = value;
        output.set(value);
      } else {
        const isEqual = equals ? equals(lastValue, value) : lastValue === value;
        if (!isEqual) {
          lastValue = value;
          output.set(value);
        }
      }
    });
    
    return output;
  };
}

/**
 * Scan - accumulate values over time
 */
export function scan<T, R>(
  accumulator: (acc: R, value: T) => R,
  seed: R
): OperatorFunction<T, R> {
  return (source: Readable<T>) => {
    let accumulated = seed;
    const output = writable<R>(seed);
    
    source.subscribe((value) => {
      accumulated = accumulator(accumulated, value);
      output.set(accumulated);
    });
    
    return output;
  };
}

/**
 * Pipe multiple operators together
 */
export function pipe<T>(): MonoTypeOperatorFunction<T>;
export function pipe<T, A>(op1: OperatorFunction<T, A>): OperatorFunction<T, A>;
export function pipe<T, A, B>(
  op1: OperatorFunction<T, A>,
  op2: OperatorFunction<A, B>
): OperatorFunction<T, B>;
export function pipe<T, A, B, C>(
  op1: OperatorFunction<T, A>,
  op2: OperatorFunction<A, B>,
  op3: OperatorFunction<B, C>
): OperatorFunction<T, C>;
export function pipe(...operators: OperatorFunction<any, any>[]): OperatorFunction<any, any> {
  return (source: Readable<any>) => {
    return operators.reduce((prev, operator) => operator(prev), source);
  };
}
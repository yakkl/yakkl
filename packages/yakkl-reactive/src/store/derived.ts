/**
 * Derived store implementation
 */

import type { Readable, Unsubscriber } from '../types';
import { readable } from './readable';

/**
 * Create a store that derives its value from one or more other stores
 */
// Single store with setter callback
export function derived<S, T>(
  stores: Readable<S>,
  fn: (value: S, set: (value: T) => void) => Unsubscriber | void,
  initialValue?: T
): Readable<T>;

// Multiple stores with setter callback
export function derived<T>(
  stores: Array<Readable<any>>,
  fn: (values: any[], set: (value: T) => void) => Unsubscriber | void,
  initialValue?: T
): Readable<T>;

// Single store with simple function
export function derived<S, T>(
  stores: Readable<S>,
  fn: (value: S) => T,
  initialValue?: T
): Readable<T>;

// Multiple stores with simple function
export function derived<T>(
  stores: Array<Readable<any>>,
  fn: (values: any[]) => T,
  initialValue?: T
): Readable<T>;

export function derived<T>(
  stores: Readable<any> | Array<Readable<any>>,
  fn: any,
  initialValue?: T
): Readable<T> {
  const single = !Array.isArray(stores);
  const storesArray: Array<Readable<any>> = single ? [stores] : stores;
  const auto = fn.length < 2;

  return readable(initialValue!, (set) => {
    let inited = false;
    const values: any[] = [];
    let pending = 0;
    let cleanup: Unsubscriber | void;

    const sync = () => {
      if (pending) {
        return;
      }
      cleanup?.();
      const result = fn(single ? values[0] : values, set);
      if (auto) {
        set(result);
      } else {
        cleanup = result;
      }
    };

    const unsubscribers = storesArray.map((store, i) =>
      store.subscribe((value) => {
        values[i] = value;
        pending &= ~(1 << i);
        if (inited) {
          sync();
        }
      })
    );

    inited = true;
    sync();

    return function stop() {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      cleanup?.();
    };
  });
}
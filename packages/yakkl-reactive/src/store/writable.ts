/**
 * Writable store implementation
 */

import type { Writable, Subscriber, Unsubscriber, Updater, StartStopNotifier } from '../types';
import { safeNotEquals } from '../utils/equality';

/**
 * Create a writable store with an initial value
 */
export function writable<T>(
  value: T,
  start?: StartStopNotifier<T>
): Writable<T> {
  let stop: Unsubscriber | null = null;
  const subscribers = new Set<Subscriber<T>>();

  function set(newValue: T): void {
    if (safeNotEquals(value, newValue)) {
      value = newValue;
      if (stop) {
        // Store is active, notify subscribers
        subscribers.forEach((subscriber) => {
          subscriber(value);
        });
      }
    }
  }

  function update(fn: Updater<T>): void {
    set(fn(value));
  }

  function subscribe(subscriber: Subscriber<T>): Unsubscriber {
    subscribers.add(subscriber);
    
    if (subscribers.size === 1) {
      // First subscriber, start the store
      stop = start?.(set) || null;
    }
    
    // Immediately call subscriber with current value
    subscriber(value);
    
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        // Last subscriber removed, stop the store
        stop();
        stop = null;
      }
    };
  }

  function get(): T {
    return value;
  }

  return { set, update, subscribe, get };
}
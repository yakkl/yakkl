/**
 * Readable store implementation
 */

import type { Readable, StartStopNotifier } from '../types';
import { writable } from './writable';

/**
 * Create a readable store with an initial value
 * Readable stores can only be updated from within their start function
 */
export function readable<T>(
  value: T,
  start?: StartStopNotifier<T>
): Readable<T> {
  const { subscribe, get } = writable(value, start);
  
  return {
    subscribe,
    get,
  };
}
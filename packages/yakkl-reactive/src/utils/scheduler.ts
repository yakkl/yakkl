/**
 * Scheduler utilities for batching and controlling reactive updates
 */

import type { BatchOptions } from '../types';

let batchDepth = 0;
let batchedUpdates: Set<() => void> = new Set();

/**
 * Batch multiple updates into a single update cycle
 */
export function batch<T>(fn: () => T, options: BatchOptions = {}): T {
  const { onError, maxBatchSize = 1000 } = options;
  
  batchDepth++;
  
  try {
    const result = fn();
    
    if (--batchDepth === 0) {
      // We're at the end of the batch, flush all updates
      const updates = Array.from(batchedUpdates);
      batchedUpdates.clear();
      
      if (updates.length > maxBatchSize) {
        console.warn(`Batch size (${updates.length}) exceeds maximum (${maxBatchSize})`);
      }
      
      for (const update of updates) {
        try {
          update();
        } catch (error) {
          if (onError) {
            onError(error as Error);
          } else {
            console.error('Error in batched update:', error);
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    batchDepth = 0;
    batchedUpdates.clear();
    throw error;
  }
}

/**
 * Add an update to the current batch
 */
export function queueUpdate(fn: () => void): void {
  if (batchDepth > 0) {
    batchedUpdates.add(fn);
  } else {
    fn();
  }
}

/**
 * Run a function without tracking reactive dependencies
 */
export function untrack<T>(fn: () => T): T {
  // This would integrate with the dependency tracking system
  // For now, just run the function
  return fn();
}

/**
 * Schedule a microtask
 */
export function nextTick(fn: () => void): void {
  Promise.resolve().then(fn);
}

/**
 * Flush all pending updates immediately
 */
export function flush(): void {
  const updates = Array.from(batchedUpdates);
  batchedUpdates.clear();
  
  for (const update of updates) {
    update();
  }
}
/**
 * @yakkl/reactive - High-performance reactive state management library
 * 
 * Main entry point that exports all public APIs
 */

import { globalRegistry } from './registry/store-registry';

// Core reactive primitives
export * from './store';
export * from './computed';
export * from './effect';

// Operators for transforming reactive values - export selectively to avoid conflicts
export { 
  map, 
  filter, 
  take, 
  skip, 
  distinctUntilChanged, 
  scan, 
  pipe,
  debounce as debounceOperator,
  throttle as throttleOperator
} from './operators';

// Utility functions - export selectively to avoid conflicts
export { 
  safeNotEquals, 
  shallowEqual, 
  deepEqual,
  batch, 
  untrack, 
  queueUpdate, 
  nextTick, 
  flush,
  isRef, 
  isReactive, 
  toRaw, 
  markRaw,
  ref,
  unref,
  debounce as debounceUtil,
  throttle as throttleUtil,
  rafUpdate,
  delay,
  createTimeout
} from './utils';

// Type definitions
export * from './types';

// Version info
export const VERSION = '0.1.0';

// Re-export commonly used items at top level
export { createstore, writable, readable, derived } from './store';
export { computed } from './computed';
export { effect, watch, watchEffect } from './effect';
// batch and untrack are already exported in the utils section below

// --------------------------------
// Core exports
export { ReactiveStore } from './core/reactive-store';
export { SynchronousStore } from './core/sync-store';

// Type exports
export type {
  Store,
  SyncStore,
  StoreAdapter,
  SyncAdapter,
  Subscriber,
  Unsubscriber,
  ChangeMetadata,
  Middleware,
  Transform,
  StoreOptions,
  ReactiveStoreConfig,
  ChromeStorageArea,
  ChromeStorageChange,
  ChromeStorageChangedEvent,
  ChromeStorage,
  ChromeAPI
} from './types';

// Adapter exports
export { MemoryAdapter, SyncMemoryAdapter, SecureMemoryAdapter } from './adapters/memory';
export { 
  ChromeStorageAdapter, 
  LocalStorageAdapter, 
  SessionStorageAdapter 
} from './adapters/browser';
export { 
  DurableObjectAdapter, 
  D1Adapter, 
  KVAdapter 
} from './adapters/cloudflare';
export { 
  PostgresAdapter, 
  RedisAdapter, 
  MongoAdapter 
} from './adapters/database';

// Middleware exports
export { SyncMiddleware } from './middleware/sync';
export { PersistenceMiddleware } from './middleware/persistence';
export { CacheMiddleware } from './middleware/cache';
export { LoggerMiddleware } from './middleware/logger';

// Registry exports  
export { StoreRegistry, globalRegistry } from './registry/store-registry';
export type { StoreDefinition } from './registry/store-registry';

// Helper exports
export { createStore, createSyncStore } from './helpers/create-store';
export type { CreateStoreOptions } from './helpers/create-store';

// Convenience re-export
export const registry = globalRegistry;

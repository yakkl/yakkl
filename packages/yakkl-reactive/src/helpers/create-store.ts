import { Store, StoreAdapter, Middleware, StoreOptions } from '../types';
import { ReactiveStore } from '../core/reactive-store';
import { SynchronousStore } from '../core/sync-store';
import { MemoryAdapter, SyncMemoryAdapter } from '../adapters/memory';
import {
  ChromeStorageAdapter,
  LocalStorageAdapter,
  SessionStorageAdapter,
} from '../adapters/browser';
import { PersistenceMiddleware } from '../middleware/persistence';
import { CacheMiddleware } from '../middleware/cache';
import { LoggerMiddleware } from '../middleware/logger';

export interface CreateStoreOptions<T> {
  type?: 'memory' | 'chrome-local' | 'chrome-sync' | 'local-storage' | 'session-storage';
  initialValue?: T;
  key?: string;
  cache?: {
    enabled: boolean;
    ttlMs?: number;
  };
  persistence?: {
    enabled: boolean;
    adapter?: StoreAdapter<T>;
    batchMs?: number;
  };
  logging?: {
    enabled: boolean;
    logValues?: boolean;
  };
  middleware?: Middleware<T>[];
}

export function createStore<T>(
  initialValueOrOptions: T | CreateStoreOptions<T>,
  options?: CreateStoreOptions<T>
): Store<T> {
  // Handle overloaded parameters
  let config: CreateStoreOptions<T>;

  if (options) {
    config = { ...options, initialValue: initialValueOrOptions as T };
  } else if (
    typeof initialValueOrOptions === 'object' &&
    initialValueOrOptions !== null &&
    'type' in initialValueOrOptions
  ) {
    config = initialValueOrOptions as CreateStoreOptions<T>;
  } else {
    config = { initialValue: initialValueOrOptions as T };
  }

  // Set defaults
  config = {
    type: 'memory',
    key: 'default',
    ...config,
  };

  // Create adapter
  let adapter: StoreAdapter<T>;

  switch (config.type) {
    case 'chrome-local':
      if (typeof chrome !== 'undefined' && chrome.storage) {
        adapter = new ChromeStorageAdapter('local', config.key!);
      } else {
        console.warn('Chrome storage not available, falling back to memory');
        adapter = new MemoryAdapter(config.initialValue || null);
      }
      break;

    case 'chrome-sync':
      if (typeof chrome !== 'undefined' && chrome.storage) {
        adapter = new ChromeStorageAdapter('sync', config.key!);
      } else {
        console.warn('Chrome storage not available, falling back to memory');
        adapter = new MemoryAdapter(config.initialValue || null);
      }
      break;

    case 'local-storage':
      if (typeof localStorage !== 'undefined') {
        adapter = new LocalStorageAdapter(config.key!);
      } else {
        console.warn('localStorage not available, falling back to memory');
        adapter = new MemoryAdapter(config.initialValue || null);
      }
      break;

    case 'session-storage':
      if (typeof sessionStorage !== 'undefined') {
        adapter = new SessionStorageAdapter(config.key!);
      } else {
        console.warn('sessionStorage not available, falling back to memory');
        adapter = new MemoryAdapter(config.initialValue || null);
      }
      break;

    case 'memory':
    default:
      adapter = new MemoryAdapter(config.initialValue || null);
  }

  // Create store
  const storeOptions: StoreOptions = {
    key: config.key!,
    cacheMs: config.cache?.enabled ? config.cache.ttlMs : undefined,
  };

  const store = new ReactiveStore(adapter, storeOptions);

  // Add middleware
  if (config.cache?.enabled) {
    store.use(
      new CacheMiddleware(undefined, {
        ttlMs: config.cache.ttlMs,
      })
    );
  }

  if (config.persistence?.enabled && config.persistence.adapter) {
    store.use(
      new PersistenceMiddleware(config.persistence.adapter, {
        batchMs: config.persistence.batchMs,
      })
    );
  }

  if (config.logging?.enabled) {
    store.use(
      new LoggerMiddleware(console, {
        logValues: config.logging.logValues,
      })
    );
  }

  if (config.middleware) {
    config.middleware.forEach((mw) => store.use(mw));
  }

  return store;
}

export function createSyncStore<T>(initialValue: T, key: string = 'default'): SynchronousStore<T> {
  const adapter = new SyncMemoryAdapter(initialValue);
  return new SynchronousStore(adapter, key);
}

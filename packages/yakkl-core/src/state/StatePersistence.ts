/**
 * State Persistence Layer
 * Automatic state persistence to storage
 */

import type {
  IStatePersistence,
  IState,
  StateUnsubscriber
} from '../interfaces/state.interface';
import type { IStorage } from '../interfaces/storage.interface';
import { StorageManager } from '../storage/StorageManager';
import { StorageType } from '../interfaces/storage-enhanced.interface';
import { WritableState } from './State';

/**
 * State persistence implementation
 */
export class StatePersistence implements IStatePersistence {
  private storage: IStorage;
  private prefix: string;

  constructor(storage?: IStorage, prefix = 'state') {
    this.storage = storage || new StorageManager().getBestAvailableStorage();
    this.prefix = prefix;
  }

  /**
   * Get storage key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Load state from storage
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      const storageKey = this.getKey(key);
      const value = await this.storage.get<T>(storageKey);
      return value;
    } catch (error) {
      console.error(`Failed to load state for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Save state to storage
   */
  async save<T>(key: string, value: T): Promise<void> {
    try {
      const storageKey = this.getKey(key);
      await this.storage.set(storageKey, value);
    } catch (error) {
      console.error(`Failed to save state for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Remove state from storage
   */
  async remove(key: string): Promise<void> {
    try {
      const storageKey = this.getKey(key);
      await this.storage.remove(storageKey);
    } catch (error) {
      console.error(`Failed to remove state for key "${key}":`, error);
      throw error;
    }
  }

  /**
   * Clear all persisted state
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.storage.getKeys();
      const stateKeys = keys.filter(key => key.startsWith(this.prefix));
      await this.storage.removeMultiple(stateKeys);
    } catch (error) {
      console.error('Failed to clear persisted state:', error);
      throw error;
    }
  }
}

/**
 * Persisted state wrapper
 */
export class PersistedState<T> implements IState<T> {
  private state: IState<T>;
  private persistence: IStatePersistence;
  private key: string;
  private saveDebounceTimer?: NodeJS.Timeout;
  private saveDebounceMs: number;

  constructor(
    state: IState<T>,
    key: string,
    persistence?: IStatePersistence,
    saveDebounceMs = 500
  ) {
    this.state = state;
    this.key = key;
    this.persistence = persistence || new StatePersistence();
    this.saveDebounceMs = saveDebounceMs;

    // Load initial value from storage
    this.loadFromStorage();

    // Subscribe to state changes for auto-save
    this.state.subscribe(value => {
      this.saveToStorage(value);
    });
  }

  /**
   * Load value from storage
   */
  private async loadFromStorage(): Promise<void> {
    const value = await this.persistence.load<T>(this.key);
    if (value !== null) {
      this.state.set(value);
    }
  }

  /**
   * Save value to storage (debounced)
   */
  private saveToStorage(value: T): void {
    // Clear existing timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Set new timer
    this.saveDebounceTimer = setTimeout(async () => {
      try {
        await this.persistence.save(this.key, value);
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    }, this.saveDebounceMs);
  }

  /**
   * Get current value
   */
  get(): T {
    return this.state.get();
  }

  /**
   * Set new value
   */
  set(value: T | ((prev: T) => T)): void {
    this.state.set(value);
  }

  /**
   * Update value
   */
  update(updater: (value: T) => T): void {
    this.state.update(updater);
  }

  /**
   * Subscribe to changes
   */
  subscribe(subscriber: (value: T) => void): StateUnsubscriber {
    return this.state.subscribe(subscriber);
  }

  /**
   * Force save to storage immediately
   */
  async flush(): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = undefined;
    }
    await this.persistence.save(this.key, this.get());
  }

  /**
   * Clear persisted value
   */
  async clearPersisted(): Promise<void> {
    await this.persistence.remove(this.key);
  }
}

/**
 * Create a persisted state
 */
export function persisted<T>(
  initial: T,
  key: string,
  options?: {
    storage?: IStorage;
    storageType?: StorageType;
    prefix?: string;
    debounceMs?: number;
  }
): PersistedState<T> {
  const { storage, storageType, prefix, debounceMs } = options || {};
  
  let storageInstance = storage;
  if (!storageInstance && storageType) {
    const manager = new StorageManager();
    storageInstance = manager.getStorage(storageType);
  }

  const persistence = new StatePersistence(storageInstance, prefix);
  const state = new WritableState(initial);
  
  return new PersistedState(state, key, persistence, debounceMs);
}

/**
 * Session storage persisted state
 */
export function sessionPersisted<T>(
  initial: T,
  key: string,
  options?: {
    prefix?: string;
    debounceMs?: number;
  }
): PersistedState<T> {
  const manager = new StorageManager();
  const storage = manager.getStorage(StorageType.SESSION);
  
  return persisted(initial, key, {
    storage,
    ...options
  });
}

/**
 * Local storage persisted state
 */
export function localPersisted<T>(
  initial: T,
  key: string,
  options?: {
    prefix?: string;
    debounceMs?: number;
  }
): PersistedState<T> {
  const manager = new StorageManager();
  const storage = manager.getStorage(StorageType.LOCAL);
  
  return persisted(initial, key, {
    storage,
    ...options
  });
}
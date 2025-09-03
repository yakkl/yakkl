/**
 * Base Storage Provider
 * Abstract base class for all storage providers
 */

import type { 
  IStorage, 
  IEnhancedStorage, 
  StorageEntry, 
  StorageMetadata,
  StorageQuery,
  StorageChange,
  StorageWatchCallback,
  UnwatchFn
} from '../interfaces/storage-enhanced.interface';

export abstract class BaseStorageProvider implements IEnhancedStorage {
  protected watchers: Map<string, Set<StorageWatchCallback>> = new Map();
  protected metadata: Map<string, StorageMetadata> = new Map();

  abstract get<T = any>(key: string): Promise<T | null>;
  abstract set<T = any>(key: string, value: T): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  abstract getKeys(): Promise<string[]>;

  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.get<T>(key);
      })
    );
    return result;
  }

  async setMultiple<T = any>(items: Record<string, T>): Promise<void> {
    await Promise.all(
      Object.entries(items).map(([key, value]) => this.set(key, value))
    );
  }

  async removeMultiple(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.remove(key)));
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async getWithMetadata<T = any>(key: string): Promise<StorageEntry<T> | null> {
    const value = await this.get<T>(key);
    if (value === null) return null;

    const metadata = this.metadata.get(key) || this.createDefaultMetadata();
    return { key, value, metadata };
  }

  async setWithMetadata<T = any>(
    key: string, 
    value: T, 
    metadata?: Partial<StorageMetadata>
  ): Promise<void> {
    const now = Date.now();
    const existingMetadata = this.metadata.get(key);
    
    const newMetadata: StorageMetadata = {
      created: existingMetadata?.created || now,
      updated: now,
      accessed: now,
      ...metadata
    };

    this.metadata.set(key, newMetadata);
    await this.set(key, value);
    
    this.notifyWatchers(key, {
      key,
      newValue: value,
      type: 'set'
    });
  }

  async updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    const existing = this.metadata.get(key);
    if (!existing) {
      throw new Error(`No metadata found for key: ${key}`);
    }

    this.metadata.set(key, {
      ...existing,
      ...metadata,
      updated: Date.now()
    });
  }

  async getByTag<T = any>(tag: string): Promise<StorageEntry<T>[]> {
    const keys = await this.getKeys();
    const results: StorageEntry<T>[] = [];

    for (const key of keys) {
      const metadata = this.metadata.get(key);
      if (metadata?.tags?.includes(tag)) {
        const value = await this.get<T>(key);
        if (value !== null) {
          results.push({ key, value, metadata });
        }
      }
    }

    return results;
  }

  async query<T = any>(filter: StorageQuery): Promise<StorageEntry<T>[]> {
    const keys = await this.getKeys();
    const results: StorageEntry<T>[] = [];

    for (const key of keys) {
      if (filter.keyPattern) {
        const pattern = filter.keyPattern instanceof RegExp 
          ? filter.keyPattern 
          : new RegExp(filter.keyPattern);
        if (!pattern.test(key)) continue;
      }

      const metadata = this.metadata.get(key);
      if (!this.matchesFilter(metadata, filter)) continue;

      const value = await this.get<T>(key);
      if (value !== null) {
        results.push({ key, value, metadata });
      }
    }

    // Apply pagination
    const start = filter.offset || 0;
    const end = filter.limit ? start + filter.limit : results.length;
    
    return results.slice(start, end);
  }

  watch(key: string | string[], callback: StorageWatchCallback): UnwatchFn {
    const keys = Array.isArray(key) ? key : [key];
    
    keys.forEach(k => {
      if (!this.watchers.has(k)) {
        this.watchers.set(k, new Set());
      }
      this.watchers.get(k)!.add(callback);
    });

    return () => {
      keys.forEach(k => {
        this.watchers.get(k)?.delete(callback);
      });
    };
  }

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    // Basic transaction support - can be overridden by providers that support real transactions
    try {
      return await operations();
    } catch (error) {
      throw new Error(`Transaction failed: ${error}`);
    }
  }

  protected createDefaultMetadata(): StorageMetadata {
    const now = Date.now();
    return {
      created: now,
      updated: now,
      accessed: now
    };
  }

  protected matchesFilter(metadata: StorageMetadata | undefined, filter: StorageQuery): boolean {
    if (!metadata) return false;

    if (filter.tags && filter.tags.length > 0) {
      if (!metadata.tags || !filter.tags.every(tag => metadata.tags!.includes(tag))) {
        return false;
      }
    }

    if (filter.createdAfter && metadata.created < filter.createdAfter) return false;
    if (filter.createdBefore && metadata.created > filter.createdBefore) return false;
    if (filter.updatedAfter && metadata.updated < filter.updatedAfter) return false;
    if (filter.updatedBefore && metadata.updated > filter.updatedBefore) return false;
    
    if (filter.expired !== undefined) {
      const isExpired = metadata.expires ? metadata.expires < Date.now() : false;
      if (filter.expired !== isExpired) return false;
    }

    return true;
  }

  protected notifyWatchers(key: string, change: StorageChange): void {
    const callbacks = this.watchers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback([change]));
    }
  }
}
/**
 * Versioned Storage Wrapper
 * Adds versioning support to any storage provider
 */

import type { 
  IStorage,
  IVersionedStorage,
  StorageEntry,
  StorageMetadata,
  StorageQuery,
  StorageWatchCallback,
  UnwatchFn,
  StorageVersion,
  StorageChange
} from '../interfaces/storage-enhanced.interface';

export class VersionedStorageWrapper implements IVersionedStorage {
  private storage: IStorage;
  private maxVersions: number;
  private versionPrefix = '__version__';

  constructor(storage: IStorage, maxVersions: number = 10) {
    this.storage = storage;
    this.maxVersions = maxVersions;
  }

  private getVersionKey(key: string, version: string): string {
    return `${this.versionPrefix}:${key}:${version}`;
  }

  private getVersionListKey(key: string): string {
    return `${this.versionPrefix}:list:${key}`;
  }

  private generateVersion(): string {
    return `v${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getHistory(key: string, limit?: number): Promise<StorageVersion[]> {
    const versionListKey = this.getVersionListKey(key);
    const versionList = await this.storage.get<string[]>(versionListKey) || [];
    
    const effectiveLimit = limit || this.maxVersions;
    const versionsToFetch = versionList.slice(-effectiveLimit);
    
    const versions: StorageVersion[] = [];
    
    for (const version of versionsToFetch) {
      const versionKey = this.getVersionKey(key, version);
      const versionData = await this.storage.get<StorageVersion>(versionKey);
      
      if (versionData) {
        versions.push(versionData);
      }
    }
    
    return versions.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getVersion<T = any>(key: string, version: string): Promise<T | null> {
    const versionKey = this.getVersionKey(key, version);
    const versionData = await this.storage.get<StorageVersion<T>>(versionKey);
    
    return versionData ? versionData.value : null;
  }

  async restoreVersion(key: string, version: string): Promise<void> {
    const value = await this.getVersion(key, version);
    
    if (value === null) {
      throw new Error(`Version ${version} not found for key ${key}`);
    }
    
    await this.set(key, value);
  }

  async pruneVersions(key: string, keepCount: number): Promise<void> {
    const versionListKey = this.getVersionListKey(key);
    const versionList = await this.storage.get<string[]>(versionListKey) || [];
    
    if (versionList.length <= keepCount) {
      return;
    }
    
    const versionsToRemove = versionList.slice(0, versionList.length - keepCount);
    
    // Remove old versions
    for (const version of versionsToRemove) {
      const versionKey = this.getVersionKey(key, version);
      await this.storage.remove(versionKey);
    }
    
    // Update version list
    const newVersionList = versionList.slice(-keepCount);
    await this.storage.set(versionListKey, newVersionList);
  }

  // IStorage implementation with versioning
  async get<T = any>(key: string): Promise<T | null> {
    return this.storage.get<T>(key);
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    // Get current value for versioning
    const currentValue = await this.storage.get(key);
    
    if (currentValue !== null) {
      // Create version entry
      const version = this.generateVersion();
      const versionData: StorageVersion<T> = {
        version,
        value: currentValue as T,
        timestamp: Date.now()
      };
      
      // Store version
      const versionKey = this.getVersionKey(key, version);
      await this.storage.set(versionKey, versionData);
      
      // Update version list
      const versionListKey = this.getVersionListKey(key);
      const versionList = await this.storage.get<string[]>(versionListKey) || [];
      versionList.push(version);
      
      // Prune old versions if necessary
      if (versionList.length > this.maxVersions) {
        const versionsToRemove = versionList.slice(0, versionList.length - this.maxVersions);
        
        for (const oldVersion of versionsToRemove) {
          const oldVersionKey = this.getVersionKey(key, oldVersion);
          await this.storage.remove(oldVersionKey);
        }
        
        versionList.splice(0, versionsToRemove.length);
      }
      
      await this.storage.set(versionListKey, versionList);
    }
    
    // Set new value
    await this.storage.set(key, value);
  }

  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    return this.storage.getMultiple<T>(keys);
  }

  async setMultiple<T = any>(items: Record<string, T>): Promise<void> {
    // Version each item individually
    for (const [key, value] of Object.entries(items)) {
      await this.set(key, value);
    }
  }

  async remove(key: string): Promise<void> {
    // Remove all versions
    const versionListKey = this.getVersionListKey(key);
    const versionList = await this.storage.get<string[]>(versionListKey) || [];
    
    for (const version of versionList) {
      const versionKey = this.getVersionKey(key, version);
      await this.storage.remove(versionKey);
    }
    
    await this.storage.remove(versionListKey);
    await this.storage.remove(key);
  }

  async removeMultiple(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.remove(key);
    }
  }

  async clear(): Promise<void> {
    // Clear all including versions
    await this.storage.clear();
  }

  async getKeys(): Promise<string[]> {
    const allKeys = await this.storage.getKeys();
    
    // Filter out version-related keys
    return allKeys.filter((key: string) => !key.startsWith(this.versionPrefix));
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async getInfo?(): Promise<{ bytesInUse?: number; quota?: number; usage?: number }> {
    return this.storage.getInfo?.() || {};
  }

  // IEnhancedStorage implementation
  async getWithMetadata<T = any>(key: string): Promise<StorageEntry<T> | null> {
    if ('getWithMetadata' in this.storage) {
      return (this.storage as any).getWithMetadata(key);
    }
    
    const value = await this.get<T>(key);
    return value !== null ? { key, value } : null;
  }

  async setWithMetadata<T = any>(
    key: string, 
    value: T, 
    metadata?: Partial<StorageMetadata>
  ): Promise<void> {
    // Create version before setting
    await this.set(key, value);
    
    if ('setWithMetadata' in this.storage) {
      const updatedMetadata: Partial<StorageMetadata> = {
        ...metadata,
        version: this.generateVersion()
      };
      return (this.storage as any).setWithMetadata(key, value, updatedMetadata);
    }
  }

  async updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    if ('updateMetadata' in this.storage) {
      return (this.storage as any).updateMetadata(key, metadata);
    }
    throw new Error('Base storage does not support metadata');
  }

  async getByTag<T = any>(tag: string): Promise<StorageEntry<T>[]> {
    if ('getByTag' in this.storage) {
      const entries = await (this.storage as any).getByTag(tag);
      // Filter out version entries
      return entries.filter((entry: StorageEntry<T>) => !entry.key.startsWith(this.versionPrefix));
    }
    return [];
  }

  async query<T = any>(filter: StorageQuery): Promise<StorageEntry<T>[]> {
    if ('query' in this.storage) {
      const entries = await (this.storage as any).query(filter);
      // Filter out version entries
      return entries.filter((entry: StorageEntry<T>) => !entry.key.startsWith(this.versionPrefix));
    }
    return [];
  }

  watch(key: string | string[], callback: StorageWatchCallback): UnwatchFn {
    if ('watch' in this.storage) {
      // Filter out version-related changes
      const wrappedCallback = (changes: StorageChange[]) => {
        const filteredChanges = changes.filter(
          (change: StorageChange) => !change.key.startsWith(this.versionPrefix)
        );
        if (filteredChanges.length > 0) {
          callback(filteredChanges);
        }
      };
      
      return (this.storage as any).watch(key, wrappedCallback);
    }
    
    return () => {};
  }

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    if ('transaction' in this.storage) {
      return (this.storage as any).transaction(operations);
    }
    return operations();
  }
}
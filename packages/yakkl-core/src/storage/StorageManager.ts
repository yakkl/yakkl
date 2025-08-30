/**
 * Storage Manager
 * Manages storage providers and coordinates between different storage types
 */

import type { 
  IStorage,
  IStorageManager,
  IStorageProvider,
  IEncryptedStorage,
  IVersionedStorage,
  IStorageMigrator,
  StorageOptions,
  StorageMigration,
  StorageSyncOptions,
  StorageSyncResult,
  StorageEntry,
  StorageSyncConflict
} from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';

import { LocalStorageProviderFactory } from './LocalStorageProvider';
import { IndexedDBProviderFactory } from './IndexedDBProvider';
import { ChromeLocalStorageProviderFactory, ChromeSyncStorageProviderFactory } from './ChromeStorageProvider';
import { MemoryStorageProviderFactory } from './MemoryStorageProvider';
import { EncryptedStorageWrapper } from './EncryptedStorageWrapper';
import { VersionedStorageWrapper } from './VersionedStorageWrapper';
import { StorageMigrator } from './StorageMigrator';

export class StorageManager implements IStorageManager {
  private providers: Map<StorageType, IStorageProvider> = new Map();
  private storageInstances: Map<string, IStorage> = new Map();

  constructor() {
    // Register default providers
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    this.registerProvider(new LocalStorageProviderFactory());
    this.registerProvider(new IndexedDBProviderFactory());
    this.registerProvider(new ChromeLocalStorageProviderFactory());
    this.registerProvider(new ChromeSyncStorageProviderFactory());
    this.registerProvider(new MemoryStorageProviderFactory());
  }

  registerProvider(provider: IStorageProvider): void {
    this.providers.set(provider.type, provider);
  }

  getStorage(type: StorageType, options?: StorageOptions): IStorage {
    const cacheKey = `${type}:${options?.namespace || 'default'}`;
    
    // Check if we already have an instance
    if (this.storageInstances.has(cacheKey)) {
      return this.storageInstances.get(cacheKey)!;
    }

    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`Storage provider not found for type: ${type}`);
    }

    if (!provider.isAvailable()) {
      throw new Error(`Storage provider not available: ${type}`);
    }

    const storage = provider.createStorage(options);
    this.storageInstances.set(cacheKey, storage);
    
    return storage;
  }

  getEncryptedStorage(type: StorageType, options?: StorageOptions): IEncryptedStorage {
    const baseStorage = this.getStorage(type, options);
    return new EncryptedStorageWrapper(baseStorage);
  }

  getVersionedStorage(type: StorageType, options?: StorageOptions): IVersionedStorage {
    const baseStorage = this.getStorage(type, options);
    return new VersionedStorageWrapper(baseStorage);
  }

  createMigrator(storage: IStorage, migrations: StorageMigration[]): IStorageMigrator {
    return new StorageMigrator(storage, migrations);
  }

  async sync(source: IStorage, target: IStorage, options?: StorageSyncOptions): Promise<StorageSyncResult> {
    const startTime = Date.now();
    const result: StorageSyncResult = {
      itemsSynced: 0,
      itemsSkipped: 0,
      conflicts: [],
      errors: [],
      duration: 0
    };

    try {
      const sourceKeys = await source.getKeys();
      const targetKeys = await target.getKeys();
      const allKeys = new Set([...sourceKeys, ...targetKeys]);

      const batchSize = options?.batchSize || 100;
      const keysArray = Array.from(allKeys);

      for (let i = 0; i < keysArray.length; i += batchSize) {
        const batch = keysArray.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (key) => {
          try {
            const sourceValue = await source.get(key);
            const targetValue = await target.get(key);

            // Apply filter if provided
            if (options?.filter) {
              const entry: StorageEntry = { key, value: sourceValue };
              if (!options.filter(entry)) {
                result.itemsSkipped++;
                return;
              }
            }

            // Handle different sync directions
            if (options?.direction === 'push') {
              if (sourceValue !== null) {
                await target.set(key, sourceValue);
                result.itemsSynced++;
              }
            } else if (options?.direction === 'pull') {
              if (targetValue !== null) {
                await source.set(key, targetValue);
                result.itemsSynced++;
              }
            } else {
              // Bidirectional sync - handle conflicts
              if (sourceValue !== null && targetValue !== null && 
                  JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
                const conflict: StorageSyncConflict = {
                  key,
                  sourceValue,
                  targetValue
                };

                // Apply conflict resolution
                switch (options?.conflictResolution) {
                  case 'source':
                    await target.set(key, sourceValue);
                    conflict.resolution = 'source';
                    break;
                  case 'target':
                    await source.set(key, targetValue);
                    conflict.resolution = 'target';
                    break;
                  case 'newest':
                    // Would need timestamp metadata to determine newest
                    // For now, default to source
                    await target.set(key, sourceValue);
                    conflict.resolution = 'source';
                    break;
                  default:
                    // Manual resolution - add to conflicts
                    result.conflicts.push(conflict);
                    result.itemsSkipped++;
                    return;
                }

                result.conflicts.push(conflict);
                result.itemsSynced++;
              } else if (sourceValue !== null) {
                await target.set(key, sourceValue);
                result.itemsSynced++;
              } else if (targetValue !== null) {
                await source.set(key, targetValue);
                result.itemsSynced++;
              }
            }
          } catch (error) {
            result.errors.push(error as Error);
          }
        }));
      }
    } catch (error) {
      result.errors.push(error as Error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Get the best available storage provider for the current environment
   */
  getBestAvailableStorage(options?: StorageOptions): IStorage {
    // Priority order for best storage
    const priorityOrder: StorageType[] = [
      StorageType.INDEXED_DB,      // Best for large data
      StorageType.CHROME_LOCAL,    // Best for extensions
      StorageType.LOCAL,           // Fallback for web
      StorageType.SESSION,         // Temporary storage
      StorageType.MEMORY          // Last resort
    ];

    for (const type of priorityOrder) {
      const provider = this.providers.get(type);
      if (provider && provider.isAvailable()) {
        try {
          return this.getStorage(type, options);
        } catch {
          // Continue to next provider
        }
      }
    }

    // If nothing else works, use memory storage
    return this.getStorage(StorageType.MEMORY, options);
  }

  /**
   * Clear all storage instances
   */
  async clearAll(): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const storage of this.storageInstances.values()) {
      promises.push(storage.clear());
    }
    
    await Promise.all(promises);
    this.storageInstances.clear();
  }
}
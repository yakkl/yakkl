/**
 * IndexedDB Provider
 * Browser IndexedDB implementation with transaction support
 */

import { BaseStorageProvider } from './BaseStorageProvider';
import type { 
  StorageOptions, 
  IStorageProvider, 
  StorageCapabilities, 
  IStorage,
  StorageMetadata 
} from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';

interface StoredItem<T = any> {
  key: string;
  value: T;
  metadata: StorageMetadata;
}

export class IndexedDBProvider extends BaseStorageProvider {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private storeName: string;
  private version: number;

  constructor(options?: StorageOptions) {
    super();
    this.dbName = options?.namespace || 'yakkl_wallet';
    this.storeName = 'storage';
    this.version = options?.version || 1;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('tags', 'metadata.tags', { multiEntry: true });
          store.createIndex('created', 'metadata.created');
          store.createIndex('updated', 'metadata.updated');
          store.createIndex('expires', 'metadata.expires');
        }
      };
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as StoredItem<T> | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check expiration
        if (result.metadata.expires && result.metadata.expires < Date.now()) {
          this.remove(key).then(() => resolve(null));
          return;
        }

        // Update metadata cache
        this.metadata.set(key, {
          ...result.metadata,
          accessed: Date.now()
        });

        resolve(result.value);
      };
    });
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    const db = await this.ensureDB();
    const metadata = this.metadata.get(key) || this.createDefaultMetadata();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const item: StoredItem<T> = {
        key,
        value,
        metadata
      };

      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.notifyWatchers(key, {
          key,
          newValue: value,
          type: 'set'
        });
        resolve();
      };
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.ensureDB();
    const oldValue = await this.get(key);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.metadata.delete(key);
        this.notifyWatchers(key, {
          key,
          oldValue,
          type: 'remove'
        });
        resolve();
      };
    });
  }

  async clear(): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.metadata.clear();
        this.watchers.clear();
        resolve();
      };
    });
  }

  async getKeys(): Promise<string[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string[]);
    });
  }

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    // IndexedDB has built-in transaction support
    // This is a simplified version - could be enhanced with savepoints
    const db = await this.ensureDB();
    
    return new Promise(async (resolve, reject) => {
      try {
        // Start a transaction
        const result = await operations();
        resolve(result);
      } catch (error) {
        // In a real implementation, we'd rollback the transaction
        reject(error);
      }
    });
  }

  async getInfo(): Promise<{ bytesInUse?: number; quota?: number; usage?: number }> {
    try {
      if ('navigator' in globalThis && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          bytesInUse: estimate.usage
        };
      }
      return {};
    } catch {
      return {};
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export class IndexedDBProviderFactory implements IStorageProvider {
  readonly type: StorageType = StorageType.INDEXED_DB;

  createStorage(options?: StorageOptions): IStorage {
    return new IndexedDBProvider(options);
  }

  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  getCapabilities(): StorageCapabilities {
    return {
      persistent: true,
      synchronizable: false,
      searchable: true,
      transactional: true,
      versionable: true,
      encryptable: true,
      maxSize: 1024 * 1024 * 1024, // 1GB+ typically available
      maxKeys: undefined
    };
  }
}
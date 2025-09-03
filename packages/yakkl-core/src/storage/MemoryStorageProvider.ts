/**
 * Memory Storage Provider
 * In-memory storage implementation for testing and temporary storage
 */

import { BaseStorageProvider } from './BaseStorageProvider';
import type { 
  StorageOptions, 
  IStorageProvider, 
  StorageCapabilities, 
  IStorage 
} from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';

export class MemoryStorageProvider extends BaseStorageProvider {
  private store: Map<string, any> = new Map();
  private namespace: string;

  constructor(options?: StorageOptions) {
    super();
    this.namespace = options?.namespace || 'yakkl';
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const namespacedKey = this.getKey(key);
    
    if (!this.store.has(namespacedKey)) {
      return null;
    }

    const data = this.store.get(namespacedKey);
    
    // Check expiration
    if (data.expires && data.expires < Date.now()) {
      await this.remove(key);
      return null;
    }

    // Update access time in metadata
    const metadata = this.metadata.get(key);
    if (metadata) {
      metadata.accessed = Date.now();
    }

    return data.value;
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    const metadata = this.metadata.get(key) || this.createDefaultMetadata();
    const data = {
      value,
      expires: metadata.expires
    };

    this.store.set(this.getKey(key), data);
    
    this.notifyWatchers(key, {
      key,
      newValue: value,
      type: 'set'
    });
  }

  async remove(key: string): Promise<void> {
    const oldValue = await this.get(key);
    this.store.delete(this.getKey(key));
    this.metadata.delete(key);
    
    this.notifyWatchers(key, {
      key,
      oldValue,
      type: 'remove'
    });
  }

  async clear(): Promise<void> {
    const keys = await this.getKeys();
    keys.forEach(key => {
      this.store.delete(this.getKey(key));
    });
    
    this.metadata.clear();
    this.watchers.clear();
  }

  async getKeys(): Promise<string[]> {
    const keys: string[] = [];
    const prefix = `${this.namespace}:`;
    
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    }
    
    return keys;
  }

  async getInfo(): Promise<{ bytesInUse?: number; quota?: number; usage?: number }> {
    // Estimate memory usage (rough approximation)
    let bytesInUse = 0;
    
    for (const [key, value] of this.store.entries()) {
      bytesInUse += key.length * 2; // UTF-16
      bytesInUse += JSON.stringify(value).length * 2;
    }
    
    return { bytesInUse };
  }
}

export class MemoryStorageProviderFactory implements IStorageProvider {
  readonly type: StorageType = StorageType.MEMORY;

  createStorage(options?: StorageOptions): IStorage {
    return new MemoryStorageProvider(options);
  }

  isAvailable(): boolean {
    return true; // Always available
  }

  getCapabilities(): StorageCapabilities {
    return {
      persistent: false,
      synchronizable: false,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: undefined, // Limited by available memory
      maxKeys: undefined
    };
  }
}
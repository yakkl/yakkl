/**
 * LocalStorage Provider
 * Browser localStorage implementation
 */

import { BaseStorageProvider } from './BaseStorageProvider';
import type { StorageOptions, IStorageProvider, StorageCapabilities, IStorage } from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';

export class LocalStorageProvider extends BaseStorageProvider {
  private namespace: string;

  constructor(options?: StorageOptions) {
    super();
    this.namespace = options?.namespace || 'yakkl';
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private isOurKey(key: string): boolean {
    return key.startsWith(`${this.namespace}:`);
  }

  private extractKey(namespacedKey: string): string {
    return namespacedKey.substring(this.namespace.length + 1);
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) return null;

      const data = JSON.parse(item);
      
      // Update access time in metadata
      const metadata = this.metadata.get(key);
      if (metadata) {
        metadata.accessed = Date.now();
      }

      // Check expiration
      if (data.expires && data.expires < Date.now()) {
        await this.remove(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error(`Failed to get item from localStorage: ${error}`);
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const metadata = this.metadata.get(key);
      const data = {
        value,
        expires: metadata?.expires
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(data));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key));
    this.metadata.delete(key);
    
    this.notifyWatchers(key, {
      key,
      oldValue: await this.get(key),
      type: 'remove'
    });
  }

  async clear(): Promise<void> {
    const keys = await this.getKeys();
    
    // Clear only our namespaced keys
    keys.forEach(key => {
      localStorage.removeItem(this.getKey(key));
    });
    
    this.metadata.clear();
    this.watchers.clear();
  }

  async getKeys(): Promise<string[]> {
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && this.isOurKey(key)) {
        keys.push(this.extractKey(key));
      }
    }
    
    return keys;
  }

  async getInfo(): Promise<{ bytesInUse?: number; quota?: number; usage?: number }> {
    try {
      // Estimate storage usage
      let bytesInUse = 0;
      const keys = await this.getKeys();
      
      for (const key of keys) {
        const item = localStorage.getItem(this.getKey(key));
        if (item) {
          bytesInUse += item.length * 2; // UTF-16 encoding
        }
      }

      // Try to get quota if available
      if ('navigator' in globalThis && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          bytesInUse,
          quota: estimate.quota,
          usage: estimate.usage
        };
      }

      return { bytesInUse };
    } catch (error) {
      return {};
    }
  }
}

export class LocalStorageProviderFactory implements IStorageProvider {
  readonly type: StorageType = StorageType.LOCAL;

  createStorage(options?: StorageOptions): IStorage {
    return new LocalStorageProvider(options);
  }

  isAvailable(): boolean {
    try {
      const testKey = '__yakkl_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  getCapabilities(): StorageCapabilities {
    return {
      persistent: false,
      synchronizable: false,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: 5 * 1024 * 1024, // 5MB typical limit
      maxKeys: undefined
    };
  }
}
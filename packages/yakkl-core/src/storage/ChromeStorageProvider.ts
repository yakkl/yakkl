/**
 * Chrome Storage Provider
 * Browser extension storage implementation (chrome.storage.local and chrome.storage.sync)
 */

import { BaseStorageProvider } from './BaseStorageProvider';
import type { 
  StorageOptions, 
  IStorageProvider, 
  StorageCapabilities, 
  IStorage 
} from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';

type ChromeStorageArea = {
  get(keys?: string | string[] | null): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
  getBytesInUse(keys?: string | string[] | null): Promise<number>;
};

export class ChromeStorageProvider extends BaseStorageProvider {
  private storage: ChromeStorageArea;
  private namespace: string;
  private isSync: boolean;

  constructor(options?: StorageOptions & { sync?: boolean }) {
    super();
    this.namespace = options?.namespace || 'yakkl';
    this.isSync = options?.sync || false;
    
    // Use dynamic check for browser API availability
    if (typeof globalThis !== 'undefined' && 'browser' in globalThis) {
      const browser = (globalThis as any).browser;
      this.storage = this.isSync ? browser.storage.sync : browser.storage.local;
    } else if (typeof globalThis !== 'undefined' && 'chrome' in globalThis) {
      const chrome = (globalThis as any).chrome;
      this.storage = this.isSync ? chrome.storage.sync : chrome.storage.local;
    } else {
      throw new Error('Chrome storage API not available');
    }
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
      const namespacedKey = this.getKey(key);
      const result = await this.storage.get(namespacedKey);
      
      if (!(namespacedKey in result)) {
        return null;
      }

      const data = result[namespacedKey];
      
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
    } catch (error) {
      console.error(`Failed to get item from Chrome storage: ${error}`);
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      const metadata = this.metadata.get(key) || this.createDefaultMetadata();
      const data = {
        value,
        expires: metadata.expires
      };

      await this.storage.set({ [this.getKey(key)]: data });
      
      this.notifyWatchers(key, {
        key,
        newValue: value,
        type: 'set'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    const oldValue = await this.get(key);
    await this.storage.remove(this.getKey(key));
    this.metadata.delete(key);
    
    this.notifyWatchers(key, {
      key,
      oldValue,
      type: 'remove'
    });
  }

  async clear(): Promise<void> {
    const keys = await this.getKeys();
    const namespacedKeys = keys.map(key => this.getKey(key));
    
    if (namespacedKeys.length > 0) {
      await this.storage.remove(namespacedKeys);
    }
    
    this.metadata.clear();
    this.watchers.clear();
  }

  async getKeys(): Promise<string[]> {
    const allItems = await this.storage.get(null);
    const keys: string[] = [];
    
    for (const key in allItems) {
      if (this.isOurKey(key)) {
        keys.push(this.extractKey(key));
      }
    }
    
    return keys;
  }

  async getInfo(): Promise<{ bytesInUse?: number; quota?: number; usage?: number }> {
    try {
      const keys = await this.getKeys();
      const namespacedKeys = keys.map(key => this.getKey(key));
      const bytesInUse = await this.storage.getBytesInUse(namespacedKeys);
      
      // Chrome storage quotas
      const quota = this.isSync 
        ? 102400  // 100KB for sync storage
        : 10485760; // 10MB for local storage (can be unlimited with permission)
      
      return {
        bytesInUse,
        quota,
        usage: bytesInUse
      };
    } catch {
      return {};
    }
  }
}

export class ChromeLocalStorageProviderFactory implements IStorageProvider {
  readonly type: StorageType = StorageType.CHROME_LOCAL;

  createStorage(options?: StorageOptions): IStorage {
    return new ChromeStorageProvider({ ...options, sync: false });
  }

  isAvailable(): boolean {
    return (typeof globalThis !== 'undefined' && 
            ('browser' in globalThis || 'chrome' in globalThis) &&
            ((globalThis as any).browser?.storage || (globalThis as any).chrome?.storage));
  }

  getCapabilities(): StorageCapabilities {
    return {
      persistent: true,
      synchronizable: false,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: 10 * 1024 * 1024, // 10MB default, unlimited with permission
      maxKeys: undefined
    };
  }
}

export class ChromeSyncStorageProviderFactory implements IStorageProvider {
  readonly type: StorageType = StorageType.CHROME_SYNC;

  createStorage(options?: StorageOptions): IStorage {
    return new ChromeStorageProvider({ ...options, sync: true });
  }

  isAvailable(): boolean {
    return (typeof globalThis !== 'undefined' && 
            ('browser' in globalThis || 'chrome' in globalThis) &&
            ((globalThis as any).browser?.storage?.sync || (globalThis as any).chrome?.storage?.sync));
  }

  getCapabilities(): StorageCapabilities {
    return {
      persistent: true,
      synchronizable: true,
      searchable: true,
      transactional: false,
      versionable: true,
      encryptable: true,
      maxSize: 100 * 1024, // 100KB for sync storage
      maxKeys: 512 // Chrome sync storage limit
    };
  }
}
/**
 * Browser Extension Storage
 * Abstraction for browser.storage API with type safety
 */

import type { Storage } from 'webextension-polyfill';

export type StorageArea = 'local' | 'sync' | 'managed' | 'session';

export interface StorageOptions {
  area?: StorageArea;
  encrypt?: boolean;
  prefix?: string;
}

export interface StorageChange<T = any> {
  oldValue?: T;
  newValue?: T;
}

export type StorageChangeHandler<T = any> = (
  changes: Record<string, StorageChange<T>>,
  areaName: StorageArea
) => void;

/**
 * Type-safe browser extension storage
 */
export class ExtensionStorage<T extends Record<string, any> = Record<string, any>> {
  private area: Storage.StorageArea;
  private prefix: string;
  private encrypt: boolean;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || '';
    this.encrypt = options.encrypt || false;
    this.area = this.getStorageArea(options.area || 'local');
  }

  /**
   * Get item from storage
   */
  async get<K extends keyof T>(key: K): Promise<T[K] | undefined> {
    const fullKey = this.getFullKey(key as string);
    const result = await this.area.get(fullKey);
    
    if (result[fullKey] === undefined) {
      return undefined;
    }

    const value = result[fullKey];
    return this.decrypt ? await this.decryptValue(value) : value;
  }

  /**
   * Get multiple items from storage
   */
  async getMultiple<K extends keyof T>(keys: K[]): Promise<Partial<T>> {
    const fullKeys = keys.map(key => this.getFullKey(key as string));
    const results = await this.area.get(fullKeys);
    
    const items: Partial<T> = {};
    for (const key of keys) {
      const fullKey = this.getFullKey(key as string);
      if (results[fullKey] !== undefined) {
        const value = results[fullKey];
        items[key] = this.encrypt ? await this.decryptValue(value) : value;
      }
    }
    
    return items;
  }

  /**
   * Get all items from storage
   */
  async getAll(): Promise<T> {
    const results = await this.area.get(null);
    const items: any = {};
    
    for (const [fullKey, value] of Object.entries(results)) {
      if (this.prefix && !fullKey.startsWith(this.prefix)) {
        continue;
      }
      
      const key = this.prefix ? fullKey.slice(this.prefix.length) : fullKey;
      items[key] = this.encrypt ? await this.decryptValue(value) : value;
    }
    
    return items;
  }

  /**
   * Set item in storage
   */
  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    const fullKey = this.getFullKey(key as string);
    const encryptedValue = this.encrypt ? await this.encryptValue(value) : value;
    
    await this.area.set({
      [fullKey]: encryptedValue
    });
  }

  /**
   * Set multiple items in storage
   */
  async setMultiple(items: Partial<T>): Promise<void> {
    const storageItems: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(items)) {
      const fullKey = this.getFullKey(key);
      storageItems[fullKey] = this.encrypt ? await this.encryptValue(value) : value;
    }
    
    await this.area.set(storageItems);
  }

  /**
   * Remove item from storage
   */
  async remove<K extends keyof T>(key: K): Promise<void> {
    const fullKey = this.getFullKey(key as string);
    await this.area.remove(fullKey);
  }

  /**
   * Remove multiple items from storage
   */
  async removeMultiple<K extends keyof T>(keys: K[]): Promise<void> {
    const fullKeys = keys.map(key => this.getFullKey(key as string));
    await this.area.remove(fullKeys);
  }

  /**
   * Clear all items from storage
   */
  async clear(): Promise<void> {
    if (this.prefix) {
      // Only clear items with our prefix
      const all = await this.area.get(null);
      const keysToRemove = Object.keys(all).filter(key => key.startsWith(this.prefix));
      if (keysToRemove.length > 0) {
        await this.area.remove(keysToRemove);
      }
    } else {
      await this.area.clear();
    }
  }

  /**
   * Get storage usage
   */
  async getUsage(): Promise<number> {
    if ('getBytesInUse' in this.area) {
      return await (this.area as any).getBytesInUse(null);
    }
    return 0;
  }

  /**
   * Watch for storage changes
   */
  watch<K extends keyof T>(
    keys: K | K[],
    handler: StorageChangeHandler<T[K]>
  ): () => void {
    const watchKeys = Array.isArray(keys) ? keys : [keys];
    const fullKeys = new Set(watchKeys.map(key => this.getFullKey(key as string)));

    const listener = (
      changes: Record<string, Storage.StorageChange>,
      areaName: string
    ) => {
      const relevantChanges: Record<string, StorageChange> = {};
      
      for (const [fullKey, change] of Object.entries(changes)) {
        if (fullKeys.has(fullKey)) {
          const key = this.prefix ? fullKey.slice(this.prefix.length) : fullKey;
          relevantChanges[key] = {
            oldValue: change.oldValue,
            newValue: change.newValue
          };
        }
      }
      
      if (Object.keys(relevantChanges).length > 0) {
        handler(relevantChanges, areaName as StorageArea);
      }
    };

    this.getBrowser().then(browser => {
      browser.storage.onChanged.addListener(listener);
    });

    // Return unsubscribe function
    return () => {
      this.getBrowser().then(browser => {
        browser.storage.onChanged.removeListener(listener);
      });
    };
  }

  /**
   * Get full storage key with prefix
   */
  private getFullKey(key: string): string {
    return this.prefix ? `${this.prefix}${key}` : key;
  }

  /**
   * Get storage area
   */
  private getStorageArea(area: StorageArea): Storage.StorageArea {
    // This will be resolved at runtime
    const browser = (globalThis as any).browser || (globalThis as any).chrome;
    
    switch (area) {
      case 'sync':
        return browser.storage.sync;
      case 'managed':
        return browser.storage.managed;
      case 'session':
        // Session storage is Chrome 102+
        return browser.storage.session || browser.storage.local;
      case 'local':
      default:
        return browser.storage.local;
    }
  }

  /**
   * Encrypt value (placeholder - implement with @yakkl/security)
   */
  private async encryptValue(value: any): Promise<any> {
    // In production, use @yakkl/security for encryption
    return value;
  }

  /**
   * Decrypt value (placeholder - implement with @yakkl/security)
   */
  private async decryptValue(value: any): Promise<any> {
    // In production, use @yakkl/security for decryption
    return value;
  }

  /**
   * Get browser API
   */
  private async getBrowser(): Promise<typeof import('webextension-polyfill')> {
    if (typeof browser !== 'undefined') {
      return browser as any;
    }
    return await import('webextension-polyfill');
  }
}

/**
 * Create typed storage instance
 */
export function createExtensionStorage<T extends Record<string, any>>(
  options?: StorageOptions
): ExtensionStorage<T> {
  return new ExtensionStorage<T>(options);
}
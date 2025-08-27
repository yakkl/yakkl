/**
 * Browser Storage Bridge
 * Implements IStorage interface using browser.storage APIs
 */

import browser from 'webextension-polyfill';

// TODO: Import from @yakkl/core when package is properly set up
// import type { IStorage } from '@yakkl/core/interfaces';

// Temporary local definition until @yakkl/core is properly set up
export interface IStorage {
  get<T = any>(key: string): Promise<T | null>;
  getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>>;
  set<T = any>(key: string, value: T): Promise<void>;
  setMultiple<T = any>(items: Record<string, T>): Promise<void>;
  remove(key: string): Promise<void>;
  removeMultiple(keys: string[]): Promise<void>;
  clear(): Promise<void>;
  getKeys(): Promise<string[]>;
  has(key: string): Promise<boolean>;
  getInfo?(): Promise<{
    bytesInUse?: number;
    quota?: number;
    usage?: number;
  }>;
}

export class BrowserStorageBridge implements IStorage {
  private area: 'local' | 'sync';
  
  constructor(area: 'local' | 'sync' = 'local') {
    this.area = area;
  }
  
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const result = await browser.storage[this.area].get(key);
      return (result[key] as T) ?? null;
    } catch (error) {
      console.error(`[BrowserStorage] Failed to get ${key}:`, error);
      return null;
    }
  }
  
  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const result = await browser.storage[this.area].get(keys);
      const output: Record<string, T | null> = {};
      
      for (const key of keys) {
        output[key] = (result[key] as T) ?? null;
      }
      
      return output;
    } catch (error) {
      console.error('[BrowserStorage] Failed to get multiple:', error);
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {});
    }
  }
  
  async set<T = any>(key: string, value: T): Promise<void> {
    try {
      await browser.storage[this.area].set({ [key]: value });
    } catch (error) {
      console.error(`[BrowserStorage] Failed to set ${key}:`, error);
      throw error;
    }
  }
  
  async setMultiple<T = any>(items: Record<string, T>): Promise<void> {
    try {
      await browser.storage[this.area].set(items);
    } catch (error) {
      console.error('[BrowserStorage] Failed to set multiple:', error);
      throw error;
    }
  }
  
  async remove(key: string): Promise<void> {
    try {
      await browser.storage[this.area].remove(key);
    } catch (error) {
      console.error(`[BrowserStorage] Failed to remove ${key}:`, error);
      throw error;
    }
  }
  
  async removeMultiple(keys: string[]): Promise<void> {
    try {
      await browser.storage[this.area].remove(keys);
    } catch (error) {
      console.error('[BrowserStorage] Failed to remove multiple:', error);
      throw error;
    }
  }
  
  async clear(): Promise<void> {
    try {
      await browser.storage[this.area].clear();
    } catch (error) {
      console.error('[BrowserStorage] Failed to clear storage:', error);
      throw error;
    }
  }
  
  async getKeys(): Promise<string[]> {
    try {
      const all = await browser.storage[this.area].get(null);
      return Object.keys(all);
    } catch (error) {
      console.error('[BrowserStorage] Failed to get keys:', error);
      return [];
    }
  }
  
  async has(key: string): Promise<boolean> {
    try {
      const result = await browser.storage[this.area].get(key);
      return key in result;
    } catch (error) {
      console.error(`[BrowserStorage] Failed to check ${key}:`, error);
      return false;
    }
  }
  
  async getInfo(): Promise<{ bytesInUse?: number; quota?: number; usage?: number }> {
    try {
      // Check if getBytesInUse is available (Chrome-specific)
      if ('getBytesInUse' in browser.storage[this.area]) {
        const bytesInUse = await (browser.storage[this.area] as any).getBytesInUse(null);
        
        // Get quota if available
        let quota: number | undefined;
        if (this.area === 'local' && 'QUOTA_BYTES' in browser.storage.local) {
          quota = (browser.storage.local as any).QUOTA_BYTES;
        } else if (this.area === 'sync' && 'QUOTA_BYTES' in browser.storage.sync) {
          quota = (browser.storage.sync as any).QUOTA_BYTES;
        }
        
        return {
          bytesInUse,
          quota,
          usage: quota ? (bytesInUse / quota) * 100 : undefined
        };
      }
      
      // Fallback for browsers that don't support getBytesInUse
      return {};
    } catch (error) {
      console.error('[BrowserStorage] Failed to get info:', error);
      return {};
    }
  }
}

/**
 * Factory function to create storage instances
 */
export function createBrowserStorage(area: 'local' | 'sync' = 'local'): IStorage {
  return new BrowserStorageBridge(area);
}

/**
 * Pre-configured instances for common use cases
 */
export const localStorageBridge = new BrowserStorageBridge('local');
export const syncStorageBridge = new BrowserStorageBridge('sync');
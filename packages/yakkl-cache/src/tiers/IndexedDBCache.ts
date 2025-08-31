/**
 * IndexedDBCache - Persistent browser storage using IndexedDB
 * Provides larger storage capacity than localStorage with async API
 */

import { openDB, IDBPDatabase } from 'idb';
import type { 
  CacheProvider, 
  CacheOptions, 
  CacheStats, 
  CacheEntry 
} from '../types';

export interface IndexedDBCacheOptions {
  dbName?: string;
  storeName?: string;
  maxSize?: number;
  ttl?: number;
  version?: number;
}

interface DBSchema {
  cache: {
    key: string;
    value: CacheEntry;
    indexes: {
      'by-expiry': number;
      'by-access': number;
    };
  };
}

export class IndexedDBCache implements CacheProvider {
  private db: IDBPDatabase<DBSchema> | null = null;
  private dbName: string;
  private storeName: string;
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats;
  private initPromise: Promise<void> | null = null;

  constructor(options: IndexedDBCacheOptions = {}) {
    this.dbName = options.dbName || 'yakkl-cache';
    this.storeName = options.storeName || 'cache';
    this.maxSize = options.maxSize || 10000;
    this.defaultTTL = options.ttl || 30 * 60 * 1000; // 30 minutes default
    
    this.stats = this.initStats();
    this.initPromise = this.initializeDB();
  }

  private initStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalSize: 0,
      itemCount: 0,
      evictions: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      costSavings: 0
    };
  }

  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB<DBSchema>(this.dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache')) {
            const store = db.createObjectStore('cache', { keyPath: 'key' });
            store.createIndex('by-expiry', 'value.expiresAt');
            store.createIndex('by-access', 'value.lastAccessedAt');
          }
        }
      });
      
      // Clean up expired entries on initialization
      await this.cleanupExpired();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  private async ensureDB(): Promise<IDBPDatabase<DBSchema>> {
    if (this.initPromise) {
      await this.initPromise;
      this.initPromise = null;
    }
    
    if (!this.db) {
      await this.initializeDB();
    }
    
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    
    return this.db;
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      
      const record = await store.get(key);
      
      if (!record) {
        this.updateStats('miss', performance.now() - startTime);
        return null;
      }
      
      const entry = record.value;
      
      // Check if expired
      if (entry.expiresAt < Date.now()) {
        // Delete expired entry
        await this.delete(key);
        this.updateStats('miss', performance.now() - startTime);
        return null;
      }
      
      // Update access metadata
      entry.hitCount++;
      entry.lastAccessedAt = Date.now();
      
      // Update the entry with new metadata
      const updateTx = db.transaction('cache', 'readwrite');
      await updateTx.objectStore('cache').put({ key, value: entry });
      
      this.updateStats('hit', performance.now() - startTime);
      return entry.value as T;
    } catch (error) {
      console.error('IndexedDB get error:', error);
      this.updateStats('miss', performance.now() - startTime);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const db = await this.ensureDB();
      const ttl = options?.ttl || this.defaultTTL;
      const now = Date.now();
      
      const entry: CacheEntry<T> = {
        value,
        createdAt: now,
        expiresAt: now + ttl,
        hitCount: 0,
        lastAccessedAt: now,
        size: this.estimateSize(value),
        metadata: {
          source: 'indexeddb',
          version: 1,
          immutable: options?.strategy === 'blockchain' && ttl > 24 * 60 * 60 * 1000
        }
      };
      
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      
      await store.put({ key, value: entry });
      await tx.done;
      
      // Check if we need to evict old entries
      await this.enforceMaxSize();
      
      this.stats.itemCount = await this.count();
    } catch (error) {
      console.error('IndexedDB set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      
      const existed = await store.get(key) !== undefined;
      
      if (existed) {
        await store.delete(key);
        await tx.done;
        this.stats.itemCount = await this.count();
      }
      
      return existed;
    } catch (error) {
      console.error('IndexedDB delete error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readwrite');
      await tx.objectStore('cache').clear();
      await tx.done;
      
      this.stats = this.initStats();
    } catch (error) {
      console.error('IndexedDB clear error:', error);
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      
      const record = await store.get(key);
      
      if (!record) return false;
      
      // Check if expired
      if (record.value.expiresAt < Date.now()) {
        await this.delete(key);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('IndexedDB has error:', error);
      return false;
    }
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      
      const results = await Promise.all(
        keys.map(async (key) => {
          const record = await store.get(key);
          
          if (!record || record.value.expiresAt < Date.now()) {
            return null;
          }
          
          return record.value.value as T;
        })
      );
      
      return results;
    } catch (error) {
      console.error('IndexedDB getMany error:', error);
      return keys.map(() => null);
    }
  }

  async setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      
      const ttl = options?.ttl || this.defaultTTL;
      const now = Date.now();
      
      for (const [key, value] of entries) {
        const entry: CacheEntry<T> = {
          value,
          createdAt: now,
          expiresAt: now + ttl,
          hitCount: 0,
          lastAccessedAt: now,
          size: this.estimateSize(value),
          metadata: {
            source: 'indexeddb',
            version: 1
          }
        };
        
        await store.put({ key, value: entry });
      }
      
      await tx.done;
      await this.enforceMaxSize();
      this.stats.itemCount = await this.count();
    } catch (error) {
      console.error('IndexedDB setMany error:', error);
      throw error;
    }
  }

  async getStats(): Promise<CacheStats> {
    const itemCount = await this.count();
    const totalSize = await this.size();
    
    return {
      ...this.stats,
      itemCount,
      totalSize
    };
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      
      const allKeys = await store.getAllKeys();
      
      if (!pattern) {
        return allKeys as string[];
      }
      
      // Simple pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return (allKeys as string[]).filter(key => regex.test(key));
    } catch (error) {
      console.error('IndexedDB keys error:', error);
      return [];
    }
  }

  async size(): Promise<number> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      
      const allRecords = await store.getAll();
      
      return allRecords.reduce((total, record) => {
        return total + (record.value.size || 0);
      }, 0);
    } catch (error) {
      console.error('IndexedDB size error:', error);
      return 0;
    }
  }

  private async count(): Promise<number> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readonly');
      const store = tx.objectStore('cache');
      
      return await store.count();
    } catch (error) {
      console.error('IndexedDB count error:', error);
      return 0;
    }
  }

  private async cleanupExpired(): Promise<void> {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const index = store.index('by-expiry');
      
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      
      for await (const cursor of index.iterate(range)) {
        await cursor.delete();
        this.stats.evictions++;
      }
      
      await tx.done;
    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
    }
  }

  private async enforceMaxSize(): Promise<void> {
    try {
      const count = await this.count();
      
      if (count <= this.maxSize) return;
      
      const db = await this.ensureDB();
      const tx = db.transaction('cache', 'readwrite');
      const store = tx.objectStore('cache');
      const index = store.index('by-access');
      
      const toDelete = count - this.maxSize;
      let deleted = 0;
      
      // Delete least recently accessed entries
      for await (const cursor of index.iterate()) {
        if (deleted >= toDelete) break;
        
        await cursor.delete();
        deleted++;
        this.stats.evictions++;
      }
      
      await tx.done;
    } catch (error) {
      console.error('IndexedDB enforce max size error:', error);
    }
  }

  private estimateSize(value: any): number {
    try {
      const str = JSON.stringify(value);
      return str.length * 2; // UTF-16
    } catch {
      return 1;
    }
  }

  private updateStats(type: 'hit' | 'miss', responseTime: number): void {
    if (type === 'hit') {
      this.stats.hits++;
      this.stats.avgHitTime = 
        (this.stats.avgHitTime * (this.stats.hits - 1) + responseTime) / this.stats.hits;
    } else {
      this.stats.misses++;
      this.stats.avgMissTime = 
        (this.stats.avgMissTime * (this.stats.misses - 1) + responseTime) / this.stats.misses;
    }
    
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }
}
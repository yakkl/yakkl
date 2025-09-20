/**
 * MemoryCache - Fast in-memory LRU cache for hot data
 * Uses LRU eviction policy to keep most frequently accessed data
 */

import { LRUCache } from 'lru-cache';
import type { 
  CacheProvider, 
  CacheOptions, 
  CacheStats, 
  CacheEntry 
} from '../types';

export interface MemoryCacheOptions {
  maxSize?: number;
  ttl?: number;
  updateAgeOnGet?: boolean;
  updateAgeOnHas?: boolean;
}

export class MemoryCache implements CacheProvider {
  private cache: LRUCache<string, CacheEntry>;
  private stats: CacheStats;
  private defaultTTL: number;

  constructor(options: MemoryCacheOptions = {}) {
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
    
    this.cache = new LRUCache<string, CacheEntry>({
      max: options.maxSize || 1000,
      ttl: this.defaultTTL,
      updateAgeOnGet: options.updateAgeOnGet ?? true,
      updateAgeOnHas: options.updateAgeOnHas ?? false,
      // Removed maxEntrySize as it requires sizeCalculation function
      // If size limiting is needed, add sizeCalculation: (entry) => entry.data.length
      dispose: () => {
        this.stats.evictions++;
      }
    });

    this.stats = this.initStats();
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

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const entry = this.cache.get(key);
    
    if (entry) {
      // Check if expired
      if (entry.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.updateStats('miss', performance.now() - startTime);
        return null;
      }
      
      // Update access metadata
      entry.hitCount++;
      entry.lastAccessedAt = Date.now();
      
      this.updateStats('hit', performance.now() - startTime);
      return entry.value as T;
    }
    
    this.updateStats('miss', performance.now() - startTime);
    return null;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
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
        source: 'memory',
        version: 1,
        immutable: options?.strategy === 'blockchain' && !options?.ttl
      }
    };

    this.cache.set(key, entry, { ttl });
    this.stats.itemCount = this.cache.size;
    this.stats.totalSize = this.cache.calculatedSize || 0;
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.stats.itemCount = this.cache.size;
    return existed;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = this.initStats();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }

  async getStats(): Promise<CacheStats> {
    return {
      ...this.stats,
      itemCount: this.cache.size,
      totalSize: this.cache.calculatedSize || 0
    };
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return allKeys;
    }
    
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async size(): Promise<number> {
    return this.cache.calculatedSize || 0;
  }

  private estimateSize(value: any): number {
    try {
      // Rough estimation of object size in memory
      const str = JSON.stringify(value);
      return str.length * 2; // Approximate bytes (UTF-16)
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

  /**
   * Get cache dump for debugging
   */
  dump(): Array<[string, CacheEntry]> {
    const entries: Array<[string, CacheEntry]> = [];
    this.cache.forEach((value, key) => {
      entries.push([key, value]);
    });
    return entries;
  }

  /**
   * Load cache from dump
   */
  load(entries: Array<[string, CacheEntry]>): void {
    this.cache.clear();
    for (const [key, entry] of entries) {
      // Only load non-expired entries
      if (entry.expiresAt > Date.now()) {
        this.cache.set(key, entry, {
          ttl: entry.expiresAt - Date.now()
        });
      }
    }
    this.stats.itemCount = this.cache.size;
  }
}
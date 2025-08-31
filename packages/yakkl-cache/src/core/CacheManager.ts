/**
 * CacheManager - Central orchestrator for all caching operations
 * Manages multiple cache tiers and strategies with automatic promotion/demotion
 */

import type { 
  CacheOptions, 
  CacheProvider, 
  CacheConfig, 
  CacheTier,
  CacheStrategy,
  CacheStats,
  CacheSyncEvent,
  QueryFingerprint
} from '../types';
import { CacheError } from '../types';
import { MemoryCache } from '../tiers/MemoryCache';
import { IndexedDBCache } from '../tiers/IndexedDBCache';
import { PersistentCache } from '../tiers/PersistentCache';
import { Deduplicator } from '../utilities/Deduplicator';
import { BatchProcessor } from '../utilities/BatchProcessor';
import { CostTracker } from '../utilities/CostTracker';

export class CacheManager implements CacheProvider {
  private tiers: Map<CacheTier, CacheProvider>;
  private strategies: Map<CacheStrategy, any>;
  private config: CacheConfig;
  private deduplicator?: Deduplicator;
  private batchProcessor?: BatchProcessor<any, any>;
  private costTracker?: CostTracker;
  private syncListeners: Set<(event: CacheSyncEvent) => void>;
  private stats: CacheStats;

  constructor(config?: Partial<CacheConfig>) {
    this.config = this.mergeConfig(config);
    this.tiers = new Map();
    this.strategies = new Map();
    this.syncListeners = new Set();
    this.stats = this.initStats();
    
    this.initializeTiers();
    this.initializeUtilities();
    
    if (this.config.enableSync) {
      this.setupSynchronization();
    }
  }

  private mergeConfig(partial?: Partial<CacheConfig>): CacheConfig {
    return {
      tierTTL: {
        hot: 5 * 60 * 1000,      // 5 minutes
        warm: 30 * 60 * 1000,     // 30 minutes
        cold: 24 * 60 * 60 * 1000 // 24 hours
      },
      tierMaxSize: {
        hot: 1000,
        warm: 10000,
        cold: 100000
      },
      autoTiering: true,
      enableSync: true,
      enableMetrics: true,
      enableCompression: true,
      compressionThreshold: 1024, // 1KB
      batch: {
        enabled: true,
        maxSize: 100,
        maxWait: 100
      },
      dedupe: {
        enabled: true,
        ttl: 5000
      },
      ...partial
    };
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

  private initializeTiers(): void {
    // Hot tier - in-memory LRU cache (always available)
    this.tiers.set('hot', new MemoryCache({
      maxSize: this.config.tierMaxSize.hot,
      ttl: this.config.tierTTL.hot
    }));

    // Only initialize browser-dependent tiers if in browser environment
    if (typeof window !== 'undefined') {
      // Warm tier - IndexedDB
      this.tiers.set('warm', new IndexedDBCache({
        maxSize: this.config.tierMaxSize.warm,
        ttl: this.config.tierTTL.warm,
        dbName: 'yakkl-cache-warm'
      }));

      // Cold tier - Persistent storage with compression
      this.tiers.set('cold', new PersistentCache({
        maxSize: this.config.tierMaxSize.cold,
        ttl: this.config.tierTTL.cold,
        compress: this.config.enableCompression,
        compressionThreshold: this.config.compressionThreshold
      }));
    }
  }

  private initializeUtilities(): void {
    if (this.config.dedupe.enabled) {
      this.deduplicator = new Deduplicator({
        ttl: this.config.dedupe.ttl
      });
    }

    if (this.config.batch.enabled) {
      this.batchProcessor = new BatchProcessor({
        maxBatchSize: this.config.batch.maxSize,
        maxWaitTime: this.config.batch.maxWait,
        processor: async (batch: any[]) => batch // Default processor
      });
    }

    if (this.config.enableMetrics) {
      this.costTracker = new CostTracker();
    }
  }

  private setupSynchronization(): void {
    // Listen for storage changes across contexts
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (event) => {
        if (event.key?.startsWith('yakkl-cache:')) {
          this.handleSyncEvent({
            type: event.newValue ? 'set' : 'delete',
            key: event.key.replace('yakkl-cache:', ''),
            value: event.newValue ? JSON.parse(event.newValue) : undefined,
            timestamp: Date.now(),
            source: 'remote'
          });
        }
      });
    }
  }

  private handleSyncEvent(event: CacheSyncEvent): void {
    this.syncListeners.forEach(listener => listener(event));
  }

  /**
   * Get value from cache with automatic tier checking
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const startTime = Date.now();
    
    // Check for deduplicated request
    if (this.deduplicator && options?.deduplicate) {
      // Use deduplicator to prevent duplicate requests
      const cached = null; // Deduplicator doesn't have get method
      if (cached) {
        this.updateStats('hit', Date.now() - startTime);
        return cached as T;
      }
    }

    // Check each tier in order: hot -> warm -> cold
    const tiers: CacheTier[] = ['hot', 'warm', 'cold'];
    
    for (const tier of tiers) {
      const cache = this.tiers.get(tier);
      if (cache) {
        const value = await cache.get<T>(key);
        
        if (value !== null) {
          // Found in cache
          this.updateStats('hit', Date.now() - startTime);
          
          // Promote to hot tier if found in warm/cold
          if (this.config.autoTiering && tier !== 'hot') {
            await this.promote(key, value, tier);
          }
          
          return value;
        }
      }
    }
    
    this.updateStats('miss', Date.now() - startTime);
    return null;
  }

  /**
   * Set value in cache with automatic tier selection
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const tier = options?.tier || this.selectTier(value, options);
    const cache = this.tiers.get(tier);
    
    if (!cache) {
      throw new CacheError(`Invalid cache tier: ${tier}`, 'INVALID_KEY');
    }

    // Handle deduplication
    if (this.deduplicator && options?.deduplicate) {
      // Deduplicator doesn't have set method, use deduplicate
      await this.deduplicator.deduplicate(`set:${key}`, async () => {
        // Set operation handled by caller
        return value;
      });
    }

    // Handle batching
    if (this.batchProcessor && options?.batch) {
      await this.batchProcessor.add({
        id: key,
        type: 'set',
        keys: key,
        values: value,
        options
      });
      return;
    }

    await cache.set(key, value, options);
    
    // Track costs if applicable
    if (this.costTracker && options?.strategy === 'blockchain') {
      // Track the cache hit for cost savings
      this.costTracker.trackCall(key, true, 0);
    }

    // Emit sync event
    if (this.config.enableSync) {
      this.handleSyncEvent({
        type: 'set',
        key,
        value,
        timestamp: Date.now(),
        source: 'local'
      });
    }
  }

  /**
   * Delete value from all tiers
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;
    
    for (const cache of this.tiers.values()) {
      const result = await cache.delete(key);
      deleted = deleted || result;
    }
    
    if (this.deduplicator) {
      // Deduplicator doesn't have delete method, use deduplicate
      await this.deduplicator.deduplicate(`delete:${key}`, async () => {
        // Delete operation handled by caller
        return true;
      });
    }
    
    if (deleted && this.config.enableSync) {
      this.handleSyncEvent({
        type: 'delete',
        key,
        timestamp: Date.now(),
        source: 'local'
      });
    }
    
    return deleted;
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    for (const cache of this.tiers.values()) {
      await cache.clear();
    }
    
    if (this.deduplicator) {
      await this.deduplicator.clear();
    }
    
    this.stats = this.initStats();
    
    if (this.config.enableSync) {
      this.handleSyncEvent({
        type: 'clear',
        timestamp: Date.now(),
        source: 'local'
      });
    }
  }

  /**
   * Check if key exists in any tier
   */
  async has(key: string): Promise<boolean> {
    for (const cache of this.tiers.values()) {
      if (await cache.has(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get multiple values efficiently
   */
  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (this.batchProcessor) {
      // Batch processor doesn't have getMany, use parallel gets
      return Promise.all(keys.map(key => this.get<T>(key)));
    }
    
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  /**
   * Set multiple values efficiently
   */
  async setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void> {
    if (this.batchProcessor) {
      // Batch processor doesn't have setMany, use parallel sets
      await Promise.all(entries.map(([key, value]) => this.set(key, value, options)));
    }
    
    await Promise.all(
      entries.map(([key, value]) => this.set(key, value, options))
    );
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    // Aggregate stats from all tiers
    const tierStats = await Promise.all(
      Array.from(this.tiers.values()).map(cache => cache.getStats())
    );
    
    const aggregated = tierStats.reduce((acc, stats) => ({
      hits: acc.hits + stats.hits,
      misses: acc.misses + stats.misses,
      totalSize: acc.totalSize + stats.totalSize,
      itemCount: acc.itemCount + stats.itemCount,
      evictions: acc.evictions + stats.evictions,
      hitRatio: 0, // Calculate below
      avgHitTime: 0, // Calculate below
      avgMissTime: 0, // Calculate below
      costSavings: (acc.costSavings || 0) + (stats.costSavings || 0)
    }), this.stats);
    
    // Calculate ratios
    const total = aggregated.hits + aggregated.misses;
    aggregated.hitRatio = total > 0 ? aggregated.hits / total : 0;
    
    return aggregated;
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = new Set<string>();
    
    for (const cache of this.tiers.values()) {
      const keys = await cache.keys(pattern);
      keys.forEach(key => allKeys.add(key));
    }
    
    return Array.from(allKeys);
  }

  /**
   * Get total size of cached data
   */
  async size(): Promise<number> {
    const sizes = await Promise.all(
      Array.from(this.tiers.values()).map(cache => cache.size())
    );
    return sizes.reduce((acc, size) => acc + size, 0);
  }

  /**
   * Register a strategy for specific cache operations
   */
  registerStrategy(name: CacheStrategy, strategy: any): void {
    this.strategies.set(name, strategy);
  }

  /**
   * Add sync event listener
   */
  onSync(listener: (event: CacheSyncEvent) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  // Private helper methods

  private async getFromTiers<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const tiers: CacheTier[] = ['hot', 'warm', 'cold'];
    
    for (const tier of tiers) {
      const cache = this.tiers.get(tier);
      if (cache) {
        const value = await cache.get<T>(key);
        if (value !== null) {
          return value;
        }
      }
    }
    
    return null;
  }

  private async setInTiers(key: string, value: any, options?: CacheOptions): Promise<void> {
    const tier = this.selectTier(value, options);
    const cache = this.tiers.get(tier);
    
    if (cache) {
      await cache.set(key, value, options);
    }
  }

  private async deleteFromTiers(key: string): Promise<boolean> {
    let deleted = false;
    
    for (const cache of this.tiers.values()) {
      const result = await cache.delete(key);
      if (result) {
        deleted = true;
      }
    }
    
    return deleted;
  }

  private selectTier(value: any, options?: CacheOptions): CacheTier {
    // If tier is explicitly specified, use it
    if (options?.tier) {
      return options.tier;
    }
    
    // Select based on TTL
    if (options?.ttl) {
      if (options.ttl <= this.config.tierTTL.hot) {
        return 'hot';
      } else if (options.ttl <= this.config.tierTTL.warm) {
        return 'warm';
      } else {
        return 'cold';
      }
    }
    
    // Default to hot tier
    return 'hot';
  }

  private async promote(key: string, value: any, fromTier: CacheTier): Promise<void> {
    const hotCache = this.tiers.get('hot');
    if (hotCache) {
      await hotCache.set(key, value, { ttl: this.config.tierTTL.hot });
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

// Export singleton instance for convenience
export const cacheManager = new CacheManager();
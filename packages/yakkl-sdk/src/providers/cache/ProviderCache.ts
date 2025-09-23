/**
 * ProviderCache - Intelligent caching for RPC requests
 *
 * Features:
 * - LRU eviction strategy
 * - TTL-based expiration
 * - Method-specific caching rules
 * - Memory-efficient storage
 */

interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheConfig {
  ttl?: number;      // Default TTL in milliseconds
  maxSize?: number;  // Maximum entries
  maxMemory?: number; // Maximum memory in bytes
}

export class ProviderCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;
  private memoryUsage = 0;

  // Methods that should not be cached
  private readonly NO_CACHE_METHODS = new Set([
    'eth_sendTransaction',
    'eth_sendRawTransaction',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData',
    'personal_sign',
    'eth_accounts',
    'eth_coinbase',
    'eth_mining',
    'eth_hashrate',
    'eth_submitWork',
    'eth_submitHashrate'
  ]);

  // Methods with short TTL (5 seconds)
  private readonly SHORT_TTL_METHODS = new Set([
    'eth_gasPrice',
    'eth_blockNumber',
    'eth_getBalance',
    'eth_getTransactionCount',
    'eth_estimateGas',
    'eth_getBlockByNumber',
    'eth_syncing',
    'net_peerCount'
  ]);

  // Methods with long TTL (5 minutes)
  private readonly LONG_TTL_METHODS = new Set([
    'eth_getCode',
    'eth_getStorageAt',
    'eth_getTransactionByHash',
    'eth_getTransactionReceipt',
    'eth_getBlockByHash',
    'eth_getLogs',
    'eth_chainId',
    'net_version'
  ]);

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 60000,           // 1 minute default
      maxSize: config.maxSize || 1000,    // 1000 entries
      maxMemory: config.maxMemory || 50 * 1024 * 1024  // 50MB
    };
  }

  /**
   * Get a value from cache
   */
  get(key: string): any | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: any, ttl?: number): void {
    // Extract method from key
    const method = this.extractMethod(key);

    // Check if method should be cached
    if (this.NO_CACHE_METHODS.has(method)) {
      return;
    }

    // Determine TTL
    const finalTtl = ttl || this.getTTLForMethod(method) || this.config.ttl;

    // Estimate memory size
    const size = this.estimateSize(value);

    // Check memory limit
    if (this.memoryUsage + size > this.config.maxMemory) {
      this.evictLRU();
    }

    // Check size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // Add to cache
    const entry: CacheEntry = {
      value,
      timestamp: Date.now(),
      ttl: finalTtl,
      hits: 0
    };

    this.cache.set(key, entry);
    this.memoryUsage += size;
  }

  /**
   * Delete a specific entry
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      const size = this.estimateSize(entry.value);
      this.memoryUsage = Math.max(0, this.memoryUsage - size);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.memoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    entries: number;
    memoryUsage: number;
    hitRate: number;
    avgHits: number;
  } {
    let totalHits = 0;
    let entriesWithHits = 0;

    this.cache.forEach(entry => {
      totalHits += entry.hits;
      if (entry.hits > 0) entriesWithHits++;
    });

    return {
      entries: this.cache.size,
      memoryUsage: this.memoryUsage,
      hitRate: this.cache.size > 0 ? entriesWithHits / this.cache.size : 0,
      avgHits: this.cache.size > 0 ? totalHits / this.cache.size : 0
    };
  }

  /**
   * Extract method name from cache key
   */
  private extractMethod(key: string): string {
    // Key format: "method:params"
    const colonIndex = key.indexOf(':');
    return colonIndex > 0 ? key.substring(0, colonIndex) : '';
  }

  /**
   * Get TTL for specific method
   */
  private getTTLForMethod(method: string): number | undefined {
    if (this.SHORT_TTL_METHODS.has(method)) {
      return 5000; // 5 seconds
    }
    if (this.LONG_TTL_METHODS.has(method)) {
      return 300000; // 5 minutes
    }
    return undefined;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    // Map maintains insertion order, so first entry is LRU
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }

  /**
   * Estimate memory size of a value
   */
  private estimateSize(value: any): number {
    // Simple estimation - can be improved
    const str = JSON.stringify(value);
    return str.length * 2; // 2 bytes per character (UTF-16)
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }
}
/**
 * Deduplicator - Prevents duplicate concurrent requests
 * Ensures only one request is made for the same resource
 */

export interface DeduplicatorOptions {
  ttl?: number; // How long to cache the promise result
  keyGenerator?: (...args: any[]) => string;
  onDeduplicated?: (key: string) => void;
}

export class Deduplicator {
  private pending: Map<string, Promise<any>> = new Map();
  private results: Map<string, { value: any; expires: number }> = new Map();
  private ttl: number;
  private keyGenerator: (...args: any[]) => string;
  private stats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(options: DeduplicatorOptions = {}) {
    this.ttl = options.ttl || 60000; // 1 minute default
    this.keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));
  }

  /**
   * Wrap an async function to deduplicate concurrent calls
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: DeduplicatorOptions
  ): T {
    const ttl = options?.ttl || this.ttl;
    const keyGen = options?.keyGenerator || this.keyGenerator;
    
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const key = keyGen(...args);
      return this.execute(key, () => fn(...args), ttl, options?.onDeduplicated);
    }) as T;
  }

  /**
   * Execute a function with deduplication
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
    onDeduplicated?: (key: string) => void
  ): Promise<T> {
    this.stats.totalRequests++;
    
    // Check if there's a pending request
    const pending = this.pending.get(key);
    if (pending) {
      this.stats.deduplicatedRequests++;
      if (onDeduplicated) {
        onDeduplicated(key);
      }
      return pending;
    }
    
    // Check if there's a cached result
    const cached = this.results.get(key);
    if (cached && cached.expires > Date.now()) {
      this.stats.cacheHits++;
      return cached.value;
    }
    
    this.stats.cacheMisses++;
    
    // Create new request
    const promise = fn().then(
      result => {
        // Cache the result
        this.results.set(key, {
          value: result,
          expires: Date.now() + (ttl || this.ttl)
        });
        
        // Remove from pending
        this.pending.delete(key);
        
        // Cleanup old results periodically
        if (this.results.size > 1000) {
          this.cleanup();
        }
        
        return result;
      },
      error => {
        // Remove from pending on error
        this.pending.delete(key);
        throw error;
      }
    );
    
    // Store as pending
    this.pending.set(key, promise);
    
    return promise;
  }

  /**
   * Alias for execute for better readability
   */
  async deduplicate<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
    onDeduplicated?: (key: string) => void
  ): Promise<T> {
    return this.execute(key, fn, ttl, onDeduplicated);
  }

  /**
   * Clear all pending and cached results
   */
  clear(): void {
    this.pending.clear();
    this.results.clear();
  }

  /**
   * Clear specific key
   */
  clearKey(key: string): void {
    this.pending.delete(key);
    this.results.delete(key);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRequests: number;
    deduplicatedRequests: number;
    deduplicationRatio: number;
    cacheHits: number;
    cacheMisses: number;
    cacheHitRatio: number;
    pendingRequests: number;
    cachedResults: number;
  } {
    const total = this.stats.totalRequests || 1;
    const cacheTotal = this.stats.cacheHits + this.stats.cacheMisses || 1;
    
    return {
      ...this.stats,
      deduplicationRatio: this.stats.deduplicatedRequests / total,
      cacheHitRatio: this.stats.cacheHits / cacheTotal,
      pendingRequests: this.pending.size,
      cachedResults: this.results.size
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Cleanup expired results
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, result] of this.results.entries()) {
      if (result.expires < now) {
        this.results.delete(key);
      }
    }
  }

  /**
   * Create a deduplication group with shared state
   */
  static createGroup(options?: DeduplicatorOptions): DeduplicatorGroup {
    return new DeduplicatorGroup(options);
  }
}

/**
 * DeduplicatorGroup - Manage multiple deduplicators with shared configuration
 */
export class DeduplicatorGroup {
  private deduplicators: Map<string, Deduplicator> = new Map();
  private defaultOptions: DeduplicatorOptions;

  constructor(options: DeduplicatorOptions = {}) {
    this.defaultOptions = options;
  }

  /**
   * Get or create a deduplicator for a namespace
   */
  get(namespace: string): Deduplicator {
    let dedup = this.deduplicators.get(namespace);
    
    if (!dedup) {
      dedup = new Deduplicator(this.defaultOptions);
      this.deduplicators.set(namespace, dedup);
    }
    
    return dedup;
  }

  /**
   * Clear all deduplicators
   */
  clearAll(): void {
    for (const dedup of this.deduplicators.values()) {
      dedup.clear();
    }
  }

  /**
   * Get combined statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [namespace, dedup] of this.deduplicators.entries()) {
      stats[namespace] = dedup.getStats();
    }
    
    return stats;
  }
}
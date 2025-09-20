/**
 * ProviderCache - Intelligent caching for RPC requests
 *
 * Features:
 * - LRU eviction strategy
 * - TTL-based expiration
 * - Method-specific caching rules
 * - Memory-efficient storage
 */
interface CacheConfig {
    ttl?: number;
    maxSize?: number;
    maxMemory?: number;
}
export declare class ProviderCache {
    private cache;
    private config;
    private memoryUsage;
    private readonly NO_CACHE_METHODS;
    private readonly SHORT_TTL_METHODS;
    private readonly LONG_TTL_METHODS;
    constructor(config?: CacheConfig);
    /**
     * Get a value from cache
     */
    get(key: string): any | undefined;
    /**
     * Set a value in cache
     */
    set(key: string, value: any, ttl?: number): void;
    /**
     * Delete a specific entry
     */
    delete(key: string): boolean;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        entries: number;
        memoryUsage: number;
        hitRate: number;
        avgHits: number;
    };
    /**
     * Extract method name from cache key
     */
    private extractMethod;
    /**
     * Get TTL for specific method
     */
    private getTTLForMethod;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Estimate memory size of a value
     */
    private estimateSize;
    /**
     * Clean up expired entries (can be called periodically)
     */
    cleanup(): void;
}
export {};

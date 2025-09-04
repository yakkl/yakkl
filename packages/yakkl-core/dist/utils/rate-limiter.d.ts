/**
 * Generic rate limiter for client and server-side operations
 * @module @yakkl/core/utils/rate-limiter
 */
export interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
}
export interface RateLimitEntry {
    count: number;
    windowStart: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}
/**
 * Simple rate limiter class for controlling operation frequency
 */
export declare class RateLimiter {
    private config;
    private limits;
    constructor(config: RateLimiterConfig);
    /**
     * Check if an operation is allowed under the rate limit
     * @param key - Unique identifier for the operation
     * @returns true if allowed, false if rate limited
     */
    isAllowed(key: string): boolean;
    /**
     * Check if an operation is allowed and get detailed info
     * @param key - Unique identifier for the operation
     * @returns Result object with allowed status and metadata
     */
    check(key: string): RateLimitResult;
    /**
     * Get remaining time until rate limit resets
     * @param key - Unique identifier for the operation
     * @returns milliseconds until reset, or 0 if not rate limited
     */
    getResetTime(key: string): number;
    /**
     * Get the number of remaining requests for a key
     * @param key - Unique identifier for the operation
     * @returns Number of remaining requests in current window
     */
    getRemaining(key: string): number;
    /**
     * Reset rate limit for a specific key
     * @param key - Unique identifier for the operation
     */
    resetKey(key: string): void;
    /**
     * Clear all rate limit entries
     */
    reset(): void;
    /**
     * Clean up expired entries (call periodically to prevent memory leaks)
     */
    cleanup(): void;
    /**
     * Get the current configuration
     * @returns Current rate limit configuration
     */
    getConfig(): Readonly<RateLimiterConfig>;
    /**
     * Update the configuration
     * @param config - New configuration
     */
    updateConfig(config: Partial<RateLimiterConfig>): void;
}
/**
 * Factory function to create a rate limiter
 * @param maxRequests - Maximum number of requests per window
 * @param windowMs - Time window in milliseconds
 * @returns New RateLimiter instance
 */
export declare function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter;
/**
 * Common rate limit presets
 */
export declare const RateLimitPresets: {
    /** Strict: 1 request per second */
    readonly STRICT: {
        readonly maxRequests: 1;
        readonly windowMs: 1000;
    };
    /** API: 10 requests per second */
    readonly API: {
        readonly maxRequests: 10;
        readonly windowMs: 1000;
    };
    /** Network: 5 requests per minute */
    readonly NETWORK: {
        readonly maxRequests: 5;
        readonly windowMs: 60000;
    };
    /** Search: 30 requests per minute */
    readonly SEARCH: {
        readonly maxRequests: 30;
        readonly windowMs: 60000;
    };
    /** Health Check: 10 requests per minute */
    readonly HEALTH_CHECK: {
        readonly maxRequests: 10;
        readonly windowMs: 60000;
    };
    /** Bulk Operations: 100 requests per minute */
    readonly BULK: {
        readonly maxRequests: 100;
        readonly windowMs: 60000;
    };
};
/**
 * Create a self-cleaning rate limiter that automatically removes expired entries
 * @param config - Rate limit configuration
 * @param cleanupIntervalMs - Interval for cleanup (default: 5 minutes)
 * @returns RateLimiter instance with automatic cleanup
 */
export declare function createAutoCleanupRateLimiter(config: RateLimiterConfig, cleanupIntervalMs?: number): RateLimiter & {
    destroy: () => void;
};
//# sourceMappingURL=rate-limiter.d.ts.map
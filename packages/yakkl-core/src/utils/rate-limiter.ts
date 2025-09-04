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
export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  constructor(private config: RateLimiterConfig) {}
  
  /**
   * Check if an operation is allowed under the rate limit
   * @param key - Unique identifier for the operation
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    if (!entry) {
      // First request
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    
    // Check if window has expired
    if (now - entry.windowStart > this.config.windowMs) {
      // Reset window
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return true;
    }
    
    // Within window - check count
    if (entry.count >= this.config.maxRequests) {
      return false;
    }
    
    // Increment count
    entry.count++;
    return true;
  }
  
  /**
   * Check if an operation is allowed and get detailed info
   * @param key - Unique identifier for the operation
   * @returns Result object with allowed status and metadata
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    if (!entry) {
      // First request
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }
    
    // Check if window has expired
    if (now - entry.windowStart > this.config.windowMs) {
      // Reset window
      this.limits.set(key, {
        count: 1,
        windowStart: now
      });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }
    
    // Within window - check count
    const allowed = entry.count < this.config.maxRequests;
    if (allowed) {
      entry.count++;
    }
    
    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.windowStart + this.config.windowMs
    };
  }
  
  /**
   * Get remaining time until rate limit resets
   * @param key - Unique identifier for the operation
   * @returns milliseconds until reset, or 0 if not rate limited
   */
  getResetTime(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return 0;
    
    const now = Date.now();
    const windowEnd = entry.windowStart + this.config.windowMs;
    
    if (now >= windowEnd) return 0;
    return windowEnd - now;
  }
  
  /**
   * Get the number of remaining requests for a key
   * @param key - Unique identifier for the operation
   * @returns Number of remaining requests in current window
   */
  getRemaining(key: string): number {
    const entry = this.limits.get(key);
    if (!entry) return this.config.maxRequests;
    
    const now = Date.now();
    if (now - entry.windowStart > this.config.windowMs) {
      return this.config.maxRequests;
    }
    
    return Math.max(0, this.config.maxRequests - entry.count);
  }
  
  /**
   * Reset rate limit for a specific key
   * @param key - Unique identifier for the operation
   */
  resetKey(key: string): void {
    this.limits.delete(key);
  }
  
  /**
   * Clear all rate limit entries
   */
  reset(): void {
    this.limits.clear();
  }
  
  /**
   * Clean up expired entries (call periodically to prevent memory leaks)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.windowStart > this.config.windowMs) {
        this.limits.delete(key);
      }
    }
  }
  
  /**
   * Get the current configuration
   * @returns Current rate limit configuration
   */
  getConfig(): Readonly<RateLimiterConfig> {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   * @param config - New configuration
   */
  updateConfig(config: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Factory function to create a rate limiter
 * @param maxRequests - Maximum number of requests per window
 * @param windowMs - Time window in milliseconds
 * @returns New RateLimiter instance
 */
export function createRateLimiter(maxRequests: number, windowMs: number): RateLimiter {
  return new RateLimiter({ maxRequests, windowMs });
}

/**
 * Common rate limit presets
 */
export const RateLimitPresets = {
  /** Strict: 1 request per second */
  STRICT: { maxRequests: 1, windowMs: 1000 },
  
  /** API: 10 requests per second */
  API: { maxRequests: 10, windowMs: 1000 },
  
  /** Network: 5 requests per minute */
  NETWORK: { maxRequests: 5, windowMs: 60000 },
  
  /** Search: 30 requests per minute */
  SEARCH: { maxRequests: 30, windowMs: 60000 },
  
  /** Health Check: 10 requests per minute */
  HEALTH_CHECK: { maxRequests: 10, windowMs: 60000 },
  
  /** Bulk Operations: 100 requests per minute */
  BULK: { maxRequests: 100, windowMs: 60000 }
} as const;

/**
 * Create a self-cleaning rate limiter that automatically removes expired entries
 * @param config - Rate limit configuration
 * @param cleanupIntervalMs - Interval for cleanup (default: 5 minutes)
 * @returns RateLimiter instance with automatic cleanup
 */
export function createAutoCleanupRateLimiter(
  config: RateLimiterConfig,
  cleanupIntervalMs = 5 * 60 * 1000
): RateLimiter & { destroy: () => void } {
  const limiter = new RateLimiter(config);
  
  // Only set up interval in browser/Node environments
  let intervalId: any;
  if (typeof globalThis !== 'undefined' && 
      (typeof window !== 'undefined' || typeof global !== 'undefined')) {
    intervalId = setInterval(() => limiter.cleanup(), cleanupIntervalMs);
  }
  
  // Add destroy method to clear interval
  return Object.assign(limiter, {
    destroy: () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  });
}
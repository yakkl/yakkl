/**
 * Simple rate limiter for client-side operations
 * Prevents abuse of expensive operations like network tests and RPC health checks
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
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
}

// Pre-configured rate limiters for different operations
export const networkTestLimiter = new RateLimiter({
  maxRequests: 5,     // 5 tests
  windowMs: 60_000    // per minute
});

export const rpcHealthLimiter = new RateLimiter({
  maxRequests: 10,    // 10 checks
  windowMs: 60_000    // per minute
});

export const connectionCheckLimiter = new RateLimiter({
  maxRequests: 30,    // 30 checks
  windowMs: 60_000    // per minute (every 2 seconds)
});

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    networkTestLimiter.cleanup();
    rpcHealthLimiter.cleanup();
    connectionCheckLimiter.cleanup();
  }, 5 * 60_000);
}
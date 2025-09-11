/**
 * Re-export rate limiter utilities from @yakkl/core
 * This file is maintained for backward compatibility with wallet-specific presets
 */

import { RateLimiter, RateLimitPresets } from '@yakkl/core';

// Re-export the core RateLimiter class
export { RateLimiter } from '@yakkl/core';

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
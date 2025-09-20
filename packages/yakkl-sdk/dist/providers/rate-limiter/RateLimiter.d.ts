/**
 * RateLimiter - Prevent API rate limit violations
 *
 * Uses token bucket algorithm for smooth request distribution
 */
export declare class RateLimiter {
    private tokens;
    private maxTokens;
    private refillRate;
    private lastRefill;
    private queue;
    constructor(requestsPerWindow: number, windowMs: number);
    /**
     * Check if a request can be made immediately
     */
    canMakeRequest(): boolean;
    /**
     * Consume a token for a request
     */
    consumeToken(): Promise<void>;
    /**
     * Refill tokens based on elapsed time
     */
    private refill;
    /**
     * Process queued requests
     */
    private processQueue;
    /**
     * Get current state
     */
    getState(): {
        tokens: number;
        queueLength: number;
    };
    /**
     * Reset the rate limiter
     */
    reset(): void;
}

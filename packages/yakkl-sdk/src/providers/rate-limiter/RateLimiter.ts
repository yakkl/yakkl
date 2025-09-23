/**
 * RateLimiter - Prevent API rate limit violations
 *
 * Uses token bucket algorithm for smooth request distribution
 */

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;
  private queue: Array<() => void> = [];

  constructor(requestsPerWindow: number, windowMs: number) {
    this.maxTokens = requestsPerWindow;
    this.tokens = requestsPerWindow;
    this.refillRate = requestsPerWindow / windowMs * 1000; // tokens per second
    this.lastRefill = Date.now();
  }

  /**
   * Check if a request can be made immediately
   */
  canMakeRequest(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  /**
   * Consume a token for a request
   */
  async consumeToken(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Wait for token to become available
    return new Promise(resolve => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = (elapsed / 1000) * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    this.refill();

    while (this.queue.length > 0 && this.tokens >= 1) {
      const resolve = this.queue.shift();
      if (resolve) {
        this.tokens--;
        resolve();
      }
    }

    // Schedule next processing if queue not empty
    if (this.queue.length > 0) {
      const timeToNextToken = (1 / this.refillRate) * 1000;
      setTimeout(() => this.processQueue(), timeToNextToken);
    }
  }

  /**
   * Get current state
   */
  getState(): { tokens: number; queueLength: number } {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      queueLength: this.queue.length
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.queue = [];
  }
}
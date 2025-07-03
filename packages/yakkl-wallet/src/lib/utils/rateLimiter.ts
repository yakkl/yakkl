// rateLimiter.ts - Simple rate limiter for API calls

export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastCallTime = 0;
  
  constructor(
    private maxCallsPerSecond: number = 2,
    private minDelayMs: number = 500 // Minimum delay between calls (500ms for 2/sec)
  ) {}

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastCall = now - this.lastCallTime;
      
      // If not enough time has passed, wait
      if (timeSinceLastCall < this.minDelayMs) {
        await this.sleep(this.minDelayMs - timeSinceLastCall);
      }
      
      const task = this.queue.shift();
      if (task) {
        this.lastCallTime = Date.now();
        await task();
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create a singleton instance for Etherscan API
export const etherscanRateLimiter = new RateLimiter(2, 550); // 2 calls/sec with 550ms delay for safety margin
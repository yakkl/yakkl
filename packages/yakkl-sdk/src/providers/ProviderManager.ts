/**
 * ProviderManager - Intelligent provider orchestration
 *
 * Key advantages over Ethers/Viem:
 * 1. Multi-provider management with automatic failover
 * 2. Load balancing across providers
 * 3. Cost optimization (routes to cheapest provider)
 * 4. Health monitoring and auto-recovery
 * 5. Request deduplication and caching
 */

import { IProvider, ProviderConfig, ProviderType, ProviderStats } from './ProviderInterface';
import { LoadBalancer, LoadBalancerStrategy } from './load-balancer/LoadBalancer';
import { ProviderCache } from './cache/ProviderCache';
import { RateLimiter } from './rate-limiter/RateLimiter';

export interface ProviderManagerConfig {
  providers: IProvider[];
  strategy?: LoadBalancerStrategy;
  cache?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
  fallback?: {
    enabled: boolean;
    maxRetries?: number;
    retryDelay?: number;
  };
  monitoring?: {
    enabled: boolean;
    healthCheckInterval?: number;
    unhealthyThreshold?: number;
  };
}

export class ProviderManager {
  private providers: Map<string, IProvider> = new Map();
  private loadBalancer: LoadBalancer;
  private cache?: ProviderCache;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private config: ProviderManagerConfig;

  constructor(config: ProviderManagerConfig) {
    this.config = config;

    // Initialize providers
    config.providers.forEach(provider => {
      this.addProvider(provider);
    });

    // Setup load balancer
    this.loadBalancer = new LoadBalancer(
      Array.from(this.providers.values()),
      config.strategy || LoadBalancerStrategy.ROUND_ROBIN
    );

    // Setup cache if enabled
    if (config.cache?.enabled) {
      this.cache = new ProviderCache({
        ttl: config.cache.ttl || 60000, // 1 minute default
        maxSize: config.cache.maxSize || 1000
      });
    }

    // Start health monitoring if enabled
    if (config.monitoring?.enabled) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Add a provider to the manager
   */
  addProvider(provider: IProvider): void {
    const key = `${provider.type}_${provider.name}`;
    this.providers.set(key, provider);

    // Setup rate limiter if configured
    if (provider.config.rateLimit) {
      this.rateLimiters.set(key, new RateLimiter(
        provider.config.rateLimit.requests,
        provider.config.rateLimit.window
      ));
    }

    // Update load balancer
    this.loadBalancer.updateProviders(Array.from(this.providers.values()));
  }

  /**
   * Remove a provider from the manager
   */
  removeProvider(type: ProviderType, name: string): void {
    const key = `${type}_${name}`;
    const provider = this.providers.get(key);

    if (provider) {
      provider.disconnect();
      this.providers.delete(key);
      this.rateLimiters.delete(key);
      this.loadBalancer.updateProviders(Array.from(this.providers.values()));
    }
  }

  /**
   * Execute a request with automatic provider selection and fallback
   */
  async request<T = any>(args: { method: string; params?: any[] }): Promise<T> {
    const cacheKey = this.getCacheKey(args);

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return cached as T;
      }
    }

    // Try providers with fallback
    const maxRetries = this.config.fallback?.maxRetries || 3;
    const retryDelay = this.config.fallback?.retryDelay || 1000;
    let lastError: Error | undefined;

    for (let retry = 0; retry < maxRetries; retry++) {
      const provider = await this.selectProvider(args.method);

      if (!provider) {
        throw new Error('No healthy providers available');
      }

      try {
        // Check rate limit
        const rateLimiter = this.rateLimiters.get(
          `${provider.type}_${provider.name}`
        );
        if (rateLimiter && !rateLimiter.canMakeRequest()) {
          // Skip this provider if rate limited
          continue;
        }

        // Execute request
        const result = await provider.request(args);

        // Cache successful result
        if (this.cache) {
          this.cache.set(cacheKey, result);
        }

        // Record success for load balancing
        this.loadBalancer.recordSuccess(provider);

        return result as T;

      } catch (error) {
        lastError = error as Error;

        // Record failure for load balancing
        this.loadBalancer.recordFailure(provider);

        // Wait before retry
        if (retry < maxRetries - 1) {
          await this.delay(retryDelay * Math.pow(2, retry)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * Select the best provider for a specific method
   */
  private async selectProvider(method: string): Promise<IProvider | null> {
    // For now, use load balancer. In future, can add method-specific routing
    return this.loadBalancer.selectProvider();
  }

  /**
   * Batch multiple requests (optimized for providers that support batch)
   */
  async batch(requests: Array<{ method: string; params?: any[] }>): Promise<any[]> {
    // Find a provider that supports batch
    const batchProvider = Array.from(this.providers.values()).find(p => p.batch);

    if (batchProvider && batchProvider.batch) {
      try {
        return await batchProvider.batch(requests.map(r => ({
          method: r.method,
          params: r.params || []
        })));
      } catch (error) {
        // Fallback to sequential requests
      }
    }

    // Fallback to sequential requests
    return Promise.all(requests.map(req => this.request(req)));
  }

  /**
   * Get statistics for all providers
   */
  getStats(): Map<string, ProviderStats> {
    const stats = new Map<string, ProviderStats>();

    this.providers.forEach((provider, key) => {
      stats.set(key, provider.getStats());
    });

    return stats;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const interval = this.config.monitoring?.healthCheckInterval || 30000; // 30 seconds

    this.healthCheckInterval = setInterval(async () => {
      const checks = Array.from(this.providers.values()).map(async provider => {
        const healthy = await provider.healthCheck();
        if (!healthy) {
          this.loadBalancer.markUnhealthy(provider);
        } else {
          this.loadBalancer.markHealthy(provider);
        }
      });

      await Promise.all(checks);
    }, interval);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Generate cache key for a request
   */
  private getCacheKey(args: { method: string; params?: any[] }): string {
    return `${args.method}:${JSON.stringify(args.params || [])}`;
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopHealthMonitoring();

    // Disconnect all providers
    const disconnects = Array.from(this.providers.values()).map(p => p.disconnect());
    await Promise.all(disconnects);

    this.providers.clear();
    this.rateLimiters.clear();
    this.cache?.clear();
  }

  // Convenience methods that use the request method

  async getBalance(address: string): Promise<string> {
    return this.request({ method: 'eth_getBalance', params: [address, 'latest'] });
  }

  async getTransactionCount(address: string): Promise<number> {
    const result = await this.request({
      method: 'eth_getTransactionCount',
      params: [address, 'latest']
    });
    return parseInt(result, 16);
  }

  async getGasPrice(): Promise<string> {
    return this.request({ method: 'eth_gasPrice' });
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.request({ method: 'eth_blockNumber' });
    return parseInt(result, 16);
  }

  async getChainId(): Promise<number> {
    const result = await this.request({ method: 'eth_chainId' });
    return parseInt(result, 16);
  }

  async sendTransaction(transaction: any): Promise<string> {
    return this.request({ method: 'eth_sendTransaction', params: [transaction] });
  }

  async getTransaction(hash: string): Promise<any> {
    return this.request({ method: 'eth_getTransactionByHash', params: [hash] });
  }

  async getTransactionReceipt(hash: string): Promise<any> {
    return this.request({ method: 'eth_getTransactionReceipt', params: [hash] });
  }
}
/**
 * LoadBalancer - Intelligent request distribution across providers
 *
 * Strategies:
 * - Round Robin: Equal distribution
 * - Weighted Round Robin: Based on provider weights
 * - Least Connections: Route to least busy
 * - Least Response Time: Route to fastest
 * - Priority: Use providers in order of priority
 * - Cost Optimized: Route to cheapest provider
 */

import { IProvider } from '../ProviderInterface';

export enum LoadBalancerStrategy {
  ROUND_ROBIN = 'round_robin',
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  LEAST_CONNECTIONS = 'least_connections',
  LEAST_RESPONSE_TIME = 'least_response_time',
  PRIORITY = 'priority',
  COST_OPTIMIZED = 'cost_optimized'
}

interface ProviderMetrics {
  provider: IProvider;
  activeConnections: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  lastResponseTime: number;
  isHealthy: boolean;
  weight: number;
  priority: number;
  costPerRequest?: number;
}

export class LoadBalancer {
  private providers: ProviderMetrics[] = [];
  private strategy: LoadBalancerStrategy;
  private currentIndex = 0;
  private weightedIndexes: number[] = [];

  constructor(providers: IProvider[], strategy: LoadBalancerStrategy) {
    this.strategy = strategy;
    this.updateProviders(providers);
  }

  /**
   * Update the list of providers
   */
  updateProviders(providers: IProvider[]): void {
    this.providers = providers.map(provider => ({
      provider,
      activeConnections: 0,
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      lastResponseTime: 0,
      isHealthy: true,
      weight: provider.config.weight || 1,
      priority: provider.config.priority || 100,
      costPerRequest: this.getProviderCost(provider)
    }));

    // Build weighted indexes for weighted round-robin
    this.buildWeightedIndexes();
  }

  /**
   * Select a provider based on the configured strategy
   */
  async selectProvider(): Promise<IProvider | null> {
    const healthyProviders = this.providers.filter(p => p.isHealthy);

    if (healthyProviders.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case LoadBalancerStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(healthyProviders);

      case LoadBalancerStrategy.WEIGHTED_ROUND_ROBIN:
        return this.selectWeightedRoundRobin(healthyProviders);

      case LoadBalancerStrategy.LEAST_CONNECTIONS:
        return this.selectLeastConnections(healthyProviders);

      case LoadBalancerStrategy.LEAST_RESPONSE_TIME:
        return this.selectLeastResponseTime(healthyProviders);

      case LoadBalancerStrategy.PRIORITY:
        return this.selectByPriority(healthyProviders);

      case LoadBalancerStrategy.COST_OPTIMIZED:
        return this.selectByCost(healthyProviders);

      default:
        return this.selectRoundRobin(healthyProviders);
    }
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(providers: ProviderMetrics[]): IProvider {
    const provider = providers[this.currentIndex % providers.length];
    this.currentIndex++;
    provider.activeConnections++;
    return provider.provider;
  }

  /**
   * Weighted round-robin selection
   */
  private selectWeightedRoundRobin(providers: ProviderMetrics[]): IProvider {
    if (this.weightedIndexes.length === 0) {
      this.buildWeightedIndexes();
    }

    const index = this.weightedIndexes[this.currentIndex % this.weightedIndexes.length];
    this.currentIndex++;

    const provider = providers[index];
    provider.activeConnections++;
    return provider.provider;
  }

  /**
   * Select provider with least active connections
   */
  private selectLeastConnections(providers: ProviderMetrics[]): IProvider {
    const provider = providers.reduce((min, p) =>
      p.activeConnections < min.activeConnections ? p : min
    );
    provider.activeConnections++;
    return provider.provider;
  }

  /**
   * Select provider with best response time
   */
  private selectLeastResponseTime(providers: ProviderMetrics[]): IProvider {
    const provider = providers.reduce((best, p) => {
      // If no stats yet, consider it best
      if (p.totalRequests === 0) return p;
      if (best.totalRequests === 0) return best;

      return p.averageResponseTime < best.averageResponseTime ? p : best;
    });
    provider.activeConnections++;
    return provider.provider;
  }

  /**
   * Select by priority (lower number = higher priority)
   */
  private selectByPriority(providers: ProviderMetrics[]): IProvider {
    const provider = providers.reduce((best, p) =>
      p.priority < best.priority ? p : best
    );
    provider.activeConnections++;
    return provider.provider;
  }

  /**
   * Select cheapest provider
   */
  private selectByCost(providers: ProviderMetrics[]): IProvider {
    const provider = providers.reduce((cheapest, p) => {
      if (p.costPerRequest === undefined) return cheapest;
      if (cheapest.costPerRequest === undefined) return p;
      return p.costPerRequest < cheapest.costPerRequest ? p : cheapest;
    });
    provider.activeConnections++;
    return provider.provider;
  }

  /**
   * Record successful request
   */
  recordSuccess(provider: IProvider, responseTime?: number): void {
    const metrics = this.providers.find(p => p.provider === provider);
    if (metrics) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      metrics.totalRequests++;
      metrics.successCount++;

      if (responseTime !== undefined) {
        metrics.lastResponseTime = responseTime;
        metrics.averageResponseTime =
          (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime)
          / metrics.totalRequests;
      }
    }
  }

  /**
   * Record failed request
   */
  recordFailure(provider: IProvider): void {
    const metrics = this.providers.find(p => p.provider === provider);
    if (metrics) {
      metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
      metrics.totalRequests++;
      metrics.failureCount++;

      // Mark unhealthy if failure rate too high
      const failureRate = metrics.failureCount / metrics.totalRequests;
      if (failureRate > 0.5 && metrics.totalRequests > 10) {
        metrics.isHealthy = false;
      }
    }
  }

  /**
   * Mark provider as unhealthy
   */
  markUnhealthy(provider: IProvider): void {
    const metrics = this.providers.find(p => p.provider === provider);
    if (metrics) {
      metrics.isHealthy = false;
    }
  }

  /**
   * Mark provider as healthy
   */
  markHealthy(provider: IProvider): void {
    const metrics = this.providers.find(p => p.provider === provider);
    if (metrics) {
      metrics.isHealthy = true;
    }
  }

  /**
   * Build weighted indexes for weighted round-robin
   */
  private buildWeightedIndexes(): void {
    this.weightedIndexes = [];

    this.providers.forEach((provider, index) => {
      const weight = provider.weight;
      for (let i = 0; i < weight; i++) {
        this.weightedIndexes.push(index);
      }
    });

    // Shuffle for better distribution
    for (let i = this.weightedIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.weightedIndexes[i], this.weightedIndexes[j]] =
        [this.weightedIndexes[j], this.weightedIndexes[i]];
    }
  }

  /**
   * Estimate cost per request for a provider
   */
  private getProviderCost(provider: IProvider): number | undefined {
    // Cost estimates per 1000 requests (in USD)
    const costEstimates: Record<string, number> = {
      'alchemy': 0.12,      // Alchemy pricing
      'infura': 0.10,       // Infura pricing
      'quicknode': 0.15,    // QuickNode pricing
      'etherscan': 0,       // Free tier
      'custom': 0.05        // Assume self-hosted
    };

    return costEstimates[provider.type] ? costEstimates[provider.type] / 1000 : undefined;
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProviderMetrics[] {
    return [...this.providers];
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.providers.forEach(metrics => {
      metrics.activeConnections = 0;
      metrics.totalRequests = 0;
      metrics.successCount = 0;
      metrics.failureCount = 0;
      metrics.averageResponseTime = 0;
      metrics.lastResponseTime = 0;
    });
  }
}
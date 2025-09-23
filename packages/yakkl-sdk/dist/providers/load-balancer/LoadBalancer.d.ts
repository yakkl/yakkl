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
export declare enum LoadBalancerStrategy {
    ROUND_ROBIN = "round_robin",
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin",
    LEAST_CONNECTIONS = "least_connections",
    LEAST_RESPONSE_TIME = "least_response_time",
    PRIORITY = "priority",
    COST_OPTIMIZED = "cost_optimized"
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
export declare class LoadBalancer {
    private providers;
    private strategy;
    private currentIndex;
    private weightedIndexes;
    constructor(providers: IProvider[], strategy: LoadBalancerStrategy);
    /**
     * Update the list of providers
     */
    updateProviders(providers: IProvider[]): void;
    /**
     * Select a provider based on the configured strategy
     */
    selectProvider(): Promise<IProvider | null>;
    /**
     * Round-robin selection
     */
    private selectRoundRobin;
    /**
     * Weighted round-robin selection
     */
    private selectWeightedRoundRobin;
    /**
     * Select provider with least active connections
     */
    private selectLeastConnections;
    /**
     * Select provider with best response time
     */
    private selectLeastResponseTime;
    /**
     * Select by priority (lower number = higher priority)
     */
    private selectByPriority;
    /**
     * Select cheapest provider
     */
    private selectByCost;
    /**
     * Record successful request
     */
    recordSuccess(provider: IProvider, responseTime?: number): void;
    /**
     * Record failed request
     */
    recordFailure(provider: IProvider): void;
    /**
     * Mark provider as unhealthy
     */
    markUnhealthy(provider: IProvider): void;
    /**
     * Mark provider as healthy
     */
    markHealthy(provider: IProvider): void;
    /**
     * Build weighted indexes for weighted round-robin
     */
    private buildWeightedIndexes;
    /**
     * Estimate cost per request for a provider
     */
    private getProviderCost;
    /**
     * Get current metrics
     */
    getMetrics(): ProviderMetrics[];
    /**
     * Reset all metrics
     */
    resetMetrics(): void;
}
export {};

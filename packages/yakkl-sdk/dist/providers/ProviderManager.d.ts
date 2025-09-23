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
import { IProvider, ProviderType, ProviderStats } from './ProviderInterface';
import { LoadBalancerStrategy } from './load-balancer/LoadBalancer';
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
export declare class ProviderManager {
    private providers;
    private loadBalancer;
    private cache?;
    private rateLimiters;
    private healthCheckInterval?;
    private config;
    constructor(config: ProviderManagerConfig);
    /**
     * Add a provider to the manager
     */
    addProvider(provider: IProvider): void;
    /**
     * Remove a provider from the manager
     */
    removeProvider(type: ProviderType, name: string): void;
    /**
     * Execute a request with automatic provider selection and fallback
     */
    request<T = any>(args: {
        method: string;
        params?: any[];
    }): Promise<T>;
    /**
     * Select the best provider for a specific method
     */
    private selectProvider;
    /**
     * Batch multiple requests (optimized for providers that support batch)
     */
    batch(requests: Array<{
        method: string;
        params?: any[];
    }>): Promise<any[]>;
    /**
     * Get statistics for all providers
     */
    getStats(): Map<string, ProviderStats>;
    /**
     * Start health monitoring
     */
    private startHealthMonitoring;
    /**
     * Stop health monitoring
     */
    private stopHealthMonitoring;
    /**
     * Generate cache key for a request
     */
    private getCacheKey;
    /**
     * Helper delay function
     */
    private delay;
    /**
     * Cleanup resources
     */
    destroy(): Promise<void>;
    getBalance(address: string): Promise<string>;
    getTransactionCount(address: string): Promise<number>;
    getGasPrice(): Promise<string>;
    getBlockNumber(): Promise<number>;
    getChainId(): Promise<number>;
    sendTransaction(transaction: any): Promise<string>;
    getTransaction(hash: string): Promise<any>;
    getTransactionReceipt(hash: string): Promise<any>;
}

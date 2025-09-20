/**
 * HistoricalPriceService - Unified historical pricing for backtesting
 *
 * Plugin-based architecture supporting multiple data sources:
 * - API providers (CoinGecko, CoinMarketCap, Messari)
 * - On-chain DEX data (Uniswap, SushiSwap)
 * - Archive nodes (for exact block prices)
 * - Local transaction history
 */
export interface PricePoint {
    timestamp: number;
    blockNumber?: number;
    price: number;
    volume24h?: number;
    marketCap?: number;
    source: string;
    confidence: number;
}
export interface PriceRange {
    token: string;
    chainId: number;
    startTime: number;
    endTime: number;
    interval: 'minute' | 'hour' | 'day' | 'week' | 'month';
    prices: PricePoint[];
}
export interface HistoricalProviderConfig {
    name: string;
    priority: number;
    rateLimit?: {
        requests: number;
        window: number;
    };
    apiKey?: string;
    capabilities: ProviderCapabilities;
}
export interface ProviderCapabilities {
    maxHistoryDays: number;
    supportedChains: number[];
    supportedTokens?: string[];
    hasBlockLevel: boolean;
    hasVolumeData: boolean;
    hasFreeTier: boolean;
    resolution: {
        minute?: boolean;
        hour?: boolean;
        day?: boolean;
    };
}
/**
 * Abstract base class for historical price providers
 */
export declare abstract class HistoricalPriceProvider {
    abstract name: string;
    abstract capabilities: ProviderCapabilities;
    config: HistoricalProviderConfig;
    constructor(config: HistoricalProviderConfig);
    /**
     * Get price at specific timestamp
     */
    abstract getPriceAtTime(token: string, chainId: number, timestamp: number): Promise<PricePoint | null>;
    /**
     * Get price at specific block
     */
    abstract getPriceAtBlock(token: string, chainId: number, blockNumber: number): Promise<PricePoint | null>;
    /**
     * Get price range
     */
    abstract getPriceRange(token: string, chainId: number, startTime: number, endTime: number, interval?: 'minute' | 'hour' | 'day'): Promise<PriceRange>;
    /**
     * Check if provider supports this query
     */
    canHandle(token: string, chainId: number, timestamp: number): boolean;
    /**
     * Calculate confidence score for a price point
     */
    protected calculateConfidence(source: string, age: number): number;
}
/**
 * Main service that orchestrates multiple providers
 */
export declare class HistoricalPriceService {
    private providers;
    private cache;
    private storage?;
    constructor();
    /**
     * Register a provider
     */
    registerProvider(provider: HistoricalPriceProvider): void;
    /**
     * Get price at specific timestamp with automatic provider selection
     */
    getPriceAtTime(token: string, chainId: number, timestamp: number): Promise<PricePoint | null>;
    /**
     * Get price at specific block
     */
    getPriceAtBlock(token: string, chainId: number, blockNumber: number): Promise<PricePoint | null>;
    /**
     * Get price range for charting
     */
    getPriceRange(token: string, chainId: number, startTime: number, endTime: number, interval?: 'minute' | 'hour' | 'day'): Promise<PriceRange>;
    /**
     * Build price history from user's transactions
     */
    buildPriceHistoryFromTransactions(transactions: Array<{
        hash: string;
        timestamp: number;
        value: string;
        tokenAddress?: string;
        tokenAmount?: string;
    }>): Promise<Map<string, PricePoint[]>>;
    /**
     * Interpolate price between known points
     */
    private interpolatePrice;
    /**
     * Initialize IndexedDB storage
     */
    private initializeStorage;
    private getFromStorage;
    private saveToStorage;
    private findNearestPrice;
    private estimateBlockTimestamp;
    private buildRangeFromPoints;
    private calculateConfidence;
}

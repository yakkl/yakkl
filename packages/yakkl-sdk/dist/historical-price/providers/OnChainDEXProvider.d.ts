/**
 * OnChainDEXProvider - Historical prices from DEX events
 *
 * Gets exact historical prices from on-chain DEX swaps
 * Most accurate but requires archive node access
 */
import { HistoricalPriceProvider, type PricePoint, type PriceRange, type ProviderCapabilities } from '../HistoricalPriceService';
export declare class OnChainDEXProvider extends HistoricalPriceProvider {
    name: string;
    capabilities: ProviderCapabilities;
    private archiveNodeUrl;
    private poolCache;
    constructor(config: any);
    getPriceAtTime(tokenAddress: string, chainId: number, timestamp: number): Promise<PricePoint | null>;
    getPriceAtBlock(tokenAddress: string, chainId: number, blockNumber: number): Promise<PricePoint | null>;
    getPriceRange(tokenAddress: string, chainId: number, startTime: number, endTime: number, interval?: 'minute' | 'hour' | 'day'): Promise<PriceRange>;
    /**
     * Find the best liquidity pool for a token
     */
    private findBestPool;
    /**
     * Get pool reserves at specific block
     */
    private getPoolReserves;
    /**
     * Calculate price from pool reserves
     */
    private calculatePriceFromReserves;
    /**
     * Get swap events from a pool
     */
    private getSwapEvents;
    /**
     * Aggregate swap events into price points
     */
    private aggregateSwapsIntoPrices;
    /**
     * Helper methods
     */
    private getQuoteTokens;
    private findUniswapV3Pool;
    private findUniswapV2Pool;
    private sortPoolsByLiquidity;
    private getBlockFromTimestamp;
    private getBlockTimestamp;
}

/**
 * CoinGeckoHistoricalProvider - Free tier historical pricing
 *
 * Capabilities:
 * - 365 days of history (free tier)
 * - Hourly/daily resolution
 * - Most major tokens
 * - No API key required for basic usage
 */
import { HistoricalPriceProvider, type PricePoint, type PriceRange, type ProviderCapabilities } from '../HistoricalPriceService';
export declare class CoinGeckoHistoricalProvider extends HistoricalPriceProvider {
    name: string;
    capabilities: ProviderCapabilities;
    private baseUrl;
    private tokenIdCache;
    getPriceAtTime(tokenAddress: string, chainId: number, timestamp: number): Promise<PricePoint | null>;
    getPriceAtBlock(tokenAddress: string, chainId: number, blockNumber: number): Promise<PricePoint | null>;
    getPriceRange(tokenAddress: string, chainId: number, startTime: number, endTime: number, interval?: 'minute' | 'hour' | 'day'): Promise<PriceRange>;
    /**
     * Map token address to CoinGecko ID
     */
    private getTokenId;
}

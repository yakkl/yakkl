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

export class CoinGeckoHistoricalProvider extends HistoricalPriceProvider {
  name = 'coingecko';
  capabilities: ProviderCapabilities = {
    maxHistoryDays: 365,
    supportedChains: [1, 137, 56, 43114, 250, 10, 42161], // Major EVM chains
    hasBlockLevel: false,
    hasVolumeData: true,
    hasFreeTier: true,
    resolution: {
      hour: true,
      day: true
    }
  };

  private baseUrl = 'https://api.coingecko.com/api/v3';
  private tokenIdCache = new Map<string, string>();

  async getPriceAtTime(
    tokenAddress: string,
    chainId: number,
    timestamp: number
  ): Promise<PricePoint | null> {
    try {
      const tokenId = await this.getTokenId(tokenAddress, chainId);
      if (!tokenId) return null;

      // Convert timestamp to date
      const date = new Date(timestamp);
      const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

      // Get historical price for specific date
      const url = `${this.baseUrl}/coins/${tokenId}/history?date=${dateStr}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.market_data?.current_price?.usd) {
        return null;
      }

      return {
        timestamp,
        price: data.market_data.current_price.usd,
        volume24h: data.market_data.total_volume?.usd,
        marketCap: data.market_data.market_cap?.usd,
        source: 'coingecko',
        confidence: this.calculateConfidence('coingecko', Date.now() - timestamp)
      };
    } catch (error) {
      console.warn('[CoinGecko] Failed to get historical price:', error);
      return null;
    }
  }

  async getPriceAtBlock(
    tokenAddress: string,
    chainId: number,
    blockNumber: number
  ): Promise<PricePoint | null> {
    // CoinGecko doesn't support block-level queries
    return null;
  }

  async getPriceRange(
    tokenAddress: string,
    chainId: number,
    startTime: number,
    endTime: number,
    interval?: 'minute' | 'hour' | 'day'
  ): Promise<PriceRange> {
    try {
      const tokenId = await this.getTokenId(tokenAddress, chainId);
      if (!tokenId) {
        return {
          token: tokenAddress,
          chainId,
          startTime,
          endTime,
          interval: interval || 'hour',
          prices: []
        };
      }

      // Calculate days between start and end
      const days = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));

      // CoinGecko market_chart endpoint
      const url = `${this.baseUrl}/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}&interval=${interval || 'hourly'}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      const prices: PricePoint[] = data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
        source: 'coingecko',
        confidence: this.calculateConfidence('coingecko', Date.now() - timestamp)
      }));

      // Add volume data if available
      if (data.total_volumes) {
        data.total_volumes.forEach(([timestamp, volume]: [number, number], index: number) => {
          if (prices[index] && prices[index].timestamp === timestamp) {
            prices[index].volume24h = volume;
          }
        });
      }

      // Add market cap data if available
      if (data.market_caps) {
        data.market_caps.forEach(([timestamp, marketCap]: [number, number], index: number) => {
          if (prices[index] && prices[index].timestamp === timestamp) {
            prices[index].marketCap = marketCap;
          }
        });
      }

      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || 'hour',
        prices: prices.filter(p => p.timestamp >= startTime && p.timestamp <= endTime)
      };
    } catch (error) {
      console.warn('[CoinGecko] Failed to get price range:', error);
      return {
        token: tokenAddress,
        chainId,
        startTime,
        endTime,
        interval: interval || 'hour',
        prices: []
      };
    }
  }

  /**
   * Map token address to CoinGecko ID
   */
  private async getTokenId(tokenAddress: string, chainId: number): Promise<string | null> {
    const cacheKey = `${chainId}-${tokenAddress.toLowerCase()}`;

    if (this.tokenIdCache.has(cacheKey)) {
      return this.tokenIdCache.get(cacheKey)!;
    }

    try {
      // Map chainId to CoinGecko platform
      const platformMap: Record<number, string> = {
        1: 'ethereum',
        137: 'polygon-pos',
        56: 'binance-smart-chain',
        43114: 'avalanche',
        250: 'fantom',
        10: 'optimistic-ethereum',
        42161: 'arbitrum-one'
      };

      const platform = platformMap[chainId];
      if (!platform) return null;

      // Special case for native tokens
      if (tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
        const nativeTokens: Record<number, string> = {
          1: 'ethereum',
          137: 'matic-network',
          56: 'binancecoin',
          43114: 'avalanche-2',
          250: 'fantom',
          10: 'ethereum', // Uses ETH
          42161: 'ethereum' // Uses ETH
        };
        const tokenId = nativeTokens[chainId];
        if (tokenId) {
          this.tokenIdCache.set(cacheKey, tokenId);
          return tokenId;
        }
      }

      // Query CoinGecko for token info
      const url = `${this.baseUrl}/coins/${platform}/contract/${tokenAddress.toLowerCase()}`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        const tokenId = data.id;
        this.tokenIdCache.set(cacheKey, tokenId);
        return tokenId;
      }

      return null;
    } catch (error) {
      console.warn('[CoinGecko] Failed to get token ID:', error);
      return null;
    }
  }
}
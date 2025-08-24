/**
 * Migration adapter to bridge legacy price providers with the new IPriceProvider interface
 * This allows gradual migration while maintaining backwards compatibility
 */

import type { PriceProvider, MarketPriceData } from '$lib/common/interfaces';
import type { IPriceProvider, PriceData, TokenPriceData, HistoricalPriceData, BatchPriceData, HistoricalPriceOptions } from '../interfaces/IPriceProvider';

/**
 * Adapter that wraps a legacy PriceProvider to work with the new IPriceProvider interface
 */
export class LegacyPriceProviderAdapter implements IPriceProvider {
  readonly name: string;
  readonly supportedChains: string[];
  readonly rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };

  private legacyProvider: PriceProvider;

  constructor(legacyProvider: PriceProvider, config?: {
    supportedChains?: string[];
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
  }) {
    this.legacyProvider = legacyProvider;
    this.name = legacyProvider.getName().toLowerCase();
    this.supportedChains = config?.supportedChains || ['ethereum', 'polygon', 'arbitrum'];
    this.rateLimit = config?.rateLimit;
  }

  /**
   * Convert legacy MarketPriceData to new PriceData format
   */
  private convertToNewFormat(pair: string, legacyData: MarketPriceData): PriceData {
    return {
      pair,
      price: legacyData.price,
      priceString: legacyData.price.toString(),
      change24h: undefined, // Legacy interface doesn't have this
      change24hAbs: undefined,
      volume24h: undefined,
      marketCap: undefined,
      lastUpdated: legacyData.lastUpdated ? legacyData.lastUpdated.getTime() : Date.now(),
      source: this.name,
      baseCurrency: pair.split('-')[0] || pair.split('/')[0] || 'ETH',
      quoteCurrency: legacyData.currency || 'USD'
    };
  }

  async getMarketPrice(pair: string): Promise<PriceData> {
    try {
      const legacyResult = await this.legacyProvider.getMarketPrice(pair);
      
      if (legacyResult.status !== 0 && legacyResult.status !== 200) {
        throw new Error(legacyResult.message || `API returned status: ${legacyResult.status}`);
      }

      return this.convertToNewFormat(pair, legacyResult);
    } catch (error) {
      throw new Error(`Failed to get market price for ${pair}: ${error}`);
    }
  }

  async getHistoricalPrices(
    pair: string,
    options: HistoricalPriceOptions
  ): Promise<HistoricalPriceData> {
    // Legacy providers don't support historical data
    throw new Error(`Historical prices not supported by legacy provider ${this.name}`);
  }

  async getBatchPrices(pairs: string[]): Promise<BatchPriceData> {
    const prices: Record<string, PriceData> = {};
    const errors: Record<string, string> = {};

    // Legacy providers don't have native batch support, so we'll use parallel requests
    const promises = pairs.map(async (pair) => {
      try {
        const result = await this.getMarketPrice(pair);
        prices[pair] = result;
      } catch (error) {
        errors[pair] = error instanceof Error ? error.message : 'Unknown error';
      }
    });

    await Promise.allSettled(promises);

    return {
      prices,
      timestamp: Date.now(),
      source: this.name,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }

  async getTokenPrice(
    contractAddress: string,
    chainId: number,
    vsCurrency: string = 'USD'
  ): Promise<TokenPriceData> {
    // Legacy providers don't support token prices by contract address
    throw new Error(`Token prices by contract address not supported by legacy provider ${this.name}`);
  }

  async getSupportedCurrencies(): Promise<string[]> {
    // Return common currencies for legacy providers
    return ['USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH'];
  }

  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Try to get ETH price as a health check
      const result = await this.legacyProvider.getMarketPrice('ETH-USD');
      
      if (result.status !== 0 && result.status !== 200) {
        return {
          healthy: false,
          latency: Date.now() - startTime,
          error: result.message || `API returned status: ${result.status}`
        };
      }

      return {
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Factory function to create legacy price provider adapters
 */
export function createLegacyPriceProviderAdapter(
  legacyProvider: PriceProvider,
  config?: {
    supportedChains?: string[];
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
  }
): IPriceProvider {
  return new LegacyPriceProviderAdapter(legacyProvider, config);
}
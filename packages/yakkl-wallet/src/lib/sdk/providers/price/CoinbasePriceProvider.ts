import type { IPriceProvider, PriceData, TokenPriceData, HistoricalPriceData, BatchPriceData, HistoricalPriceOptions } from '../../interfaces/IPriceProvider';
import type { IKeyManager } from '../../interfaces/IKeyManager';

/**
 * Coinbase Price Provider using the new IPriceProvider interface
 * Supports batch price fetching with parallel requests
 */
export class CoinbasePriceProvider implements IPriceProvider {
  readonly name = 'coinbase';
  readonly supportedChains = [
    'ethereum',
    'bitcoin',
    'litecoin'
  ];
  readonly rateLimit = {
    requestsPerMinute: 10,
    requestsPerHour: 600,
    requestsPerDay: 14400
  };

  private keyManager: IKeyManager;
  private baseUrl = 'https://api.coinbase.com/api/v3/brokerage';

  constructor(keyManager: IKeyManager) {
    this.keyManager = keyManager;
  }

  /**
   * Get API key for requests (optional for public endpoints)
   */
  private async getApiKey(): Promise<string | null> {
    try {
      return await this.keyManager.getKey('coinbase', 'read');
    } catch {
      // API key is optional for public endpoints
      return null;
    }
  }

  /**
   * Make HTTP request to Coinbase API
   */
  private async makeRequest(endpoint: string, params: URLSearchParams = new URLSearchParams()): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}?${params.toString()}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'YAKKL-SDK/1.0'
    };

    // Add API key if available (for higher rate limits)
    const apiKey = await this.getApiKey();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Coinbase API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Format symbol for Coinbase API
   */
  private formatSymbol(pair: string): string {
    // Handle wrapped tokens
    if (pair.startsWith('WETH')) {
      return pair.replace('WETH', 'ETH');
    }
    if (pair.startsWith('WBTC')) {
      return pair.replace('WBTC', 'BTC');
    }
    
    return pair.toUpperCase();
  }

  /**
   * Get current market price for a trading pair
   */
  async getMarketPrice(pair: string): Promise<PriceData> {
    try {
      const formattedPair = this.formatSymbol(pair);
      const [tokenIn, tokenOut] = formattedPair.split('-');
      
      if (!tokenIn || !tokenOut) {
        throw new Error(`Invalid pair format: ${pair}. Expected format: TOKEN-USD`);
      }

      // Handle USDC special case - always $1.00
      if (tokenIn === 'USDC' && tokenOut === 'USD') {
        return {
          pair,
          price: 1.00,
          priceString: '1.00',
          change24h: 0,
          change24hAbs: 0,
          volume24h: undefined,
          marketCap: undefined,
          lastUpdated: Date.now(),
          source: this.name,
          baseCurrency: tokenIn,
          quoteCurrency: tokenOut
        };
      }

      const productId = `${tokenIn}-${tokenOut}`;
      const params = new URLSearchParams({
        limit: '1',
        product_ids: productId
      });

      const response = await this.makeRequest('market/products', params);

      if (!response.products || response.products.length === 0) {
        throw new Error(`No data found for ${productId}`);
      }

      const product = response.products[0];
      const price = parseFloat(product.price);

      if (isNaN(price)) {
        throw new Error(`Invalid price data for ${productId}`);
      }

      return {
        pair,
        price,
        priceString: product.price,
        change24h: product.price_percentage_change_24h ? parseFloat(product.price_percentage_change_24h) : undefined,
        change24hAbs: undefined,
        volume24h: product.volume_24h ? parseFloat(product.volume_24h) : undefined,
        marketCap: undefined,
        lastUpdated: Date.now(),
        source: this.name,
        baseCurrency: tokenIn,
        quoteCurrency: tokenOut
      };
    } catch (error) {
      throw new Error(`Failed to fetch price for ${pair}: ${error}`);
    }
  }

  /**
   * Get historical price data
   */
  async getHistoricalPrices(
    pair: string,
    options: HistoricalPriceOptions
  ): Promise<HistoricalPriceData> {
    const formattedPair = this.formatSymbol(pair);
    const [tokenIn, tokenOut] = formattedPair.split('-');
    const productId = `${tokenIn}-${tokenOut}`;

    const params = new URLSearchParams({
      start: new Date(options.startTime).toISOString(),
      end: new Date(options.endTime).toISOString(),
      granularity: this.convertInterval(options.interval || '1d')
    });

    try {
      const response = await this.makeRequest(`market/products/${productId}/candles`, params);

      if (!response.candles || response.candles.length === 0) {
        throw new Error(`No historical data found for ${productId}`);
      }

      const prices = response.candles.map((candle: any) => ({
        timestamp: Math.floor(new Date(candle.start).getTime() / 1000) * 1000,
        price: parseFloat(candle.close),
        volume: parseFloat(candle.volume),
        marketCap: undefined
      }));

      return {
        pair,
        prices,
        startTime: options.startTime,
        endTime: options.endTime,
        interval: options.interval || '1d',
        source: this.name
      };
    } catch (error) {
      throw new Error(`Failed to fetch historical prices for ${pair}: ${error}`);
    }
  }

  /**
   * Convert interval format for Coinbase API
   */
  private convertInterval(interval: string): string {
    const intervalMap: Record<string, string> = {
      '1m': '60',
      '5m': '300',
      '15m': '900',
      '1h': '3600',
      '6h': '21600',
      '1d': '86400'
    };
    return intervalMap[interval] || '86400'; // Default to 1 day
  }

  /**
   * Get prices for multiple pairs using parallel requests
   */
  async getBatchPrices(pairs: string[]): Promise<BatchPriceData> {
    const prices: Record<string, PriceData> = {};
    const errors: Record<string, string> = {};

    // Coinbase doesn't have a native batch API, so we use parallel requests
    const promises = pairs.map(async (pair) => {
      try {
        const priceData = await this.getMarketPrice(pair);
        prices[pair] = priceData;
      } catch (error) {
        errors[pair] = error instanceof Error ? error.message : 'Unknown error';
      }
    });

    // Execute all requests in parallel with a reasonable limit
    const batchSize = 5; // Limit concurrent requests to avoid rate limiting
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      await Promise.allSettled(batch);
    }

    return {
      prices,
      timestamp: Date.now(),
      source: this.name,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }

  /**
   * Get token price by contract address (not supported by Coinbase)
   */
  async getTokenPrice(
    contractAddress: string,
    chainId: number,
    vsCurrency: string = 'USD'
  ): Promise<TokenPriceData> {
    throw new Error('Token prices by contract address not supported by Coinbase');
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    return ['USD', 'EUR', 'GBP', 'BTC', 'ETH'];
  }

  /**
   * Health check for the price provider
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Simple test to check if API is responsive
      await this.getMarketPrice('BTC-USD');
      
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
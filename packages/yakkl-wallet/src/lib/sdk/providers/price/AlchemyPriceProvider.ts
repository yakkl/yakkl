import type { IPriceProvider, PriceData, TokenPriceData, HistoricalPriceData, BatchPriceData, HistoricalPriceOptions } from '../../interfaces/IPriceProvider';
import type { IKeyManager } from '../../interfaces/IKeyManager';

/**
 * Alchemy Price Provider using the IPriceProvider interface
 * Integrates with the enhanced key manager for secure API key handling
 */
export class AlchemyPriceProvider implements IPriceProvider {
  readonly name = 'alchemy';
  readonly supportedChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'base'
  ];
  readonly rateLimit = {
    requestsPerMinute: 100,
    requestsPerHour: 6000,
    requestsPerDay: 144000
  };

  private keyManager: IKeyManager;
  private baseUrl = 'https://api.g.alchemy.com/prices/v1';

  constructor(keyManager: IKeyManager) {
    this.keyManager = keyManager;
  }

  /**
   * Get API key for price requests
   */
  private async getApiKey(): Promise<string> {
    const key = await this.keyManager.getKey('alchemy', 'read');
    if (!key) {
      throw new Error('No Alchemy API key available for price requests');
    }
    return key;
  }

  /**
   * Make HTTP request to Alchemy Price API
   */
  private async makeRequest(endpoint: string, params: URLSearchParams = new URLSearchParams()): Promise<any> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/${endpoint}?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Alchemy Price API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Format symbol for Alchemy API
   */
  private formatSymbol(pair: string): string {
    // Remove any pair suffix (e.g., 'ETH-USD' -> 'ETH')
    return pair.split('-')[0].toUpperCase();
  }

  /**
   * Get current market price for a trading pair
   */
  async getMarketPrice(pair: string): Promise<PriceData> {
    try {
      const symbol = this.formatSymbol(pair);
      const params = new URLSearchParams({ symbols: symbol });
      
      const response = await this.makeRequest('tokens/by-symbol', params);
      
      if (!response.data || response.data.length === 0) {
        throw new Error(`No price data found for ${symbol}`);
      }

      const tokenData = response.data[0];
      const priceUsd = tokenData.prices?.find((p: any) => p.currency === 'USD')?.value;
      
      if (!priceUsd) {
        throw new Error(`No USD price found for ${symbol}`);
      }

      return {
        pair,
        price: parseFloat(priceUsd),
        priceString: priceUsd,
        change24h: tokenData.price_change_24h,
        change24hAbs: tokenData.price_change_24h_abs,
        volume24h: tokenData.volume_24h,
        marketCap: tokenData.market_cap,
        lastUpdated: Date.now(),
        source: this.name,
        baseCurrency: symbol,
        quoteCurrency: 'USD'
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
    try {
      const symbol = this.formatSymbol(pair);
      const params = new URLSearchParams({
        symbols: symbol,
        startTime: options.startTime.toString(),
        endTime: options.endTime.toString(),
        interval: options.interval || '1d'
      });

      if (options.limit) {
        params.append('limit', options.limit.toString());
      }

      const response = await this.makeRequest('tokens/historical', params);
      
      if (!response.data || !response.data[symbol]) {
        throw new Error(`No historical data found for ${symbol}`);
      }

      const historicalData = response.data[symbol];
      
      const prices = historicalData.map((point: any) => ({
        timestamp: point.timestamp,
        price: parseFloat(point.price),
        volume: point.volume ? parseFloat(point.volume) : undefined,
        marketCap: point.market_cap ? parseFloat(point.market_cap) : undefined
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
   * Get prices for multiple pairs at once
   */
  async getBatchPrices(pairs: string[]): Promise<BatchPriceData> {
    try {
      const symbols = pairs.map(pair => this.formatSymbol(pair)).join(',');
      const params = new URLSearchParams({ symbols });
      
      const response = await this.makeRequest('tokens/by-symbol', params);
      
      if (!response.data) {
        throw new Error('No batch price data received');
      }

      const prices: Record<string, PriceData> = {};
      const errors: Record<string, string> = {};

      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const symbol = this.formatSymbol(pair);
        const tokenData = response.data.find((d: any) => d.symbol === symbol);
        
        if (tokenData) {
          const priceUsd = tokenData.prices?.find((p: any) => p.currency === 'USD')?.value;
          
          if (priceUsd) {
            prices[pair] = {
              pair,
              price: parseFloat(priceUsd),
              priceString: priceUsd,
              change24h: tokenData.price_change_24h,
              change24hAbs: tokenData.price_change_24h_abs,
              volume24h: tokenData.volume_24h,
              marketCap: tokenData.market_cap,
              lastUpdated: Date.now(),
              source: this.name,
              baseCurrency: symbol,
              quoteCurrency: 'USD'
            };
          } else {
            errors[pair] = 'No USD price found';
          }
        } else {
          errors[pair] = 'Token not found';
        }
      }

      return {
        prices,
        timestamp: Date.now(),
        source: this.name,
        errors: Object.keys(errors).length > 0 ? errors : undefined
      };
    } catch (error) {
      throw new Error(`Failed to fetch batch prices: ${error}`);
    }
  }

  /**
   * Get token price by contract address
   */
  async getTokenPrice(
    contractAddress: string,
    chainId: number,
    vsCurrency: string = 'USD'
  ): Promise<TokenPriceData> {
    try {
      const params = new URLSearchParams({
        contractAddress,
        chainId: chainId.toString()
      });
      
      const response = await this.makeRequest('tokens/by-address', params);
      
      if (!response.data || response.data.length === 0) {
        throw new Error(`No price data found for contract ${contractAddress}`);
      }

      const tokenData = response.data[0];
      const priceData = tokenData.prices?.find((p: any) => p.currency === vsCurrency.toUpperCase());
      
      if (!priceData) {
        throw new Error(`No ${vsCurrency} price found for contract ${contractAddress}`);
      }

      return {
        pair: `${tokenData.symbol}-${vsCurrency}`,
        price: parseFloat(priceData.value),
        priceString: priceData.value,
        change24h: tokenData.price_change_24h,
        change24hAbs: tokenData.price_change_24h_abs,
        volume24h: tokenData.volume_24h,
        marketCap: tokenData.market_cap,
        lastUpdated: Date.now(),
        source: this.name,
        baseCurrency: tokenData.symbol,
        quoteCurrency: vsCurrency.toUpperCase(),
        contractAddress,
        chainId,
        symbol: tokenData.symbol,
        name: tokenData.name,
        decimals: tokenData.decimals,
        circulatingSupply: tokenData.circulating_supply,
        totalSupply: tokenData.total_supply,
        maxSupply: tokenData.max_supply
      };
    } catch (error) {
      throw new Error(`Failed to fetch token price for ${contractAddress}: ${error}`);
    }
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    return ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW'];
  }

  /**
   * Health check for the price provider
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Simple test to check if API is responsive
      await this.getMarketPrice('ETH');
      
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
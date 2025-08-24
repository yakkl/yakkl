import type { IPriceProvider, PriceData, TokenPriceData, HistoricalPriceData, BatchPriceData, HistoricalPriceOptions } from '../../interfaces/IPriceProvider';
import type { IKeyManager } from '../../interfaces/IKeyManager';

/**
 * CoinGecko Price Provider using the new IPriceProvider interface
 * Supports native batch price fetching for multiple tokens at once
 */
export class CoingeckoPriceProvider implements IPriceProvider {
  readonly name = 'coingecko';
  readonly supportedChains = [
    'ethereum',
    'bitcoin',
    'polygon',
    'arbitrum',
    'optimism',
    'base',
    'binance-smart-chain',
    'avalanche',
    'solana'
  ];
  readonly rateLimit = {
    requestsPerMinute: 30, // Pro API limit
    requestsPerHour: 1800,
    requestsPerDay: 43200
  };

  private keyManager: IKeyManager;
  private baseUrl = 'https://pro-api.coingecko.com/api/v3';

  // Symbol to CoinGecko ID mapping
  private symbolToIdMap: Record<string, string> = {
    'ETH': 'ethereum',
    'WETH': 'ethereum',
    'BTC': 'bitcoin',
    'WBTC': 'wrapped-bitcoin',
    'USDC': 'usd-coin',
    'DAI': 'dai',
    'USDT': 'tether',
    'BUSD': 'binance-usd',
    'SOL': 'solana',
    'MATIC': 'matic-network',
    'BNB': 'binance-coin',
    'AVAX': 'avalanche-2',
    'DOGE': 'dogecoin',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'LTC': 'litecoin',
    'BCH': 'bitcoin-cash',
    'XLM': 'stellar',
    'VET': 'vechain',
    'THETA': 'theta-token',
    'TRX': 'tron',
    'EOS': 'eos',
    'XMR': 'monero',
    'NEO': 'neo',
    'DASH': 'dash',
    'ZEC': 'zcash',
    'QTUM': 'qtum'
  };

  constructor(keyManager: IKeyManager) {
    this.keyManager = keyManager;
  }

  /**
   * Get API key for requests
   */
  private async getApiKey(): Promise<string> {
    const key = await this.keyManager.getKey('coingecko', 'read');
    if (!key) {
      throw new Error('No CoinGecko API key available for price requests');
    }
    return key;
  }

  /**
   * Make HTTP request to CoinGecko API
   */
  private async makeRequest(endpoint: string, params: URLSearchParams = new URLSearchParams()): Promise<any> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/${endpoint}?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-cg-pro-api-key': apiKey,
        'User-Agent': 'YAKKL-SDK/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Convert symbol to CoinGecko ID
   */
  private symbolToId(symbol: string): string {
    return this.symbolToIdMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  /**
   * Parse pair format (SYMBOL-CURRENCY or SYMBOL/CURRENCY)
   */
  private parsePair(pair: string): { symbol: string; currency: string } {
    const separators = ['-', '/'];
    for (const sep of separators) {
      if (pair.includes(sep)) {
        const [symbol, currency] = pair.split(sep);
        return { symbol: symbol.trim(), currency: currency.trim().toLowerCase() };
      }
    }
    // Default to USD if no currency specified
    return { symbol: pair.trim(), currency: 'usd' };
  }

  /**
   * Get current market price for a trading pair
   */
  async getMarketPrice(pair: string): Promise<PriceData> {
    try {
      const { symbol, currency } = this.parsePair(pair);
      const coinId = this.symbolToId(symbol);

      const params = new URLSearchParams({
        ids: coinId,
        vs_currencies: currency,
        include_24hr_change: 'true',
        include_24hr_vol: 'true',
        include_market_cap: 'true',
        include_last_updated_at: 'true'
      });

      const response = await this.makeRequest('simple/price', params);
      const coinData = response[coinId];

      if (!coinData) {
        throw new Error(`No data found for ${coinId}`);
      }

      const price = coinData[currency];
      if (price === undefined || price === null) {
        throw new Error(`No ${currency} price found for ${coinId}`);
      }

      return {
        pair,
        price: parseFloat(price.toString()),
        priceString: price.toString(),
        change24h: coinData[`${currency}_24h_change`] ? parseFloat(coinData[`${currency}_24h_change`]) : undefined,
        change24hAbs: undefined,
        volume24h: coinData[`${currency}_24h_vol`] ? parseFloat(coinData[`${currency}_24h_vol`]) : undefined,
        marketCap: coinData[`${currency}_market_cap`] ? parseFloat(coinData[`${currency}_market_cap`]) : undefined,
        lastUpdated: coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now(),
        source: this.name,
        baseCurrency: symbol.toUpperCase(),
        quoteCurrency: currency.toUpperCase()
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
    const { symbol, currency } = this.parsePair(pair);
    const coinId = this.symbolToId(symbol);

    const params = new URLSearchParams({
      vs_currency: currency,
      from: Math.floor(options.startTime / 1000).toString(),
      to: Math.floor(options.endTime / 1000).toString()
    });

    try {
      const response = await this.makeRequest(`coins/${coinId}/market_chart/range`, params);

      if (!response.prices || response.prices.length === 0) {
        throw new Error(`No historical data found for ${coinId}`);
      }

      const prices = response.prices.map((point: [number, number], index: number) => ({
        timestamp: point[0],
        price: point[1],
        volume: response.total_volumes && response.total_volumes[index] ? response.total_volumes[index][1] : undefined,
        marketCap: response.market_caps && response.market_caps[index] ? response.market_caps[index][1] : undefined
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
   * Get prices for multiple pairs using native batch API
   */
  async getBatchPrices(pairs: string[]): Promise<BatchPriceData> {
    if (pairs.length === 0) {
      return {
        prices: {},
        timestamp: Date.now(),
        source: this.name
      };
    }

    try {
      // Group pairs by currency
      const currencyGroups: Record<string, Array<{ pair: string; symbol: string; coinId: string }>> = {};
      
      pairs.forEach(pair => {
        const { symbol, currency } = this.parsePair(pair);
        const coinId = this.symbolToId(symbol);
        
        if (!currencyGroups[currency]) {
          currencyGroups[currency] = [];
        }
        currencyGroups[currency].push({ pair, symbol, coinId });
      });

      const prices: Record<string, PriceData> = {};
      const errors: Record<string, string> = {};

      // Process each currency group
      for (const [currency, items] of Object.entries(currencyGroups)) {
        try {
          const coinIds = items.map(item => item.coinId).join(',');
          const params = new URLSearchParams({
            ids: coinIds,
            vs_currencies: currency,
            include_24hr_change: 'true',
            include_24hr_vol: 'true',
            include_market_cap: 'true',
            include_last_updated_at: 'true'
          });

          const response = await this.makeRequest('simple/price', params);

          items.forEach(({ pair, symbol, coinId }) => {
            const coinData = response[coinId];
            
            if (coinData && coinData[currency] !== undefined) {
              const price = coinData[currency];
              prices[pair] = {
                pair,
                price: parseFloat(price.toString()),
                priceString: price.toString(),
                change24h: coinData[`${currency}_24h_change`] ? parseFloat(coinData[`${currency}_24h_change`]) : undefined,
                change24hAbs: undefined,
                volume24h: coinData[`${currency}_24h_vol`] ? parseFloat(coinData[`${currency}_24h_vol`]) : undefined,
                marketCap: coinData[`${currency}_market_cap`] ? parseFloat(coinData[`${currency}_market_cap`]) : undefined,
                lastUpdated: coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now(),
                source: this.name,
                baseCurrency: symbol.toUpperCase(),
                quoteCurrency: currency.toUpperCase()
              };
            } else {
              errors[pair] = `No data found for ${coinId}`;
            }
          });
        } catch (error) {
          items.forEach(({ pair }) => {
            errors[pair] = error instanceof Error ? error.message : 'Unknown error';
          });
        }
      }

      return {
        prices,
        timestamp: Date.now(),
        source: this.name,
        errors: Object.keys(errors).length > 0 ? errors : undefined
      };
    } catch (error) {
      // If batch request fails completely, fall back to individual requests
      const errors: Record<string, string> = {};
      pairs.forEach(pair => {
        errors[pair] = error instanceof Error ? error.message : 'Batch request failed';
      });
      
      return {
        prices: {},
        timestamp: Date.now(),
        source: this.name,
        errors
      };
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
      const platformId = this.chainIdToPlatform(chainId);
      const currency = vsCurrency.toLowerCase();

      const params = new URLSearchParams({
        contract_addresses: contractAddress,
        vs_currencies: currency,
        include_24hr_change: 'true',
        include_24hr_vol: 'true',
        include_market_cap: 'true'
      });

      const response = await this.makeRequest(`simple/token_price/${platformId}`, params);
      const tokenData = response[contractAddress.toLowerCase()];

      if (!tokenData) {
        throw new Error(`No data found for contract ${contractAddress}`);
      }

      const price = tokenData[currency];
      if (price === undefined || price === null) {
        throw new Error(`No ${vsCurrency} price found for contract ${contractAddress}`);
      }

      return {
        pair: `TOKEN-${vsCurrency}`,
        price: parseFloat(price.toString()),
        priceString: price.toString(),
        change24h: tokenData[`${currency}_24h_change`] ? parseFloat(tokenData[`${currency}_24h_change`]) : undefined,
        change24hAbs: undefined,
        volume24h: tokenData[`${currency}_24h_vol`] ? parseFloat(tokenData[`${currency}_24h_vol`]) : undefined,
        marketCap: tokenData[`${currency}_market_cap`] ? parseFloat(tokenData[`${currency}_market_cap`]) : undefined,
        lastUpdated: Date.now(),
        source: this.name,
        baseCurrency: 'TOKEN',
        quoteCurrency: vsCurrency.toUpperCase(),
        contractAddress,
        chainId
      };
    } catch (error) {
      throw new Error(`Failed to fetch token price for ${contractAddress}: ${error}`);
    }
  }

  /**
   * Convert chain ID to CoinGecko platform ID
   */
  private chainIdToPlatform(chainId: number): string {
    const chainMap: Record<number, string> = {
      1: 'ethereum',
      137: 'polygon-pos',
      42161: 'arbitrum-one',
      10: 'optimistic-ethereum',
      8453: 'base',
      56: 'binance-smart-chain',
      43114: 'avalanche',
      250: 'fantom'
    };
    
    return chainMap[chainId] || 'ethereum';
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const response = await this.makeRequest('simple/supported_vs_currencies');
      return response;
    } catch {
      // Return common currencies if API fails
      return ['usd', 'eur', 'gbp', 'jpy', 'aud', 'cad', 'chf', 'cny', 'krw', 'btc', 'eth'];
    }
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
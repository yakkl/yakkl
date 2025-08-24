/**
 * Price provider interface for retrieving cryptocurrency prices
 * This interface abstracts different price API providers (CoinGecko, CoinMarketCap, etc.)
 */
export interface IPriceProvider {
  /** Provider name (e.g., 'coingecko', 'coinbase', 'alchemy-prices') */
  readonly name: string;
  
  /** Supported networks/chains */
  readonly supportedChains: string[];
  
  /** Rate limit information */
  readonly rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  
  /**
   * Get current market price for a trading pair
   * @param pair - Trading pair (e.g., 'ETH/USD', 'BTC/EUR')
   */
  getMarketPrice(pair: string): Promise<PriceData>;
  
  /**
   * Get historical price data
   * @param pair - Trading pair
   * @param options - Query options
   */
  getHistoricalPrices(
    pair: string,
    options: HistoricalPriceOptions
  ): Promise<HistoricalPriceData>;
  
  /**
   * Get prices for multiple pairs at once
   * @param pairs - Array of trading pairs
   */
  getBatchPrices(pairs: string[]): Promise<BatchPriceData>;
  
  /**
   * Get token price by contract address
   * @param contractAddress - Token contract address
   * @param chainId - Chain ID
   * @param vsCurrency - Base currency (default: 'usd')
   */
  getTokenPrice(
    contractAddress: string,
    chainId: number,
    vsCurrency?: string
  ): Promise<TokenPriceData>;
  
  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Promise<string[]>;
  
  /**
   * Health check for the price provider
   */
  healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
}

/**
 * Basic price data structure
 */
export interface PriceData {
  /** Trading pair */
  pair: string;
  
  /** Current price */
  price: number;
  
  /** Price in string format for precision */
  priceString: string;
  
  /** 24h change percentage */
  change24h?: number;
  
  /** 24h change in absolute value */
  change24hAbs?: number;
  
  /** 24h volume */
  volume24h?: number;
  
  /** Market cap */
  marketCap?: number;
  
  /** Last updated timestamp */
  lastUpdated: number;
  
  /** Data source */
  source: string;
  
  /** Base currency */
  baseCurrency: string;
  
  /** Quote currency */
  quoteCurrency: string;
}

/**
 * Token-specific price data
 */
export interface TokenPriceData extends PriceData {
  /** Token contract address */
  contractAddress: string;
  
  /** Chain ID */
  chainId: number;
  
  /** Token symbol */
  symbol?: string;
  
  /** Token name */
  name?: string;
  
  /** Token decimals */
  decimals?: number;
  
  /** Circulating supply */
  circulatingSupply?: number;
  
  /** Total supply */
  totalSupply?: number;
  
  /** Max supply */
  maxSupply?: number;
}

/**
 * Historical price data point
 */
export interface PricePoint {
  /** Timestamp */
  timestamp: number;
  
  /** Price at this timestamp */
  price: number;
  
  /** Volume (if available) */
  volume?: number;
  
  /** Market cap (if available) */
  marketCap?: number;
}

/**
 * Historical price data response
 */
export interface HistoricalPriceData {
  /** Trading pair */
  pair: string;
  
  /** Array of price points */
  prices: PricePoint[];
  
  /** Start timestamp */
  startTime: number;
  
  /** End timestamp */
  endTime: number;
  
  /** Interval between data points */
  interval: string;
  
  /** Data source */
  source: string;
}

/**
 * Batch price data response
 */
export interface BatchPriceData {
  /** Map of pair to price data */
  prices: Record<string, PriceData>;
  
  /** Timestamp when batch was fetched */
  timestamp: number;
  
  /** Data source */
  source: string;
  
  /** Any failed pairs */
  errors?: Record<string, string>;
}

/**
 * Options for historical price queries
 */
export interface HistoricalPriceOptions {
  /** Start timestamp */
  startTime: number;
  
  /** End timestamp */
  endTime: number;
  
  /** Data interval ('1h', '1d', '1w', etc.) */
  interval?: string;
  
  /** Maximum number of data points */
  limit?: number;
  
  /** Base currency for prices */
  currency?: string;
}

/**
 * Weighted price provider for load balancing
 */
export interface WeightedPriceProvider {
  /** Price provider instance */
  provider: IPriceProvider;
  
  /** Weight for selection probability */
  weight: number;
  
  /** Priority level (higher = more preferred) */
  priority?: number;
  
  /** Cost tier ('free' or 'paid') */
  costTier?: 'free' | 'paid';
  
  /** Current failure count */
  failureCount?: number;
  
  /** Last failure timestamp */
  lastFailure?: number;
  
  /** Average response time */
  avgResponseTime?: number;
}
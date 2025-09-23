/**
 * HistoricalPriceService - Unified historical pricing for backtesting
 *
 * Plugin-based architecture supporting multiple data sources:
 * - API providers (CoinGecko, CoinMarketCap, Messari)
 * - On-chain DEX data (Uniswap, SushiSwap)
 * - Archive nodes (for exact block prices)
 * - Local transaction history
 */


// Types
export interface PricePoint {
  timestamp: number;
  blockNumber?: number;
  price: number;
  volume24h?: number;
  marketCap?: number;
  source: string;
  confidence: number; // 0-1, how reliable is this price
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
  rateLimit?: { requests: number; window: number };
  apiKey?: string;
  capabilities: ProviderCapabilities;
}

export interface ProviderCapabilities {
  maxHistoryDays: number;
  supportedChains: number[];
  supportedTokens?: string[]; // undefined = all tokens
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
export abstract class HistoricalPriceProvider {
  abstract name: string;
  abstract capabilities: ProviderCapabilities;
  config: HistoricalProviderConfig;

  constructor(config: HistoricalProviderConfig) {
    this.config = config;
  }

  /**
   * Get price at specific timestamp
   */
  abstract getPriceAtTime(
    token: string,
    chainId: number,
    timestamp: number
  ): Promise<PricePoint | null>;

  /**
   * Get price at specific block
   */
  abstract getPriceAtBlock(
    token: string,
    chainId: number,
    blockNumber: number
  ): Promise<PricePoint | null>;

  /**
   * Get price range
   */
  abstract getPriceRange(
    token: string,
    chainId: number,
    startTime: number,
    endTime: number,
    interval?: 'minute' | 'hour' | 'day'
  ): Promise<PriceRange>;

  /**
   * Check if provider supports this query
   */
  canHandle(token: string, chainId: number, timestamp: number): boolean {
    // Check chain support
    if (!this.capabilities.supportedChains.includes(chainId)) {
      return false;
    }

    // Check token support if limited
    if (this.capabilities.supportedTokens &&
        !this.capabilities.supportedTokens.includes(token)) {
      return false;
    }

    // Check time range
    const maxHistory = Date.now() - (this.capabilities.maxHistoryDays * 24 * 60 * 60 * 1000);
    if (timestamp < maxHistory) {
      return false;
    }

    return true;
  }

  /**
   * Calculate confidence score for a price point
   */
  protected calculateConfidence(source: string, age: number): number {
    // Newer data is more reliable
    const agePenalty = Math.min(age / (365 * 24 * 60 * 60 * 1000), 0.5); // Max 50% penalty for old data

    // Source reliability scores
    const sourceScores: Record<string, number> = {
      'onchain': 1.0,      // Direct from blockchain
      'coingecko': 0.9,    // Aggregated from multiple exchanges
      'coinmarketcap': 0.85,
      'messari': 0.85,
      'dexscreener': 0.8,
      'transaction': 0.7,  // Derived from user transactions
      'interpolated': 0.5  // Interpolated between known points
    };

    const baseScore = sourceScores[source] || 0.5;
    return baseScore * (1 - agePenalty);
  }
}

/**
 * Main service that orchestrates multiple providers
 */
export class HistoricalPriceService {
  private providers: Map<string, HistoricalPriceProvider> = new Map();
  private cache: Map<string, PricePoint> = new Map();
  private storage?: IDBDatabase;

  constructor() {
    this.initializeStorage();
  }

  /**
   * Register a provider
   */
  registerProvider(provider: HistoricalPriceProvider): void {
    this.providers.set(provider.name, provider);
    console.info(`[HistoricalPriceService] Registered provider: ${provider.name}`);
  }

  /**
   * Get price at specific timestamp with automatic provider selection
   */
  async getPriceAtTime(
    token: string,
    chainId: number,
    timestamp: number
  ): Promise<PricePoint | null> {
    const cacheKey = `${token}-${chainId}-${timestamp}`;

    // Check memory cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check IndexedDB
    const stored = await this.getFromStorage(cacheKey);
    if (stored) {
      this.cache.set(cacheKey, stored);
      return stored;
    }

    // Find capable providers, sorted by priority
    const capableProviders = Array.from(this.providers.values())
      .filter(p => p.canHandle(token, chainId, timestamp))
      .sort((a, b) => a.config.priority - b.config.priority);

    // Try each provider
    for (const provider of capableProviders) {
      try {
        const price = await provider.getPriceAtTime(token, chainId, timestamp);
        if (price) {
          // Cache and store
          this.cache.set(cacheKey, price);
          await this.saveToStorage(cacheKey, price);
          return price;
        }
      } catch (error) {
        console.warn(`[HistoricalPriceService] Provider ${provider.name} failed:`, error);
      }
    }

    // If no exact match, try interpolation
    return this.interpolatePrice(token, chainId, timestamp);
  }

  /**
   * Get price at specific block
   */
  async getPriceAtBlock(
    token: string,
    chainId: number,
    blockNumber: number
  ): Promise<PricePoint | null> {
    // Find providers with block-level capability
    const blockProviders = Array.from(this.providers.values())
      .filter(p => p.capabilities.hasBlockLevel);

    for (const provider of blockProviders) {
      try {
        const price = await provider.getPriceAtBlock(token, chainId, blockNumber);
        if (price) return price;
      } catch (error) {
        console.warn(`[HistoricalPriceService] Block provider ${provider.name} failed:`, error);
      }
    }

    // Fallback: estimate timestamp from block and use time-based lookup
    const estimatedTime = await this.estimateBlockTimestamp(chainId, blockNumber);
    if (estimatedTime) {
      return this.getPriceAtTime(token, chainId, estimatedTime);
    }

    return null;
  }

  /**
   * Get price range for charting
   */
  async getPriceRange(
    token: string,
    chainId: number,
    startTime: number,
    endTime: number,
    interval: 'minute' | 'hour' | 'day' = 'hour'
  ): Promise<PriceRange> {
    // Find best provider for range queries
    const rangeProviders = Array.from(this.providers.values())
      .filter(p => p.capabilities.resolution[interval])
      .sort((a, b) => a.config.priority - b.config.priority);

    for (const provider of rangeProviders) {
      try {
        const range = await provider.getPriceRange(
          token, chainId, startTime, endTime, interval
        );
        if (range && range.prices.length > 0) {
          return range;
        }
      } catch (error) {
        console.warn(`[HistoricalPriceService] Range provider ${provider.name} failed:`, error);
      }
    }

    // Fallback: build range from individual points
    return this.buildRangeFromPoints(token, chainId, startTime, endTime, interval);
  }

  /**
   * Build price history from user's transactions
   */
  async buildPriceHistoryFromTransactions(
    transactions: Array<{
      hash: string;
      timestamp: number;
      value: string;
      tokenAddress?: string;
      tokenAmount?: string;
    }>
  ): Promise<Map<string, PricePoint[]>> {
    const priceHistory = new Map<string, PricePoint[]>();

    for (const tx of transactions) {
      if (!tx.tokenAddress || !tx.tokenAmount || !tx.value) continue;

      // Calculate implied price from transaction
      const ethValue = parseFloat(tx.value);
      const tokenAmount = parseFloat(tx.tokenAmount);
      if (tokenAmount > 0) {
        const impliedPrice = ethValue / tokenAmount;

        const token = tx.tokenAddress.toLowerCase();
        if (!priceHistory.has(token)) {
          priceHistory.set(token, []);
        }

        priceHistory.get(token)!.push({
          timestamp: tx.timestamp,
          price: impliedPrice,
          source: 'transaction',
          confidence: this.calculateConfidence('transaction', Date.now() - tx.timestamp)
        });
      }
    }

    // Store these price points for future use
    for (const [token, points] of priceHistory.entries()) {
      for (const point of points) {
        const cacheKey = `${token}-1-${point.timestamp}`;
        this.cache.set(cacheKey, point);
        await this.saveToStorage(cacheKey, point);
      }
    }

    return priceHistory;
  }

  /**
   * Interpolate price between known points
   */
  private async interpolatePrice(
    token: string,
    chainId: number,
    timestamp: number
  ): Promise<PricePoint | null> {
    // Find nearest known prices before and after
    const before = await this.findNearestPrice(token, chainId, timestamp, 'before');
    const after = await this.findNearestPrice(token, chainId, timestamp, 'after');

    if (!before || !after) return null;

    // Linear interpolation
    const timeDiff = after.timestamp - before.timestamp;
    const priceDiff = after.price - before.price;
    const timeOffset = timestamp - before.timestamp;
    const interpolatedPrice = before.price + (priceDiff * (timeOffset / timeDiff));

    return {
      timestamp,
      price: interpolatedPrice,
      source: 'interpolated',
      confidence: Math.min(before.confidence, after.confidence) * 0.8 // Reduce confidence for interpolated
    };
  }

  /**
   * Initialize IndexedDB storage
   */
  private async initializeStorage(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;

    const request = indexedDB.open('HistoricalPrices', 1);

    request.onerror = () => {
      console.error('[HistoricalPriceService] Failed to open IndexedDB');
    };

    request.onsuccess = () => {
      this.storage = request.result;
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('prices')) {
        const store = db.createObjectStore('prices', { keyPath: 'key' });
        store.createIndex('token', 'token', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  }

  private async getFromStorage(key: string): Promise<PricePoint | null> {
    if (!this.storage) return null;

    return new Promise((resolve) => {
      const transaction = this.storage!.transaction(['prices'], 'readonly');
      const store = transaction.objectStore('prices');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  }

  private async saveToStorage(key: string, price: PricePoint): Promise<void> {
    if (!this.storage) return;

    const transaction = this.storage.transaction(['prices'], 'readwrite');
    const store = transaction.objectStore('prices');
    store.put({
      key,
      token: key.split('-')[0],
      timestamp: price.timestamp,
      data: price
    });
  }

  private async findNearestPrice(
    token: string,
    chainId: number,
    timestamp: number,
    direction: 'before' | 'after'
  ): Promise<PricePoint | null> {
    // This would query IndexedDB for nearest known price
    // Implementation depends on IndexedDB index structure
    return null; // Placeholder
  }

  private async estimateBlockTimestamp(
    chainId: number,
    blockNumber: number
  ): Promise<number | null> {
    // Estimate timestamp based on average block time
    const blockTimes: Record<number, number> = {
      1: 12,     // Ethereum mainnet: ~12 seconds
      137: 2,    // Polygon: ~2 seconds
      42161: 0.25 // Arbitrum: ~0.25 seconds
    };

    const avgBlockTime = blockTimes[chainId] || 12;
    // Would need current block to calculate, placeholder for now
    return null;
  }

  private async buildRangeFromPoints(
    token: string,
    chainId: number,
    startTime: number,
    endTime: number,
    interval: 'minute' | 'hour' | 'day'
  ): Promise<PriceRange> {
    const prices: PricePoint[] = [];
    const intervalMs = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    }[interval];

    for (let time = startTime; time <= endTime; time += intervalMs) {
      const price = await this.getPriceAtTime(token, chainId, time);
      if (price) prices.push(price);
    }

    return {
      token,
      chainId,
      startTime,
      endTime,
      interval,
      prices
    };
  }

  private calculateConfidence(source: string, age: number): number {
    // Reuse from base class logic
    const agePenalty = Math.min(age / (365 * 24 * 60 * 60 * 1000), 0.5);
    const sourceScores: Record<string, number> = {
      'onchain': 1.0,
      'coingecko': 0.9,
      'transaction': 0.7,
      'interpolated': 0.5
    };
    const baseScore = sourceScores[source] || 0.5;
    return baseScore * (1 - agePenalty);
  }
}
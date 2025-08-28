/**
 * Token Cache Service with Bridge Pattern
 * Demonstrates migration to platform-agnostic architecture
 * 
 * This service manages token data using the bridge pattern,
 * allowing the same logic to work across different environments.
 */

import type { IStorage, IMessageBus, ILogger } from '$lib/bridges';
import type { TokenDisplay, ServiceResponse, ErrorState } from '$lib/types';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

// Token interface for cache
export interface CachedToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
  balance: string; // Wei value as string
  quantity?: string; // Human-readable quantity
  price?: number;
  value?: number; // USD value
  icon?: string;
  lastUpdated: number;
}

export interface TokenCacheEntry {
  tokens: CachedToken[];
  timestamp: number;
  chainId: number;
  address: string;
}

export interface TokenCacheOptions {
  cacheTTL?: number; // Cache time-to-live in milliseconds
  maxCacheSize?: number; // Maximum number of cache entries
  enableBackgroundSync?: boolean;
}

/**
 * Token Cache Service using Bridge Pattern
 * 
 * This service demonstrates how to refactor existing services
 * to use the bridge pattern for better testability and portability.
 */
export class TokenCacheBridgeService {
  private readonly CACHE_KEY = 'token_cache_v2';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  
  private cacheTTL: number;
  private maxCacheSize: number;
  private enableBackgroundSync: boolean;
  private memoryCache = new Map<string, TokenCacheEntry>();
  
  constructor(
    private storage: IStorage,
    private messaging: IMessageBus,
    private logger: ILogger,
    options: TokenCacheOptions = {}
  ) {
    this.cacheTTL = options.cacheTTL ?? this.DEFAULT_TTL;
    this.maxCacheSize = options.maxCacheSize ?? this.MAX_CACHE_SIZE;
    this.enableBackgroundSync = options.enableBackgroundSync ?? true;
    
    this.setupListeners();
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('[TokenCache] Initializing service');
    
    // Load cache from storage
    const storedCache = await this.storage.get<Record<string, TokenCacheEntry>>(this.CACHE_KEY);
    
    if (storedCache) {
      // Restore memory cache from storage
      Object.entries(storedCache).forEach(([key, entry]) => {
        // Only restore if not expired
        if (!this.isExpired(entry)) {
          this.memoryCache.set(key, entry);
        }
      });
      
      this.logger.debug('[TokenCache] Restored cache with', this.memoryCache.size, 'entries');
    }
    
    // Notify that service is ready
    this.messaging.post('service_ready', { 
      service: 'token_cache',
      cacheSize: this.memoryCache.size 
    });
  }
  
  /**
   * Get tokens for an account/chain combination
   */
  async getTokens(
    address: string, 
    chainId: number
  ): Promise<ServiceResponse<TokenDisplay[]>> {
    const cacheKey = this.getCacheKey(address, chainId);
    this.logger.debug('[TokenCache] Getting tokens for', cacheKey);
    
    try {
      // Check memory cache first
      const cached = this.memoryCache.get(cacheKey);
      
      if (cached && !this.isExpired(cached)) {
        this.logger.debug('[TokenCache] Memory cache hit for', cacheKey);
        return {
          success: true,
          data: this.transformToDisplayTokens(cached.tokens)
        };
      }
      
      // Check storage cache
      const storedCache = await this.storage.get<Record<string, TokenCacheEntry>>(this.CACHE_KEY);
      const storedEntry = storedCache?.[cacheKey];
      
      if (storedEntry && !this.isExpired(storedEntry)) {
        this.logger.debug('[TokenCache] Storage cache hit for', cacheKey);
        // Update memory cache
        this.memoryCache.set(cacheKey, storedEntry);
        return {
          success: true,
          data: this.transformToDisplayTokens(storedEntry.tokens)
        };
      }
      
      // Cache miss - request fresh data
      this.logger.debug('[TokenCache] Cache miss, requesting fresh data');
      const tokens = await this.fetchTokens(address, chainId);
      
      // Update cache
      await this.updateCache(cacheKey, tokens, address, chainId);
      
      return {
        success: true,
        data: this.transformToDisplayTokens(tokens)
      };
      
    } catch (error) {
      this.logger.error('[TokenCache] Failed to get tokens', error);
      return {
        success: false,
        error: {
          hasError: true,
          message: error instanceof Error ? error.message : 'Failed to get tokens',
          code: 'TOKEN_FETCH_ERROR'
        }
      };
    }
  }
  
  /**
   * Force refresh tokens for an account
   */
  async refreshTokens(
    address: string,
    chainId: number
  ): Promise<ServiceResponse<TokenDisplay[]>> {
    const cacheKey = this.getCacheKey(address, chainId);
    this.logger.info('[TokenCache] Force refreshing tokens for', cacheKey);
    
    try {
      // Clear existing cache
      this.memoryCache.delete(cacheKey);
      
      // Fetch fresh data
      const tokens = await this.fetchTokens(address, chainId);
      
      // Update cache
      await this.updateCache(cacheKey, tokens, address, chainId);
      
      // Notify about update
      this.messaging.post('tokens_updated', {
        address,
        chainId,
        tokenCount: tokens.length
      });
      
      return {
        success: true,
        data: this.transformToDisplayTokens(tokens)
      };
      
    } catch (error) {
      this.logger.error('[TokenCache] Failed to refresh tokens', error);
      return {
        success: false,
        error: {
          hasError: true,
          message: error instanceof Error ? error.message : 'Failed to refresh tokens',
          code: 'TOKEN_REFRESH_ERROR'
        }
      };
    }
  }
  
  /**
   * Clear cache for an account or all accounts
   */
  async clearCache(address?: string): Promise<void> {
    if (address) {
      this.logger.info('[TokenCache] Clearing cache for address', address);
      
      // Remove from memory cache
      const keysToRemove = Array.from(this.memoryCache.keys())
        .filter(key => key.startsWith(`${address.toLowerCase()}_`));
      
      keysToRemove.forEach(key => this.memoryCache.delete(key));
      
      // Update storage
      await this.persistCache();
    } else {
      this.logger.info('[TokenCache] Clearing entire cache');
      this.memoryCache.clear();
      await this.storage.remove(this.CACHE_KEY);
    }
    
    // Notify about cache clear
    this.messaging.post('cache_cleared', { 
      address,
      type: 'tokens' 
    });
  }
  
  /**
   * Update token prices
   */
  async updatePrices(prices: Record<string, number>): Promise<void> {
    this.logger.debug('[TokenCache] Updating prices for', Object.keys(prices).length, 'tokens');
    
    let updated = false;
    
    // Update prices in all cached entries
    this.memoryCache.forEach((entry) => {
      entry.tokens.forEach(token => {
        const price = prices[token.symbol] || prices[token.address.toLowerCase()];
        if (price && price !== token.price) {
          token.price = price;
          // Recalculate value
          if (token.quantity) {
            const qty = parseFloat(token.quantity);
            token.value = qty * price;
          }
          updated = true;
        }
      });
    });
    
    if (updated) {
      await this.persistCache();
      this.messaging.post('prices_updated', {
        tokenCount: Object.keys(prices).length
      });
    }
  }
  
  // Private methods
  
  private setupListeners(): void {
    // Listen for cache clear requests
    this.messaging.listen('clear_token_cache', async (message) => {
      await this.clearCache(message.data?.address);
    });
    
    // Listen for refresh requests
    this.messaging.listen('refresh_tokens', async (message) => {
      const { address, chainId } = message.data;
      if (address && chainId) {
        await this.refreshTokens(address, chainId);
      }
    });
    
    // Listen for price updates
    this.messaging.listen('token_prices', async (message) => {
      if (message.data) {
        await this.updatePrices(message.data);
      }
    });
    
    // Listen for balance updates from background
    this.messaging.listen('token_balance_update', async (message) => {
      const { address, chainId, tokenAddress, balance } = message.data;
      await this.updateTokenBalance(address, chainId, tokenAddress, balance);
    });
  }
  
  private getCacheKey(address: string, chainId: number): string {
    return `${address.toLowerCase()}_${chainId}`;
  }
  
  private isExpired(entry: TokenCacheEntry): boolean {
    return Date.now() - entry.timestamp > this.cacheTTL;
  }
  
  private async fetchTokens(
    address: string,
    chainId: number
  ): Promise<CachedToken[]> {
    try {
      // Request tokens from background service
      const response = await this.messaging.send<any, CachedToken[]>(
        'fetch_tokens',
        { address, chainId },
        { timeout: 10000 }
      );
      
      return response || [];
    } catch (error) {
      this.logger.error('[TokenCache] Failed to fetch tokens', error);
      // Return empty array on error
      return [];
    }
  }
  
  private async updateCache(
    cacheKey: string,
    tokens: CachedToken[],
    address: string,
    chainId: number
  ): Promise<void> {
    const entry: TokenCacheEntry = {
      tokens,
      timestamp: Date.now(),
      address,
      chainId
    };
    
    // Update memory cache
    this.memoryCache.set(cacheKey, entry);
    
    // Enforce max cache size
    if (this.memoryCache.size > this.maxCacheSize) {
      // Remove oldest entries
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = sortedEntries.slice(0, this.memoryCache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
    
    // Persist to storage
    await this.persistCache();
  }
  
  private async persistCache(): Promise<void> {
    try {
      const cacheObject: Record<string, TokenCacheEntry> = {};
      this.memoryCache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      
      await this.storage.set(this.CACHE_KEY, cacheObject);
    } catch (error) {
      this.logger.error('[TokenCache] Failed to persist cache', error);
    }
  }
  
  private async updateTokenBalance(
    address: string,
    chainId: number,
    tokenAddress: string,
    balance: string
  ): Promise<void> {
    const cacheKey = this.getCacheKey(address, chainId);
    const entry = this.memoryCache.get(cacheKey);
    
    if (!entry) return;
    
    const token = entry.tokens.find(t => 
      t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    
    if (token) {
      token.balance = balance;
      // Recalculate quantity
      if (token.decimals) {
        const divisor = BigInt(10) ** BigInt(token.decimals);
        const balanceBigInt = BigNumberishUtils.toBigInt(balance);
        const wholePart = balanceBigInt / divisor;
        const fractionalPart = balanceBigInt % divisor;
        
        // Format with proper decimals
        const fractionalStr = fractionalPart.toString().padStart(token.decimals, '0');
        const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 8); // Max 8 decimal places
        
        token.quantity = trimmedFractional 
          ? `${wholePart}.${trimmedFractional}`
          : wholePart.toString();
        
        // Update value if price is available
        if (token.price) {
          const qty = parseFloat(token.quantity);
          token.value = qty * token.price;
        }
      }
      
      // Update timestamp
      entry.timestamp = Date.now();
      token.lastUpdated = Date.now();
      
      await this.persistCache();
      
      // Notify about balance update
      this.messaging.post('token_balance_updated', {
        address,
        chainId,
        tokenAddress,
        balance: token.quantity
      });
    }
  }
  
  private transformToDisplayTokens(tokens: CachedToken[]): TokenDisplay[] {
    return tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      chainId: token.chainId,
      chainName: this.getChainName(token.chainId),
      qty: parseFloat(token.quantity || '0'),
      price: token.price || 0,
      value: token.value || 0,
      icon: token.icon || this.getDefaultIcon(token.symbol),
      balance: token.quantity || '0', // For compatibility
      color: this.getTokenColor(token.symbol)
    }));
  }
  
  private getChainName(chainId: number): string {
    // This would normally come from chain configuration
    const chainNames: Record<number, string> = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      137: 'Polygon',
      56: 'BSC',
      43114: 'Avalanche',
      42161: 'Arbitrum',
      10: 'Optimism'
    };
    
    return chainNames[chainId] || `Chain ${chainId}`;
  }
  
  private getDefaultIcon(symbol: string): string {
    // Default icons for common tokens
    const icons: Record<string, string> = {
      'ETH': '/images/eth.svg',
      'USDT': '/images/usdt.svg',
      'USDC': '/images/usdc.svg',
      'DAI': '/images/dai.svg',
      'WBTC': '/images/wbtc.svg',
      'UNI': '/images/uni.svg'
    };
    
    return icons[symbol.toUpperCase()] || '/images/default-token.svg';
  }
  
  private getTokenColor(symbol: string): string {
    // Color mapping for tokens
    const colors: Record<string, string> = {
      'ETH': 'bg-blue-400',
      'USDT': 'bg-green-400',
      'USDC': 'bg-blue-500',
      'DAI': 'bg-yellow-400',
      'WBTC': 'bg-orange-400',
      'UNI': 'bg-pink-400'
    };
    
    return colors[symbol.toUpperCase()] || 'bg-gray-400';
  }
}

/**
 * Factory function to create token cache service
 */
export function createTokenCacheService(
  storage: IStorage,
  messaging: IMessageBus,
  logger: ILogger,
  options?: TokenCacheOptions
): TokenCacheBridgeService {
  return new TokenCacheBridgeService(storage, messaging, logger, options);
}
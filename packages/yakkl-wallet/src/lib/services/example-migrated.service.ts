/**
 * Example Migrated Service
 * Demonstrates how to refactor a service to use the bridge pattern
 * 
 * BEFORE: Direct browser API usage (tightly coupled)
 * AFTER: Interface-based with dependency injection (loosely coupled)
 */

import type { IStorage, IMessageBus, ILogger } from '$lib/bridges';

// Token interface - simplified for example
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  price?: number;
}

/**
 * Example: Token Cache Service
 * This service manages token data caching
 */
export class TokenCacheService {
  private cacheKey = 'token_cache';
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  constructor(
    private storage: IStorage,
    private messaging: IMessageBus,
    private logger: ILogger
  ) {
    // Set up listeners
    this.setupListeners();
  }
  
  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    this.logger.info('[TokenCache] Initializing service');
    
    // Load initial cache
    const cache = await this.loadCache();
    if (cache) {
      this.logger.debug('[TokenCache] Loaded cache with', Object.keys(cache).length, 'entries');
    }
    
    // Notify that service is ready
    this.messaging.post('service_ready', { service: 'token_cache' });
  }
  
  /**
   * Get tokens for an account
   */
  async getTokens(accountAddress: string, chainId: number): Promise<Token[]> {
    const cacheKey = this.getCacheKey(accountAddress, chainId);
    this.logger.debug('[TokenCache] Getting tokens for', cacheKey);
    
    // Check cache first
    const cached = await this.getCached(cacheKey);
    if (cached) {
      this.logger.debug('[TokenCache] Cache hit for', cacheKey);
      return cached;
    }
    
    // Request fresh data
    this.logger.debug('[TokenCache] Cache miss, requesting fresh data');
    const tokens = await this.fetchTokens(accountAddress, chainId);
    
    // Update cache
    await this.setCached(cacheKey, tokens);
    
    // Notify about update
    this.messaging.post('tokens_updated', {
      accountAddress,
      chainId,
      tokenCount: tokens.length
    });
    
    return tokens;
  }
  
  /**
   * Clear cache for an account
   */
  async clearCache(accountAddress?: string): Promise<void> {
    if (accountAddress) {
      this.logger.info('[TokenCache] Clearing cache for account', accountAddress);
      const cache = await this.loadCache();
      if (cache) {
        // Remove entries for this account
        const keysToRemove = Object.keys(cache).filter(key => 
          key.startsWith(`${accountAddress}_`)
        );
        
        for (const key of keysToRemove) {
          delete cache[key];
        }
        
        await this.saveCache(cache);
      }
    } else {
      this.logger.info('[TokenCache] Clearing entire cache');
      await this.storage.remove(this.cacheKey);
    }
    
    // Notify about cache clear
    this.messaging.post('cache_cleared', { accountAddress });
  }
  
  /**
   * Handle token price updates
   */
  async updateTokenPrices(prices: Record<string, number>): Promise<void> {
    this.logger.debug('[TokenCache] Updating prices for', Object.keys(prices).length, 'tokens');
    
    const cache = await this.loadCache();
    if (!cache) return;
    
    let updated = false;
    
    // Update prices in cached tokens
    for (const [key, entry] of Object.entries(cache)) {
      if (entry.data && Array.isArray(entry.data)) {
        for (const token of entry.data) {
          if (prices[token.symbol]) {
            token.price = prices[token.symbol];
            updated = true;
          }
        }
      }
    }
    
    if (updated) {
      await this.saveCache(cache);
      this.messaging.post('prices_updated', { tokenCount: Object.keys(prices).length });
    }
  }
  
  // Private methods
  
  private setupListeners(): void {
    // Listen for cache clear requests
    this.messaging.listen('clear_token_cache', async (message) => {
      await this.clearCache(message.data?.accountAddress);
    });
    
    // Listen for price updates
    this.messaging.listen('token_prices', async (message) => {
      await this.updateTokenPrices(message.data);
    });
    
    // Listen for manual refresh requests
    this.messaging.listen('refresh_tokens', async (message) => {
      const { accountAddress, chainId } = message.data;
      const cacheKey = this.getCacheKey(accountAddress, chainId);
      
      // Remove from cache to force refresh
      const cache = await this.loadCache();
      if (cache && cache[cacheKey]) {
        delete cache[cacheKey];
        await this.saveCache(cache);
      }
      
      // Fetch fresh data
      await this.getTokens(accountAddress, chainId);
    });
  }
  
  private getCacheKey(accountAddress: string, chainId: number): string {
    return `${accountAddress}_${chainId}`;
  }
  
  private async loadCache(): Promise<Record<string, CacheEntry> | null> {
    return await this.storage.get(this.cacheKey);
  }
  
  private async saveCache(cache: Record<string, CacheEntry>): Promise<void> {
    await this.storage.set(this.cacheKey, cache);
  }
  
  private async getCached(key: string): Promise<Token[] | null> {
    const cache = await this.loadCache();
    if (!cache || !cache[key]) return null;
    
    const entry = cache[key];
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.logger.debug('[TokenCache] Cache expired for', key);
      return null;
    }
    
    return entry.data;
  }
  
  private async setCached(key: string, tokens: Token[]): Promise<void> {
    const cache = await this.loadCache() || {};
    
    cache[key] = {
      data: tokens,
      timestamp: Date.now()
    };
    
    await this.saveCache(cache);
  }
  
  private async fetchTokens(accountAddress: string, chainId: number): Promise<Token[]> {
    // This would normally fetch from an API or blockchain
    // For example purposes, sending a message to background service
    try {
      const response = await this.messaging.send<any, Token[]>(
        'fetch_account_tokens',
        { accountAddress, chainId },
        { timeout: 10000 }
      );
      
      return response || [];
    } catch (error) {
      this.logger.error('[TokenCache] Failed to fetch tokens', error);
      return [];
    }
  }
}

interface CacheEntry {
  data: Token[];
  timestamp: number;
}

/**
 * USAGE EXAMPLE:
 * 
 * // In the main app (browser extension context)
 * import { localStorageBridge, getBrowserMessaging, logger } from '$lib/bridges';
 * 
 * const tokenCache = new TokenCacheService(
 *   localStorageBridge,
 *   getBrowserMessaging(),
 *   logger
 * );
 * 
 * await tokenCache.initialize();
 * 
 * // Get tokens (will use cache if available)
 * const tokens = await tokenCache.getTokens('0x123...', 1);
 * 
 * 
 * BENEFITS OF THIS APPROACH:
 * 
 * 1. Testable - Can use mock implementations
 * 2. Portable - Same code works in different environments
 * 3. Maintainable - Changes to browser APIs don't affect business logic
 * 4. Clear Dependencies - Constructor shows exactly what the service needs
 * 5. Decoupled - Service doesn't know about browser extension specifics
 */

/**
 * FOR COMPARISON - OLD WAY (Don't do this):
 * 
 * import browser from 'webextension-polyfill';
 * 
 * class OldTokenCacheService {
 *   async getTokens(account: string, chain: number) {
 *     // Tightly coupled to browser.storage
 *     const cache = await browser.storage.local.get('token_cache');
 *     
 *     // Tightly coupled to browser.runtime
 *     await browser.runtime.sendMessage({
 *       type: 'fetch_tokens',
 *       account,
 *       chain
 *     });
 *     
 *     // Hard to test, can't run outside browser extension
 *   }
 * }
 */
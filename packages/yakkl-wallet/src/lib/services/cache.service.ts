/**
 * CacheService - Modern caching service using @yakkl/cache
 * Replaces the old monolithic wallet-cache.store.ts
 */

// Commented out - moving away from @yakkl/cache to simpler yakklCache
// import { createCache, CachePresets, type CacheManager } from '@yakkl/cache';

// Temporary stub implementation until full migration
interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, options?: any): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
  getStats(): any;
  getMany<T>(keys: string[]): Promise<Map<string, T>>;
  setMany(entries: Map<string, any>): Promise<void>;
}
import type { Token, Transaction, Portfolio } from '$lib/types';

export class CacheService {
  private cache: CacheManager | null = null;
  private initialized = false;

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (!isBrowser) {
      console.warn('Cache service requires browser environment');
      return;
    }

    try {
      // Test if we can access IndexedDB (fails in sandboxed contexts)
      if (typeof indexedDB !== 'undefined') {
        const testDB = indexedDB.open('__yakkl_test__');
        testDB.onsuccess = () => {
          testDB.result.close();
          indexedDB.deleteDatabase('__yakkl_test__');
        };
      }

      // Use browser extension preset for wallet
      // this.cache = createCache(CachePresets.browserExtension);
      this.cache = {
        get: async () => null,
        set: async () => {},
        delete: async () => false,
        clear: async () => {},
        has: async () => false,
        keys: async () => [],
        getStats: () => ({}),
        getMany: async () => new Map(),
        setMany: async () => {}
      } as CacheManager; // Temporary stub
      this.initialized = true;
      console.log('Cache service initialized with browser extension preset');
    } catch (error: any) {
      // Check if this is a sandboxed context error
      const isSandboxError = error.message?.includes('SecurityError') ||
                           error.message?.includes('sandboxed') ||
                           error.message?.includes('IDBFactory') ||
                           error.name === 'SecurityError';

      if (!isSandboxError) {
        // Only log non-sandbox errors
        console.error('Failed to initialize cache service:', error);
      } else {
        console.debug('Cache service running in sandboxed context, using memory-only cache');
      }

      // Fallback to memory-only cache
      // this.cache = createCache({
      //   tierMaxSize: { hot: 100, warm: 0, cold: 0 }
      // });
      this.cache = {
        get: async () => null,
        set: async () => {},
        delete: async () => false,
        clear: async () => {},
        has: async () => false,
        keys: async () => [],
        getStats: () => ({}),
        getMany: async () => new Map(),
        setMany: async () => {}
      } as CacheManager; // Temporary stub
      this.initialized = true;
      console.log('Cache service initialized with memory-only fallback');
    }
  }

  /**
   * Get tokens from cache
   */
  async getTokens(accountId: string, chainId: number): Promise<Token[] | null> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return null;

    const key = `tokens:${accountId}:${chainId}`;
    return this.cache.get<Token[]>(key);
  }

  /**
   * Set tokens in cache
   */
  async setTokens(accountId: string, chainId: number, tokens: Token[]): Promise<void> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return;

    const key = `tokens:${accountId}:${chainId}`;
    await this.cache.set(key, tokens, {
      ttl: 5 * 60 * 1000, // 5 minutes for token data
      strategy: 'token'
    });
  }

  /**
   * Get transactions from cache
   */
  async getTransactions(accountId: string, chainId: number): Promise<Transaction[] | null> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return null;

    const key = `transactions:${accountId}:${chainId}`;
    return this.cache.get<Transaction[]>(key);
  }

  /**
   * Set transactions in cache
   */
  async setTransactions(
    accountId: string, 
    chainId: number, 
    transactions: Transaction[]
  ): Promise<void> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return;

    const key = `transactions:${accountId}:${chainId}`;
    await this.cache.set(key, transactions, {
      ttl: 10 * 60 * 1000, // 10 minutes for transaction data
      strategy: 'transaction'
    });
  }

  /**
   * Get portfolio data from cache
   */
  async getPortfolio(accountId: string): Promise<Portfolio | null> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return null;

    const key = `portfolio:${accountId}`;
    return this.cache.get<Portfolio>(key);
  }

  /**
   * Set portfolio data in cache
   */
  async setPortfolio(accountId: string, portfolio: Portfolio): Promise<void> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return;

    const key = `portfolio:${accountId}`;
    await this.cache.set(key, portfolio, {
      ttl: 2 * 60 * 1000, // 2 minutes for portfolio data
      tier: 'hot' // Keep in memory for fast access
    });
  }

  /**
   * Get cached blockchain RPC result
   */
  async getRPCResult(method: string, params: any[], chainId: number): Promise<any> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return null;

    const key = `rpc:${chainId}:${method}:${JSON.stringify(params)}`;
    return this.cache.get(key);
  }

  /**
   * Cache blockchain RPC result
   */
  async setRPCResult(
    method: string, 
    params: any[], 
    chainId: number, 
    result: any
  ): Promise<void> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return;

    const key = `rpc:${chainId}:${method}:${JSON.stringify(params)}`;
    
    // Determine TTL based on method
    let ttl = 30 * 1000; // 30 seconds default
    
    if (method.includes('Block') || method.includes('Transaction')) {
      ttl = 5 * 60 * 1000; // 5 minutes for block/tx data
    } else if (method.includes('Balance') || method.includes('gas')) {
      ttl = 15 * 1000; // 15 seconds for balance/gas
    }

    await this.cache.set(key, result, {
      ttl,
      strategy: 'blockchain'
    });
  }

  /**
   * Clear all cache for an account
   */
  async clearAccountCache(accountId: string): Promise<void> {
    if (!this.cache) return;

    const patterns = [
      `tokens:${accountId}:*`,
      `transactions:${accountId}:*`,
      `portfolio:${accountId}`
    ];

    for (const pattern of patterns) {
      const keys = await this.cache.keys();
      for (const key of keys) {
        await this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (!this.cache) return;
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    if (!this.cache) return null;
    return this.cache.getStats();
  }

  /**
   * Batch get multiple values
   */
  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return keys.map(() => null);
    
    const result = await this.cache.getMany<T>(keys);
    return keys.map(key => result.get(key) || null);
  }

  /**
   * Batch set multiple values
   */
  async setMany<T>(entries: Array<[string, T]>, options?: any): Promise<void> {
    if (!this.cache) await this.initialize();
    if (!this.cache) return;
    
    const entriesMap = new Map(entries);
    await this.cache.setMany(entriesMap);
  }
}

// Singleton instance
export const cacheService = new CacheService();
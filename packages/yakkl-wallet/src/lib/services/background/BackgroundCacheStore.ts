/**
 * BackgroundCacheStore - Background context compatible cache store
 * 
 * NO Svelte stores - uses direct browser.storage API
 * Compatible with service worker environment
 * Provides same interface as WalletCacheStore but without reactivity
 */

import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import type { WalletCacheController } from '$lib/types';
import { BigNumber } from '$lib/common/bignumber';

const CACHE_STORAGE_KEY = 'yakklWalletCache';
const CACHE_VERSION = 'v2';

export class BackgroundCacheStore {
  private static instance: BackgroundCacheStore | null = null;
  private cache: WalletCacheController | null = null;
  
  private constructor() {}

  public static getInstance(): BackgroundCacheStore {
    if (!BackgroundCacheStore.instance) {
      BackgroundCacheStore.instance = new BackgroundCacheStore();
    }
    return BackgroundCacheStore.instance;
  }

  /**
   * Get the current cache from storage
   */
  public async getCache(): Promise<WalletCacheController | null> {
    try {
      const storage = await browser.storage.local.get(CACHE_STORAGE_KEY);
      
      if (storage[CACHE_STORAGE_KEY] && 
          typeof storage[CACHE_STORAGE_KEY] === 'object' &&
          'version' in storage[CACHE_STORAGE_KEY]) {
        this.cache = storage[CACHE_STORAGE_KEY] as WalletCacheController;
        return this.cache;
      }
      
      // Initialize with default cache if not exists
      const defaultCache = this.getDefaultCache();
      await this.setCache(defaultCache);
      return defaultCache;
      
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to get cache', false, error);
      return null;
    }
  }

  /**
   * Set the entire cache in storage
   */
  public async setCache(cache: WalletCacheController): Promise<void> {
    try {
      this.cache = cache;
      await browser.storage.local.set({ [CACHE_STORAGE_KEY]: cache });
      log.debug('[BackgroundCacheStore] Cache updated in storage');
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to set cache', false, error);
      throw error;
    }
  }

  /**
   * Update native token price in cache
   */
  public async updateNativeTokenPrice(
    chainId: number, 
    address: string, 
    price: number
  ): Promise<void> {
    try {
      const cache = await this.getCache();
      if (!cache) return;

      // Update the native token price in the appropriate account cache
      const chainCache = cache.chainAccountCache?.[chainId];
      if (chainCache && chainCache[address]) {
        const accountCache = chainCache[address];
        
        // Find native token and update its price
        if (accountCache.tokens) {
          for (const token of accountCache.tokens) {
            if (token.isNative) {
              token.price = price;
              // Recalculate value if balance exists
              if (token.balance) {
                const balance = BigNumber.from(token.balance);
                const value = balance.mul(BigNumber.from(Math.floor(price * 100))).div(100);
                token.value = value.toString();
              }
              break;
            }
          }
        }

        // Update cache in storage
        await this.setCache(cache);
        
        log.debug('[BackgroundCacheStore] Updated native token price', false, {
          chainId,
          address,
          price
        });
      }
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to update native token price', false, error);
    }
  }

  /**
   * Update token balances
   */
  public async updateTokenBalances(
    chainId: number,
    address: string,
    tokens: any[]
  ): Promise<void> {
    try {
      const cache = await this.getCache();
      if (!cache) return;

      // Ensure chain cache exists
      if (!cache.chainAccountCache) {
        cache.chainAccountCache = {};
      }
      if (!cache.chainAccountCache[chainId]) {
        cache.chainAccountCache[chainId] = {};
      }
      if (!cache.chainAccountCache[chainId][address]) {
        cache.chainAccountCache[chainId][address] = {
          address,
          chainId,
          tokens: [],
          transactions: {
            transactions: [],
            lastFetch: null,
            totalCount: 0
          },
          balance: '0',
          nonce: 0,
          lastRefresh: new Date().toISOString()
        };
      }

      // Update tokens
      cache.chainAccountCache[chainId][address].tokens = tokens;
      cache.chainAccountCache[chainId][address].lastRefresh = new Date().toISOString();

      await this.setCache(cache);
      
      log.debug('[BackgroundCacheStore] Updated token balances', false, {
        chainId,
        address,
        tokenCount: tokens.length
      });
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to update token balances', false, error);
    }
  }

  /**
   * Update transactions
   */
  public async updateTransactions(
    chainId: number,
    address: string,
    transactions: any[]
  ): Promise<void> {
    try {
      const cache = await this.getCache();
      if (!cache) return;

      const chainCache = cache.chainAccountCache?.[chainId];
      if (chainCache && chainCache[address]) {
        chainCache[address].transactions = {
          transactions,
          lastFetch: new Date().toISOString(),
          totalCount: transactions.length
        };
        
        await this.setCache(cache);
        
        log.debug('[BackgroundCacheStore] Updated transactions', false, {
          chainId,
          address,
          count: transactions.length
        });
      }
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to update transactions', false, error);
    }
  }

  /**
   * Get active account info
   */
  public async getActiveAccount(): Promise<{ chainId: number; address: string } | null> {
    try {
      const cache = await this.getCache();
      if (!cache) return null;

      if (cache.activeChainId && cache.activeAccountAddress) {
        return {
          chainId: cache.activeChainId,
          address: cache.activeAccountAddress
        };
      }

      // Fallback to currently selected
      const storage = await browser.storage.local.get('yakkl-currently-selected');
      const currentlySelected = storage['yakkl-currently-selected'];
      
      if (currentlySelected && typeof currentlySelected === 'object') {
        const shortcuts = (currentlySelected as any).shortcuts;
        if (shortcuts) {
          return {
            chainId: shortcuts.chainId,
            address: shortcuts.address
          };
        }
      }

      return null;
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to get active account', false, error);
      return null;
    }
  }

  /**
   * Clear the cache
   */
  public async clearCache(): Promise<void> {
    try {
      const defaultCache = this.getDefaultCache();
      await this.setCache(defaultCache);
      log.info('[BackgroundCacheStore] Cache cleared');
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to clear cache', false, error);
    }
  }

  /**
   * Get default cache structure
   */
  private getDefaultCache(): WalletCacheController {
    return {
      version: 2, // Use numeric version
      accounts: {},
      chainAccountCache: {},
      currentAccount: null,
      currentNetwork: 1,
      activeChainId: 1,
      activeAccountAddress: '',
      lastUpdateDate: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      isInitializing: false,
      hasEverLoaded: false,
      portfolioRollups: {
        grandTotal: { totalValue: 0 }
      }
    };
  }

  /**
   * Calculate portfolio total (for background calculations)
   */
  public async calculatePortfolioTotal(): Promise<string> {
    try {
      const cache = await this.getCache();
      if (!cache?.chainAccountCache) return '0';

      let total = BigNumber.from(0);

      for (const chainData of Object.values(cache.chainAccountCache)) {
        for (const accountData of Object.values(chainData)) {
          if (accountData.tokens) {
            for (const token of accountData.tokens) {
              if (token.value) {
                try {
                  const value = BigNumber.from(token.value);
                  total = total.add(value);
                } catch (error) {
                  // Skip invalid values
                }
              }
            }
          }
        }
      }

      return total.toString();
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to calculate portfolio total', false, error);
      return '0';
    }
  }

  /**
   * Check if cache needs refresh based on age
   */
  public async needsRefresh(maxAgeMs: number = 5 * 60 * 1000): Promise<boolean> {
    try {
      const cache = await this.getCache();
      if (!cache?.lastUpdateDate) return true;

      const lastUpdate = new Date(cache.lastUpdateDate).getTime();
      const now = Date.now();
      
      return (now - lastUpdate) > maxAgeMs;
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to check refresh status', false, error);
      return true;
    }
  }

  /**
   * Update last refresh timestamp
   */
  public async updateLastRefresh(): Promise<void> {
    try {
      const cache = await this.getCache();
      if (!cache) return;

      cache.lastUpdateDate = new Date().toISOString();
      if (cache.lastSync) {
        cache.lastSync = new Date().toISOString();
      }

      await this.setCache(cache);
    } catch (error) {
      log.error('[BackgroundCacheStore] Failed to update last refresh', false, error);
    }
  }
}

// Export singleton instance
export const backgroundCacheStore = BackgroundCacheStore.getInstance();

// Export static reference for compatibility
export const BackgroundCacheStoreStatic = BackgroundCacheStore;
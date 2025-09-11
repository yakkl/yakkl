/**
 * wallet-cache-v2.store.ts - Modern wallet cache using @yakkl/cache
 * Drop-in replacement for wallet-cache.store.ts with improved performance
 */

import { writable, derived, get } from 'svelte/store';
import { cacheService } from '$lib/services/cache.service';
import type {
  YakklAccount,
  TokenCache,
  TransactionCache,
  WalletCacheController,
  AccountCache
} from '$lib/types';
import { BigNumber } from 'ethers';
import type { BigNumberish } from 'ethers';

// Default cache structure
function getDefaultCache(): WalletCacheController & { chainAccountCache?: any } {
  return {
    version: 1,
    accounts: {},
    chainAccountCache: {}, // Compatibility with old structure
    currentAccount: null,
    currentNetwork: 1,
    activeAccountAddress: undefined, // Legacy compatibility
    activeChainId: 1, // Legacy compatibility
    lastUpdateDate: new Date().toISOString(),
    lastSync: new Date().toISOString(), // Legacy compatibility
    isInitializing: false,
    hasEverLoaded: false
  };
}

// Create the main store
function createWalletCacheStore() {
  const { subscribe, set, update } = writable<WalletCacheController>(getDefaultCache());

  // Initialize cache service
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    cacheService.initialize().catch(console.error);
  }

  return {
    subscribe,

    async initialize() {
      update((cache) => ({
        ...cache,
        isInitializing: true
      }));

      try {
        await cacheService.initialize();
        await this.loadFromStorage();
      } finally {
        update((cache) => ({
          ...cache,
          isInitializing: false,
          hasEverLoaded: true
        }));
      }
    },

    async loadFromStorage() {
      try {
        // Load all cached data
        const state = get({ subscribe });
        const cacheKey = 'wallet-cache-state';
        let cached = await cacheService.getPortfolio(cacheKey);

        // FALLBACK: Try loading from old localStorage key if new key is empty
        if (!cached && typeof window !== 'undefined') {
          try {
            const oldCached = localStorage.getItem('yakklWalletCache');
            if (oldCached) {
              cached = JSON.parse(oldCached);
              console.log('[Cache] Loaded cache from old localStorage key');
            }
          } catch (e) {
            console.warn('[Cache] Failed to load old cache:', e);
          }
        }

        if (cached) {
          // CRITICAL FIX: Migrate old chainAccountCache data to new accounts structure
          const migratedCache = cached as any;

          // If we have chainAccountCache but no accounts, migrate the data
          if (migratedCache.chainAccountCache && (!migratedCache.accounts || Object.keys(migratedCache.accounts).length === 0)) {
            console.log('[Cache] Migrating chainAccountCache to accounts structure');
            migratedCache.accounts = {};

            // Iterate through all chains and accounts in chainAccountCache
            for (const [chainId, chainData] of Object.entries(migratedCache.chainAccountCache)) {
              for (const [address, accountData] of Object.entries(chainData as any)) {
                const key = `${chainId}_${address}`;
                migratedCache.accounts[key] = {
                  address,
                  chainId: Number(chainId),
                  tokens: (accountData as any).tokens || [],
                  transactions: (accountData as any).transactions?.transactions || [],
                  updateDate: (accountData as any).lastTokenRefresh || new Date().toISOString()
                };
                console.log(`[Cache] Migrated account ${address} on chain ${chainId}`);
              }
            }
          }

          set(migratedCache);
        }
      } catch (error) {
        console.error('Failed to load cache from storage:', error);
      }
    },

    async saveToStorage(state?: WalletCacheController) {
      try {
        const currentState = state || get({ subscribe });
        const cacheKey = 'wallet-cache-state';
        await cacheService.setPortfolio(cacheKey, currentState as any);
      } catch (error) {
        console.error('Failed to save cache to storage:', error);
      }
    },

    updateTokens(chainId: number, address: string, tokens: TokenCache[]) {
      update((cache: any) => {
        const key = `${chainId}_${address}`;
        if (!cache.accounts[key]) {
          cache.accounts[key] = {
            address,
            chainId,
            tokens: [],
            transactions: [],
            updateDate: new Date().toISOString()
          };
        }

        cache.accounts[key].tokens = tokens;
        cache.accounts[key].updateDate = new Date().toISOString();
        cache.lastUpdateDate = new Date().toISOString();
        cache.lastSync = new Date().toISOString();

        // Maintain compatibility with old chainAccountCache structure
        if (!cache.chainAccountCache) cache.chainAccountCache = {};
        if (!cache.chainAccountCache[chainId]) cache.chainAccountCache[chainId] = {};
        cache.chainAccountCache[chainId][address] = {
          portfolio: { totalValue: tokens.reduce((sum, t) => sum + (t.price || 0) * parseFloat(t.balance || '0'), 0) },
          tokens
        };

        // Save to new cache service
        cacheService.setTokens(address, chainId, tokens as any).catch(console.error);

        return cache;
      });
    },

    updateTransactions(
      chainId: number,
      address: string,
      transactions: TransactionCache[],
      appendOrLastBlock: boolean | number = false
    ) {
      // Handle both old signatures
      const append = typeof appendOrLastBlock === 'boolean' ? appendOrLastBlock : false;
      update((cache) => {
        const key = `${chainId}_${address}`;
        if (!cache.accounts[key]) {
          cache.accounts[key] = {
            address,
            chainId,
            tokens: [],
            transactions: [],
            updateDate: new Date().toISOString()
          };
        }

        if (append) {
          cache.accounts[key].transactions = [
            ...cache.accounts[key].transactions,
            ...transactions
          ];
        } else {
          cache.accounts[key].transactions = transactions;
        }

        cache.accounts[key].updateDate = new Date().toISOString();
        cache.lastUpdateDate = new Date().toISOString();

        // Save to new cache service
        cacheService.setTransactions(address, chainId, transactions as any).catch(console.error);

        return cache;
      });
    },

    updateTokenPrices(chainId: number, priceMap: Map<string, number>) {
      update((cache) => {
        Object.keys(cache.accounts).forEach((key) => {
          const account = cache.accounts[key];
          if (account.chainId === chainId) {
            account.tokens.forEach((token) => {
              const price = priceMap.get(token.address.toLowerCase());
              if (price !== undefined) {
                token.price = price;
              }
            });
            account.updateDate = new Date().toISOString();
          }
        });

        cache.lastUpdateDate = new Date().toISOString();
        return cache;
      });
    },

    updateTokenBalances(chainId: number, address: string, newBalances: Map<string, BigNumberish>) {
      update((cache) => {
        const key = `${chainId}_${address}`;
        const account = cache.accounts[key];

        if (account) {
          account.tokens.forEach((token) => {
            const newBalance = newBalances.get(token.address.toLowerCase());
            if (newBalance !== undefined) {
              token.balance = BigNumber.from(newBalance).toString();
            }
          });
          account.updateDate = new Date().toISOString();
        }

        cache.lastUpdateDate = new Date().toISOString();
        return cache;
      });
    },

    clearAllCache() {
      set(getDefaultCache());
      cacheService.clearAll().catch(console.error);
    },

    clearAccountCache(chainId: number, address: string) {
      update((cache) => {
        const key = `${chainId}_${address}`;
        delete cache.accounts[key];
        cache.lastUpdateDate = new Date().toISOString();

        // Clear from new cache service
        cacheService.clearAccountCache(address).catch(console.error);

        return cache;
      });
    },

    getAccountCache(chainId: number, address: string): any {
      const state = get({ subscribe });
      const key = `${chainId}_${address}`;
      const account = state.accounts[key];

      if (!account) return null;

      // Add compatibility properties for old cache-sync service
      return {
        ...account,
        portfolio: {
          totalValue: account.tokens.reduce((sum, t) => {
            if (t.price && t.balance) {
              return sum + (t.price * parseFloat(t.balance || '0'));
            }
            return sum;
          }, 0)
        },
        transactions: {
          transactions: account.transactions || [],
          lastBlock: 0 // We don't track this in v2 yet
        }
      };
    },

    setCurrentAccount(account: YakklAccount | null) {
      update((cache) => ({
        ...cache,
        currentAccount: account,
        activeAccountAddress: account?.address // Legacy compatibility
      }));
    },

    setCurrentNetwork(chainId: number) {
      update((cache) => ({
        ...cache,
        currentNetwork: chainId,
        activeChainId: chainId // Legacy compatibility
      }));
    },

    setInitializing(isInitializing: boolean) {
      update((cache) => ({
        ...cache,
        isInitializing
      }));
    },

    setHasEverLoaded(hasEverLoaded: boolean) {
      update((cache) => ({
        ...cache,
        hasEverLoaded
      }));
    },

    async getCache(): Promise<WalletCacheController | null> {
      return get({ subscribe });
    },

    getCacheSync() {
      const state = get({ subscribe });
      // Add compatibility properties for old services
      return {
        ...state,
        portfolioRollups: {
          grandTotal: {
            totalValue: get(grandPortfolioTotal)
          }
        }
      };
    },

    initializeAccountCache(account: YakklAccount, chainId: number) {
      update((cache) => {
        const key = `${chainId}_${account.address}`;
        if (!cache.accounts[key]) {
          cache.accounts[key] = {
            address: account.address,
            chainId,
            tokens: [],
            transactions: [],
            updateDate: new Date().toISOString()
          };
        }
        return cache;
      });
    },

    updateNativeTokenPrice(chainId: number, address: string, price: number) {
      update((cache) => {
        const key = `${chainId}_${address}`;
        const account = cache.accounts[key];

        if (account) {
          const nativeToken = account.tokens.find(t =>
            t.isNative || t.address === '0x0000000000000000000000000000000000000000'
          );

          if (nativeToken) {
            nativeToken.price = price;
            account.updateDate = new Date().toISOString();
          }
        }

        cache.lastUpdateDate = new Date().toISOString();
        return cache;
      });
    },

    async updateFromStorage(newCache: WalletCacheController) {
      set(newCache);
    },

    // Compatibility methods for old cache-sync service
    forcePortfolioRecalculation(chainId: number, address: string) {
      // In v2, portfolio is calculated automatically via derived stores
      // This is a no-op for compatibility
      // console.log('[Cache] Portfolio recalculation requested (auto-handled in v2)');
    },

    async calculateAllRollups() {
      // In v2, rollups are calculated automatically via derived stores
      // This is a no-op for compatibility
      // console.log('[Cache] Rollup calculation requested (auto-handled in v2)');
      return Promise.resolve();
    },

    // Additional compatibility methods for portfolio-data-coordinator
    async updateFromCoordinator(data: any) {
      // Transform coordinator data to cache format
      // console.log('[Cache] Update from coordinator (compatibility shim)');
      return Promise.resolve();
    },

    async recalculateRollupsFromPrices() {
      // In v2, this happens automatically
      // console.log('[Cache] Recalculate rollups from prices (auto-handled in v2)');
      return Promise.resolve();
    },

    async recalculatePortfoliosFromBalances() {
      // In v2, this happens automatically via derived stores
      // console.log('[Cache] Recalculate portfolios from balances (auto-handled in v2)');
      return Promise.resolve();
    },

    // Additional compatibility methods for cache-sync service
    updateAccountRollup(chainId: number, address: string, rollup: any) {
      // console.log('[Cache] Update account rollup (compatibility shim)');
      // No-op - handled automatically by derived stores
    },

    updateChainRollup(chainId: number, rollup: any) {
      // console.log('[Cache] Update chain rollup (compatibility shim)');
      // No-op - handled automatically by derived stores
    },

    updateTransactionFromCoordinator(transaction: any) {
      // console.log('[Cache] Update transaction from coordinator (compatibility shim)');
      // No-op for now
    },

    switchAccount(account: any) {
      this.setCurrentAccount(account);
    }
  };
}

// Create the store instance
export const walletCacheStore = createWalletCacheStore();
export const WalletCacheStore = walletCacheStore;

// Derived stores for backward compatibility
export const currentAccount = derived(walletCacheStore, ($cache) => {
  return $cache.currentAccount;
});

export const currentAccountTokens = derived(walletCacheStore, ($cache) => {
  if (!$cache.currentAccount || !$cache.currentNetwork) return [];

  const key = `${$cache.currentNetwork}_${$cache.currentAccount.address}`;
  const account = $cache.accounts[key];

  return account?.tokens || [];
});

export const currentAccountTransactions = derived(walletCacheStore, ($cache) => {
  if (!$cache.currentAccount || !$cache.currentNetwork) return [];

  const key = `${$cache.currentNetwork}_${$cache.currentAccount.address}`;
  const account = $cache.accounts[key];

  return account?.transactions || [];
});

export const currentPortfolioValue = derived(walletCacheStore, ($cache) => {
  if (!$cache.currentAccount || !$cache.currentNetwork) return BigNumber.from(0);

  const key = `${$cache.currentNetwork}_${$cache.currentAccount.address}`;
  const account = $cache.accounts[key];

  if (!account?.tokens) return BigNumber.from(0);

  return account.tokens.reduce((total, token) => {
    if (token.price && token.balance) {
      const value = BigNumber.from(token.balance)
        .mul(Math.floor(token.price * 1000000))
        .div(1000000);
      return total.add(value);
    }
    return total;
  }, BigNumber.from(0));
});

export const isInitializing = derived(walletCacheStore, ($cache) => $cache.isInitializing);
export const hasEverLoaded = derived(walletCacheStore, ($cache) => $cache.hasEverLoaded);

export const hasCacheForCurrent = derived(walletCacheStore, ($cache) => {
  if (!$cache.currentAccount) return false;

  const key = `${$cache.currentNetwork}_${$cache.currentAccount.address}`;
  return !!$cache.accounts[key];
});

export const lastUpdateTimes = derived(walletCacheStore, ($cache) => {
  const times: Record<string, string> = {};

  Object.entries($cache.accounts).forEach(([key, account]) => {
    times[key] = account.updateDate;
  });

  return times;
});

// Additional derived stores for compatibility
export const multiChainPortfolioValue = derived(walletCacheStore, ($cache) => {
  if (!$cache.currentAccount) return BigNumber.from(0);

  return Object.values($cache.accounts)
    .filter(account => account.address === $cache.currentAccount?.address)
    .reduce((total, account) => {
      const accountTotal = account.tokens.reduce((sum, token) => {
        if (token.price && token.balance) {
          const value = BigNumber.from(token.balance)
            .mul(Math.floor(token.price * 1000000))
            .div(1000000);
          return sum.add(value);
        }
        return sum;
      }, BigNumber.from(0));

      return total.add(accountTotal);
    }, BigNumber.from(0));
});

export const grandPortfolioTotal = derived(walletCacheStore, ($cache) => {
  // Handle null/undefined cache or missing accounts
  if (!$cache || !$cache.accounts) {
    return BigNumber.from(0);
  }

  return Object.values($cache.accounts).reduce((total, account) => {
    // Ensure account has tokens array
    if (!account || !Array.isArray(account.tokens)) {
      return total;
    }

    const accountTotal = account.tokens.reduce((sum, token) => {
      if (token.price && token.balance) {
        const value = BigNumber.from(token.balance)
          .mul(Math.floor(token.price * 1000000))
          .div(1000000);
        return sum.add(value);
      }
      return sum;
    }, BigNumber.from(0));

    return total.add(accountTotal);
  }, BigNumber.from(0));
});

// Additional derived stores for compatibility with token.store.ts
export const multiChainTokens = derived(walletCacheStore, ($cache) => {
  if (!$cache.currentAccount) return [];

  // Aggregate all tokens from all chains for the current account
  return Object.values($cache.accounts)
    .filter(account => account.address === $cache.currentAccount?.address)
    .flatMap(account => account.tokens);
});

export const portfolioByNetwork = derived(walletCacheStore, ($cache) => {
  const portfolioMap: Record<number, any> = {};

  Object.values($cache.accounts).forEach((account) => {
    if (!portfolioMap[account.chainId]) {
      portfolioMap[account.chainId] = {
        chainId: account.chainId,
        totalValue: BigNumber.from(0),
        tokens: []
      };
    }

    const chainTotal = account.tokens.reduce((sum, token) => {
      if (token.price && token.balance) {
        const value = BigNumber.from(token.balance)
          .mul(Math.floor(token.price * 1000000))
          .div(1000000);
        return sum.add(value);
      }
      return sum;
    }, BigNumber.from(0));

    portfolioMap[account.chainId].totalValue = portfolioMap[account.chainId].totalValue.add(chainTotal);
    portfolioMap[account.chainId].tokens.push(...account.tokens);
  });

  return portfolioMap;
});

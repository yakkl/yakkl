import { writable, derived, get } from 'svelte/store';
import {
  setObjectInExtensionStorage,
  getObjectFromExtensionStorage,
  getYakklCurrentlySelected
} from '$lib/common/stores';
import type {
  YakklAccount,
  TokenDisplay,
  TransactionDisplay,
  ChainDisplay
} from '$lib/types';
import { VERSION } from '$lib/common';
import { log } from '$lib/common/logger-wrapper';
import { BigNumber, type BigNumberish } from '$lib/common/bignumber';

// Cache version for migrations
const CACHE_VERSION = VERSION;
const CACHE_KEY = 'yakklWalletCache';

// Interfaces
export interface WalletCacheController {
  // Current active selections
  activeChainId: number;
  activeAccountAddress: string;

  // Master cache keyed by chainId -> accountAddress
  chainAccountCache: {
    [chainId: number]: {
      [accountAddress: string]: AccountCache;
    }
  };

  // Metadata
  lastSync: Date;
  version: string;

  // Loading states
  isInitializing: boolean;
  hasEverLoaded: boolean;
}

export interface AccountCache {
  // Account info
  account: YakklAccount;
  chainId: number;

  // Token data for this account on this chain
  tokens: TokenCache[];

  // Portfolio calculations
  portfolio: {
    totalValue: number;
    lastCalculated: Date;
    tokenCount: number;
  };

  // Transaction cache
  transactions: TransactionCache;

  // Last updates
  lastTokenRefresh: Date;
  lastTransactionRefresh: Date;
  lastPriceUpdate: Date;
}

export interface TokenCache {
  address: string;
  symbol: string;
  name: string;
  decimals: number;               // Stay number (decimal places count)

  // Balance data
  balance: string;                // Keep as string for storage
  balanceLastUpdated: Date;

  // Price data
  price: BigNumberish;            // Changed from number - CRITICAL
  priceLastUpdated: Date;
  price24hChange?: BigNumberish;  // Changed from number for precision

  // Calculated value
  value: BigNumberish;            // Changed from number - CRITICAL (balance * price)

  // UI display data
  icon?: string;
  isNative: boolean;
  chainId: number;                // Stay number (chain ID is integer)
}

export interface TransactionCache {
  transactions: TransactionDisplay[];
  lastBlock: number;
  hasMore: boolean;
  total: number;
}

// Helper functions
function getDefaultCache(): WalletCacheController {
  return {
    activeChainId: 1, // Default to Ethereum mainnet
    activeAccountAddress: '',
    chainAccountCache: {},
    lastSync: new Date(),
    version: CACHE_VERSION,
    isInitializing: false,
    hasEverLoaded: false
  };
}

function getDefaultAccountCache(account: YakklAccount, chainId: number): AccountCache {
  return {
    account,
    chainId,
    tokens: [],
    portfolio: {
      totalValue: 0,
      lastCalculated: new Date(),
      tokenCount: 0
    },
    transactions: {
      transactions: [],
      lastBlock: 0,
      hasMore: true,
      total: 0
    },
    lastTokenRefresh: new Date(),
    lastTransactionRefresh: new Date(),
    lastPriceUpdate: new Date()
  };
}

// Utility to convert date strings back to Date objects
function hydrateDates(obj: any): any {
  if (obj instanceof Date) return obj;
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
    return new Date(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(hydrateDates);
  }
  if (obj && typeof obj === 'object') {
    const hydrated: any = {};
    for (const key in obj) {
      hydrated[key] = hydrateDates(obj[key]);
    }
    return hydrated;
  }
  return obj;
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Main store creation
function createWalletCacheStore() {
  const { subscribe, set, update } = writable<WalletCacheController>(getDefaultCache());

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // Debounced save to prevent excessive writes
  const saveToStorage = debounce(async (state: WalletCacheController) => {
    if (!isBrowser) return;

    try {
      // Validate before saving - don't save if all values are zero
      let hasValidData = false;

      if (state.chainAccountCache) {
        Object.values(state.chainAccountCache).forEach(chainData => {
          Object.values(chainData).forEach((accountData: any) => {
            if (accountData?.portfolio?.totalValue > 0 ||
                accountData?.tokens?.some((t: any) => t.balance && parseFloat(t.balance) > 0)) {
              hasValidData = true;
            }
          });
        });
      }

      // Only save if we have valid data
      if (hasValidData) {
        await setObjectInExtensionStorage(CACHE_KEY, state);
        log.info('[WalletCache] Saved to extension storage with valid data', false);
      } else {
        log.info('[WalletCache] Skipping save - no valid data to persist', false);
      }
    } catch (error) {
      log.warn('[WalletCache] Failed to save:', false, error);
    }
  }, 500);

  // Load from storage on initialization
  async function loadFromStorage() {
    if (!isBrowser) return;

    try {
      const cached = await getObjectFromExtensionStorage<WalletCacheController>(CACHE_KEY);
      if (cached && cached.version === CACHE_VERSION) {
        const hydrated = hydrateDates(cached);
        set(hydrated);
        log.info('[WalletCache] Loaded from extension storage', false);
      } else if (cached && cached.version !== CACHE_VERSION) {
        // Handle migration if needed
        log.info('[WalletCache] Version mismatch, starting fresh', false);
        set(getDefaultCache());
      }

      // Sync with current account from persisted storage
      const currentlySelected = await getYakklCurrentlySelected();
      if (currentlySelected?.shortcuts?.address) {
        update(cache => ({
          ...cache,
          activeAccountAddress: currentlySelected.shortcuts.address.toLowerCase()
        }));
        log.info('[WalletCache] Synced active account from storage:', false, currentlySelected.shortcuts.address);
      }

      // Sync with current chain if available
      if (currentlySelected?.shortcuts?.chainId) {
        update(cache => ({
          ...cache,
          activeChainId: currentlySelected.shortcuts.chainId
        }));
        log.info('[WalletCache] Synced active chain from storage:', false, currentlySelected.shortcuts.chainId);
      }
    } catch (error) {
      log.warn('[WalletCache] Failed to load:', false, error);
    }
  }

  // Initialize
  if (isBrowser) {
    loadFromStorage();
  }

  // Auto-save on changes
  subscribe(state => {
    if (isBrowser) {
      saveToStorage(state);
    }
  });

  return {
    subscribe,

    // Initialize cache from storage
    async initialize() {
      await loadFromStorage();

      // Ensure we're synced with the current account after initialization
      const currentlySelected = await getYakklCurrentlySelected();
      if (currentlySelected?.shortcuts?.address) {
        const currentState = get({ subscribe });
        if (currentState.activeAccountAddress !== currentlySelected.shortcuts.address.toLowerCase()) {
          update(cache => ({
            ...cache,
            activeAccountAddress: currentlySelected.shortcuts.address.toLowerCase()
          }));
          console.log('[WalletCache] Re-synced active account on initialize:', currentlySelected.shortcuts.address);
        }
      }
    },

    // Switch active account without clearing cache
    switchAccount(address: string) {
      update(cache => ({
        ...cache,
        activeAccountAddress: address.toLowerCase()
      }));
    },

    // Switch active chain without clearing cache
    switchChain(chainId: number) {
      update(cache => ({
        ...cache,
        activeChainId: chainId
      }));
    },

    // Initialize account cache if it doesn't exist
    initializeAccountCache(account: YakklAccount, chainId: number) {
      update(cache => {
        const newCache = { ...cache };
        const address = account.address.toLowerCase();

        if (!newCache.chainAccountCache[chainId]) {
          newCache.chainAccountCache[chainId] = {};
        }

        if (!newCache.chainAccountCache[chainId][address]) {
          newCache.chainAccountCache[chainId][address] = getDefaultAccountCache(account, chainId);
          console.log(`[WalletCache] Initialized cache for ${address} on chain ${chainId}`);
        }

        return newCache;
      });
    },

    // Update tokens for specific account/chain
    updateTokens(chainId: number, address: string, tokens: TokenCache[]) {
      update(cache => {
        const newCache = { ...cache };
        const normalizedAddress = address.toLowerCase();

        if (!newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
          console.warn(`[WalletCache] No cache for ${normalizedAddress} on chain ${chainId}`);
          return cache;
        }

        const accountCache = newCache.chainAccountCache[chainId][normalizedAddress];

        // More lenient validation - allow updates if we have ANY meaningful data
        const hasAnyMeaningfulData = tokens.some(token =>
          (token.balance && parseFloat(token.balance) > 0) ||
          (token.price && (BigNumber.toNumber(token.price) || 0) > 0) ||
          token.isNative // Always preserve native token even with 0 balance
        );

        // Only reject if ALL tokens have zero values AND no native token
        const existingHasValues = accountCache.tokens.some(token =>
          (token.balance && parseFloat(token.balance) > 0) ||
          (token.value && (BigNumber.toNumber(token.value) || 0) > 0) ||
          token.isNative
        );

        const allNewTokensZero = tokens.every(token =>
          (!token.balance || parseFloat(token.balance) === 0) &&
          (!token.value || token.value === 0) &&
          (!token.price || token.price === 0)
        );

        if (existingHasValues && allNewTokensZero && !hasAnyMeaningfulData) {
          log.warn('[WalletCache] Rejecting token update - all new values are zero and no meaningful data', false);
          return cache;
        }

        accountCache.tokens = tokens;
        accountCache.lastTokenRefresh = new Date();

        // Recalculate portfolio
        accountCache.portfolio = {
          totalValue: tokens.reduce((sum, token) => {
            const tokenValue = BigNumber.toNumber(token.value || 0) || 0;
            return sum + tokenValue;
          }, 0),
          lastCalculated: new Date(),
          tokenCount: tokens.length
        };

        return newCache;
      });
    },

    // Update only native token price without touching other cache data
    updateNativeTokenPrice(chainId: number, address: string, price: number) {
      update(cache => {
        const newCache = { ...cache };
        const normalizedAddress = address.toLowerCase();
        const accountCache = newCache.chainAccountCache[chainId]?.[normalizedAddress];

        if (!accountCache) {
          log.warn('[WalletCache] No cache for native token price update', false, { chainId, address });
          return cache;
        }

        // Find and update only the native token
        let updated = false;
        accountCache.tokens = accountCache.tokens.map(token => {
          if (token.isNative) {
            const balance = parseFloat(token.balance) || 0;
            updated = true;
            return {
              ...token,
              price: price,
              priceLastUpdated: new Date(),
              value: balance * price
            };
          }
          return token;
        });

        if (updated) {
          // DON'T recalculate portfolio here - let other systems handle portfolio totals
          // Just update the price update timestamp
          accountCache.lastPriceUpdate = new Date();
          log.info('[WalletCache] Updated native token price only (portfolio calculation skipped)', false, { chainId, address, price });
        }

        return newCache;
      });
    },

    // Update token prices for all accounts on a chain
    updateTokenPrices(chainId: number, priceMap: Map<string, number>) {
      update(cache => {
        const newCache = { ...cache };
        const chainCache = newCache.chainAccountCache[chainId];

        if (!chainCache) return cache;

        // Update prices for all accounts on this chain
        Object.keys(chainCache).forEach(address => {
          const accountCache = chainCache[address];

          accountCache.tokens = accountCache.tokens.map(token => {
            const tokenKey = token.address.toLowerCase();
            const newPrice = priceMap.get(tokenKey);

            if (newPrice !== undefined) {
              const balance = parseFloat(token.balance) || 0;
              return {
                ...token,
                price: newPrice,
                priceLastUpdated: new Date(),
                value: balance * newPrice
              };
            }

            return token;
          });

          // Recalculate portfolio
          accountCache.portfolio = {
            totalValue: accountCache.tokens.reduce((sum, token) => {
              const tokenValue = BigNumber.toNumber(token.value || 0) || 0;
              return sum + tokenValue;
            }, 0),
            lastCalculated: new Date(),
            tokenCount: accountCache.tokens.length
          };

          accountCache.lastPriceUpdate = new Date();
        });

        return newCache;
      });
    },

    // Update transactions for specific account/chain
    updateTransactions(chainId: number, address: string, transactions: TransactionDisplay[], lastBlock: number) {
      update(cache => {
        const newCache = { ...cache };
        const normalizedAddress = address.toLowerCase();

        if (!newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
          console.warn(`[WalletCache] No cache for ${normalizedAddress} on chain ${chainId}`);
          return cache;
        }

        const accountCache = newCache.chainAccountCache[chainId][normalizedAddress];

        // Merge new transactions with existing (remove duplicates)
        const existingHashes = new Set(accountCache.transactions.transactions.map(tx => tx.hash));
        const newTransactions = transactions.filter(tx => !existingHashes.has(tx.hash));

        accountCache.transactions = {
          transactions: [...accountCache.transactions.transactions, ...newTransactions]
            .sort((a, b) => b.timestamp - a.timestamp), // Sort by newest first
          lastBlock: Math.max(accountCache.transactions.lastBlock, lastBlock),
          hasMore: true, // Will be determined by the sync manager
          total: accountCache.transactions.total + newTransactions.length
        };

        accountCache.lastTransactionRefresh = new Date();

        return newCache;
      });
    },

    // Get account cache
    getAccountCache(chainId: number, address: string): AccountCache | null {
      const state = get({ subscribe });
      return state.chainAccountCache[chainId]?.[address.toLowerCase()] || null;
    },

    // Clear all cache (user action only)
    clearAllCache() {
      set(getDefaultCache());
      console.log('[WalletCache] All cache cleared by user');
    },

    // Clear specific account cache (user action only)
    clearAccountCache(chainId: number, address: string) {
      update(cache => {
        const newCache = { ...cache };
        const normalizedAddress = address.toLowerCase();

        if (newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
          delete newCache.chainAccountCache[chainId][normalizedAddress];
          console.log(`[WalletCache] Cleared cache for ${normalizedAddress} on chain ${chainId}`);
        }

        return newCache;
      });
    },

    // Set initialization state
    setInitializing(isInitializing: boolean) {
      update(cache => ({
        ...cache,
        isInitializing
      }));
    },

    // Set has ever loaded state
    setHasEverLoaded(hasEverLoaded: boolean) {
      update(cache => ({
        ...cache,
        hasEverLoaded
      }));
    }
  };
}

// Create the main store
export const walletCacheStore = createWalletCacheStore();

// Derived stores for UI consumption
export const currentAccount = derived(
  walletCacheStore,
  $cache => {
    const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
    return chainAccountCache[activeChainId]?.[activeAccountAddress]?.account || null;
  }
);

export const currentAccountTokens = derived(
  walletCacheStore,
  $cache => {
    const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
    return chainAccountCache[activeChainId]?.[activeAccountAddress]?.tokens || [];
  }
);

export const currentPortfolioValue = derived(
  walletCacheStore,
  $cache => {
    const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
    return chainAccountCache[activeChainId]?.[activeAccountAddress]?.portfolio.totalValue || 0;
  }
);

export const currentAccountTransactions = derived(
  walletCacheStore,
  $cache => {
    const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
    return chainAccountCache[activeChainId]?.[activeAccountAddress]?.transactions.transactions || [];
  }
);

// Multi-chain portfolio value (sum across all chains for current account)
export const multiChainPortfolioValue = derived(
  walletCacheStore,
  $cache => {
    const { activeAccountAddress, chainAccountCache } = $cache;
    if (!activeAccountAddress) return 0;

    let total = 0;

    Object.values(chainAccountCache).forEach(chainData => {
      const accountData = chainData[activeAccountAddress];
      if (accountData) {
        total += accountData.portfolio.totalValue;
      }
    });

    return total;
  }
);

// All tokens across all chains for current account
export const multiChainTokens = derived(
  walletCacheStore,
  $cache => {
    const { activeAccountAddress, chainAccountCache } = $cache;
    if (!activeAccountAddress) return [];

    const allTokens: TokenCache[] = [];

    Object.entries(chainAccountCache).forEach(([chainId, chainData]) => {
      const accountData = chainData[activeAccountAddress];
      if (accountData) {
        allTokens.push(...accountData.tokens);
      }
    });

    return allTokens;
  }
);

// Network breakdown for portfolio view
export const portfolioByNetwork = derived(
  walletCacheStore,
  $cache => {
    const { activeAccountAddress, chainAccountCache } = $cache;
    if (!activeAccountAddress) return new Map<number, number>();

    const networkTotals = new Map<number, number>();

    Object.entries(chainAccountCache).forEach(([chainId, chainData]) => {
      const accountData = chainData[activeAccountAddress];
      if (accountData && accountData.portfolio.totalValue > 0) {
        networkTotals.set(Number(chainId), accountData.portfolio.totalValue);
      }
    });

    return networkTotals;
  }
);

// Check if cache exists for current selection
export const hasCacheForCurrent = derived(
  walletCacheStore,
  $cache => {
    const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
    return !!chainAccountCache[activeChainId]?.[activeAccountAddress];
  }
);

// Last update times
export const lastUpdateTimes = derived(
  walletCacheStore,
  $cache => {
    const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
    const accountCache = chainAccountCache[activeChainId]?.[activeAccountAddress];

    return {
      tokens: accountCache?.lastTokenRefresh || null,
      prices: accountCache?.lastPriceUpdate || null,
      transactions: accountCache?.lastTransactionRefresh || null,
      portfolio: accountCache?.portfolio.lastCalculated || null
    };
  }
);

// Derived store for loading state
export const isInitializing = derived(
  walletCacheStore,
  $cache => $cache.isInitializing
);

export const hasEverLoaded = derived(
  walletCacheStore,
  $cache => $cache.hasEverLoaded
);

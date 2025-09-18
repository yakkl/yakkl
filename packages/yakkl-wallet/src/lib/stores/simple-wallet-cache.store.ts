import { writable, derived, get } from 'svelte/store';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import type { TokenDisplay, TransactionDisplay } from '$lib/types';
import { log } from '$lib/common/logger-wrapper';
// import { browser_ext } from '$lib/common/environment';
import browser from '$lib/common/browser-wrapper';

// Simplified cache structure - ~100 lines instead of 2351
export interface SimpleWalletCache {
  current: {
    chainId: number;
    address: string;
    tokens: TokenDisplay[];
    transactions: TransactionDisplay[];
    totalValue: bigint;
    lastUpdate: number;
  };
  recent: Record<string, {
    tokens: TokenDisplay[];
    transactions: TransactionDisplay[];
    totalValue: bigint;
    lastUpdate: number;
  }>;
}

const CACHE_KEY = 'yakklSimpleCache';
const MAX_RECENT_ENTRIES = 5;
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

function getDefaultCache(): SimpleWalletCache {
  return {
    current: {
      chainId: 1,
      address: '',
      tokens: [],
      transactions: [],
      totalValue: 0n,
      lastUpdate: Date.now()
    },
    recent: {}
  };
}

function createSimpleWalletCache() {
  const { subscribe, set, update } = writable<SimpleWalletCache>(getDefaultCache());

  // Load from storage on init
  async function loadFromStorage() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return; // Skip during SSR
    }
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert bigint strings back
        if (parsed.current) {
          parsed.current.totalValue = BigInt(parsed.current.totalValue || 0);
        }
        Object.values(parsed.recent || {}).forEach((entry: any) => {
          entry.totalValue = BigInt(entry.totalValue || 0);
        });
        set(parsed);
      }
    } catch (e) {
      log.warn('Failed to load cache from storage', false, e);
    }
  }

  // Save to storage
  function saveToStorage(cache: SimpleWalletCache) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return; // Skip during SSR
    }
    try {
      // Convert bigints to strings for JSON
      const toStore = {
        ...cache,
        current: {
          ...cache.current,
          totalValue: cache.current.totalValue.toString()
        },
        recent: Object.entries(cache.recent).reduce((acc, [key, val]) => ({
          ...acc,
          [key]: { ...val, totalValue: val.totalValue.toString() }
        }), {})
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(toStore));
    } catch (e) {
      log.warn('Failed to save cache to storage', false, e);
    }
  }

  // Auto-save on changes
  subscribe(saveToStorage);

  // Initialize on creation
  if (typeof window !== 'undefined') {
    loadFromStorage();
  }

  return {
    subscribe,

    async switchAccount(chainId: number, address: string) {
      const cacheKey = `${chainId}_${address.toLowerCase()}`;

      update(cache => {
        // Check recent cache
        if (cache.recent[cacheKey] &&
            Date.now() - cache.recent[cacheKey].lastUpdate < CACHE_EXPIRY) {
          // Use cached data
          cache.current = {
            chainId,
            address: address.toLowerCase(),
            ...cache.recent[cacheKey]
          };
        } else {
          // Clear current, will be populated by background
          cache.current = {
            chainId,
            address: address.toLowerCase(),
            tokens: [],
            transactions: [],
            totalValue: 0n,
            lastUpdate: Date.now()
          };
        }
        return cache;
      });
    },

    // Update tokens with just array (uses current chain/address)
    updateTokens(tokens: TokenDisplay[] | { chainId: number; address: string; tokens: TokenDisplay[] }) {
      // Handle both signatures
      if (Array.isArray(tokens)) {
        // Simple array of tokens - use current account
        update(cache => {
          // Ensure tokens have balance data - CRITICAL FIX
          const tokensWithBalance = tokens.map(token => {
            // Preserve all original fields and ensure balance/qty are set
            const balance = token.balance || token.qty || '0';
            const qty = token.qty || token.balance || '0';
            
            // Calculate value if missing
            let value = token.value;
            if (!value && token.price && qty) {
              // Calculate value = price * qty
              const qtyNum = typeof qty === 'string' ? parseFloat(qty) : Number(qty);
              const priceNum = typeof token.price === 'number' ? token.price : parseFloat(token.price || '0');
              value = BigInt(Math.round(priceNum * qtyNum * 100)); // Store as cents in bigint
            }
            
            return {
              ...token,
              balance,
              qty,
              value: value || 0n
            };
          });

          // Calculate total value properly
          const totalValue = tokensWithBalance.reduce((sum, token) => {
            try {
              // Handle BigNumber, string, number, or bigint
              let value: bigint;
              if (typeof token.value === 'bigint') {
                value = token.value;
              } else if (typeof token.value === 'string' || typeof token.value === 'number') {
                value = BigInt(token.value || 0);
              } else if (token.value && typeof token.value === 'object' && 'toString' in token.value) {
                // Handle BigNumber objects
                value = BigInt((token.value as any).toString());
              } else {
                value = 0n;
              }
              return sum + value;
            } catch {
              return sum;
            }
          }, 0n);

          cache.current = {
            ...cache.current,
            tokens: tokensWithBalance,
            totalValue,
            lastUpdate: Date.now()
          };

          // Also update recent cache
          const cacheKey = `${cache.current.chainId}_${cache.current.address}`;
          cache.recent[cacheKey] = {
            ...cache.recent[cacheKey],
            tokens: tokensWithBalance,
            totalValue,
            lastUpdate: Date.now()
          };

          log.debug('[SimpleCache] Updated tokens', false, {
            count: tokensWithBalance.length,
            totalValue: totalValue.toString(),
            firstToken: tokensWithBalance[0]
          });

          return cache;
        });
      } else {
        // Full signature with chainId and address
        const { chainId, address, tokens: tokenList } = tokens;
        update(cache => {
          const cacheKey = `${chainId}_${address.toLowerCase()}`;

          // Ensure tokens have balance data
          const tokensWithBalance = tokenList.map(token => ({
            ...token,
            balance: token.balance || token.qty || '0',
            qty: token.qty || token.balance || '0'
          }));

          // Calculate total value
          const totalValue = tokensWithBalance.reduce((sum, token) => {
            try {
              // Handle BigNumber, string, number, or bigint
              let value: bigint;
              if (typeof token.value === 'bigint') {
                value = token.value;
              } else if (typeof token.value === 'string' || typeof token.value === 'number') {
                value = BigInt(token.value || 0);
              } else if (token.value && typeof token.value === 'object' && 'toString' in token.value) {
                // Handle BigNumber objects
                value = BigInt((token.value as any).toString());
              } else {
                value = 0n;
              }
              return sum + value;
            } catch {
              return sum;
            }
          }, 0n);

          const tokenData = {
            tokens: tokensWithBalance,
            totalValue,
            lastUpdate: Date.now()
          };

          // Update current if it matches
          if (cache.current.chainId === chainId &&
              cache.current.address === address.toLowerCase()) {
            cache.current = {
              ...cache.current,
              ...tokenData
            };
          }

          // Update recent cache
          cache.recent[cacheKey] = {
            ...cache.recent[cacheKey],
            ...tokenData
          };

          // Evict old entries if needed
          const entries = Object.entries(cache.recent);
          if (entries.length > MAX_RECENT_ENTRIES) {
            // Sort by lastUpdate and keep only newest
            const sorted = entries.sort((a, b) => b[1].lastUpdate - a[1].lastUpdate);
            cache.recent = Object.fromEntries(sorted.slice(0, MAX_RECENT_ENTRIES));
          }

          return cache;
        });
      }
    },

    // Update transactions with just array (uses current chain/address)
    updateTransactions(transactions: TransactionDisplay[] | { chainId: number; address: string; transactions: TransactionDisplay[] }) {
      if (Array.isArray(transactions)) {
        // Simple array - use current account
        update(cache => {
          cache.current = {
            ...cache.current,
            transactions,
            lastUpdate: Date.now()
          };

          // Also update recent cache
          const cacheKey = `${cache.current.chainId}_${cache.current.address}`;
          cache.recent[cacheKey] = {
            ...cache.recent[cacheKey],
            transactions,
            lastUpdate: Date.now()
          };

          return cache;
        });
      } else {
        // Full signature
        const { chainId, address, transactions: txList } = transactions;
        update(cache => {
          const cacheKey = `${chainId}_${address.toLowerCase()}`;

          const txData = {
            transactions: txList,
            lastUpdate: Date.now()
          };

          // Update current if it matches
          if (cache.current.chainId === chainId &&
              cache.current.address === address.toLowerCase()) {
            cache.current = {
              ...cache.current,
              ...txData
            };
          }

          // Update recent cache
          cache.recent[cacheKey] = {
            ...cache.recent[cacheKey],
            ...txData
          };

          return cache;
        });
      }
    },

    clearCache() {
      set(getDefaultCache());
      localStorage.removeItem(CACHE_KEY);
    },

    async initialize() {
      loadFromStorage();

      // Set current from yakklCurrentlySelected
      const selected = await getYakklCurrentlySelected();
      if (selected?.shortcuts?.address && selected?.shortcuts?.chainId) {
        await this.switchAccount(
          selected.shortcuts.chainId,
          selected.shortcuts.address
        );
      }
    },

    async refresh() {
      // Request fresh data from background
      try {
        const cache = get(simpleWalletCache);
        if (!cache.current.address) return;

        // Send message to background to refresh
        if (browser.runtime) {
          await browser.runtime.sendMessage({
            method: 'yakkl_refreshTokens',
            params: {
              chainId: cache.current.chainId,
              address: cache.current.address,
              force: true
            }
          });
        }
      } catch (e) {
        log.warn('[SimpleCache] Failed to request refresh', false, e);
      }
    }
  };
}

// Create the store
export const simpleWalletCache = createSimpleWalletCache();

// Derived stores for UI
export const currentTokens = derived(
  simpleWalletCache,
  $cache => $cache.current.tokens
);

export const currentTransactions = derived(
  simpleWalletCache,
  $cache => $cache.current.transactions
);

export const currentPortfolioValue = derived(
  simpleWalletCache,
  $cache => $cache.current.totalValue
);

export const currentAccount = derived(
  simpleWalletCache,
  $cache => ({
    chainId: $cache.current.chainId,
    address: $cache.current.address
  })
);

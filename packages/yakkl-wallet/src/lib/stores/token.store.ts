import { derived } from 'svelte/store';
// Check if we're in a browser environment
const browser = typeof window !== 'undefined';
import type { LoadingState, ErrorState } from '../types';
import {
  walletCacheStore,
  currentAccountTokens,
  currentPortfolioValue,
  multiChainTokens,
  multiChainPortfolioValue,
  portfolioByNetwork as cachePortfolioByNetwork
} from './wallet-cache.store';
// Remove direct import of currentAccount to avoid circular dependency
// import { currentAccount } from './account.store';
import { currentChain } from './chain.store';
import { CacheSyncManager } from '../services/cache-sync.service';
import { log } from '$lib/common/logger-wrapper';

import type { TokenData } from '$lib/common/interfaces';
import { setYakklCombinedTokenStorage, getYakklCombinedTokens } from '$lib/common/stores';
import { BigNumber } from '$lib/common/bignumber';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

interface TokenState {
  loading: LoadingState;
  error: ErrorState;
  isMultiChainView: boolean;
}

// Create a writable store for UI state only
import { writable } from 'svelte/store';

function createTokenStore() {
  const { subscribe, set, update } = writable<TokenState>({
    loading: { isLoading: false },
    error: { hasError: false },
    isMultiChainView: false
  });

  const syncManager = CacheSyncManager.getInstance();

      // Initialize on creation
  async function initialize() {
    log.info('[TokenStore] Initializing...', false);

    try {
      // CRITICAL FIX: Ensure wallet cache is properly initialized first
      log.info('[TokenStore] Step 1: Initializing wallet cache from storage...', false);
      await walletCacheStore.initialize();

      // CRITICAL FIX: Initialize current account cache with retry logic
      log.info('[TokenStore] Step 2: Initializing current account cache...', false);
      await syncManager.initializeCurrentAccount();
      
      // CRITICAL FIX: Ensure rollups are always calculated on initial load
      log.info('[TokenStore] Step 3: Calculating rollups...', false);
      const cacheState = walletCacheStore.getCacheSync();
      if (cacheState) {
        // Always calculate rollups on initialization to ensure UI shows values
        log.info('[TokenStore] Calculating initial rollups to ensure UI shows values...', false);
        await walletCacheStore.calculateAllRollups();
        
        // Mark cache as having been loaded
        walletCacheStore.setHasEverLoaded(true);
      }

      // Start auto-sync only in browser
      if (browser) {
        log.info('[TokenStore] Step 4: Starting auto-sync...', false);
        syncManager.startAutoSync();
      }

      // Set up listeners after initialization to avoid circular dependency
      if (browser) {
        try {
          // EXCEPTION: Dynamic import required here to avoid circular dependency
          // account.store imports token.store, so we can't statically import it back
          const { currentAccount } = await import('./account.store');

          // Listen for account changes with better error handling
          currentAccount.subscribe(async (account) => {
            if (account) {
              log.info('[TokenStore] Account changed, initializing cache...', false, account.address);
              try {
                await syncManager.initializeCurrentAccount();
                // Ensure rollups are recalculated for new account
                await walletCacheStore.calculateAllRollups();
              } catch (error) {
                log.error('[TokenStore] Failed to initialize cache for account change:', false, error);
              }
            }
          });
        } catch (error) {
          log.error('[TokenStore] Failed to set up account listener:', false, error);
        }

        // Listen for chain changes with better error handling
        currentChain.subscribe(async (chain) => {
          if (chain) {
            log.info('[TokenStore] Chain changed, initializing cache...', false, chain.chainId);
            try {
              await syncManager.initializeCurrentAccount();
              // Ensure rollups are recalculated for new chain
              await walletCacheStore.calculateAllRollups();
            } catch (error) {
              log.error('[TokenStore] Failed to initialize cache for chain change:', false, error);
            }
          }
        });
      }

      log.info('[TokenStore] Initialization complete successfully', false);
    } catch (error) {
      log.error('[TokenStore] Initialization failed:', false, error);
      // Don't throw - allow the app to continue with degraded functionality
    }
  }

  // Run initialization only in browser
  if (browser) {
    initialize();
  }

  return {
    subscribe,

    async refresh(forceRefresh = true) {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Refreshing tokens...' }
      }));

      try {
        // CRITICAL FIX: Ensure cache is properly initialized before refresh
        log.info('[TokenStore] Starting refresh - ensuring cache initialization...', false);
        
        // First ensure cache is initialized
        await syncManager.initializeCurrentAccount();
        
        // Then sync current account data
        await syncManager.syncCurrentAccount();
        
        // CRITICAL: Always recalculate rollups after refresh to ensure UI shows values
        log.info('[TokenStore] Refresh complete - recalculating rollups...', false);
        await walletCacheStore.calculateAllRollups();

        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
        
        log.info('[TokenStore] Refresh completed successfully', false);
      } catch (error) {
        log.warn('[TokenStore] Refresh failed:', false, error);
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: { hasError: true, message: 'Failed to refresh tokens' }
        }));
      }
    },

    async toggleMultiChainView() {
      update(state => ({
        ...state,
        isMultiChainView: !state.isMultiChainView
      }));

      // Data will automatically update via derived stores
      log.info('[TokenStore] Toggled multi-chain view', false);
    },

    async refreshPrices() {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Updating prices...' }
      }));

      try {
        await syncManager.refreshPrices();

        update(state => ({
          ...state,
          loading: { isLoading: false }
        }));
      } catch (error) {
        log.warn('[TokenStore] Price refresh failed:', false, error);
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: { hasError: true, message: 'Failed to update prices' }
        }));
      }
    },

    reset() {
      // Stop sync manager only in browser
      if (browser) {
        syncManager.stopAutoSync();
      }

      // Reset UI state
      set({
        loading: { isLoading: false },
        error: { hasError: false },
        isMultiChainView: false
      });
    },

    async addCustomToken(token: TokenData) {
      try {
        // Save to combined token storage
        const yakklTokens = await getYakklCombinedTokens() || [];
        yakklTokens.push({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          chainId: token.chainId
        } as TokenData);
        await setYakklCombinedTokenStorage(yakklTokens);

        // Refresh to pick up new token
        await this.refresh();
      } catch (error) {
        log.warn('[TokenStore] Failed to add custom token:', false, error);
      }
    },

    updateTokenBalance(address: string, balance: string) {
      // This will be handled by the sync manager in the next update
      log.info('[TokenStore] Token balance update requested:', false, address, balance);
    }
  };
}

export const tokenStore = createTokenStore();

// Derived stores - these now come from wallet-cache.store
export const tokens = derived(
  [tokenStore, currentAccountTokens],
  ([$store, $tokens]) => {
    // Map TokenCache to TokenDisplay format
    return $tokens.map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      balance: token.balance,
      price: token.price,
      value: token.value,
      icon: token.icon,
      change24h: token.price24hChange,
      isNative: token.isNative,
      chainId: token.chainId,
      // Add required fields for TokenDisplay
      qty: BigNumber.from(token.balance) || 0n,
      quantity: token.balance,
      chainName: ''  // Will be filled by UI
    }));
  }
);

export const totalPortfolioValue = currentPortfolioValue;

export const isLoadingTokens = derived(
  tokenStore,
  $store => $store.loading.isLoading
);

export const tokensByValue = derived(
  tokens,
  $tokens => {
    if (!Array.isArray($tokens)) return [];
    return [...$tokens].sort((a, b) => BigNumberishUtils.compare(b.value, a.value));
  }
);

export const lastTokenUpdate = derived(
  walletCacheStore,
  $cache => $cache.lastSync
);

// Multi-chain support
export const isMultiChainView = derived(
  tokenStore,
  $store => $store.isMultiChainView
);

// Use the multi-chain derived stores from wallet-cache
export { multiChainTokens, multiChainPortfolioValue };

export const displayTokens = derived(
  [tokenStore, tokens, multiChainTokens],
  ([$store, $singleTokens, $multiTokens]) => {
    const tokenList = $store.isMultiChainView ? $multiTokens : $singleTokens;
    // Always ensure we return an array, even if empty
    const result = Array.isArray(tokenList) ? tokenList : [];
    log.info('[TokenStore] displayTokens:', false, result.length, 'tokens', result);
    return result;
  }
);

// Re-export portfolio breakdown from cache store
export const portfolioByNetwork = cachePortfolioByNetwork;

// Network total value - sum of all accounts on current network
export const networkTotalValue = derived(
  [walletCacheStore, currentChain],
  ([$cache, $chain]) => {
    if (!$chain) return 0;

    let totalValue = 0n;
    const chainCache = $cache.chainAccountCache[$chain.chainId];

    if (chainCache) {
      Object.values(chainCache).forEach(accountCache => {
        try {
          const portfolioValue = accountCache.portfolio?.totalValue;
          if (portfolioValue !== undefined && portfolioValue !== null) {
            const bigIntValue = BigNumber.toBigInt(portfolioValue);
            if (bigIntValue !== null) {
              totalValue += bigIntValue;
            }
          }
        } catch (err) {
          // Silently ignore invalid portfolio values
          console.warn('Invalid portfolio value in network total:', accountCache.portfolio?.totalValue);
        }
      });
    }

    return totalValue;
  }
);

// Grand total across ALL addresses and ALL chains
export const grandTotalPortfolioValue = derived(
  walletCacheStore,
  $cache => {
    let totalValue = 0n;

    try {
      Object.values($cache.chainAccountCache).forEach(chainData => {
        Object.values(chainData).forEach(accountCache => {
          try {
            const portfolioValue = accountCache.portfolio?.totalValue;
            if (portfolioValue !== undefined && portfolioValue !== null) {
              const bigIntValue = BigNumber.toBigInt(portfolioValue);
              if (bigIntValue !== null) {
                totalValue += bigIntValue;
              }
            }
          } catch (err) {
            // Silently ignore invalid portfolio values
            console.warn('Invalid portfolio value:', accountCache.portfolio?.totalValue);
          }
        });
      });
    } catch (error) {
      console.error('Error calculating grand total portfolio value:', error);
    }
    
    return totalValue;
  }
);

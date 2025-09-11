import { derived, get } from 'svelte/store';
// Removed direct ethers import - use blockchain-bridge utilities
import { parseUnits } from '$lib/utils/blockchain-bridge';
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
import { hasChanged, compareTokenData } from '$lib/utils/deepCompare';

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
        log.info('[TokenStore] Starting refresh - ensuring cache initialization...');

        // First ensure cache is initialized
        await syncManager.initializeCurrentAccount();

        // Then sync current account data
        await syncManager.syncCurrentAccount();

        // CRITICAL: Always recalculate rollups after refresh to ensure UI shows values
        log.info('[TokenStore] Refresh complete - recalculating rollups...');
        await walletCacheStore.calculateAllRollups();

        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: { hasError: false }
        }));

        log.info('[TokenStore] Refresh completed successfully');
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

    async refreshFromStorage() {
      // Called by storage sync service when storage changes
      log.debug('[TokenStore] Refreshing from storage change');

      try {
        // Get current token data before sync
        const currentTokens = get(currentAccountTokens);

        // Re-sync current account from storage
        await syncManager.syncCurrentAccount();

        // Get new token data after sync
        const newTokens = get(currentAccountTokens);

        // CRITICAL FIX: Only recalculate rollups if token data actually changed
        if (compareTokenData(currentTokens, newTokens)) {
          log.debug('[TokenStore] Token data changed during storage refresh, recalculating rollups');
          await walletCacheStore.calculateAllRollups();
        } else {
          log.debug('[TokenStore] No token data changes detected during storage refresh');
        }

        log.debug('[TokenStore] Storage refresh completed');
      } catch (error) {
        log.error('[TokenStore] Error refreshing from storage:', false, error);
      }
    },

    async updatePricesFromCache(tokenCache: Record<string, any>) {
      // Called by storage sync service when token cache changes
      log.debug('[TokenStore] Updating prices from cache');

      try {
        // Get current token data to compare prices
        const currentTokens = get(currentAccountTokens);
        const currentPrices = currentTokens.map(t => ({ address: t.address.toLowerCase(), price: t.price }));

        // Extract new prices from token cache
        const newPrices = Object.entries(tokenCache).map(([key, entry]: [string, any]) => ({
          address: entry.tokenAddress?.toLowerCase() || key.toLowerCase(),
          price: entry.price
        }));

        // CRITICAL FIX: Only trigger rollup recalculation if prices actually changed
        const pricesChanged = hasChanged(currentPrices, newPrices);

        if (pricesChanged) {
          log.debug('[TokenStore] Price data changed, updating rollups');
          // The wallet cache store handles price updates
          // We just need to trigger a rollup recalculation
          await walletCacheStore.calculateAllRollups();
        } else {
          log.debug('[TokenStore] No price changes detected, skipping rollup update');
        }

        log.debug('[TokenStore] Price update from cache completed');
      } catch (error) {
        log.error('[TokenStore] Error updating prices from cache:', false, error);
      }
    },

    async updateBalancesFromHoldings(holdings: Record<string, any>) {
      // Called by storage sync service when address token holdings change
      log.debug('[TokenStore] Updating balances from holdings');

      try {
        // Get current token balances for comparison
        const currentTokens = get(currentAccountTokens);
        const currentBalances = currentTokens.map(t => ({ address: t.address.toLowerCase(), balance: t.balance }));

        // The sync manager handles balance updates
        await syncManager.syncCurrentAccount();

        // Get new token balances after sync
        const newTokens = get(currentAccountTokens);
        const newBalances = newTokens.map(t => ({ address: t.address.toLowerCase(), balance: t.balance }));

        // CRITICAL FIX: Only recalculate rollups if balances actually changed
        const balancesChanged = hasChanged(currentBalances, newBalances);

        if (balancesChanged) {
          log.debug('[TokenStore] Balance data changed during holdings update, recalculating rollups');
          await walletCacheStore.calculateAllRollups();
        } else {
          log.debug('[TokenStore] No balance changes detected during holdings update');
        }

        log.debug('[TokenStore] Balance update from holdings completed');
      } catch (error) {
        log.error('[TokenStore] Error updating balances from holdings:', false, error);
      }
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
    },

    /**
     * Update prices from Portfolio Data Coordinator
     * This method is called by the coordinator to apply validated price updates
     */
    async updatePricesFromCoordinator(priceData: Record<string, any>) {
      log.debug('[TokenStore] Updating prices from coordinator');

      try {
        // Update prices in wallet cache
        const cache = walletCacheStore.getCacheSync();
        if (!cache) return;

        // Update token prices in cache
        for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
          for (const [address, accountCache] of Object.entries(chainData)) {
            accountCache.tokens = accountCache.tokens.map(token => {
              const priceEntry = priceData[token.address.toLowerCase()];
              if (priceEntry && priceEntry.price !== undefined) {
                // Recalculate value with new price
                const balance = BigNumberishUtils.toBigInt(token.balance || 0n);
                const newPrice = priceEntry.price;
                const value = balance > 0n && newPrice > 0
                  ? BigNumberishUtils.toBigInt((Number(balance) / 1e18) * newPrice * 100) // Convert to cents
                  : 0n;

                return {
                  ...token,
                  price: newPrice,
                  value,
                  priceLastUpdated: new Date()
                };
              }
              return token;
            });
          }
        }

        // Trigger wallet cache update
        await walletCacheStore.updateFromCoordinator(cache);

        log.debug('[TokenStore] Prices updated from coordinator');
      } catch (error) {
        log.error('[TokenStore] Error updating prices from coordinator:', false, error);
      }
    },

    /**
     * Update balances from Portfolio Data Coordinator
     */
    async updateBalancesFromCoordinator(balanceData: Record<string, any>) {
      log.debug('[TokenStore] Updating balances from coordinator');

      try {
        // Update balances in wallet cache
        const cache = walletCacheStore.getCacheSync();
        if (!cache) return;

        // Update token balances in cache
        for (const [accountAddress, accountBalances] of Object.entries(balanceData)) {
          for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
            const accountCache = chainData[accountAddress.toLowerCase()];
            if (accountCache && accountBalances) {
              accountCache.tokens = accountCache.tokens.map(token => {
                const newBalance = (accountBalances as any)[token.address.toLowerCase()];
                if (newBalance !== undefined) {
                  const balanceBigInt = BigNumberishUtils.toBigInt(newBalance);
                  const price = token.price || 0;
                  // Calculate value in cents, ensuring we convert to integer before BigInt
                  const value = balanceBigInt > 0n && price > 0
                    ? BigInt(Math.floor((Number(balanceBigInt) / 1e18) * price * 100)) // Convert to cents, floor to integer
                    : 0n;

                  return {
                    ...token,
                    balance: balanceBigInt.toString(),
                    value,
                    balanceLastUpdated: new Date()
                  };
                }
                return token;
              });
            }
          }
        }

        // Trigger wallet cache update
        await walletCacheStore.updateFromCoordinator(cache);

        log.debug('[TokenStore] Balances updated from coordinator');
      } catch (error) {
        log.error('[TokenStore] Error updating balances from coordinator:', false, error);
      }
    },

    /**
     * Update token list from Portfolio Data Coordinator
     */
    async updateTokenListFromCoordinator(data: { tokens: any[], address?: string, chainId?: number }) {
      log.debug('[TokenStore] Updating token list from coordinator');

      try {
        const cache = walletCacheStore.getCacheSync();
        if (!cache) return;

        // Determine which account/chain to update
        const address = data.address || cache.activeAccountAddress;
        const chainId = data.chainId || cache.activeChainId;

        if (cache.chainAccountCache[chainId]?.[address]) {
          // Update the token list
          cache.chainAccountCache[chainId][address].tokens = data.tokens;
          cache.chainAccountCache[chainId][address].lastTokenRefresh = new Date();

          // Trigger wallet cache update
          await walletCacheStore.updateFromCoordinator(cache);
        }

        log.debug('[TokenStore] Token list updated from coordinator');
      } catch (error) {
        log.error('[TokenStore] Error updating token list from coordinator:', false, error);
      }
    }
  };
}

export const tokenStore = createTokenStore();

// Derived stores - these now come from wallet-cache.store
export const tokens = derived(
  [tokenStore, currentAccountTokens],
  ([$store, $tokens]) => {
    // Debug logging (only in development and when there's data)
    if (process.env.NODE_ENV === 'development' && $tokens?.length > 0) {
      log.debug('[TokenStore] Processing tokens from currentAccountTokens:', false, {
        count: $tokens.length
      });
    }

    // Map TokenCache to TokenDisplay format
    const result = $tokens.map((token, index) => {
      const mappedToken = {
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        balance: token.balance || '0', // Ensure balance is never undefined
        price: token.price || 0,
        value: token.value || 0,
        icon: token.icon,
        change24h: token.price24hChange,
        isNative: token.isNative,
        chainId: token.chainId,
        // Add required fields for TokenDisplay
        // Balance is formatted string, convert to wei for qty
        qty: (() => {
          try {
            const balance = token.balance || '0';
            if (balance && typeof balance === 'string' && balance.includes('.')) {
              // Formatted balance, convert to wei
              const decimals = token.decimals || 18;
              return BigInt(parseUnits(balance, decimals));
            }
            return BigNumberishUtils.toBigInt(balance) || 0n;
          } catch (e) {
            log.warn(`[TokenStore] Failed to convert balance to qty for ${token.symbol}:`, false, { balance: token.balance });
            return 0n;
          }
        })(),
        quantity: token.balance || '0',
        chainName: ''  // Will be filled by UI
      };

      // Log each mapped token
      if (index < 3) { // Only log first 3 to avoid spam
        console.log(`[TokenStore] Mapped token ${index}:`, {
          symbol: mappedToken.symbol,
          balance: mappedToken.balance,
          qty: mappedToken.qty?.toString(),
          value: mappedToken.value,
          quantity: mappedToken.quantity
        });
      }

      return mappedToken;
    });

    // Log only if we have results in development
    if (process.env.NODE_ENV === 'development' && result.length > 0) {
      log.debug('[TokenStore] Tokens processed:', false, {
        count: result.length,
        hasBalances: result.some(t => t.balance && t.balance !== '0')
      });
    }

    return result;
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

    console.error('[TokenStore] displayTokens', {$store, $singleTokens, $multiTokens, tokenList, result});

    // Only log if there's an unexpected state (debug logging can be re-enabled if needed)
    if (process.env.NODE_ENV === 'development' && result.length > 0) {
      // Minimal logging when tokens are present
      log.debug('[TokenStore] displayTokens:', false, {
        view: $store.isMultiChainView ? 'multi-chain' : 'single-chain',
        count: result.length
      });
    }

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

    console.error('[TokenStore] networkTotalValue', {$cache, $chain, totalValue});

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
            console.log('[TokenStore] grandTotalPortfolioValue >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', chainData, accountCache);
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

    console.error('[TokenStore] grandTotalPortfolioValue', {$cache, totalValue});
    return totalValue;
  }
);


// Add compatibility methods to existing tokenStore
tokenStore.updatePricesFromCoordinator = async (data: any) => {
  console.log('[TokenStore] Update prices from coordinator (compatibility shim)');
  // This would normally update prices, but in v2 it's handled by wallet-cache
  return Promise.resolve();
};

tokenStore.updateBalancesFromCoordinator = async (data: any) => {
  console.log('[TokenStore] Update balances from coordinator (compatibility shim)');
  // This would normally update balances, but in v2 it's handled by wallet-cache
  return Promise.resolve();
};

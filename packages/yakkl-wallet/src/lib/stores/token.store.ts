import { writable, derived } from 'svelte/store';
import type { TokenDisplay, LoadingState, ErrorState } from '../types';
import { TokenService } from '../services/token.service';
import { currentAccount } from './account.store';
import { currentChain } from './chain.store';
import { get } from 'svelte/store';
import { getYakklCombinedToken, setYakklCombinedTokenStorage, yakklTokenCacheStore } from '$lib/common/stores';
import type { TokenData } from '$lib/common/interfaces';

interface TokenState {
  tokens: TokenDisplay[];
  multiChainTokens: TokenDisplay[];
  loading: LoadingState;
  error: ErrorState;
  lastUpdate: Date | null;
  isMultiChainView: boolean;
}

function createTokenStore() {
  const tokenService = TokenService.getInstance();

  const { subscribe, set, update } = writable<TokenState>({
    tokens: [],
    multiChainTokens: [],
    loading: { isLoading: false },
    error: { hasError: false },
    lastUpdate: null,
    isMultiChainView: false
  });

  // Track previous values to prevent unnecessary refreshes
  let lastAccountAddress: string | null = null;
  let lastChainId: number | null = null;
  let isRefreshing = false;

  // Load cached data immediately on store creation
  async function loadCachedData() {
    try {
      // Import necessary stores and functions
      const { getYakklTokenCache, getYakklAddressTokenHoldings, getYakklCombinedToken } = await import('$lib/common/stores');
      const { currentChain, chainStore } = await import('./chain.store');
      const { currentAccount } = await import('./account.store');
      const { get: getStore } = await import('svelte/store');
      
      const account = getStore(currentAccount);
      const chain = getStore(currentChain);
      const chainId = chain?.chainId || 1;
      
      if (!account?.address) {
        console.log('[TokenStore] No account selected, skipping cache load');
        update(state => ({ ...state, loading: { isLoading: false } }));
        return;
      }
      
      // Load holdings and cache for current address and chain
      const [holdings, cache, combinedTokens] = await Promise.all([
        getYakklAddressTokenHoldings(),
        getYakklTokenCache(),
        getYakklCombinedToken()
      ]);
      
      console.log('[TokenStore] Loading cache for address:', account.address, 'chain:', chainId);
      console.log('[TokenStore] Holdings:', holdings.length, 'Cache entries:', cache.length);
      
      // Filter holdings for current address and chain
      const addressHoldings = holdings.filter(h => 
        h.walletAddress.toLowerCase() === account.address.toLowerCase() && 
        h.chainId === chainId
      );
      
      // Get all chains for name lookup
      const chains = getStore(chainStore).chains;
      const chainMap = new Map(chains.map(c => [c.chainId, c]));
      
      // Build display tokens from holdings and cache
      const displayTokens = addressHoldings.map(holding => {
        // Find token metadata
        const tokenMeta = combinedTokens.find(t => 
          t.address.toLowerCase() === holding.tokenAddress.toLowerCase() && 
          t.chainId === chainId
        );
        
        // Find cached data - ensure case-insensitive comparison
        const cached = cache.find(c => 
          c.walletAddress.toLowerCase() === account.address.toLowerCase() &&
          c.tokenAddress.toLowerCase() === holding.tokenAddress.toLowerCase() &&
          c.chainId === chainId
        );
        
        return {
          address: holding.tokenAddress,
          symbol: holding.symbol,
          name: tokenMeta?.name || holding.symbol,
          decimals: tokenMeta?.decimals || 18,
          chainId: chainId,
          chainName: chainMap.get(chainId)?.name || 'Unknown',
          qty: holding.quantity,
          quantity: String(holding.quantity),
          balance: String(holding.quantity),
          price: cached?.price || 0,
          value: cached?.value || 0,
          icon: tokenMeta?.logoURI,
          change24h: undefined as number | undefined
        };
      });

      // Show cached data immediately
      update(state => ({
        ...state,
        tokens: displayTokens,
        multiChainTokens: displayTokens, // Also set multi-chain view
        lastUpdate: new Date(),
        loading: { isLoading: false } // Clear loading state after cache load
      }));
      
      console.log('[TokenStore] Loaded', displayTokens.length, 'tokens from cache');
      
      // If no cached tokens, load from service
      if (displayTokens.length === 0) {
        const response = await tokenService.getTokens();
        if (response.success && response.data) {
          update(state => ({
            ...state,
            tokens: response.data!,
            multiChainTokens: response.data!,
            lastUpdate: new Date(),
            loading: { isLoading: false }
          }));
        }
      }
    } catch (error) {
      console.error('[TokenStore] Failed to load cached data:', error);
    }
  }

  // Load cached data immediately, and also check if we have an account
  loadCachedData().then(() => {
    // After loading cache, check if we need to refresh based on current account
    const account = get(currentAccount);
    if (account && account.address) {
      console.log('[TokenStore] Account found on init, starting auto-refresh');
      // Start auto-refresh which will run immediately
      startAutoRefresh();
    }
    
    // Trigger price update after loading cache to get fresh prices
    // Reduced timeout to 100ms for faster initial display
    setTimeout(async () => {
      try {
        const { updateTokenPrices } = await import('../common/tokenPriceManager');
        await updateTokenPrices();
        console.log('[TokenStore] Triggered price update after cache load');
      } catch (error) {
        console.error('[TokenStore] Failed to trigger price update:', error);
      }
    }, 100);
  });
  
  // Set up auto-refresh timer for token data (every 30-60 seconds)
  let refreshInterval: number | null = null;
  
  function startAutoRefresh() {
    // Clear any existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    // Define the refresh function
    const doRefresh = async () => {
      const account = get(currentAccount);
      if (account && account.address) {
        console.log('[TokenStore] Auto-refresh triggered');
        const state = get({ subscribe });
        
        // Only refresh if not already refreshing
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            if (state.isMultiChainView) {
              await loadMultiChainTokens(account.address);
            } else {
              await loadTokens(account.address, true);
            }
          } finally {
            isRefreshing = false;
          }
        }
      }
    };
    
    // Run immediately first
    doRefresh();
    
    // Then set up interval (30 seconds)
    refreshInterval = window.setInterval(doRefresh, 30000); // 30 seconds
  }
  
  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
  
  // Start auto-refresh when we have an account
  currentAccount.subscribe((account) => {
    if (account && account.address) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  // Auto-refresh when account changes
  currentAccount.subscribe(async (account) => {
    if (account && account.address !== lastAccountAddress) {
      lastAccountAddress = account.address;
      console.log('[TokenStore] Account changed to:', account.address);
      
      // First, load cached data for the new account immediately
      await loadCachedData();
      
      // Then fetch fresh data in the background
      // Prevent duplicate refreshes if already refreshing
      if (!isRefreshing) {
        isRefreshing = true;
        // Use setTimeout to break out of synchronous update cycle
        setTimeout(async () => {
          await loadTokens(account.address, true);
          isRefreshing = false;
        }, 100);
      }
    }
  });

  // Auto-refresh when chain changes
  currentChain.subscribe(async (chain) => {
    if (chain && chain.chainId !== lastChainId) {
      lastChainId = chain.chainId;
      const account = get(currentAccount);
      if (account) {
        console.log('[TokenStore] Chain changed to:', chain.chainId);
        
        // First, load cached data for the new chain immediately
        await loadCachedData();
        
        // Then fetch fresh data in the background
        if (!isRefreshing) {
          isRefreshing = true;
          // Use setTimeout to break out of synchronous update cycle
          setTimeout(async () => {
            await loadTokens(account.address, true);
            isRefreshing = false;
          }, 100);
        }
      }
    }
  });

  async function loadTokens(address?: string, forceRefresh = false) {
    // Don't show loading if we have cached data
    const currentState = get({ subscribe });
    const hasData = currentState.tokens.length > 0;

    // If we have data and it's not a force refresh, check if we need to refresh
    if (hasData && !forceRefresh) {
      const timeSinceLastUpdate = currentState.lastUpdate ? 
        Date.now() - currentState.lastUpdate.getTime() : Infinity;
      
      // Skip refresh if we updated less than 5 seconds ago
      if (timeSinceLastUpdate < 5000) {
        console.log('[TokenStore] Skipping refresh, data is fresh');
        return;
      }
    }

    // Keep existing data while loading new data
    if (!hasData) {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Loading tokens...' }
      }));
    } else {
      // Set a background loading state without clearing existing data
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Updating tokens...', isBackgroundUpdate: true }
      }));
    }

    const response = await tokenService.getTokens(address);

    if (response.success && response.data) {
      // Only update if we got actual data
      if (response.data.length > 0 || !hasData) {
        update(state => ({
          ...state,
          tokens: response.data!,
          loading: { isLoading: false },
          error: { hasError: false },
          lastUpdate: new Date()
        }));
        console.log('[TokenStore] Updated tokens:', response.data.length);
        
        // Save to new architecture stores
        try {
          const { setYakklAddressTokenHoldingsStorage, setYakklTokenCacheStorage } = await import('$lib/common/stores');
          const account = get(currentAccount);
          const chain = get(currentChain);
          
          if (account?.address && chain?.chainId) {
            // Update holdings - normalize addresses to lowercase
            const holdings = response.data!
              .filter(token => token.qty && token.qty > 0)
              .map(token => ({
                walletAddress: account.address.toLowerCase(),
                chainId: chain.chainId,
                tokenAddress: token.address.toLowerCase(),
                symbol: token.symbol,
                quantity: token.qty || 0,
                lastUpdated: new Date()
              }));
            
            // Update cache - normalize addresses to lowercase
            const cacheEntries = response.data!.map(token => ({
              walletAddress: account.address.toLowerCase(),
              chainId: chain.chainId,
              tokenAddress: token.address.toLowerCase(),
              symbol: token.symbol,
              quantity: token.qty || 0,
              price: token.price || 0,
              value: typeof token.value === 'number' ? token.value : parseFloat(token.value || '0'),
              lastPriceUpdate: new Date(),
              lastBalanceUpdate: new Date(),
              priceProvider: 'tokenService'
            }));
            
            // Get existing data and merge
            const { getYakklAddressTokenHoldings, getYakklTokenCache } = await import('$lib/common/stores');
            const [existingHoldings, existingCache] = await Promise.all([
              getYakklAddressTokenHoldings(),
              getYakklTokenCache()
            ]);
            
            // Remove old entries for this address/chain combination
            const filteredHoldings = existingHoldings.filter(h => 
              !(h.walletAddress.toLowerCase() === account.address.toLowerCase() && h.chainId === chain.chainId)
            );
            const filteredCache = existingCache.filter(c => 
              !(c.walletAddress.toLowerCase() === account.address.toLowerCase() && c.chainId === chain.chainId)
            );
            
            // Merge new data with existing data for other address/chain combinations
            const mergedHoldings = [...filteredHoldings, ...holdings];
            const mergedCache = [...filteredCache, ...cacheEntries];
            
            // Save updated data
            await Promise.all([
              setYakklAddressTokenHoldingsStorage(mergedHoldings),
              setYakklTokenCacheStorage(mergedCache)
            ]);
            
            console.log('[TokenStore] Saved holdings and cache for', account.address);
          
          }
        } catch (error) {
          console.error('[TokenStore] Failed to save to new stores:', error);
        }
      } else {
        // Keep existing data if new data is empty
        update(state => ({
          ...state,
          loading: { isLoading: false }
        }));
        console.log('[TokenStore] Keeping existing tokens, new data was empty');
      }
    } else {
      update(state => ({
        ...state,
        loading: { isLoading: false },
        error: response.error || { hasError: true, message: 'Failed to load tokens' }
      }));
    }
  }

  async function loadMultiChainTokens(address?: string) {
    try {
      // First load cached data for all chains
      const { getYakklAddressTokenHoldings, getYakklTokenCache, getYakklCombinedToken } = await import('$lib/common/stores');
      const { chainStore } = await import('./chain.store');
      const { get: getStore } = await import('svelte/store');
      
      const account = address || getStore(currentAccount)?.address;
      if (!account) {
        console.log('[TokenStore] No account for multi-chain load');
        return;
      }
      
      const [holdings, cache, combinedTokens] = await Promise.all([
        getYakklAddressTokenHoldings(),
        getYakklTokenCache(),
        getYakklCombinedToken()
      ]);
      
      // Get all chains for the aggregated view
      const chains = getStore(chainStore).chains;
      const chainMap = new Map(chains.map(c => [c.chainId, c]));
      
      // Filter holdings for current address across ALL chains
      const addressHoldings = holdings.filter(h => 
        h.walletAddress.toLowerCase() === account.toLowerCase()
      );
      
      console.log('[TokenStore] Multi-chain load for address:', account, 'Holdings:', addressHoldings.length);
      
      // Build display tokens from holdings and cache for all chains
      const multiChainDisplayTokens = addressHoldings.map(holding => {
        // Find token metadata
        const tokenMeta = combinedTokens.find(t => 
          t.address.toLowerCase() === holding.tokenAddress.toLowerCase() && 
          t.chainId === holding.chainId
        );
        
        // Find cached data - ensure case-insensitive comparison
        const cached = cache.find(c => 
          c.walletAddress.toLowerCase() === account.toLowerCase() &&
          c.tokenAddress.toLowerCase() === holding.tokenAddress.toLowerCase() &&
          c.chainId === holding.chainId
        );
        
        return {
          address: holding.tokenAddress,
          symbol: holding.symbol,
          name: tokenMeta?.name || holding.symbol,
          decimals: tokenMeta?.decimals || 18,
          chainId: holding.chainId,
          chainName: chainMap.get(holding.chainId)?.name || 'Unknown',
          qty: holding.quantity,
          quantity: String(holding.quantity),
          balance: String(holding.quantity),
          price: cached?.price || 0,
          value: cached?.value || 0,
          icon: tokenMeta?.logoURI,
          change24h: undefined as number | undefined
        };
      });
      
      // Update state with cached multi-chain data
      update(state => ({
        ...state,
        multiChainTokens: multiChainDisplayTokens,
        loading: { isLoading: false },
        lastUpdate: new Date()
      }));
      
      console.log('[TokenStore] Loaded', multiChainDisplayTokens.length, 'multi-chain tokens from cache');
      
      // Then try to fetch fresh data from service
      try {
        const response = await tokenService.getMultiChainTokens(address);
        
        if (response.success && response.data && response.data.length > 0) {
          // Only update if we got actual data
          update(state => ({
            ...state,
            multiChainTokens: response.data!,
            loading: { isLoading: false },
            error: { hasError: false },
            lastUpdate: new Date()
          }));
        } else {
          // Keep using cache data if service returns empty
          console.log('[TokenStore] Service returned empty data, keeping cache data');
        }
      } catch (serviceError) {
        // If service fails, we still have cache data
        console.warn('[TokenStore] Service call failed, using cache data:', serviceError);
      }
    } catch (error) {
      console.error('[TokenStore] Failed to load multi-chain tokens:', error);
      update(state => ({
        ...state,
        loading: { isLoading: false },
        error: { hasError: true, message: 'Failed to load multi-network tokens' }
      }));
    }
  }

  return {
    subscribe,

    async refresh(forceRefresh = true) {
      // Prevent duplicate refreshes
      if (isRefreshing && !forceRefresh) {
        console.log('[TokenStore] Refresh already in progress, skipping');
        return;
      }
      
      const account = get(currentAccount);
      const state = get({ subscribe });
      if (account) {
        isRefreshing = true;
        try {
          if (state.isMultiChainView) {
            await loadMultiChainTokens(account.address);
          } else {
            await loadTokens(account.address, forceRefresh);
          }
        } finally {
          isRefreshing = false;
        }
      }
    },

    async toggleMultiChainView() {
      // Get the current state BEFORE updating
      const currentState = get({ subscribe });
      const wasMultiChain = currentState.isMultiChainView;
      
      update(state => ({
        ...state,
        isMultiChainView: !state.isMultiChainView
      }));
      
      // Refresh data with new view mode
      const account = get(currentAccount);
      
      if (account) {
        if (!wasMultiChain) {
          // Was single chain, now switching TO multi-chain view
          console.log('[TokenStore] Switching to multi-chain view');
          await loadMultiChainTokens(account.address);
        } else {
          // Was multi-chain, now switching back to single chain view
          console.log('[TokenStore] Switching to single chain view');
          await loadCachedData();
          
          // Then fetch fresh data in background
          if (!isRefreshing) {
            isRefreshing = true;
            setTimeout(async () => {
              await loadTokens(account.address, true);
              isRefreshing = false;
            }, 100);
          }
        }
      }
    },

    async refreshPrices() {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Updating prices...' }
      }));

      const response = await tokenService.refreshTokenPrices();

      if (response.success) {
        // Reload tokens with new prices
        const account = get(currentAccount);
        if (account) {
          await loadTokens(account.address);
        }
      } else {
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: response.error || { hasError: true, message: 'Failed to update prices' }
        }));
      }
    },

    reset() {
      stopAutoRefresh();
      set({
        tokens: [],
        multiChainTokens: [],
        loading: { isLoading: false },
        error: { hasError: false },
        lastUpdate: null,
        isMultiChainView: false
      });
    },

    async addCustomToken(token: TokenData) {
      update(state => ({
        ...state,
        tokens: [...state.tokens, {
          ...token,
          value: 0,
          quantity: '0',
          balance: '0',
          price: 0,
          chainName: '',
          icon: token.logoURI
        }]
      }));

      // Save to storage
      try {
        const yakklTokens = await getYakklCombinedToken() || [];
        yakklTokens.push({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          chainId: token.chainId
        } as TokenData);
        await setYakklCombinedTokenStorage(yakklTokens);
      } catch (error) {
        console.error('Failed to save custom token:', error);
      }
    },

    updateTokenBalance(address: string, balance: string) {
      update(state => ({
        ...state,
        tokens: state.tokens.map(token =>
          token.address === address ? { ...token, balance, quantity: balance } : token
        )
      }));
    }
  };
}

export const tokenStore = createTokenStore();

// Derived stores
export const tokens = derived(
  tokenStore,
  $store => $store.tokens
);

export const totalPortfolioValue = derived(
  tokenStore,
  $store => {
    const tokens = $store.tokens;
    if (!Array.isArray(tokens)) return 0;
    return tokens.reduce((sum, token) => sum + (typeof token.value === 'number' ? token.value : parseFloat(token.value || '0')), 0);
  }
);

export const isLoadingTokens = derived(
  tokenStore,
  $store => $store.loading.isLoading
);

export const tokensByValue = derived(
  tokenStore,
  $store => {
    const tokens = $store.tokens;
    if (!Array.isArray(tokens)) return [];
    return [...tokens].sort((a, b) => {
      const aVal = typeof a.value === 'number' ? a.value : parseFloat(a.value || '0');
      const bVal = typeof b.value === 'number' ? b.value : parseFloat(b.value || '0');
      return bVal - aVal;
    });
  }
);

export const lastTokenUpdate = derived(
  tokenStore,
  $store => $store.lastUpdate
);

// Multi-chain support
export const isMultiChainView = derived(
  tokenStore,
  $store => $store.isMultiChainView
);

export const multiChainTokens = derived(
  tokenStore,
  $store => $store.multiChainTokens
);

export const displayTokens = derived(
  tokenStore,
  $store => {
    const tokens = $store.isMultiChainView ? $store.multiChainTokens : $store.tokens;
    // Ensure we always return an array
    return Array.isArray(tokens) ? tokens : [];
  }
);

export const multiChainPortfolioValue = derived(
  tokenStore,
  $store => {
    const tokens = $store.multiChainTokens;
    if (!Array.isArray(tokens)) return 0;
    return tokens.reduce((sum, token) => sum + (typeof token.value === 'number' ? token.value : parseFloat(token.value || '0')), 0);
  }
);

// New: Total portfolio value across ALL addresses for the current chain
export const networkTotalValue = derived(
  [tokenStore, currentChain, yakklTokenCacheStore],
  ([$tokenStore, $currentChain, $cache]) => {
    if (!$currentChain || !$cache) return 0;
    
    // Filter cache entries for current chain across ALL addresses
    const chainEntries = $cache.filter(entry => entry.chainId === $currentChain.chainId);
    
    // Sum values for all addresses on this chain
    const total = chainEntries.reduce((sum, entry) => sum + (entry.value || 0), 0);
    
    // If no cache data but we have tokens in the store, use current account's total
    if (total === 0 && $tokenStore.tokens.length > 0) {
      return $tokenStore.tokens.reduce((sum, token) => sum + (typeof token.value === 'number' ? token.value : parseFloat(token.value || '0')), 0);
    }
    
    return total;
  }
);

// New: Grand total across ALL addresses and ALL chains
export const grandTotalPortfolioValue = derived(
  yakklTokenCacheStore,
  $cache => {
    if (!$cache || !Array.isArray($cache)) return 0;
    
    // Sum all values in the cache
    return $cache.reduce((sum, entry) => sum + (entry.value || 0), 0);
  }
);

// New: Get portfolio breakdown by network for current account
export const portfolioByNetwork = derived(
  [yakklTokenCacheStore, currentAccount],
  ([$cache, $account]) => {
    if (!$cache || !$account) return new Map();
    
    const networkTotals = new Map<number, number>();
    
    // Filter cache for current account and group by chainId
    $cache
      .filter(entry => entry.walletAddress.toLowerCase() === $account.address.toLowerCase())
      .forEach(entry => {
        const current = networkTotals.get(entry.chainId) || 0;
        networkTotals.set(entry.chainId, current + (entry.value || 0));
      });
    
    return networkTotals;
  }
);

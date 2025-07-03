import { writable, derived } from 'svelte/store';
import type { TokenDisplay, LoadingState, ErrorState } from '../types';
import { TokenService } from '../services/token.service';
import { currentAccount } from './account.store';
import { currentChain } from './chain.store';
import { get } from 'svelte/store';

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

  // Auto-refresh when account changes
  currentAccount.subscribe(async (account) => {
    if (account) {
      await loadTokens(account.address);
    }
  });

  // Auto-refresh when chain changes
  currentChain.subscribe(async (chain) => {
    if (chain) {
      const account = get(currentAccount);
      if (account) {
        await loadTokens(account.address);
      }
    }
  });

  async function loadTokens(address?: string) {
    update(state => ({
      ...state,
      loading: { isLoading: true, message: 'Loading tokens...' }
    }));

    const response = await tokenService.getTokens(address);
    
    if (response.success && response.data) {
      update(state => ({
        ...state,
        tokens: response.data!,
        loading: { isLoading: false },
        error: { hasError: false },
        lastUpdate: new Date()
      }));
    } else {
      update(state => ({
        ...state,
        loading: { isLoading: false },
        error: response.error || { hasError: true, message: 'Failed to load tokens' }
      }));
    }
  }

  async function loadMultiChainTokens(address?: string) {
    update(state => ({
      ...state,
      loading: { isLoading: true, message: 'Loading multi-chain tokens...' }
    }));

    const response = await tokenService.getMultiChainTokens(address);
    
    if (response.success && response.data) {
      update(state => ({
        ...state,
        multiChainTokens: response.data!,
        loading: { isLoading: false },
        error: { hasError: false },
        lastUpdate: new Date()
      }));
    } else {
      update(state => ({
        ...state,
        loading: { isLoading: false },
        error: response.error || { hasError: true, message: 'Failed to load multi-chain tokens' }
      }));
    }
  }

  return {
    subscribe,
    
    async refresh() {
      const account = get(currentAccount);
      const state = get({ subscribe });
      if (account) {
        if (state.isMultiChainView) {
          await loadMultiChainTokens(account.address);
        } else {
          await loadTokens(account.address);
        }
      }
    },

    toggleMultiChainView() {
      update(state => ({
        ...state,
        isMultiChainView: !state.isMultiChainView
      }));
      // Refresh data with new view mode
      this.refresh();
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
      set({
        tokens: [],
        multiChainTokens: [],
        loading: { isLoading: false },
        error: { hasError: false },
        lastUpdate: null,
        isMultiChainView: false
      });
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
  $store => $store.tokens.reduce((sum, token) => sum + token.value, 0)
);

export const isLoadingTokens = derived(
  tokenStore,
  $store => $store.loading.isLoading
);

export const tokensByValue = derived(
  tokenStore,
  $store => [...$store.tokens].sort((a, b) => b.value - a.value)
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
  $store => $store.isMultiChainView ? $store.multiChainTokens : $store.tokens
);

export const multiChainPortfolioValue = derived(
  tokenStore,
  $store => $store.multiChainTokens.reduce((sum, token) => sum + token.value, 0)
);
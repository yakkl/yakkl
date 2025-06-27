import { writable, derived } from 'svelte/store';
import type { Preview2Token, LoadingState, ErrorState } from '../types';
import { TokenService } from '../services/token.service';
import { currentAccount } from './account.store';
import { get } from 'svelte/store';

interface TokenState {
  tokens: Preview2Token[];
  loading: LoadingState;
  error: ErrorState;
  lastUpdate: Date | null;
}

function createTokenStore() {
  const tokenService = TokenService.getInstance();
  
  const { subscribe, set, update } = writable<TokenState>({
    tokens: [],
    loading: { isLoading: false },
    error: { hasError: false },
    lastUpdate: null
  });

  // Auto-refresh when account changes
  currentAccount.subscribe(async (account) => {
    if (account) {
      await loadTokens(account.address);
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

  return {
    subscribe,
    
    async refresh() {
      const account = get(currentAccount);
      if (account) {
        await loadTokens(account.address);
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
      set({
        tokens: [],
        loading: { isLoading: false },
        error: { hasError: false },
        lastUpdate: null
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
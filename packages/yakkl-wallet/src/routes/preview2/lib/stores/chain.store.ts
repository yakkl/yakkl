import { writable, derived } from 'svelte/store';
import type { Preview2Chain, LoadingState, ErrorState } from '../types';
import { WalletService } from '../services/wallet.service';

interface ChainState {
  chains: Preview2Chain[];
  currentChain: Preview2Chain | null;
  showTestnets: boolean;
  loading: LoadingState;
  error: ErrorState;
}

function createChainStore() {
  const walletService = WalletService.getInstance();
  
  const { subscribe, set, update } = writable<ChainState>({
    chains: [],
    currentChain: null,
    showTestnets: false,
    loading: { isLoading: false },
    error: { hasError: false }
  });

  return {
    subscribe,
    
    async loadChains() {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Loading networks...' }
      }));

      const response = await walletService.getChains();
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          chains: response.data!,
          currentChain: response.data!.find(c => c.chainId === 1) || response.data![0],
          loading: { isLoading: false },
          error: { hasError: false }
        }));
      } else {
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: response.error || { hasError: true, message: 'Failed to load chains' }
        }));
      }
    },

    async switchChain(chainId: number) {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Switching network...' }
      }));

      const response = await walletService.switchChain(chainId);
      
      if (response.success) {
        update(state => {
          const chain = state.chains.find(c => c.chainId === chainId);
          return {
            ...state,
            currentChain: chain || null,
            loading: { isLoading: false },
            error: { hasError: false }
          };
        });
      } else {
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: response.error || { hasError: true, message: 'Failed to switch network' }
        }));
      }
    },

    setCurrentChain(chain: Preview2Chain) {
      update(state => ({
        ...state,
        currentChain: chain
      }));
    },

    toggleTestnets() {
      update(state => ({
        ...state,
        showTestnets: !state.showTestnets
      }));
    },

    reset() {
      set({
        chains: [],
        currentChain: null,
        showTestnets: false,
        loading: { isLoading: false },
        error: { hasError: false }
      });
    }
  };
}

export const chainStore = createChainStore();

// Derived stores
export const currentChain = derived(
  chainStore,
  $store => $store.currentChain
);

export const visibleChains = derived(
  chainStore,
  $store => $store.showTestnets 
    ? $store.chains 
    : $store.chains.filter(chain => !chain.isTestnet)
);

export const isLoadingChains = derived(
  chainStore,
  $store => $store.loading.isLoading
);
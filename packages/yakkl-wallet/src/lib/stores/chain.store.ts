import { writable, derived } from 'svelte/store';
import type { ChainDisplay, LoadingState, ErrorState } from '../types';
import { WalletService } from '../services/wallet.service';

interface ChainState {
  chains: ChainDisplay[];
  currentChain: ChainDisplay | null;
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
      console.log('ChainStore: Loading chains...');
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Loading networks...' }
      }));

      const response = await walletService.getChains();
      console.log('ChainStore: getChains response:', response);
      
      if (response.success && response.data) {
        // Get the current chain ID from the store
        const { yakklCurrentlySelectedStore } = await import('$lib/common/stores');
        const { get } = await import('svelte/store');
        const currentlySelected = get(yakklCurrentlySelectedStore);
        const savedChainId = currentlySelected?.shortcuts?.chainId || 1;
        console.log('ChainStore: savedChainId:', savedChainId, 'chains:', response.data);
        
        update(state => ({
          ...state,
          chains: response.data!,
          currentChain: response.data!.find(c => c.chainId === savedChainId) || response.data!.find(c => c.chainId === 1) || response.data![0],
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
      console.log('ChainStore: switchChain called with chainId:', chainId);
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Switching network...' }
      }));

      const response = await walletService.switchChain(chainId);
      console.log('ChainStore: switchChain response:', response);
      
      if (response.success) {
        update(state => {
          const chain = state.chains.find(c => c.chainId === chainId);
          console.log('ChainStore: Found chain:', chain);
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

    setCurrentChain(chain: ChainDisplay) {
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

    setShowTestnets(show: boolean) {
      update(state => ({
        ...state,
        showTestnets: show
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
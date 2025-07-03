import { writable, derived } from 'svelte/store';
import type { AccountDisplay, LoadingState, ErrorState } from '../types';
import { WalletService } from '../services/wallet.service';

interface AccountState {
  accounts: AccountDisplay[];
  currentAccount: AccountDisplay | null;
  loading: LoadingState;
  error: ErrorState;
}

function createAccountStore() {
  const walletService = WalletService.getInstance();
  
  const { subscribe, set, update } = writable<AccountState>({
    accounts: [],
    currentAccount: null,
    loading: { isLoading: false },
    error: { hasError: false }
  });

  return {
    subscribe,
    
    async loadAccounts() {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Loading accounts...' }
      }));

      const response = await walletService.getAccounts();
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          accounts: response.data!,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
        
        // Load current account if not set
        const currentResponse = await walletService.getCurrentAccount();
        if (currentResponse.success && currentResponse.data) {
          update(state => ({
            ...state,
            currentAccount: currentResponse.data!
          }));
        }
      } else {
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: response.error || { hasError: true, message: 'Failed to load accounts' }
        }));
      }
    },

    async switchAccount(address: string) {
      const response = await walletService.switchAccount(address);
      
      if (response.success) {
        update(state => {
          const account = state.accounts.find(acc => acc.address === address);
          return {
            ...state,
            currentAccount: account || null
          };
        });
      }
    },

    setCurrentAccount(account: AccountDisplay) {
      update(state => ({
        ...state,
        currentAccount: account
      }));
    },

    reset() {
      set({
        accounts: [],
        currentAccount: null,
        loading: { isLoading: false },
        error: { hasError: false }
      });
    }
  };
}

export const accountStore = createAccountStore();

// Derived stores for easy access
export const currentAccount = derived(
  accountStore,
  $store => $store.currentAccount
);

export const accounts = derived(
  accountStore,
  $store => $store.accounts
);

export const isLoadingAccounts = derived(
  accountStore,
  $store => $store.loading.isLoading
);
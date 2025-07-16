import { writable, derived, get } from 'svelte/store';
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
        // Update accounts but don't fetch balances here - let token store handle that
        update(state => ({
          ...state,
          accounts: response.data!,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
        
        // Load current account if not set
        const currentResponse = await walletService.getCurrentAccount();
        if (currentResponse.success && currentResponse.data) {
          // Fetch real balance for current account
          const balanceResponse = await walletService.getBalance(currentResponse.data.address);
          if (balanceResponse.success && balanceResponse.data) {
            // Convert from Wei to ETH
            const { ethers } = await import('ethers-v6');
            const balanceInEth = ethers.formatEther(balanceResponse.data);
            currentResponse.data.balance = balanceInEth;
          }
          
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
        // Find the account first
        const currentState = get({ subscribe });
        const account = currentState.accounts.find(acc => acc.address === address);
        
        if (account) {
          // Fetch fresh balance for the new account
          const balanceResponse = await walletService.getBalance(address);
          if (balanceResponse.success && balanceResponse.data) {
            const { ethers } = await import('ethers-v6');
            const balanceInEth = ethers.formatEther(balanceResponse.data);
            account.balance = balanceInEth;
          }
        }
        
        // Update the current account
        update(state => ({
          ...state,
          currentAccount: account || null
        }));
        
        // Persist the selection
        try {
          const { setYakklCurrentlySelectedStorage } = await import('$lib/common/stores');
          const { getYakklCurrentlySelected } = await import('$lib/common/stores');
          
          // Get current selection data
          const currentlySelected = await getYakklCurrentlySelected();
          if (currentlySelected && currentlySelected.data && typeof currentlySelected.data === 'object' && 'account' in currentlySelected.data && currentlySelected.data.account) {
            // Update the account address in the nested structure
            currentlySelected.data.account.address = address;
            await setYakklCurrentlySelectedStorage(currentlySelected);
          }
        } catch (error) {
          console.error('[AccountStore] Failed to persist account switch:', error);
        }
        
        // Notify token store to refresh immediately by importing and calling refresh
        // This ensures immediate update rather than waiting for subscription
        const { tokenStore } = await import('./token.store');
        tokenStore.refresh(true);
        
        return true;
      }
      
      return false;
    },

    setCurrentAccount(account: AccountDisplay) {
      update(state => ({
        ...state,
        currentAccount: account
      }));
    },

    async removeAccount(address: string) {
      // Don't allow removing the current account if it's the only one
      const state = get(accountStore);
      if (state.accounts.length <= 1) {
        update(s => ({
          ...s,
          error: { hasError: true, message: 'Cannot remove the last account' }
        }));
        return false;
      }

      // Don't allow removing the current account without switching first
      if (state.currentAccount?.address === address) {
        update(s => ({
          ...s,
          error: { hasError: true, message: 'Cannot remove the current account. Please switch to another account first.' }
        }));
        return false;
      }

      update(s => ({
        ...s,
        loading: { isLoading: true, message: 'Removing account...' }
      }));

      const response = await walletService.removeAccount(address);
      
      if (response.success) {
        // Remove from local state
        update(s => ({
          ...s,
          accounts: s.accounts.filter(acc => acc.address !== address),
          loading: { isLoading: false },
          error: { hasError: false }
        }));
        return true;
      } else {
        update(s => ({
          ...s,
          loading: { isLoading: false },
          error: response.error || { hasError: true, message: 'Failed to remove account' }
        }));
        return false;
      }
    },

    async updateAccountName(address: string, name: string) {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Updating account name...' }
      }));

      try {
        // Update in local state
        update(state => ({
          ...state,
          accounts: state.accounts.map(acc => 
            acc.address === address 
              ? { ...acc, username: name, ens: name }
              : acc
          ),
          currentAccount: state.currentAccount?.address === address
            ? { ...state.currentAccount, username: name, ens: name }
            : state.currentAccount,
          loading: { isLoading: false },
          error: { hasError: false }
        }));

        // TODO: Persist to storage
        // await walletService.updateAccountName(address, name);
        
        return true;
      } catch (error) {
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: { hasError: true, message: 'Failed to update account name' }
        }));
        return false;
      }
    },

    async deleteAccount(address: string) {
      // Alias for removeAccount to match component usage
      return accountStore.removeAccount(address);
    },

    async importPrivateKey(privateKey: string, name?: string, alias?: string) {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Importing account...' }
      }));

      const response = await walletService.importPrivateKey(privateKey, name, alias);
      
      if (response.success && response.data) {
        // Reload accounts to get the new one
        await accountStore.loadAccounts();
        
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
        
        return response.data;
      } else {
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: response.error || { hasError: true, message: 'Failed to import account' }
        }));
        return null;
      }
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
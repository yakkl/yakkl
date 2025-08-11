import { writable, derived, get } from 'svelte/store';
import type { AccountDisplay, LoadingState, ErrorState } from '../types';
import { WalletService } from '../services/wallet.service';
// Import directly from the specific function to avoid circular dependency
import { getYakklCurrentlySelected, setYakklCurrentlySelectedStorage } from './account-utils';
import { walletCacheStore } from './wallet-cache.store';
import { tokenStore } from './token.store';
import { log } from '$lib/common/logger-wrapper';
import { ethers } from 'ethers-v6';

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

      console.log('loadAccounts:>>>>>>>>>>>>>>>>>>>', response);

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
          log.info('[AccountStore] Fetching balance for:', false, currentResponse.data.address);
          const balanceResponse = await walletService.getBalance(currentResponse.data.address);
          log.info('[AccountStore] Balance response:', false, balanceResponse);
          if (balanceResponse.success && balanceResponse.data) {
            // Balance might already be in ETH format (decimal string) or Wei (bigint/string)
            let balanceInEth: string;

            // Check if the balance is already a decimal string (ETH format)
            if (typeof balanceResponse.data === 'string' && balanceResponse.data.includes('.')) {
              // Already in ETH format
              balanceInEth = balanceResponse.data;
            } else {
              // Convert from Wei to ETH (using static import)
              balanceInEth = ethers.formatEther(balanceResponse.data);
            }

            currentResponse.data.balance = balanceInEth;
            log.info('[AccountStore] Set balance:', false, balanceInEth, 'ETH for', currentResponse.data.address);
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

      console.log('switchAccount:>>>>>>>>>>>>>>>>>>>', response);
      
      if (response.success) {
        // Find the account first
        const currentState = get({ subscribe });
        const account = currentState.accounts.find(acc => acc.address === address);

        if (account) {
          // Fetch fresh balance for the new account
          log.info('[AccountStore] Switching account - fetching balance for:', false, address);
          const balanceResponse = await walletService.getBalance(address);
          log.info('[AccountStore] Switch account balance response:', false, balanceResponse);
          if (balanceResponse.success && balanceResponse.data) {
            // Balance might already be in ETH format (decimal string) or Wei (bigint/string)
            let balanceInEth: string;

            // Check if the balance is already a decimal string (ETH format)
            if (typeof balanceResponse.data === 'string' && balanceResponse.data.includes('.')) {
              // Already in ETH format
              balanceInEth = balanceResponse.data;
            } else {
              // Convert from Wei to ETH (using static import)
              balanceInEth = ethers.formatEther(balanceResponse.data);
            }

            account.balance = balanceInEth;
            log.info('[AccountStore] Switch account - set balance:', false, balanceInEth, 'ETH');
          } else {
            log.warn('[AccountStore] Switch account - failed to fetch balance:',false, balanceResponse.error);
          }
        }

        // Update the current account
        update(state => ({
          ...state,
          currentAccount: account || null
        }));

        // Persist the selection - walletService.switchAccount already does this
        // but let's ensure it's done correctly
        try {
          // Get current selection data
          const currentlySelected = await getYakklCurrentlySelected();
          if (currentlySelected) {
            // Update the account address in shortcuts (the correct path)
            if (currentlySelected.shortcuts) {
              currentlySelected.shortcuts.address = address;
              await setYakklCurrentlySelectedStorage(currentlySelected);
              log.info('[AccountStore] Persisted account switch to:', address);
            } else {
              log.warn('[AccountStore] No shortcuts object in currentlySelected, cannot persist account switch');
            }
          }
        } catch (error) {
          log.warn('[AccountStore] Failed to persist account switch:', false, error);
        }

        // Update wallet cache store with the new active account
        walletCacheStore.switchAccount(address);

        // Notify token store to refresh immediately by importing and calling refresh
        // This ensures immediate update rather than waiting for subscription
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

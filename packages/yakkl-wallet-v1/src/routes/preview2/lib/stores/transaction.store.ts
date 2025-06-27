import { writable, derived } from 'svelte/store';
import type { Preview2Transaction, LoadingState, ErrorState } from '../types';
import { TransactionService } from '../services/transaction.service';
import { currentAccount } from './account.store';
import { get } from 'svelte/store';

interface TransactionState {
  transactions: Preview2Transaction[];
  pendingTx: string | null;
  loading: LoadingState;
  error: ErrorState;
  gasPrice: string | null;
}

function createTransactionStore() {
  const txService = TransactionService.getInstance();
  
  const { subscribe, set, update } = writable<TransactionState>({
    transactions: [],
    pendingTx: null,
    loading: { isLoading: false },
    error: { hasError: false },
    gasPrice: null
  });

  // Auto-refresh when account changes
  currentAccount.subscribe(async (account) => {
    if (account) {
      await loadTransactions(account.address);
    }
  });

  async function loadTransactions(address: string) {
    update(state => ({
      ...state,
      loading: { isLoading: true, message: 'Loading transactions...' }
    }));

    const response = await txService.getTransactionHistory(address);
    
    if (response.success && response.data) {
      update(state => ({
        ...state,
        transactions: response.data!,
        loading: { isLoading: false },
        error: { hasError: false }
      }));
    } else {
      update(state => ({
        ...state,
        loading: { isLoading: false },
        error: response.error || { hasError: true, message: 'Failed to load transactions' }
      }));
    }
  }

  return {
    subscribe,
    
    async sendTransaction(to: string, value: string, tokenAddress?: string) {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Sending transaction...' },
        error: { hasError: false }
      }));

      const response = await txService.sendTransaction({
        to,
        value,
        tokenAddress
      });
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          pendingTx: response.data!,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
        
        // Refresh transactions after a delay
        setTimeout(() => {
          const account = get(currentAccount);
          if (account) {
            loadTransactions(account.address);
          }
        }, 3000);
        
        return response.data;
      } else {
        update(state => ({
          ...state,
          loading: { isLoading: false },
          error: response.error || { hasError: true, message: 'Transaction failed' }
        }));
        throw new Error(response.error?.message || 'Transaction failed');
      }
    },

    async estimateGas(to: string, value: string, tokenAddress?: string) {
      const response = await txService.estimateGas({
        to,
        value,
        tokenAddress
      });
      
      return response;
    },

    async updateGasPrice() {
      const response = await txService.getGasPrice();
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          gasPrice: response.data!
        }));
      }
    },

    clearError() {
      update(state => ({
        ...state,
        error: { hasError: false }
      }));
    },

    reset() {
      set({
        transactions: [],
        pendingTx: null,
        loading: { isLoading: false },
        error: { hasError: false },
        gasPrice: null
      });
    }
  };
}

export const transactionStore = createTransactionStore();

// Derived stores
export const recentTransactions = derived(
  transactionStore,
  $store => $store.transactions.slice(0, 5)
);

export const pendingTransaction = derived(
  transactionStore,
  $store => $store.pendingTx
);

export const isLoadingTx = derived(
  transactionStore,
  $store => $store.loading.isLoading
);

export const txError = derived(
  transactionStore,
  $store => $store.error
);
import { writable, derived } from 'svelte/store';
import type { TransactionDisplay, LoadingState, ErrorState } from '../types';
import { TransactionService } from '../services/transaction.service';
import { currentAccount } from './account.store';
import { currentChain } from './chain.store';
import { get } from 'svelte/store';

interface TransactionState {
  transactions: TransactionDisplay[];
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
    if (account && account.address) {
      console.log('TransactionStore: Loading transactions for account:', account.address);
      await loadTransactions(account.address);
    }
  });

  // Auto-refresh when chain changes
  currentChain.subscribe(async (chain) => {
    if (chain) {
      const account = get(currentAccount);
      if (account && account.address) {
        console.log('TransactionStore: Chain changed to', chain.name, 'chainId:', chain.chainId, ', reloading transactions');
        await loadTransactions(account.address);
      } else {
        console.log('TransactionStore: Chain changed but no account selected');
        // Clear transactions when no account
        update(state => ({
          ...state,
          transactions: [],
          loading: { isLoading: false },
          error: { hasError: false }
        }));
      }
    }
  });

  async function loadTransactions(address: string) {
    console.log('TransactionStore: Starting to load transactions for:', address);
    update(state => ({
      ...state,
      loading: { isLoading: true, message: 'Loading transactions...' }
    }));

    try {
      const response = await txService.getTransactionHistory(address);
      console.log('TransactionStore: Got response:', response);
      
      if (response.success && response.data) {
        // Use the data even if empty - don't show mock data
        update(state => ({
          ...state,
          transactions: response.data!,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
      } else {
        // Show empty state if no data
        console.log('TransactionStore: No transaction data available');
        update(state => ({
          ...state,
          transactions: [],
          loading: { isLoading: false },
          error: { hasError: false }
        }));
      }
    } catch (error) {
      console.error('TransactionStore: Error loading transactions:', error);
      // Still show empty state rather than error
      update(state => ({
        ...state,
        transactions: [],
        loading: { isLoading: false },
        error: { hasError: false }
      }));
    }
  }

  // REMOVE MOCK DATA - keeping original code as comment for reference
  /*
  async function loadTransactionsMockData(address: string) {
        const mockTransactions: TransactionDisplay[] = [
          {
            hash: '0x' + Math.random().toString(16).substr(2, 64),
            from: address,
            to: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E123',
            value: '0.15',
            timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
            status: 'confirmed',
            type: 'send',
            gas: '21000',
            gasPrice: '20000000000'
          },
          {
            hash: '0x' + Math.random().toString(16).substr(2, 64),
            from: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E456',
            to: address,
            value: '0.25',
            timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
            status: 'confirmed',
            type: 'receive',
            gas: '21000',
            gasPrice: '20000000000'
          },
          {
            hash: '0x' + Math.random().toString(16).substr(2, 64),
            from: address,
            to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI token
            value: '0',
            timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
            status: 'confirmed',
            type: 'contract',
            gas: '100000',
            gasPrice: '20000000000'
          }
        ];
        
        update(state => ({
          ...state,
          transactions: mockTransactions,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
  }
  */

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
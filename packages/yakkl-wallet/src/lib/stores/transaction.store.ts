import { writable, derived } from 'svelte/store';
import type { TransactionDisplay, LoadingState, ErrorState } from '../types';
import { TransactionService } from '../services/transaction.service';
import { TransactionMonitorService } from '../services/transactionMonitor.service';
import { TransactionCacheManager } from '../managers/TransactionCacheManager';
import { currentAccount } from './account.store';
import { currentChain } from './chain.store';
import { get } from 'svelte/store';
import { browser } from '$app/environment';
// Removed: import browserApi from 'webextension-polyfill';
// Added: Use helper to avoid module resolution error
import { addTransactionUpdateListener, isExtensionContext, getSessionStorage } from './transaction-store-helper';

interface TransactionState {
  transactions: TransactionDisplay[];
  pendingTx: string | null;
  loading: LoadingState;
  error: ErrorState;
  gasPrice: string | null;
  sortOrder: 'newest' | 'oldest';
  isMonitoring: boolean;
}

function createTransactionStore() {
  const txService = TransactionService.getInstance();
  const txMonitor = TransactionMonitorService.getInstance();
  const cacheManager = TransactionCacheManager.getInstance();
  
  const { subscribe, set, update } = writable<TransactionState>({
    transactions: [],
    pendingTx: null,
    loading: { isLoading: false },
    error: { hasError: false },
    gasPrice: null,
    sortOrder: 'newest',
    isMonitoring: false
  });

  let currentAccountAddress: string | null = null;
  let currentChainId: number | null = null;

  // Listen for transaction updates broadcasted from background
  // Added: Use helper function to avoid direct browserApi import
  if (browser && typeof window !== 'undefined') {
    const cleanup = addTransactionUpdateListener((message: any, sender: any) => {
      if (message.type === 'yakkl_transactionUpdate') {
        const { address, chainId, transactions } = message.payload || {};
        
        // Only update if it's for the current account and chain
        const account = get(currentAccount);
        const chain = get(currentChain);
        
        if (account?.address === address && chain?.chainId === chainId) {
          console.log('TransactionStore: Received broadcast update with', transactions.length, 'transactions');
          
          update(state => ({
            ...state,
            transactions: transactions,
            loading: { isLoading: false },
            error: { hasError: false }
          }));
        }
      }
    });
    // Note: cleanup function is available if needed for listener removal
  }

  // Auto-refresh when account changes
  currentAccount.subscribe(async (account) => {
    if (account && account.address && account.address !== currentAccountAddress) {
      currentAccountAddress = account.address;
      console.log('TransactionStore: Account changed, loading transactions for:', account.address);
      
      // First try to load from cache for immediate display
      const chain = get(currentChain);
      if (chain?.chainId) {
        const currentState = get({ subscribe });
        const cachedTransactions = await cacheManager.getCachedTransactions(
          account.address,
          chain.chainId,
          currentState.sortOrder
        );
        
        if (cachedTransactions) {
          console.log('TransactionStore: Using cached transactions:', cachedTransactions.length);
          update(state => ({
            ...state,
            transactions: cachedTransactions,
            loading: { isLoading: false },
            error: { hasError: false }
          }));
        }
      }
      
      // Then fetch fresh data
      await loadTransactions(account.address);
    }
  });

  // Auto-refresh when chain changes
  currentChain.subscribe(async (chain) => {
    if (chain && chain.chainId !== currentChainId) {
      currentChainId = chain.chainId;
      const account = get(currentAccount);
      if (account && account.address) {
        console.log('TransactionStore: Chain changed to', chain.name, 'chainId:', chain.chainId, ', reloading transactions');
        
        // First try to load from cache for immediate display
        const currentState = get({ subscribe });
        const cachedTransactions = await cacheManager.getCachedTransactions(
          account.address,
          chain.chainId,
          currentState.sortOrder
        );
        
        if (cachedTransactions) {
          console.log('TransactionStore: Using cached transactions:', cachedTransactions.length);
          update(state => ({
            ...state,
            transactions: cachedTransactions,
            loading: { isLoading: false },
            error: { hasError: false }
          }));
        }
        
        // Then fetch fresh data
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
      const chain = get(currentChain);
      if (!chain?.chainId) {
        throw new Error('No chain selected');
      }

      const response = await txService.getTransactionHistory(address);
      console.log('TransactionStore: Got response:', response);
      
      if (response.success && response.data) {
        console.log('TransactionStore: Received transactions:', response.data.length, 'items');
        
        // Update cache with new transactions
        await cacheManager.updateCache(address, chain.chainId, response.data);
        
        // Sort according to current sort order
        const sortedTransactions = [...response.data];
        const currentState = get({ subscribe });
        const sortOrder = currentState.sortOrder;
        if (sortOrder === 'oldest') {
          sortedTransactions.sort((a, b) => a.timestamp - b.timestamp);
        } else {
          sortedTransactions.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        update(state => {
          console.log('TransactionStore: Updating state with transactions');
          const newState = {
            ...state,
            transactions: sortedTransactions,
            loading: { isLoading: false },
            error: { hasError: false }
          };
          console.log('TransactionStore: New state transactions:', newState.transactions.length);
          return newState;
        });
      } else {
        // Show empty state if no data
        console.log('TransactionStore: No transaction data available or failed');
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

    // Method to manually refresh transactions from session storage
    async refreshFromStorage() {
      const account = get(currentAccount);
      const chain = get(currentChain);
      
      if (account?.address && chain?.chainId) {
        try {
          const storageKey = `transactions_${account.address}_${chain.chainId}`;
          // Added: Use helper to get session storage
          const cachedData = await getSessionStorage(storageKey) as { transactions: TransactionDisplay[], timestamp: number } | undefined;
          if (cachedData && cachedData.transactions) {
            console.log('TransactionStore: Loaded from session storage:', cachedData.transactions.length, 'transactions');
            
            update(state => ({
              ...state,
              transactions: cachedData.transactions,
              loading: { isLoading: false },
              error: { hasError: false }
            }));
          }
        } catch (error) {
          console.error('TransactionStore: Failed to load from session storage:', error);
        }
      }
    },
    
    // Method to refresh transactions from the blockchain
    async refresh(force = false) {
      const account = get(currentAccount);
      if (account?.address) {
        console.log('TransactionStore: Refreshing transactions', { force });
        await loadTransactions(account.address);
      }
    },

    reset() {
      set({
        transactions: [],
        pendingTx: null,
        loading: { isLoading: false },
        error: { hasError: false },
        gasPrice: null,
        sortOrder: 'newest',
        isMonitoring: false
      });
    },

    // Toggle sort order between newest and oldest
    toggleSortOrder() {
      update(state => {
        const newSortOrder = state.sortOrder === 'newest' ? 'oldest' : 'newest';
        const sortedTransactions = [...state.transactions];
        
        if (newSortOrder === 'oldest') {
          sortedTransactions.sort((a, b) => a.timestamp - b.timestamp);
        } else {
          sortedTransactions.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        return {
          ...state,
          sortOrder: newSortOrder,
          transactions: sortedTransactions
        };
      });
    },

    // Start transaction monitoring
    async startMonitoring(pollingInterval?: number) {
      await txMonitor.start(pollingInterval);
      update(state => ({ ...state, isMonitoring: true }));
    },

    // Stop transaction monitoring
    stopMonitoring() {
      txMonitor.stop();
      update(state => ({ ...state, isMonitoring: false }));
    },

    // Configure monitoring settings
    configureMonitoring(config: { pollingInterval?: number; notificationEnabled?: boolean }) {
      txMonitor.configure(config);
    },

    // Get monitoring status
    getMonitoringStatus() {
      return txMonitor.getStatus();
    },

    // Clear cache for current account and chain
    async clearCache() {
      const account = get(currentAccount);
      const chain = get(currentChain);
      
      if (account?.address && chain?.chainId) {
        await cacheManager.clearCache(account.address, chain.chainId);
        await loadTransactions(account.address);
      }
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

export const txSortOrder = derived(
  transactionStore,
  $store => $store.sortOrder
);

export const isMonitoringTx = derived(
  transactionStore,
  $store => $store.isMonitoring
);
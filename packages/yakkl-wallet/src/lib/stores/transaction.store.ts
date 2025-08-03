import { writable, derived } from 'svelte/store';
import type { TransactionDisplay, LoadingState, ErrorState } from '../types';
import { TransactionService } from '../services/transaction.service';
import { TransactionMonitorService } from '../services/transactionMonitor.service';
import { TransactionCacheManager } from '../managers/TransactionCacheManager';
import { currentAccount } from './account.store';
import { currentChain } from './chain.store';
import { get } from 'svelte/store';

import { log } from '$lib/common/logger-wrapper';

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

  // Transaction store uses TransactionService for all communication with background
  // No need for custom broadcast listeners - the service handles all messaging

  log.info('TransactionStore: Store created, setting up subscriptions');

  // Auto-refresh when account changes
  currentAccount.subscribe(async (account) => {
    log.debug('TransactionStore: Account subscription triggered:', false, {
      hasAccount: !!account,
      accountAddress: account?.address,
      currentAccountAddress,
      willLoad: account && account.address && account.address !== currentAccountAddress
    });

    if (account && account.address && account.address !== currentAccountAddress) {
      currentAccountAddress = account.address;
      log.info('TransactionStore: Account changed, loading transactions for:', false, account.address);

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
          log.info('TransactionStore: Using cached transactions:', false, cachedTransactions.length);
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
    log.debug('TransactionStore: Chain subscription triggered:', false, {
      hasChain: !!chain,
      chainId: chain?.chainId,
      currentChainId,
      willLoad: chain && chain.chainId !== currentChainId
    });

    if (chain && chain.chainId !== currentChainId) {
      currentChainId = chain.chainId;
      const account = get(currentAccount);
      if (account && account.address) {
        log.info('TransactionStore: Chain changed to', false, chain.name, 'chainId:', chain.chainId, ', reloading transactions');

        // First try to load from cache for immediate display
        const currentState = get({ subscribe });
        const cachedTransactions = await cacheManager.getCachedTransactions(
          account.address,
          chain.chainId,
          currentState.sortOrder
        );

        if (cachedTransactions) {
          log.info('TransactionStore: Using cached transactions:', false, cachedTransactions.length);
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
        log.info('TransactionStore: Chain changed but no account selected');
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
    log.info('TransactionStore: Starting to load transactions for:', false, address);

    try {
      const chain = get(currentChain);
      if (!chain?.chainId) {
        throw new Error('No chain selected');
      }

      log.info('TransactionStore: Chain info:', false, {
        chainId: chain.chainId,
        chainName: chain.name,
        isTestnet: chain.isTestnet
      });

      // First, try to load from cache for immediate display
      const currentState = get({ subscribe });
      const cachedTransactions = await cacheManager.getCachedTransactions(
        address,
        chain.chainId,
        currentState.sortOrder
      );

      if (cachedTransactions && cachedTransactions.length > 0) {
        log.info('TransactionStore: Loading from cache:', false, cachedTransactions.length, 'transactions');

        // Show cached data immediately
        update(state => ({
          ...state,
          transactions: cachedTransactions,
          loading: { isLoading: false },
          error: { hasError: false }
        }));
      } else {
        // No cache, show loading state
        update(state => ({
          ...state,
          loading: { isLoading: true, message: 'Loading transactions...' }
        }));
      }

      // Now fetch fresh data from service
      let response;
      try {
        response = await txService.getTransactionHistory(address);
        log.info('TransactionStore: Got response:', false, {
          success: response.success,
          hasData: !!response.data,
          dataLength: response.data?.length || 0,
          firstItem: response.data?.[0] ? {
            hash: response.data[0].hash,
            type: response.data[0].type,
            value: response.data[0].value,
            timestamp: response.data[0].timestamp
          } : null
        });
      } catch (error) {
        log.warn('TransactionStore: Service call failed, using cache only:', false, error);
        response = { success: false, data: [] };
      }

      if (response.success && response.data && response.data.length > 0) {
        log.info('TransactionStore: Received fresh transactions:', false, response.data.length, 'items');
        log.debug('TransactionStore: First transaction sample:', false, {
          hash: response.data[0]?.hash,
          type: response.data[0]?.type,
          value: response.data[0]?.value,
          timestamp: response.data[0]?.timestamp,
          status: response.data[0]?.status
        });

        // Update cache with new transactions
        try {
          await cacheManager.updateCache(address, chain.chainId, response.data);
        } catch (error) {
          log.warn('TransactionStore: Failed to update cache:', false, error);
        }

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
          log.debug('TransactionStore: Updating state with fresh transactions');
          const newState = {
            ...state,
            transactions: sortedTransactions,
            loading: { isLoading: false },
            error: { hasError: false }
          };
          log.debug('TransactionStore: New state transactions:', false, newState.transactions.length);
          log.debug('TransactionStore: New state first transaction:', false, {
            hash: newState.transactions[0]?.hash,
            type: newState.transactions[0]?.type,
            value: newState.transactions[0]?.value
          });
          return newState;
        });
      } else {
        // If no fresh data, keep cached data if available, otherwise show empty
        log.info('TransactionStore: No fresh transaction data available');
        if (!cachedTransactions || cachedTransactions.length === 0) {
          update(state => ({
            ...state,
            transactions: [],
            loading: { isLoading: false },
            error: { hasError: false }
          }));
        } else {
          // Keep cached data
          log.info('TransactionStore: Keeping cached data:', false, cachedTransactions.length, 'transactions');
          update(state => ({
            ...state,
            loading: { isLoading: false },
            error: { hasError: false }
          }));
        }
      }
    } catch (error) {
      log.warn('TransactionStore: Error loading transactions:', false, error);
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

      // Session storage loading removed - using cache manager instead
    },

    // Method to refresh transactions from the blockchain
    async refresh(force = false) {
      const account = get(currentAccount);
      const chain = get(currentChain);

      log.info('TransactionStore: Refreshing transactions', false, {
        force,
        hasAccount: !!account,
        accountAddress: account?.address,
        hasChain: !!chain,
        chainId: chain?.chainId,
        chainName: chain?.name
      });

      if (account?.address) {
        await loadTransactions(account.address);
      } else {
        log.warn('TransactionStore: Cannot refresh - no account available');
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
    },

    // Load transactions for multiple accounts (for single network and all networks views)
    async loadTransactionsForAccounts(
      accounts: { address: string }[],
      chainIds?: number[]
    ): Promise<TransactionDisplay[]> {
      const allTransactions: TransactionDisplay[] = [];
      const chain = get(currentChain);

      // If no chainIds specified, use current chain
      const targetChainIds = chainIds || (chain ? [chain.chainId] : []);

      // Load from cache first for immediate display
      for (const account of accounts) {
        for (const chainId of targetChainIds) {
          const cachedTxs = await cacheManager.getCachedTransactions(
            account.address,
            chainId,
            'newest'
          );

          if (cachedTxs) {
            allTransactions.push(...cachedTxs);
          }
        }
      }

      // Remove duplicates (in case same tx appears for multiple accounts)
      const uniqueTransactions = Array.from(
        new Map(allTransactions.map(tx => [tx.hash, tx])).values()
      );

      // Sort by timestamp
      uniqueTransactions.sort((a, b) => b.timestamp - a.timestamp);

      log.info('TransactionStore: Loaded transactions for multiple accounts:', false, {
        accountCount: accounts.length,
        chainCount: targetChainIds.length,
        transactionCount: uniqueTransactions.length
      });

      return uniqueTransactions;
    },

    // Get all cached transactions across all accounts and chains
    async getAllCachedTransactions(): Promise<TransactionDisplay[]> {
      // This would need access to all accounts and chains
      // For now, return empty array - this would be implemented based on
      // how the wallet stores all account information
      log.debug('TransactionStore: getAllCachedTransactions not fully implemented yet');
      return [];
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

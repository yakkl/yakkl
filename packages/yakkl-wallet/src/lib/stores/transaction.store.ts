import { writable, derived } from 'svelte/store';
import type { TransactionDisplay, LoadingState, ErrorState } from '../types';
import { TransactionService } from '../services/transaction.service';
import { TransactionMonitorService } from '../services/transactionMonitor.service';
import { TransactionCacheManager } from '../managers/TransactionCacheManager';
import { currentAccount } from './account.store';
import { currentChain } from './chain.store';
import { get } from 'svelte/store';
import { walletCacheStore } from './wallet-cache.store';

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
  // Lazy initialization to avoid circular dependencies
  let txService: TransactionService | null = null;
  let txMonitor: TransactionMonitorService | null = null;
  let cacheManager: TransactionCacheManager | null = null;
  
  // Helper function to ensure services are initialized
  const ensureServicesInitialized = () => {
    if (!txService) {
      txService = TransactionService.getInstance();
    }
    if (!txMonitor) {
      txMonitor = TransactionMonitorService.getInstance();
    }
    if (!cacheManager) {
      cacheManager = TransactionCacheManager.getInstance();
    }
  };

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

  // Subscribe to wallet cache changes for reactive updates
  walletCacheStore.subscribe(async (cache) => {
    const account = get(currentAccount);
    const chain = get(currentChain);
    
    if (!account?.address || !chain?.chainId) {
      return;
    }
    
    // Get transactions from the updated cache
    const accountCache = cache?.chainAccountCache?.[chain.chainId]?.[account.address.toLowerCase()];
    const walletCacheTransactions = accountCache?.transactions?.transactions || [];
    
    // Only update if we have transactions or if they've been cleared
    const currentState = get({ subscribe });
    if (walletCacheTransactions.length > 0 || 
        (currentState.transactions.length > 0 && walletCacheTransactions.length === 0)) {
      log.debug('TransactionStore: Wallet cache updated, refreshing transactions', false, {
        newCount: walletCacheTransactions.length,
        oldCount: currentState.transactions.length
      });
      
      // Convert to TransactionDisplay format
      const displayTransactions: TransactionDisplay[] = walletCacheTransactions.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: tx.timestamp,
        status: tx.status || 'success',
        chainId: chain.chainId,
        nonce: tx.nonce,
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        blockNumber: tx.blockNumber,
        confirmations: tx.confirmations,
        type: tx.from.toLowerCase() === account.address.toLowerCase() ? 'send' : 'receive'
      }));
      
      // Sort according to current sort order
      const sortOrder = currentState.sortOrder;
      if (sortOrder === 'oldest') {
        displayTransactions.sort((a, b) => a.timestamp - b.timestamp);
      } else {
        displayTransactions.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      // Update the store
      update(state => ({
        ...state,
        transactions: displayTransactions,
        loading: { isLoading: false },
        error: { hasError: false }
      }));
    }
  });

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
      
      // Load transactions from wallet cache
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
      
      if (account?.address) {
        log.info('TransactionStore: Chain changed to', false, chain.name, 'chainId:', chain.chainId, ', reloading transactions');
        // Load transactions from wallet cache
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
    log.info('TransactionStore: Loading transactions from wallet cache for:', false, address);

    try {
      const chain = get(currentChain);
      if (!chain?.chainId) {
        log.warn('TransactionStore: No chain selected');
        update(state => ({
          ...state,
          transactions: [],
          loading: { isLoading: false },
          error: { hasError: false }
        }));
        return;
      }

      log.debug('TransactionStore: Chain info:', false, {
        chainId: chain.chainId,
        chainName: chain.name,
        isTestnet: chain.isTestnet
      });

      // Load from the unified wallet cache
      // The wallet cache is synced with storage changes automatically
      const cache = await walletCacheStore.getCache();
      
      // Check if we have transactions in the wallet cache
      const accountCache = cache?.chainAccountCache?.[chain.chainId]?.[address.toLowerCase()];
      const walletCacheTransactions = accountCache?.transactions?.transactions || [];
      
      log.info('TransactionStore: Found transactions in wallet cache:', false, walletCacheTransactions.length);
      
      // Convert to TransactionDisplay format
      const displayTransactions: TransactionDisplay[] = walletCacheTransactions.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timestamp: tx.timestamp,
        status: tx.status || 'success',
        chainId: chain.chainId,
        nonce: tx.nonce,
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        blockNumber: tx.blockNumber,
        confirmations: tx.confirmations,
        type: tx.from.toLowerCase() === address.toLowerCase() ? 'send' : 'receive'
      }));
      
      // Sort according to current sort order
      const currentState = get({ subscribe });
      const sortOrder = currentState.sortOrder;
      if (sortOrder === 'oldest') {
        displayTransactions.sort((a, b) => a.timestamp - b.timestamp);
      } else {
        displayTransactions.sort((a, b) => b.timestamp - a.timestamp);
      }
      
      // Update the store with wallet cache data
      update(state => ({
        ...state,
        transactions: displayTransactions,
        loading: { isLoading: false },
        error: { hasError: false }
      }));
      
      // No need to fetch from external sources - background handles that
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


  return {
    subscribe,

    async sendTransaction(to: string, value: string, tokenAddress?: string) {
      update(state => ({
        ...state,
        loading: { isLoading: true, message: 'Sending transaction...' },
        error: { hasError: false }
      }));

      ensureServicesInitialized();
      const response = await txService!.sendTransaction({
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
      ensureServicesInitialized();
      const response = await txService!.estimateGas({
        to,
        value,
        tokenAddress
      });

      return response;
    },

    async updateGasPrice() {
      ensureServicesInitialized();
      const response = await txService!.getGasPrice();

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
      ensureServicesInitialized();
      await txMonitor!.start(pollingInterval);
      update(state => ({ ...state, isMonitoring: true }));
    },

    // Stop transaction monitoring
    stopMonitoring() {
      ensureServicesInitialized();
      txMonitor!.stop();
      update(state => ({ ...state, isMonitoring: false }));
    },

    // Configure monitoring settings
    configureMonitoring(config: { pollingInterval?: number; notificationEnabled?: boolean }) {
      ensureServicesInitialized();
      txMonitor!.configure(config);
    },

    // Get monitoring status
    getMonitoringStatus() {
      ensureServicesInitialized();
      return txMonitor!.getStatus();
    },

    // Clear cache for current account and chain
    async clearCache() {
      const account = get(currentAccount);
      const chain = get(currentChain);

      if (account?.address && chain?.chainId) {
        ensureServicesInitialized();
        await cacheManager!.clearCache(account.address, chain.chainId);
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
          ensureServicesInitialized();
          const cachedTxs = await cacheManager!.getCachedTransactions(
            account.address,
            chainId
          );

          if (cachedTxs) {
            // Map TransactionData to TransactionDisplay
            const displayTxs = cachedTxs.map(tx => ({
              ...tx,
              type: tx.type || 'transfer' // Ensure type field exists
            } as TransactionDisplay));
            allTransactions.push(...displayTxs);
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

// Lazy initialization of the store to avoid circular dependencies
let _transactionStore: ReturnType<typeof createTransactionStore> | null = null;

function getTransactionStore() {
  if (!_transactionStore) {
    _transactionStore = createTransactionStore();
  }
  return _transactionStore;
}

// Create a proxy that lazily initializes the store
export const transactionStore = new Proxy({} as ReturnType<typeof createTransactionStore>, {
  get(_target, prop) {
    const store = getTransactionStore();
    return (store as any)[prop];
  }
});

// Lazy derived stores
let _recentTransactions: any = null;
export const recentTransactions = {
  subscribe: (fn: any) => {
    if (!_recentTransactions) {
      _recentTransactions = derived(
        transactionStore,
        ($store: TransactionState) => $store.transactions.slice(0, 5)
      );
    }
    return _recentTransactions.subscribe(fn);
  }
};

let _pendingTransaction: any = null;
export const pendingTransaction = {
  subscribe: (fn: any) => {
    if (!_pendingTransaction) {
      _pendingTransaction = derived(
        transactionStore,
        ($store: TransactionState) => $store.pendingTx
      );
    }
    return _pendingTransaction.subscribe(fn);
  }
};

let _isLoadingTx: any = null;
export const isLoadingTx = {
  subscribe: (fn: any) => {
    if (!_isLoadingTx) {
      _isLoadingTx = derived(
        transactionStore,
        ($store: TransactionState) => $store.loading.isLoading
      );
    }
    return _isLoadingTx.subscribe(fn);
  }
};

let _txError: any = null;
export const txError = {
  subscribe: (fn: any) => {
    if (!_txError) {
      _txError = derived(
        transactionStore,
        ($store: TransactionState) => $store.error
      );
    }
    return _txError.subscribe(fn);
  }
};

let _txSortOrder: any = null;
export const txSortOrder = {
  subscribe: (fn: any) => {
    if (!_txSortOrder) {
      _txSortOrder = derived(
        transactionStore,
        ($store: TransactionState) => $store.sortOrder
      );
    }
    return _txSortOrder.subscribe(fn);
  }
};

let _isMonitoringTx: any = null;
export const isMonitoringTx = {
  subscribe: (fn: any) => {
    if (!_isMonitoringTx) {
      _isMonitoringTx = derived(
        transactionStore,
        ($store: TransactionState) => $store.isMonitoring
      );
    }
    return _isMonitoringTx.subscribe(fn);
  }
};

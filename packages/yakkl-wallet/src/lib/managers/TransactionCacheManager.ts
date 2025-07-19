import { log } from '$lib/managers/Logger';
import type { TransactionDisplay } from '$lib/types';
import { StorageService } from '$lib/common/shared/StorageService';
import { browser_ext } from '$lib/common/environment';

interface TransactionCache {
  transactions: TransactionDisplay[];
  lastUpdated: number;
  chainId: number;
  address: string;
}

interface TransactionCacheConfig {
  maxAge: number; // Maximum age in milliseconds before cache is considered stale
  maxTransactions: number; // Maximum number of transactions to store per address/chain
  retentionDays: number; // Number of days to keep transactions
}

export class TransactionCacheManager {
  private static instance: TransactionCacheManager;
  private storageService: StorageService;
  private memoryCache: Map<string, TransactionCache> = new Map();

  private readonly config: TransactionCacheConfig = {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxTransactions: 1000, // Store up to 1000 transactions per address/chain
    retentionDays: 90 // Keep transactions for 90 days
  };

  private readonly STORAGE_PREFIX = 'yakkl_tx_cache_';
  private readonly INDEX_KEY = 'yakkl_tx_cache_index';

  private constructor() {
    this.storageService = new StorageService();
    this.initializeCleanupTask();
  }

  static getInstance(): TransactionCacheManager {
    if (!TransactionCacheManager.instance) {
      TransactionCacheManager.instance = new TransactionCacheManager();
    }
    return TransactionCacheManager.instance;
  }

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    await this.storageService.initialize();
    await this.loadCacheIndex();
  }

  /**
   * Get the cache key for a specific address and chain
   */
  private getCacheKey(address: string, chainId: number): string {
    return `${address.toLowerCase()}_${chainId}`;
  }

  /**
   * Get the storage key for a cache entry
   */
  private getStorageKey(cacheKey: string): string {
    return `${this.STORAGE_PREFIX}${cacheKey}`;
  }

  /**
   * Load the cache index from storage
   */
  private async loadCacheIndex(): Promise<string[]> {
    const index = await this.storageService.getData<string[]>(this.INDEX_KEY, []);
    return index;
  }

  /**
   * Save the cache index to storage
   */
  private async saveCacheIndex(index: string[]): Promise<void> {
    await this.storageService.saveData(this.INDEX_KEY, index);
  }

  /**
   * Get cached transactions for an address and chain
   */
  async getCachedTransactions(
    address: string,
    chainId: number,
    sortOrder: 'newest' | 'oldest' = 'newest'
  ): Promise<TransactionDisplay[] | null> {
    const cacheKey = this.getCacheKey(address, chainId);

    // Check memory cache first
    const memoryCache = this.memoryCache.get(cacheKey);
    if (memoryCache && Date.now() - memoryCache.lastUpdated < this.config.maxAge) {
      log.debug('TransactionCacheManager: Returning from memory cache', false);
      return this.sortTransactions(memoryCache.transactions, sortOrder);
    }

    // Check persistent storage
    const storageKey = this.getStorageKey(cacheKey);
    const storedCache = await this.storageService.getData<TransactionCache | null>(storageKey, null);

    if (storedCache && Date.now() - storedCache.lastUpdated < this.config.maxAge) {
      // Update memory cache
      this.memoryCache.set(cacheKey, storedCache);
      log.debug('TransactionCacheManager: Returning from storage cache', false);
      return this.sortTransactions(storedCache.transactions, sortOrder);
    }

    log.debug('TransactionCacheManager: No valid cache found', false);
    return null;
  }

  /**
   * Add or update transactions in the cache
   */
  async updateCache(
    address: string,
    chainId: number,
    transactions: TransactionDisplay[]
  ): Promise<void> {
    const cacheKey = this.getCacheKey(address, chainId);
    const storageKey = this.getStorageKey(cacheKey);

    // Get existing cache
    const existingCache = await this.storageService.getData<TransactionCache | null>(storageKey, null);

    // Merge transactions (newer ones take precedence)
    const mergedTransactions = this.mergeTransactions(
      existingCache?.transactions || [],
      transactions
    );

    // Limit the number of transactions
    const limitedTransactions = mergedTransactions.slice(0, this.config.maxTransactions);

    const cache: TransactionCache = {
      transactions: limitedTransactions,
      lastUpdated: Date.now(),
      chainId,
      address: address.toLowerCase()
    };

    // Update both memory and storage
    this.memoryCache.set(cacheKey, cache);
    await this.storageService.saveData(storageKey, cache);

    // Update index
    await this.updateCacheIndex(cacheKey);

    log.debug('TransactionCacheManager: Cache updated', false, {
      address,
      chainId,
      transactionCount: limitedTransactions.length
    });
  }

  /**
   * Add a single new transaction to the cache
   */
  async addTransaction(
    address: string,
    chainId: number,
    transaction: TransactionDisplay
  ): Promise<void> {
    const cacheKey = this.getCacheKey(address, chainId);
    const storageKey = this.getStorageKey(cacheKey);

    // Get existing cache
    const existingCache = await this.storageService.getData<TransactionCache | null>(storageKey, null);
    const transactions = existingCache?.transactions || [];

    // Check if transaction already exists
    const existingIndex = transactions.findIndex(tx => tx.hash === transaction.hash);

    if (existingIndex !== -1) {
      // Update existing transaction
      transactions[existingIndex] = transaction;
    } else {
      // Add new transaction at the beginning (newest first)
      transactions.unshift(transaction);
    }

    // Limit the number of transactions
    const limitedTransactions = transactions.slice(0, this.config.maxTransactions);

    const cache: TransactionCache = {
      transactions: limitedTransactions,
      lastUpdated: Date.now(),
      chainId,
      address: address.toLowerCase()
    };

    // Update both memory and storage
    this.memoryCache.set(cacheKey, cache);
    await this.storageService.saveData(storageKey, cache);

    log.debug('TransactionCacheManager: Transaction added', false, {
      hash: transaction.hash,
      address,
      chainId
    });
  }

  /**
   * Clear old transactions from the cache
   */
  async clearOldTransactions(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    const index = await this.loadCacheIndex();
    let cleanedCount = 0;

    for (const cacheKey of index) {
      const storageKey = this.getStorageKey(cacheKey);
      const cache = await this.storageService.getData<TransactionCache | null>(storageKey, null);

      if (cache) {
        // Filter out old transactions
        const filteredTransactions = cache.transactions.filter(
          tx => tx.timestamp > cutoffTime / 1000 // Convert to seconds
        );

        if (filteredTransactions.length < cache.transactions.length) {
          cache.transactions = filteredTransactions;
          cache.lastUpdated = Date.now();

          await this.storageService.saveData(storageKey, cache);
          this.memoryCache.set(cacheKey, cache);

          cleanedCount += cache.transactions.length - filteredTransactions.length;
        }
      }
    }

    log.info('TransactionCacheManager: Cleared old transactions', false, {
      transactionsRemoved: cleanedCount,
      retentionDays: this.config.retentionDays
    });
  }

  /**
   * Clear cache for a specific address and chain
   */
  async clearCache(address: string, chainId: number): Promise<void> {
    const cacheKey = this.getCacheKey(address, chainId);
    const storageKey = this.getStorageKey(cacheKey);

    // Clear from memory
    this.memoryCache.delete(cacheKey);

    // Clear from storage
    if (browser_ext) {
      try {
        await browser_ext.storage.local.remove(storageKey);
      } catch (error) {
        log.error('Failed to clear cache from storage', false, error);
      }
    }

    // Update index
    const index = await this.loadCacheIndex();
    const newIndex = index.filter(key => key !== cacheKey);
    await this.saveCacheIndex(newIndex);

    log.debug('TransactionCacheManager: Cache cleared', false, { address, chainId });
  }

  /**
   * Clear all transaction caches
   */
  async clearAllCaches(): Promise<void> {
    const index = await this.loadCacheIndex();

    // Clear all cache entries
    if (browser_ext) {
      try {
        const keysToRemove = index.map(key => this.getStorageKey(key));
        await browser_ext.storage.local.remove(keysToRemove);
      } catch (error) {
        log.error('Failed to clear all caches from storage', false, error);
      }
    }

    // Clear memory cache
    this.memoryCache.clear();

    // Clear index
    await this.saveCacheIndex([]);

    log.info('TransactionCacheManager: All caches cleared', false);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalCaches: number;
    totalTransactions: number;
    oldestTransaction: number | null;
    memorySize: number;
  }> {
    const index = await this.loadCacheIndex();
    let totalTransactions = 0;
    let oldestTransaction: number | null = null;

    for (const cacheKey of index) {
      const cache = this.memoryCache.get(cacheKey);
      if (cache) {
        totalTransactions += cache.transactions.length;

        for (const tx of cache.transactions) {
          if (!oldestTransaction || tx.timestamp < oldestTransaction) {
            oldestTransaction = tx.timestamp;
          }
        }
      }
    }

    return {
      totalCaches: index.length,
      totalTransactions,
      oldestTransaction,
      memorySize: this.memoryCache.size
    };
  }

  /**
   * Merge two transaction arrays, removing duplicates
   */
  private mergeTransactions(
    existing: TransactionDisplay[],
    newTxs: TransactionDisplay[]
  ): TransactionDisplay[] {
    const txMap = new Map<string, TransactionDisplay>();

    // Add existing transactions
    for (const tx of existing) {
      txMap.set(tx.hash, tx);
    }

    // Add/update with new transactions
    for (const tx of newTxs) {
      txMap.set(tx.hash, tx);
    }

    // Convert back to array and sort by timestamp (newest first)
    return Array.from(txMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Sort transactions by timestamp
   */
  private sortTransactions(
    transactions: TransactionDisplay[],
    order: 'newest' | 'oldest'
  ): TransactionDisplay[] {
    const sorted = [...transactions];

    if (order === 'newest') {
      sorted.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      sorted.sort((a, b) => a.timestamp - b.timestamp);
    }

    return sorted;
  }

  /**
   * Update the cache index with a new key
   */
  private async updateCacheIndex(cacheKey: string): Promise<void> {
    const index = await this.loadCacheIndex();

    if (!index.includes(cacheKey)) {
      index.push(cacheKey);
      await this.saveCacheIndex(index);
    }
  }

  /**
   * Initialize periodic cleanup task
   */
  private initializeCleanupTask(): void {
    // Run cleanup daily
    setInterval(() => {
      this.clearOldTransactions().catch(error => {
        log.error('Failed to run cleanup task', false, error);
      });
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Run initial cleanup after 1 minute
    setTimeout(() => {
      this.clearOldTransactions().catch(error => {
        log.error('Failed to run initial cleanup', false, error);
      });
    }, 60 * 1000); // 1 minute
  }
}

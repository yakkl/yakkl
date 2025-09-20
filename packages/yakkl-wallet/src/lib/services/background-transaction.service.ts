/**
 * Background Transaction Service
 * Fetches transaction history periodically for all accounts
 * Updates the wallet cache with transaction data
 */

import browser from 'webextension-polyfill';
import { BlockchainExplorer } from '$lib/managers/providers/explorer/BlockchainExplorer';
import { log } from '$lib/common/logger-wrapper';
import {
  STORAGE_YAKKL_WALLET_CACHE,
  STORAGE_YAKKL_CURRENTLY_SELECTED
} from '$lib/common/constants';
import type { TransactionDisplay } from '$lib/types';

export class BackgroundTransactionService {
  private static instance: BackgroundTransactionService | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;
  private explorer: BlockchainExplorer;

  // Intervals
  private readonly TEST_INTERVAL = 30 * 1000; // 30 seconds for testing
  private readonly PROD_INTERVAL = 2 * 60 * 1000; // 2 minutes for production

  private constructor() {
    this.explorer = BlockchainExplorer.getInstance();
  }

  static getInstance(): BackgroundTransactionService {
    if (!BackgroundTransactionService.instance) {
      BackgroundTransactionService.instance = new BackgroundTransactionService();
    }
    return BackgroundTransactionService.instance;
  }

  /**
   * Start automatic transaction updates
   */
  async start(): Promise<void> {
    // Do initial update
    await this.updateAllTransactions();
    // Start interval
    const interval = process.env.NODE_ENV === 'production' ? this.PROD_INTERVAL : this.TEST_INTERVAL;
    this.updateInterval = setInterval(() => {
      this.updateAllTransactions();
    }, interval);
  }

  /**
   * Stop automatic transaction updates
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update all account transactions
   */
  async updateAllTransactions(): Promise<void> {
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      // Get wallet cache and currently selected
      const storage = await browser.storage.local.get([
        STORAGE_YAKKL_WALLET_CACHE,
        STORAGE_YAKKL_CURRENTLY_SELECTED
      ]);

      const walletCache = storage[STORAGE_YAKKL_WALLET_CACHE] as any;
      const currentlySelected = storage[STORAGE_YAKKL_CURRENTLY_SELECTED] as any;

      if (!walletCache?.chainAccountCache) {
        return;
      }

      let updatedAccountCount = 0;
      let totalTransactionCount = 0;

      // Process each chain
      for (const [chainId, chainData] of Object.entries(walletCache.chainAccountCache)) {
        const chainIdNum = Number(chainId);

        // Process each account
        for (const [address, accountCache] of Object.entries(chainData as any)) {
          try {
            // Fetch transactions from explorer (limit to 100 most recent)
            const transactions = await this.explorer.getTransactionHistory(
              address,
              chainIdNum,
              100,
              true // forceRefresh
            );

            if (transactions && transactions.length > 0) {
              // Update the cache with new transactions
              const cache = accountCache as any;

              // Initialize transactions object if it doesn't exist
              if (!cache.transactions) {
                cache.transactions = {
                  transactions: [],
                  lastUpdated: null,
                  pendingTransactions: []
                };
              }

              // Update transactions
              cache.transactions.transactions = transactions;
              cache.transactions.lastUpdated = new Date().toISOString();

              updatedAccountCount++;
              totalTransactionCount += transactions.length;
            } else {
              // Even if no transactions, update the timestamp
              const cache = accountCache as any;
              if (!cache.transactions) {
                cache.transactions = {
                  transactions: [],
                  lastUpdated: new Date().toISOString(),
                  pendingTransactions: []
                };
              } else {
                cache.transactions.lastUpdated = new Date().toISOString();
              }
            }
          } catch (error) {
            log.warn(`[BackgroundTransactionService] Failed to fetch transactions for ${address} on chain ${chainId}:`, false, error);
          }
        }
      }

      // Save updated cache back to storage
      await browser.storage.local.set({
        [STORAGE_YAKKL_WALLET_CACHE]: walletCache,
        lastTransactionUpdate: Date.now()
      });

      const duration = Date.now() - startTime;
    } catch (error) {
      log.error('[BackgroundTransactionService] Error updating transactions:', false, error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Force immediate transaction update (called from UI)
   */
  async forceUpdate(): Promise<void> {
    await this.updateAllTransactions();
  }

  /**
   * Update transactions for a specific account
   */
  async updateAccountTransactions(address: string, chainId: number): Promise<TransactionDisplay[]> {
    try {
      // Fetch transactions from explorer
      const transactions = await this.explorer.getTransactionHistory(
        address,
        chainId,
        100,
        true // forceRefresh
      );

      if (transactions && transactions.length > 0) {
        // Update the wallet cache
        const storage = await browser.storage.local.get(STORAGE_YAKKL_WALLET_CACHE);
        const walletCache = storage[STORAGE_YAKKL_WALLET_CACHE] as any;

        if (walletCache?.chainAccountCache?.[chainId]?.[address.toLowerCase()]) {
          const accountCache = walletCache.chainAccountCache[chainId][address.toLowerCase()];

          if (!accountCache.transactions) {
            accountCache.transactions = {
              transactions: [],
              lastUpdated: null,
              pendingTransactions: []
            };
          }

          accountCache.transactions.transactions = transactions;
          accountCache.transactions.lastUpdated = new Date().toISOString();

          // Save updated cache
          await browser.storage.local.set({
            [STORAGE_YAKKL_WALLET_CACHE]: walletCache
          });
        }
        return transactions;
      }

      return [];
    } catch (error) {
      log.error(`[BackgroundTransactionService] Error updating transactions for ${address}:`, false, error);
      return [];
    }
  }
}

// Export singleton getter
export const getBackgroundTransactionService = () => BackgroundTransactionService.getInstance();

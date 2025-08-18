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
    log.info('[BackgroundTransactionService] Service initialized');
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
    log.info('[BackgroundTransactionService] Starting transaction update service');

    // Do initial update
    await this.updateAllTransactions();

    // Start interval
    const interval = process.env.NODE_ENV === 'production' ? this.PROD_INTERVAL : this.TEST_INTERVAL;
    this.updateInterval = setInterval(() => {
      this.updateAllTransactions();
    }, interval);

    log.info(`[BackgroundTransactionService] Transaction updates scheduled every ${interval / 1000} seconds`);
  }

  /**
   * Stop automatic transaction updates
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      log.info('[BackgroundTransactionService] Transaction update service stopped');
    }
  }

  /**
   * Update all account transactions
   */
  async updateAllTransactions(): Promise<void> {
    if (this.isUpdating) {
      log.debug('[BackgroundTransactionService] Update already in progress, skipping');
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      log.info('[BackgroundTransactionService] Starting transaction update for all accounts');

      // Get wallet cache and currently selected
      const storage = await browser.storage.local.get([
        STORAGE_YAKKL_WALLET_CACHE,
        STORAGE_YAKKL_CURRENTLY_SELECTED
      ]);
      
      const walletCache = storage[STORAGE_YAKKL_WALLET_CACHE] as any;
      const currentlySelected = storage[STORAGE_YAKKL_CURRENTLY_SELECTED] as any;

      if (!walletCache?.chainAccountCache) {
        log.debug('[BackgroundTransactionService] No wallet cache found, skipping transaction update');
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
            log.debug(`[BackgroundTransactionService] Fetching transactions for ${address} on chain ${chainId}`);
            
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

              log.debug(`[BackgroundTransactionService] Updated ${transactions.length} transactions for ${address}`);
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
            log.warn(`[BackgroundTransactionService] Failed to fetch transactions for ${address} on chain ${chainId}:`, error);
          }
        }
      }

      // Save updated cache back to storage
      await browser.storage.local.set({
        [STORAGE_YAKKL_WALLET_CACHE]: walletCache,
        lastTransactionUpdate: Date.now()
      });

      const duration = Date.now() - startTime;
      log.info(`[BackgroundTransactionService] Transaction update completed in ${duration}ms. Updated ${updatedAccountCount} accounts with ${totalTransactionCount} total transactions`);

    } catch (error) {
      log.error('[BackgroundTransactionService] Error updating transactions:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Force immediate transaction update (called from UI)
   */
  async forceUpdate(): Promise<void> {
    log.info('[BackgroundTransactionService] Force update requested');
    await this.updateAllTransactions();
  }

  /**
   * Update transactions for a specific account
   */
  async updateAccountTransactions(address: string, chainId: number): Promise<TransactionDisplay[]> {
    try {
      log.info(`[BackgroundTransactionService] Updating transactions for ${address} on chain ${chainId}`);
      
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

          log.info(`[BackgroundTransactionService] Updated ${transactions.length} transactions for ${address}`);
        }

        return transactions;
      }

      return [];
    } catch (error) {
      log.error(`[BackgroundTransactionService] Error updating transactions for ${address}:`, error);
      return [];
    }
  }
}

// Export singleton getter
export const getBackgroundTransactionService = () => BackgroundTransactionService.getInstance();
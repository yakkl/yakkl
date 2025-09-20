/**
 * BackgroundCacheSyncService - Background context compatible cache sync service
 * 
 * NO Svelte stores, NO window object, NO client messaging
 * Uses direct browser.storage API and UnifiedTimerManager
 * Handles cache synchronization in background context only
 */

import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { BackgroundCacheStore } from './BackgroundCacheStore';
import { BackgroundTransactionService } from './BackgroundTransactionService';
import { BackgroundPriceService } from './BackgroundPriceService';
import { simpleProvider } from '../../../contexts/background/services/simple-provider.service';
import { BigNumberishUtils } from '@yakkl/core'; // Use for formatEther replacement
import type { TokenData } from '$lib/common/interfaces';
import { blockchainHandlers } from '$contexts/background/handlers/blockchain'; // STATIC IMPORT - NO DYNAMIC IMPORTS IN SERVICE WORKERS

export class BackgroundCacheSyncService {
  private static instance: BackgroundCacheSyncService | null = null;
  private timerManager: UnifiedTimerManager;
  private cacheStore: BackgroundCacheStore;
  private transactionService: BackgroundTransactionService;
  private priceService: BackgroundPriceService;
  // Use centralized provider cache instead of local providers
  private isRunning = false;

  private constructor() {
    this.timerManager = UnifiedTimerManager.getInstance();
    this.cacheStore = BackgroundCacheStore.getInstance();
    this.transactionService = BackgroundTransactionService.getInstance();
    this.priceService = BackgroundPriceService.getInstance();
  }

  public static getInstance(): BackgroundCacheSyncService {
    if (!BackgroundCacheSyncService.instance) {
      BackgroundCacheSyncService.instance = new BackgroundCacheSyncService();
    }
    return BackgroundCacheSyncService.instance;
  }

  /**
   * Start cache synchronization
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      log.debug('[BackgroundCacheSync] Already running');
      return;
    }

    log.info('[BackgroundCacheSync] Starting cache synchronization');
    this.isRunning = true;

    // Initial sync
    await this.syncAll();

    // Set up periodic syncs using UnifiedTimerManager
    this.setupPeriodicSyncs();
  }

  /**
   * Stop cache synchronization
   */
  public stop(): void {
    if (!this.isRunning) return;

    log.info('[BackgroundCacheSync] Stopping cache synchronization');
    
    // Stop all timers
    this.timerManager.stopInterval('background-balance-sync');
    this.timerManager.stopInterval('background-price-sync');
    this.timerManager.stopInterval('background-transaction-sync');
    
    this.timerManager.removeInterval('background-balance-sync');
    this.timerManager.removeInterval('background-price-sync');
    this.timerManager.removeInterval('background-transaction-sync');
    
    this.isRunning = false;
  }

  /**
   * Set up periodic sync intervals
   */
  private setupPeriodicSyncs(): void {
    // Balance sync every 30 seconds
    this.timerManager.addInterval(
      'background-balance-sync',
      () => this.syncBalances(),
      30000
    );
    this.timerManager.startInterval('background-balance-sync');

    // Price sync every 30 seconds
    this.timerManager.addInterval(
      'background-price-sync',
      () => this.syncPrices(),
      30000
    );
    this.timerManager.startInterval('background-price-sync');

    // Transaction sync every 60 seconds
    this.timerManager.addInterval(
      'background-transaction-sync',
      () => this.syncTransactions(),
      60000
    );
    this.timerManager.startInterval('background-transaction-sync');
  }

  /**
   * Sync all data
   */
  public async syncAll(): Promise<void> {
    try {
      log.info('[BackgroundCacheSync] Starting full sync');
      
      await Promise.all([
        this.syncBalances(),
        this.syncPrices(),
        this.syncTransactions()
      ]);
      
      log.info('[BackgroundCacheSync] Full sync complete');
    } catch (error) {
      log.error('[BackgroundCacheSync] Full sync failed', false, error);
    }
  }

  /**
   * Sync token balances
   */
  public async syncBalances(): Promise<void> {
    try {
      log.debug('[BackgroundCacheSync] Syncing balances');
      
      const cache = await this.cacheStore.getCache();
      if (!cache?.chainAccountCache) return;

      for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
        for (const [address] of Object.entries(chainData)) {
          await this.syncAccountBalance(Number(chainId), address);
        }
      }
      
      log.debug('[BackgroundCacheSync] Balance sync complete');
    } catch (error) {
      log.error('[BackgroundCacheSync] Balance sync failed', false, error);
    }
  }

  /**
   * Sync balance for a specific account
   * FIXED: Now uses the cached GET_NATIVE_BALANCE handler instead of direct provider calls
   */
  private async syncAccountBalance(chainId: number, address: string): Promise<void> {
    try {
      // Use the cached GET_NATIVE_BALANCE handler instead of direct provider call
      // This leverages the 15-minute cache to prevent excessive RPC calls
      // FIXED: Using static import instead of dynamic import (which breaks service workers)
      const getNativeBalanceHandler = blockchainHandlers.get('GET_NATIVE_BALANCE');

      if (!getNativeBalanceHandler) {
        log.error('[BackgroundCacheSync] GET_NATIVE_BALANCE handler not found');
        return;
      }

      // Call the handler with timeout to prevent hanging
      let response;
      try {
        const handlerPromise = getNativeBalanceHandler({
          type: 'GET_NATIVE_BALANCE',
          data: {
            address,
            chainId
          }
        });
        const timeoutPromise = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error('Balance fetch timeout after 10 seconds')), 10000)
        );
        response = await Promise.race([handlerPromise, timeoutPromise]);
      } catch (error: any) {
        log.warn('[BackgroundCacheSync] Balance fetch failed', false, {
          chainId,
          address,
          error: error.message
        });
        return;
      }

      if (!response.success || !response.data) {
        log.warn('[BackgroundCacheSync] Failed to get balance from handler', false, {
          chainId,
          address,
          error: response.error
        });
        return;
      }

      // The balance is returned in Wei format from the handler
      const balance = response.data.balance;
      const balanceString = balance.toString();

      // Get existing tokens from cache
      const cache = await this.cacheStore.getCache();
      const accountCache = cache?.chainAccountCache?.[chainId]?.[address];
      let tokens = accountCache?.tokens || [];

      // Update or add native token
      let nativeTokenFound = false;
      tokens = tokens.map((token: TokenData) => {
        if (token.isNative) {
          nativeTokenFound = true;
          return {
            ...token,
            balance: balanceString,
            qty: BigNumberishUtils.format(balance, 18) // formatEther equivalent
          };
        }
        return token;
      });

      // Add native token if not found
      if (!nativeTokenFound) {
        tokens.unshift({
          address: '0x0000000000000000000000000000000000000000',
          symbol: this.getNativeSymbol(chainId),
          name: this.getNativeName(chainId),
          decimals: 18,
          balance: balanceString,
          qty: BigNumberishUtils.format(balance, 18), // formatEther equivalent
          isNative: true,
          chainId,
          icon: this.getNativeIcon(chainId),
          price: 0, // Will be updated by price sync
          value: 0
        });
      }

      // Update cache
      await this.cacheStore.updateTokenBalances(chainId, address, tokens);
      
      log.debug('[BackgroundCacheSync] Updated balance', false, {
        chainId,
        address,
        balance: balanceString
      });
    } catch (error) {
      log.error('[BackgroundCacheSync] Failed to sync account balance', false, {
        chainId,
        address,
        error
      });
    }
  }

  /**
   * Sync prices
   */
  public async syncPrices(): Promise<void> {
    try {
      log.debug('[BackgroundCacheSync] Syncing prices');
      
      // Use background price service to update prices
      await this.priceService.updatePrices();
      
      log.debug('[BackgroundCacheSync] Price sync complete');
    } catch (error) {
      log.error('[BackgroundCacheSync] Price sync failed', false, error);
    }
  }

  /**
   * Sync transactions
   */
  public async syncTransactions(): Promise<void> {
    try {
      log.debug('[BackgroundCacheSync] Syncing transactions');
      
      // Use background transaction service
      await this.transactionService.fetchAllTransactions();
      
      log.debug('[BackgroundCacheSync] Transaction sync complete');
    } catch (error) {
      log.error('[BackgroundCacheSync] Transaction sync failed', false, error);
    }
  }

  /**
   * Get provider from simple provider service
   */
  private async getProvider(chainId: number): Promise<any | null> {
    try {
      // Use the simple provider service
      const provider = await simpleProvider.getProvider(chainId);
      return provider;
    } catch (error) {
      log.error('[BackgroundCacheSync] Failed to get provider', false, {
        chainId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Get default RPC URL for common chains (keeping for reference)
   * Note: Not used anymore as we use ProviderCache now
   */
  private getDefaultRpcUrl(chainId: number): string | undefined {
    // This method is deprecated - using ProviderCache instead
    return undefined;
  }

  /**
   * Get native token symbol for a chain
   */
  private getNativeSymbol(chainId: number): string {
    switch (chainId) {
      case 1:
      case 11155111:
      case 5:
      case 42161:
      case 10:
        return 'ETH';
      case 137:
      case 80002:
        return 'MATIC';
      case 56:
      case 97:
        return 'BNB';
      case 43114:
        return 'AVAX';
      default:
        return 'ETH';
    }
  }

  /**
   * Get native token name for a chain
   */
  private getNativeName(chainId: number): string {
    switch (chainId) {
      case 1:
      case 11155111:
      case 5:
      case 42161:
      case 10:
        return 'Ethereum';
      case 137:
      case 80002:
        return 'Polygon';
      case 56:
      case 97:
        return 'BNB';
      case 43114:
        return 'Avalanche';
      default:
        return 'Ethereum';
    }
  }

  /**
   * Get native token icon
   */
  private getNativeIcon(chainId: number): string {
    switch (chainId) {
      case 137:
      case 80002:
        return '/images/matic.svg';
      case 56:
      case 97:
        return '/images/bnb.svg';
      case 43114:
        return '/images/avax.svg';
      default:
        return '/images/eth.svg';
    }
  }

  /**
   * Trigger immediate update for a specific account
   */
  public async syncAccount(chainId: number, address: string): Promise<void> {
    try {
      log.info('[BackgroundCacheSync] Syncing specific account', false, { chainId, address });
      
      await Promise.all([
        this.syncAccountBalance(chainId, address),
        this.transactionService.fetchTransactions(chainId, address),
        this.priceService.updateNativeTokenPrice(chainId, address, true)
      ]);
      
      log.info('[BackgroundCacheSync] Account sync complete', false, { chainId, address });
    } catch (error) {
      log.error('[BackgroundCacheSync] Account sync failed', false, error);
    }
  }

  /**
   * Check if sync is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const backgroundCacheSyncService = BackgroundCacheSyncService.getInstance();

// Also export as CacheSyncManager for compatibility during migration
export const CacheSyncManager = BackgroundCacheSyncService;
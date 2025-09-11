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
import { providers, utils } from 'ethers';
import type { TokenData } from '$lib/common/interfaces';

export class BackgroundCacheSyncService {
  private static instance: BackgroundCacheSyncService | null = null;
  private timerManager: UnifiedTimerManager;
  private cacheStore: BackgroundCacheStore;
  private transactionService: BackgroundTransactionService;
  private priceService: BackgroundPriceService;
  private providers: Map<number, providers.Provider> = new Map();
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
   */
  private async syncAccountBalance(chainId: number, address: string): Promise<void> {
    try {
      const provider = await this.getProvider(chainId);
      if (!provider) return;

      // Get native balance
      const balance = await provider.getBalance(address);
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
            qty: utils.formatEther(balance)
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
          qty: utils.formatEther(balance),
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
   * Get or create provider for a chain
   */
  private async getProvider(chainId: number): Promise<providers.Provider | null> {
    try {
      if (this.providers.has(chainId)) {
        return this.providers.get(chainId)!;
      }

      // Get RPC configuration
      const storage = await browser.storage.local.get(['yakklProviderConfigs']);
      const configs = storage.yakklProviderConfigs || {};
      
      let rpcUrl = configs[chainId]?.rpcUrl || this.getDefaultRpcUrl(chainId);
      
      if (!rpcUrl) {
        log.error('[BackgroundCacheSync] No RPC URL for chain', false, { chainId });
        return null;
      }

      const provider = new providers.JsonRpcProvider(rpcUrl);
      this.providers.set(chainId, provider);
      
      return provider;
    } catch (error) {
      log.error('[BackgroundCacheSync] Failed to get provider', false, error);
      return null;
    }
  }

  /**
   * Get default RPC URL for common chains
   */
  private getDefaultRpcUrl(chainId: number): string | undefined {
    switch (chainId) {
      case 1:
        return 'https://eth.llamarpc.com';
      case 137:
        return 'https://polygon-rpc.com';
      case 56:
        return 'https://bsc-dataseed.binance.org';
      case 43114:
        return 'https://api.avax.network/ext/bc/C/rpc';
      case 42161:
        return 'https://arb1.arbitrum.io/rpc';
      case 10:
        return 'https://mainnet.optimism.io';
      case 11155111:
        return 'https://sepolia.infura.io/v3/public';
      default:
        return undefined;
    }
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
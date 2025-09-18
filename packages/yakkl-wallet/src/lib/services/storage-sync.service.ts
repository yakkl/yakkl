/**
 * Storage Sync Service
 * Listens to persistent storage changes and updates corresponding Svelte stores
 * This ensures that background service updates to persistent storage are reflected in the UI
 *
 * This service complements the existing syncStorageToStore function in stores.ts
 * by adding real-time storage change listening capability
 */

import { log } from '$lib/common/logger-wrapper';
import { browser } from '$app/environment';
import {
  STORAGE_YAKKL_WALLET_CACHE,
  STORAGE_YAKKL_COMBINED_TOKENS,
  STORAGE_YAKKL_TOKEN_CACHE,
  STORAGE_YAKKL_ADDRESS_TOKEN_CACHE,
  STORAGE_YAKKL_SETTINGS,
  STORAGE_YAKKL_PROFILE,
  STORAGE_YAKKL_CURRENTLY_SELECTED
} from '$lib/common/constants';
import { walletCacheStore } from '$lib/stores/wallet-cache-v2.store';
import { tokenStore } from '$lib/stores/token.store';
import { syncStorageToStore } from '$lib/common/stores';
import { getObjectFromLocalStorage } from '$lib/common/storage';
import type { TokenCacheEntry, AddressTokenCache } from '$lib/common/interfaces';
import type { WalletCacheController } from '$lib/types';
import { compareWalletCacheData, hasChanged } from '$lib/utils/deepCompare';
import { portfolioCoordinator, UpdatePriority, UpdateType } from './portfolio-data-coordinator.service';

export class StorageSyncService {
  private static instance: StorageSyncService | null = null;
  private isListening = false;
  private storageListener: ((changes: any, areaName: string) => void) | null = null;

  private constructor() {}

  static getInstance(): StorageSyncService {
    if (!StorageSyncService.instance) {
      StorageSyncService.instance = new StorageSyncService();
    }
    return StorageSyncService.instance;
  }

  /**
   * Start listening to storage changes
   */
  async start(): Promise<void> {
    if (!browser || typeof chrome === 'undefined') {
      log.warn('[StorageSyncService] Not in browser extension context');
      return;
    }

    if (this.isListening) {
      log.debug('[StorageSyncService] Already listening to storage changes');
      return;
    }

    log.info('[StorageSyncService] Starting storage sync service');

    // Create the storage change listener
    this.storageListener = (changes: any, areaName: string) => {
      // Only process local storage changes
      if (areaName !== 'local') return;

      // Process each changed key
      for (const [key, change] of Object.entries(changes)) {
        this.handleStorageChange(key, change);
      }
    };

    // Add the listener
    chrome.storage.onChanged.addListener(this.storageListener);
    this.isListening = true;

    // Initial sync of critical stores
    await this.performInitialSync();

    log.info('[StorageSyncService] Storage sync service started');
  }

  /**
   * Stop listening to storage changes
   */
  stop(): void {
    if (!this.isListening || !this.storageListener) {
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.storageListener);
    }

    this.isListening = false;
    this.storageListener = null;

    log.info('[StorageSyncService] Storage sync service stopped');
  }

  /**
   * Handle individual storage change with improved conflict resolution
   */
  private async handleStorageChange(key: string, change: any): Promise<void> {
    try {
      const newValue = change.newValue;
      const oldValue = change.oldValue;

      // Enhanced logging with value comparison
      log.debug(`[StorageSyncService] Storage changed: ${key}`, false, {
        hasOldValue: !!oldValue,
        hasNewValue: !!newValue,
        isRemoval: !newValue && !!oldValue
      });

      // Validate the change before processing
      if (!this.validateStorageChange(key, newValue, oldValue)) {
        log.warn(`[StorageSyncService] Invalid storage change for ${key}, skipping`, false);
        return;
      }

      // Handle specific storage keys with conflict resolution
      switch (key) {
        case STORAGE_YAKKL_WALLET_CACHE:
          await this.handleWalletCacheChange(newValue, oldValue);
          break;

        case STORAGE_YAKKL_COMBINED_TOKENS:
          await this.handleCombinedTokensChange(newValue);
          break;

        case STORAGE_YAKKL_TOKEN_CACHE:
          await this.handleTokenCacheChange(newValue);
          break;

        case STORAGE_YAKKL_ADDRESS_TOKEN_CACHE:
          await this.handleAddressTokenCacheChange(newValue);
          break;

        case STORAGE_YAKKL_SETTINGS:
          // Use the existing syncStorageToStore for settings
          await syncStorageToStore('yakklSettingsStore');
          break;

        case STORAGE_YAKKL_PROFILE:
          // Use the existing syncStorageToStore for profile
          await syncStorageToStore('profileStore');
          break;

        case STORAGE_YAKKL_CURRENTLY_SELECTED:
          // Use the existing syncStorageToStore for currently selected
          await syncStorageToStore('yakklCurrentlySelected');
          break;

        // Add more cases as needed for other storage keys
        default:
          // Ignore other storage changes
          break;
      }
    } catch (error) {
      log.error(`[StorageSyncService] Error handling storage change for key ${key}:`, false, error);
    }
  }

  /**
   * Validate storage change before processing
   * Less restrictive validation - let coordinator handle conflicts
   */
  private validateStorageChange(key: string, newValue: any, oldValue: any): boolean {
    // Don't process removal of critical data
    if (!newValue && oldValue && key === STORAGE_YAKKL_WALLET_CACHE) {
      log.warn('[StorageSyncService] Preventing removal of wallet cache', false);
      return false;
    }

    // Basic structure validation only
    if (key === STORAGE_YAKKL_WALLET_CACHE && newValue) {
      // Check for required fields
      if (!newValue.chainAccountCache) {
        log.warn('[StorageSyncService] Invalid wallet cache structure - missing chainAccountCache', false);
        return false;
      }
    }

    // Allow all other updates - coordinator will validate
    return true;
  }

  /**
   * Handle wallet cache changes through coordinator
   */
  private async handleWalletCacheChange(newValue: WalletCacheController | undefined, oldValue?: any): Promise<void> {
    if (!newValue) {
      log.debug('[StorageSyncService] Wallet cache cleared');
      return;
    }

    try {
      // Get current cache to compare before updating
      const currentCache = walletCacheStore.getCacheSync();

      // Check if data has actually changed
      if (!compareWalletCacheData(currentCache, newValue)) {
        log.debug('[StorageSyncService] Wallet cache data unchanged, skipping update');
        return;
      }

      log.debug('[StorageSyncService] Wallet cache data changed, updating store');

      // Update the wallet cache store with data from background
      walletCacheStore.updateFromBackground(newValue);

      // Also queue through coordinator for future processing
      // portfolioCoordinator.queueUpdate({
      //   type: UpdateType.FULL_PORTFOLIO,
      //   priority: UpdatePriority.BACKGROUND_SYNC,
      //   source: 'storage-sync',
      //   data: newValue
      // });

      log.debug('[StorageSyncService] Wallet cache update queued with coordinator');
    } catch (error) {
      log.error('[StorageSyncService] Error handling wallet cache change:', false, error);
    }
  }

  /**
   * Handle combined tokens changes through coordinator
   */
  private async handleCombinedTokensChange(newValue: any): Promise<void> {
    if (!newValue) {
      log.debug('[StorageSyncService] Combined tokens cleared');
      return;
    }

    try {
      // Queue token list update through coordinator
      portfolioCoordinator.queueUpdate({
        type: UpdateType.TOKEN_LIST,
        priority: UpdatePriority.BACKGROUND_SYNC,
        source: 'storage-sync-tokens',
        data: { tokens: newValue }
      });

      log.debug('[StorageSyncService] Token list update queued with coordinator');
    } catch (error) {
      log.error('[StorageSyncService] Error handling combined tokens change:', false, error);
    }
  }

  /**
   * Handle token cache changes through coordinator
   */
  private async handleTokenCacheChange(newValue: Record<string, TokenCacheEntry> | undefined): Promise<void> {
    if (!newValue) {
      log.debug('[StorageSyncService] Token cache cleared');
      return;
    }

    try {
      // Get current token cache to compare
      const currentTokenCache = await getObjectFromLocalStorage(STORAGE_YAKKL_TOKEN_CACHE) as Record<string, TokenCacheEntry>;

      // Only update if token cache has actually changed
      if (!hasChanged(currentTokenCache, newValue)) {
        log.debug('[StorageSyncService] Token cache data unchanged, skipping price update');
        return;
      }

      log.debug('[StorageSyncService] Token cache data changed, queueing price update');

      // TEMPORARY: Update directly to bypass coordinator issues
      // TODO: Re-enable coordinator after debugging
      await tokenStore.updatePricesFromCache(newValue);

      // Also queue through coordinator for future processing
      // portfolioCoordinator.queueUpdate({
      //   type: UpdateType.PRICE_ONLY,
      //   priority: UpdatePriority.PRICE_UPDATE,
      //   source: 'storage-sync-prices',
      //   data: newValue
      // });

      log.debug('[StorageSyncService] Token price update queued with coordinator');
    } catch (error) {
      log.error('[StorageSyncService] Error handling token cache change:', false, error);
    }
  }

  /**
   * Handle address token holdings changes through coordinator
   */
  private async handleAddressTokenCacheChange(newValue: Record<string, AddressTokenCache> | undefined): Promise<void> {
    if (!newValue) {
      log.debug('[StorageSyncService] Address token holdings cleared');
      return;
    }

    try {
      // Get current address token holdings to compare
      const currentHoldings = await getObjectFromLocalStorage(STORAGE_YAKKL_ADDRESS_TOKEN_CACHE) as Record<string, AddressTokenCache>;

      // Only update if holdings have actually changed
      if (!hasChanged(currentHoldings, newValue)) {
        log.debug('[StorageSyncService] Address token holdings unchanged, skipping balance update');
        return;
      }

      log.debug('[StorageSyncService] Address token holdings changed, queueing balance update');

      // Queue balance update through coordinator
      portfolioCoordinator.queueUpdate({
        type: UpdateType.BALANCE_ONLY,
        priority: UpdatePriority.BLOCKCHAIN_EVENT,
        source: 'storage-sync-balances',
        data: newValue
      });

      log.debug('[StorageSyncService] Token balance update queued with coordinator');
    } catch (error) {
      log.error('[StorageSyncService] Error handling address token holdings change:', false, error);
    }
  }

  /**
   * Perform initial sync of critical stores
   */
  private async performInitialSync(): Promise<void> {
    try {
      log.debug('[StorageSyncService] Performing initial sync');

      // Sync wallet cache
      const walletCache = await getObjectFromLocalStorage(STORAGE_YAKKL_WALLET_CACHE) as WalletCacheController;
      if (walletCache) {
        await this.handleWalletCacheChange(walletCache);
      }

      // Sync combined tokens
      const combinedTokens = await getObjectFromLocalStorage(STORAGE_YAKKL_COMBINED_TOKENS);
      if (combinedTokens) {
        await this.handleCombinedTokensChange(combinedTokens);
      }

      // Sync token cache
      const tokenCache = await getObjectFromLocalStorage(STORAGE_YAKKL_TOKEN_CACHE) as Record<string, TokenCacheEntry>;
      if (tokenCache) {
        await this.handleTokenCacheChange(tokenCache);
      }

      // Sync address token holdings
      const addressTokenCache = await getObjectFromLocalStorage(STORAGE_YAKKL_ADDRESS_TOKEN_CACHE) as Record<string, AddressTokenCache>;
      if (addressTokenCache) {
        await this.handleAddressTokenCacheChange(addressTokenCache);
      }

      log.debug('[StorageSyncService] Initial sync completed');
    } catch (error) {
      log.error('[StorageSyncService] Error during initial sync:', false, error);
    }
  }

  /**
   * Force a manual sync of all stores
   */
  async forceSync(): Promise<void> {
    log.info('[StorageSyncService] Forcing manual sync of all stores');
    await this.performInitialSync();
  }
}

// Export singleton instance getter
export const storageSyncService = StorageSyncService.getInstance();

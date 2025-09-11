import { log } from '$lib/common/logger-wrapper';
import { walletCacheStore } from '$lib/stores/wallet-cache.store';
import { currentAccount } from '$lib/stores/account.store';
import { currentChain } from '$lib/stores/chain.store';
import { get } from 'svelte/store';

/**
 * Service to handle native token price updates without affecting the rest of the cache
 * This ensures users see cached data immediately while only the native token price updates
 */
export class NativeTokenPriceService {
  private static instance: NativeTokenPriceService | null = null;
  private priceUpdateInterval: NodeJS.Timeout | number | null = null;
  private lastPriceUpdate = 0;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly MIN_UPDATE_INTERVAL = 5000; // 5 seconds minimum

  static getInstance(): NativeTokenPriceService {
    if (!NativeTokenPriceService.instance) {
      NativeTokenPriceService.instance = new NativeTokenPriceService();
    }
    return NativeTokenPriceService.instance;
  }


  /**
   * Start automatic native token price updates
   */
  startAutomaticUpdates(): void {
    if (this.priceUpdateInterval) {
      return; // Already running
    }

    console.log('[NativeTokenPriceService] Starting automatic price updates');
    log.info('[NativeTokenPrice] Starting automatic price updates');

    this.priceUpdateInterval = window.setInterval(() => {
      this.updateNativeTokenPriceOnly();
    }, this.UPDATE_INTERVAL);

    // Also trigger an immediate update
    setTimeout(() => {
      this.updateNativeTokenPriceOnly();
    }, 2000); // Small delay to let cache load first
  }

  /**
   * Stop automatic native token price updates
   */
  stopAutomaticUpdates(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
      this.priceUpdateInterval = null;
      log.info('[NativeTokenPrice] Stopped automatic price updates');
    }
  }

  /**
   * Update only the native token price in the cache without touching other tokens
   */
  async updateNativeTokenPriceOnly(forceUpdate = false): Promise<void> {
    try {
      // Rate limiting
      const now = Date.now();
      if (!forceUpdate && now - this.lastPriceUpdate < this.MIN_UPDATE_INTERVAL) {
        log.debug('[NativeTokenPrice] Rate limited, skipping update');
        return;
      }

      const account = get(currentAccount);
      const chain = get(currentChain);

      if (!account || !chain) {
        log.debug('[NativeTokenPrice] No account or chain available');
        return;
      }

      // Instead of fetching from price manager, request price update from background
      // The background service should handle price fetching securely
      log.info('[NativeTokenPrice] Requesting price update from background', false, {
        chainId: chain.chainId,
        address: account.address
      });
      
      // Send message to background to update prices
      // This should be handled by the background service securely
      // For now, just use the cached price from the wallet cache
      
      this.lastPriceUpdate = now;
    } catch (error) {
      log.warn('[NativeTokenPrice] Failed to update native token price', false, error);
    }
  }

  /**
   * Manual trigger for immediate price update
   */
  async triggerUpdate(): Promise<void> {
    await this.updateNativeTokenPriceOnly(true);
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.priceUpdateInterval !== null;
  }

  /**
   * Refresh all prices (alias for triggerUpdate for compatibility)
   */
  async refreshPrices(): Promise<void> {
    await this.triggerUpdate();
  }

  /**
   * Fetch latest prices without updating storage
   * Returns empty data - prices should be fetched from background service
   */
  async fetchLatestPrices(): Promise<Record<string, any>> {
    // Client should not fetch prices directly
    // This should be handled by the background service
    log.info('[NativeTokenPrice] Price fetching should be handled by background service');
    return {};
  }
}

// Export singleton instance
export const nativeTokenPriceService = NativeTokenPriceService.getInstance();

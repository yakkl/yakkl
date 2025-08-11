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

      // Get current native token price
      const nativeTokenPrice = await this.fetchNativeTokenPrice(chain.chainId);

      if (nativeTokenPrice && nativeTokenPrice > 0) {
        // Update only the native token price in the cache
        walletCacheStore.updateNativeTokenPrice(chain.chainId, account.address, nativeTokenPrice);

        this.lastPriceUpdate = now;

        log.info('[NativeTokenPrice] Updated native token price only', false, {
          chainId: chain.chainId,
          address: account.address,
          price: nativeTokenPrice,
          symbol: chain.nativeCurrency?.symbol || 'ETH'
        });
      }
    } catch (error) {
      log.warn('[NativeTokenPrice] Failed to update native token price', false, error);
    }
  }

  /**
   * Fetch native token price from pricing service
   */
  private async fetchNativeTokenPrice(chainId: number): Promise<number | null> {
    try {
      // Get the native token identifier based on chain
      let tokenId: string;

      switch (chainId) {
        case 1: // Ethereum
        case 11155111: // Sepolia
          tokenId = 'ethereum';
          break;
        case 137: // Polygon
        case 80002: // Polygon Amoy
          tokenId = 'matic-network';
          break;
        case 56: // BSC
        case 97: // BSC Testnet
          tokenId = 'binancecoin';
          break;
        case 42161: // Arbitrum
          tokenId = 'ethereum'; // Arbitrum uses ETH
          break;
        case 10: // Optimism
          tokenId = 'ethereum'; // Optimism uses ETH
          break;
        default:
          tokenId = 'ethereum'; // Default to ETH
      }

      // Use CoinGecko API for price
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const price = data[tokenId]?.usd;

      if (typeof price === 'number' && price > 0) {
        log.debug('[NativeTokenPrice] Fetched price', false, { tokenId, price });
        return price;
      } else {
        log.warn('[NativeTokenPrice] Invalid price data received', false, { tokenId, data });
        return null;
      }
    } catch (error) {
      log.warn('[NativeTokenPrice] Failed to fetch native token price', false, error);
      return null;
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
}

// Export singleton instance
export const nativeTokenPriceService = NativeTokenPriceService.getInstance();

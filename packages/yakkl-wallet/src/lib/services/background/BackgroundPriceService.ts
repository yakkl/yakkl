/**
 * BackgroundPriceService - Background context compatible price service
 * 
 * NO Svelte stores, NO window object, NO client messaging
 * Uses direct browser.storage API and UnifiedTimerManager
 * Compatible with service worker environment
 */

import { PriceManager } from '$lib/managers/PriceManager';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
import type { TokenData } from '$lib/common/interfaces';

export class BackgroundPriceService {
  private static instance: BackgroundPriceService | null = null;
  private priceManager: PriceManager | null = null;
  private timerManager: UnifiedTimerManager | null = null;
  private lastPriceUpdate = 0;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly MIN_UPDATE_INTERVAL = 5000; // 5 seconds minimum
  private readonly STORAGE_KEY = 'yakklTokenPrices';

  private constructor() {
    // Defer initialization to avoid circular dependencies
  }

  public static getInstance(): BackgroundPriceService {
    if (!BackgroundPriceService.instance) {
      BackgroundPriceService.instance = new BackgroundPriceService();
    }
    return BackgroundPriceService.instance;
  }

  /**
   * Initialize price manager asynchronously
   */
  private async ensurePriceManagerInitialized(): Promise<void> {
    // Initialize timer manager if needed
    if (!this.timerManager) {
      this.timerManager = UnifiedTimerManager.getInstance();
    }
    
    if (!this.priceManager) {
      try {
        this.priceManager = new PriceManager();
        await this.priceManager.initialize();
        log.info('[BackgroundPriceService] PriceManager initialized');
      } catch (error) {
        log.error('[BackgroundPriceService] Failed to initialize PriceManager:', false, error);
        // Continue with default providers if initialization fails
      }
    }
  }

  /**
   * Start automatic price updates using UnifiedTimerManager
   */
  public startAutomaticUpdates(): void {
    log.info('[BackgroundPriceService] Starting automatic price updates');
    
    // Add interval to timer manager
    this.timerManager.addInterval('background-price-updates', 
      () => this.updatePrices(), 
      this.UPDATE_INTERVAL
    );
    
    // Start the interval
    this.timerManager.startInterval('background-price-updates');
    
    // Also trigger an immediate update after a short delay
    this.timerManager.addTimeout('background-price-initial', 
      () => this.updatePrices(), 
      2000
    );
    this.timerManager.startTimeout('background-price-initial');
  }

  /**
   * Stop automatic price updates
   */
  public stopAutomaticUpdates(): void {
    this.timerManager.stopInterval('background-price-updates');
    this.timerManager.removeInterval('background-price-updates');
    log.info('[BackgroundPriceService] Stopped automatic price updates');
  }

  /**
   * Update native token price for a specific chain
   */
  public async updateNativeTokenPrice(chainId: number, address: string, forceUpdate = false): Promise<void> {
    try {
      // Rate limiting
      const now = Date.now();
      if (!forceUpdate && now - this.lastPriceUpdate < this.MIN_UPDATE_INTERVAL) {
        log.debug('[BackgroundPriceService] Rate limited, skipping update');
        return;
      }

      await this.ensurePriceManagerInitialized();

      // Get native token symbol based on chain
      const nativeSymbol = this.getNativeTokenSymbol(chainId);
      const pair = `${nativeSymbol}/USD`;

      // Fetch price using PriceManager (weighted provider selection)
      const priceData = await this.priceManager!.getMarketPrice(pair);
      
      if (priceData && priceData.price > 0) {
        // Update storage directly (no Svelte stores)
        await this.updatePriceInStorage(chainId, address, priceData.price, nativeSymbol);
        
        this.lastPriceUpdate = now;
        
        log.info('[BackgroundPriceService] Updated native token price', false, {
          chainId,
          address,
          price: priceData.price,
          symbol: nativeSymbol,
          provider: priceData.provider
        });
      }
    } catch (error) {
      log.warn('[BackgroundPriceService] Failed to update native token price', false, error);
    }
  }

  /**
   * Update all token prices
   */
  public async updatePrices(): Promise<void> {
    try {
      log.debug('[BackgroundPriceService] Starting price update cycle');
      
      // Get current cache from storage
      const storage = await browser.storage.local.get(['yakklWalletCache', 'yakkl-currently-selected']);
      const cache = storage.yakklWalletCache;
      const currentlySelected = storage['yakkl-currently-selected'];
      
      if (!cache || !currentlySelected) {
        log.debug('[BackgroundPriceService] No cache or selection available');
        return;
      }

      // Type the currentlySelected properly
      const selected = currentlySelected as { shortcuts?: { chainId?: number; address?: string } };
      const chainId = selected?.shortcuts?.chainId;
      const address = selected?.shortcuts?.address;
      
      if (chainId && address) {
        await this.updateNativeTokenPrice(chainId, address, true);
      }

      // Update other token prices if needed
      await this.updateTokenPrices(cache);
      
    } catch (error) {
      log.error('[BackgroundPriceService] Failed to update prices', false, error);
    }
  }

  /**
   * Update token prices in cache
   */
  private async updateTokenPrices(cache: any): Promise<void> {
    if (!cache?.chainAccountCache) return;

    await this.ensurePriceManagerInitialized();

    const priceUpdates: Record<string, number> = {};

    // Collect unique tokens across all accounts
    for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
      for (const [address, accountData] of Object.entries(chainData as any)) {
        const tokens = (accountData as any).tokens || [];
        
        for (const token of tokens) {
          if (token.isNative) {
            // Native token - use chain-specific pricing
            const symbol = this.getNativeTokenSymbol(Number(chainId));
            const pair = `${symbol}/USD`;
            
            try {
              const priceData = await this.priceManager!.getMarketPrice(pair);
              if (priceData?.price > 0) {
                priceUpdates[`native_${chainId}`] = priceData.price;
              }
            } catch (error) {
              log.warn(`[BackgroundPriceService] Failed to get price for ${pair}`, false, error);
            }
          }
          // Add ERC20 token price fetching here if needed
        }
      }
    }

    // Update all prices in storage at once
    if (Object.keys(priceUpdates).length > 0) {
      await browser.storage.local.set({ [this.STORAGE_KEY]: priceUpdates });
      log.info('[BackgroundPriceService] Updated token prices', false, { 
        count: Object.keys(priceUpdates).length 
      });
    }
  }

  /**
   * Update price in browser storage
   */
  private async updatePriceInStorage(
    chainId: number, 
    address: string, 
    price: number, 
    symbol: string
  ): Promise<void> {
    // Get existing prices
    const storage = await browser.storage.local.get(this.STORAGE_KEY);
    const prices = storage[this.STORAGE_KEY] || {};
    
    // Update price
    prices[`native_${chainId}_${address}`] = {
      price,
      symbol,
      timestamp: Date.now(),
      chainId,
      address
    };
    
    // Save back to storage
    await browser.storage.local.set({ [this.STORAGE_KEY]: prices });
  }

  /**
   * Get native token symbol for a chain
   */
  private getNativeTokenSymbol(chainId: number): string {
    switch (chainId) {
      case 1: // Ethereum Mainnet
      case 11155111: // Sepolia
      case 5: // Goerli
      case 42161: // Arbitrum
      case 10: // Optimism
        return 'ETH';
      case 137: // Polygon
      case 80002: // Polygon Amoy
        return 'MATIC';
      case 56: // BSC
      case 97: // BSC Testnet
        return 'BNB';
      case 43114: // Avalanche
        return 'AVAX';
      default:
        return 'ETH'; // Default to ETH
    }
  }

  /**
   * Get native token pair for PriceManager
   */
  private getNativeTokenPair(chainId: number): string {
    const symbol = this.getNativeTokenSymbol(chainId);
    return `${symbol}/USD`;
  }

  /**
   * Fetch latest prices without updating storage (for coordination)
   */
  public async fetchLatestPrices(): Promise<Record<string, any>> {
    const priceData: Record<string, any> = {};
    
    try {
      await this.ensurePriceManagerInitialized();
      
      // Get cache to determine which tokens to fetch
      const storage = await browser.storage.local.get('yakklWalletCache');
      const cache = storage.yakklWalletCache as any;
      
      if (!cache?.chainAccountCache) {
        return priceData;
      }

      // Process each chain's native token
      const processedChains = new Set<number>();
      
      for (const [chainId, chainData] of Object.entries(cache.chainAccountCache as any)) {
        const numericChainId = Number(chainId);
        
        if (!processedChains.has(numericChainId)) {
          processedChains.add(numericChainId);
          
          const pair = this.getNativeTokenPair(numericChainId);
          
          try {
            const price = await this.priceManager!.getMarketPrice(pair);
            
            if (price && price.price > 0) {
              priceData[`native_${numericChainId}`] = {
                tokenAddress: '0x0000000000000000000000000000000000000000',
                price: price.price,
                timestamp: Date.now(),
                isNative: true,
                chainId: numericChainId,
                provider: price.provider
              };
            }
          } catch (error) {
            log.warn(`[BackgroundPriceService] Failed to fetch price for chain ${numericChainId}`, false, error);
          }
        }
      }

      log.debug(`[BackgroundPriceService] Fetched prices for ${Object.keys(priceData).length} tokens`);
      return priceData;
      
    } catch (error) {
      log.error('[BackgroundPriceService] Error fetching latest prices', false, error);
      return priceData;
    }
  }

  /**
   * Manual trigger for immediate price update
   */
  public async triggerUpdate(): Promise<void> {
    await this.updatePrices();
  }

  /**
   * Check if service is running
   */
  public isRunning(): boolean {
    return this.timerManager.isIntervalRunning('background-price-updates');
  }
}

// Export singleton instance
export const backgroundPriceService = BackgroundPriceService.getInstance();
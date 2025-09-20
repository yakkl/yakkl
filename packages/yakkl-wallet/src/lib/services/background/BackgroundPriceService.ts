/**
 * BackgroundPriceService - Background context compatible price service
 *
 * NO Svelte stores, NO window object, NO client messaging
 * Uses direct browser.storage API and UnifiedTimerManager
 * Compatible with service worker environment
 */

import { BackgroundPriceManager } from './providers/BackgroundPriceManager';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
import type { TokenData } from '$lib/common/interfaces';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import Decimal from 'decimal.js';

export class BackgroundPriceService {
  private static instance: BackgroundPriceService | null = null;
  private priceManager: BackgroundPriceManager | null = null;
  private timerManager: UnifiedTimerManager | null = null;
  private lastPriceUpdate = 0;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly MIN_UPDATE_INTERVAL = 5000; // 5 seconds minimum
  private readonly STORAGE_KEY = 'yakklTokenPrices';
  private readonly PRICE_CACHE_TTL = 60000; // 1 minute cache for same prices
  private priceCache = new Map<string, { price: number; timestamp: number; provider: string }>();

  // Request deduplication - prevent multiple simultaneous requests for same pair
  private pendingRequests = new Map<string, Promise<any>>();

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
        this.priceManager = new BackgroundPriceManager();
        await this.priceManager.initialize();
        log.info('[BackgroundPriceService] BackgroundPriceManager initialized');
      } catch (error) {
        log.error('[BackgroundPriceService] Failed to initialize BackgroundPriceManager:', false, error);
        // Continue with default providers if initialization fails
      }
    }
  }

  /**
   * Start automatic price updates using UnifiedTimerManager
   */
  public startAutomaticUpdates(): void {
    log.info('[BackgroundPriceService] Starting automatic price updates');

    // Check if timer already exists to avoid duplicates
    if (!this.timerManager.isIntervalRunning('background-price-updates')) {
      // Remove existing timer if it exists but isn't running
      this.timerManager.removeInterval('background-price-updates');

      // Add interval to timer manager
      this.timerManager.addInterval('background-price-updates',
        () => this.updatePrices(),
        this.UPDATE_INTERVAL
      );

      // Start the interval
      this.timerManager.startInterval('background-price-updates');

      log.info('[BackgroundPriceService] Created new price update interval');
    } else {
      log.info('[BackgroundPriceService] Price update interval already running');
    }

    // Check for initial update timer
    if (!this.timerManager.isTimeoutRunning('background-price-initial')) {
      // Remove existing timeout if it exists but isn't running
      this.timerManager.removeTimeout('background-price-initial');

      // Add initial update timeout
      this.timerManager.addTimeout('background-price-initial',
        () => this.updatePrices(),
        2000
      );
      this.timerManager.startTimeout('background-price-initial');

      log.info('[BackgroundPriceService] Scheduled initial price update');
    }
  }

  /**
   * Stop automatic price updates
   */
  public stopAutomaticUpdates(): void {
    // Stop and remove interval
    if (this.timerManager.isIntervalRunning('background-price-updates')) {
      this.timerManager.stopInterval('background-price-updates');
    }
    this.timerManager.removeInterval('background-price-updates');

    // Stop and remove initial timeout
    if (this.timerManager.isTimeoutRunning('background-price-initial')) {
      this.timerManager.stopTimeout('background-price-initial');
    }
    this.timerManager.removeTimeout('background-price-initial');

    // Clear price cache and pending requests
    this.priceCache.clear();
    this.pendingRequests.clear();

    log.info('[BackgroundPriceService] Stopped automatic price updates and cleared cache');
  }

  /**
   * Get cached price if still valid
   */
  private getCachedPrice(pair: string): { price: number; timestamp: number; provider: string } | null {
    const cached = this.priceCache.get(pair);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.PRICE_CACHE_TTL) {
      this.priceCache.delete(pair);
      return null;
    }

    return cached;
  }

  /**
   * Cache a price for future use
   */
  private setCachedPrice(pair: string, price: number, provider: string): void {
    this.priceCache.set(pair, {
      price,
      timestamp: Date.now(),
      provider
    });
  }

  /**
   * Update native token price for a specific chain with caching
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
      const pair = `${nativeSymbol}-USD`;

      // Check cache first (unless forced)
      if (!forceUpdate) {
        const cached = this.getCachedPrice(pair);
        if (cached) {
          log.debug('[BackgroundPriceService] Using cached price', false, {
            pair,
            price: cached.price,
            provider: cached.provider,
            cachedFor: now - cached.timestamp + 'ms'
          });
          await this.updatePriceInStorage(chainId, address, cached.price, nativeSymbol);
          return;
        }
      }

      // Check for pending request to avoid duplicate API calls
      let priceData;
      if (this.pendingRequests.has(pair)) {
        log.debug(`[BackgroundPriceService] Waiting for pending request for ${pair}`);
        priceData = await this.pendingRequests.get(pair);
      } else {
        // Create new request and store promise
        const pricePromise = this.priceManager!.getMarketPrice(pair);
        this.pendingRequests.set(pair, pricePromise);

        try {
          priceData = await pricePromise;
        } finally {
          this.pendingRequests.delete(pair);
        }
      }

      if (priceData && priceData.price > 0) {
        // Cache the price
        this.setCachedPrice(pair, priceData.price, priceData.provider);

        // Update storage directly (no Svelte stores)
        await this.updatePriceInStorage(chainId, address, priceData.price, nativeSymbol);

        this.lastPriceUpdate = now;

        log.info('[BackgroundPriceService] Updated native token price', false, {
          chainId,
          address,
          price: priceData.price,
          symbol: nativeSymbol,
          provider: priceData.provider,
          cached: false
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
   * Update token prices and calculate values in cache
   * Uses batch processing and deduplication to minimize API calls
   */
  private async updateTokenPrices(cache: any): Promise<void> {
    if (!cache?.chainAccountCache) return;

    await this.ensurePriceManagerInitialized();

    let updatedTokenCount = 0;
    let failedTokenCount = 0;

    // First pass: collect all unique price pairs needed
    const uniquePairs = new Set<string>();
    const tokenToPairMap = new Map<string, string>();

    for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
      for (const [address, accountCache] of Object.entries(chainData as any)) {
        const cacheData = accountCache as any;
        if (!cacheData.tokens || cacheData.tokens.length === 0) continue;

        for (const token of cacheData.tokens) {
          let pair: string | null = null;

          if (token.isNative) {
            const symbol = this.getNativeTokenSymbol(Number(chainId));
            pair = `${symbol}-USD`;
          } else {
            const tokenSymbol = token.symbol?.toUpperCase();
            if (tokenSymbol && ['USDC', 'USDT', 'DAI'].includes(tokenSymbol)) {
              // Skip stablecoins - they're always $1
              continue;
            } else if (tokenSymbol && ['WETH', 'WBTC'].includes(tokenSymbol)) {
              pair = tokenSymbol === 'WETH' ? 'ETH-USD' : 'BTC-USD';
            }
          }

          if (pair) {
            uniquePairs.add(pair);
            const tokenKey = `${chainId}-${address}-${token.address || 'native'}`;
            tokenToPairMap.set(tokenKey, pair);
          }
        }
      }
    }

    log.info(`[BackgroundPriceService] Batch fetching ${uniquePairs.size} unique price pairs`);

    // Batch fetch all unique pairs at once
    const pairPrices = new Map<string, number>();
    for (const pair of uniquePairs) {
      // Check cache first
      const cached = this.getCachedPrice(pair);
      if (cached) {
        pairPrices.set(pair, cached.price);
        log.debug(`[BackgroundPriceService] Using cached price for ${pair}: ${cached.price}`);
        continue;
      }

      // Check for pending request
      if (this.pendingRequests.has(pair)) {
        try {
          const priceData = await this.pendingRequests.get(pair);
          if (priceData?.price > 0) {
            pairPrices.set(pair, priceData.price);
          }
        } catch (error) {
          log.warn(`[BackgroundPriceService] Pending request failed for ${pair}`, false, error);
        }
        continue;
      }

      // Fetch new price
      const pricePromise = this.priceManager!.getMarketPrice(pair);
      this.pendingRequests.set(pair, pricePromise);

      try {
        const priceData = await pricePromise;
        if (priceData?.price > 0) {
          pairPrices.set(pair, priceData.price);
          this.setCachedPrice(pair, priceData.price, priceData.provider);
          log.debug(`[BackgroundPriceService] Fetched new price for ${pair}: ${priceData.price}`);
        }
      } catch (error) {
        log.warn(`[BackgroundPriceService] Failed to fetch price for ${pair}`, false, error);
      } finally {
        this.pendingRequests.delete(pair);
      }
    }

    // Second pass: apply prices and calculate values
    for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
      for (const [address, accountCache] of Object.entries(chainData as any)) {
        const cacheData = accountCache as any;

        if (!cacheData.tokens || cacheData.tokens.length === 0) {
          log.debug(`[BackgroundPriceService] No tokens for ${address} on chain ${chainId}`);
          continue;
        }

        log.info(`[BackgroundPriceService] Processing ${cacheData.tokens.length} tokens for ${address} on chain ${chainId}`);

        // Apply batch-fetched prices and calculate values for each token
        for (let i = 0; i < cacheData.tokens.length; i++) {
          const token = cacheData.tokens[i];
          try {
            let price: number | null = null;
            const tokenKey = `${chainId}-${address}-${token.address || 'native'}`;
            const pair = tokenToPairMap.get(tokenKey);

            if (token.isNative && pair) {
              // Native token - get price from batch fetch
              price = pairPrices.get(pair) || null;
              if (price) {
                log.debug(`[BackgroundPriceService] Using batch-fetched price for native ${token.symbol}: ${price}`);
              }
            } else {
              // ERC20 token pricing
              const tokenSymbol = token.symbol?.toUpperCase();
              if (tokenSymbol && ['USDC', 'USDT', 'DAI'].includes(tokenSymbol)) {
                // Stablecoins default to $1
                price = 1.0;
                log.debug(`[BackgroundPriceService] Using default stablecoin price for ${tokenSymbol}: ${price}`);
              } else if (tokenSymbol && ['WETH', 'WBTC'].includes(tokenSymbol) && pair) {
                // Wrapped tokens - get price from batch fetch
                price = pairPrices.get(pair) || null;
                if (price) {
                  log.debug(`[BackgroundPriceService] Using batch-fetched price for wrapped ${tokenSymbol}: ${price}`);
                }
              }
              // For other ERC20 tokens, price remains null (no pricing available yet)
            }

            if (price !== null && price > 0) {
              // Update token with new price
              cacheData.tokens[i].price = price;
              cacheData.tokens[i].priceLastUpdated = new Date().toISOString();

              // Calculate value (balance * price) using proper BigNumber math
              try {
                const tokenBalance = token.balance || token.qty || token.quantity;

                if (!tokenBalance || tokenBalance === '0' || tokenBalance === '0n') {
                  log.debug(`[BackgroundPriceService] Zero balance for ${token.symbol}, skipping value calculation`);
                  continue;
                }

                // Get correct decimals for each token
                let decimals = token.decimals;
                if (typeof decimals === 'bigint') {
                  decimals = Number(decimals);
                }
                if (!decimals || decimals === 0) {
                  // Set known decimals for common tokens
                  switch (token.symbol?.toUpperCase()) {
                    case 'USDC':
                    case 'USDT':
                      decimals = 6;
                      break;
                    case 'WBTC':
                      decimals = 8;
                      break;
                    case 'ETH':
                    case 'WETH':
                    case 'DAI':
                      decimals = 18;
                      break;
                    default:
                      decimals = 18; // Default to 18 for unknown tokens
                  }
                }

                // Standardize the balance to human-readable format first
                const standardizedBalance = BigNumberishUtils.standardizeBalance(tokenBalance, decimals);

                // Now convert to Decimal for calculation
                let balanceDecimal: Decimal;
                if (BigNumberishUtils.isRawBalance(tokenBalance, decimals)) {
                  // Balance is in raw format (smallest units), convert it
                  balanceDecimal = new Decimal(BigNumberishUtils.toDecimal(tokenBalance, decimals));
                  log.debug(`[BackgroundPriceService] Converting raw balance for ${token.symbol}: ${tokenBalance} (${decimals} decimals) -> ${balanceDecimal.toString()} tokens`);
                } else {
                  // Balance is already human-readable
                  balanceDecimal = new Decimal(standardizedBalance);
                  log.debug(`[BackgroundPriceService] Using human-readable balance for ${token.symbol}: ${standardizedBalance} tokens`);
                }

                // Multiply balance by price to get USD value
                const valueDecimal = balanceDecimal.times(price);

                // Store as cents (multiply by 100) as BigInt
                const valueInCents = valueDecimal.times(100).toFixed(0);

                // Bounds checking
                if (new Decimal(valueInCents).gt(Number.MAX_SAFE_INTEGER)) {
                  log.warn(`[BackgroundPriceService] Value too large for ${token.symbol}: ${valueDecimal.toString()}`);
                  cacheData.tokens[i].value = BigInt(Number.MAX_SAFE_INTEGER);
                } else {
                  cacheData.tokens[i].value = BigInt(valueInCents);
                }

                log.info(`[BackgroundPriceService] Updated value for ${token.symbol}:`, {
                  originalBalance: tokenBalance?.toString(),
                  decimals,
                  standardizedBalance: standardizedBalance,
                  balanceDecimal: balanceDecimal.toString(),
                  price: price,
                  valueDecimal: valueDecimal.toString(),
                  valueInCents,
                  finalValue: cacheData.tokens[i].value?.toString()
                });

                updatedTokenCount++;
              } catch (error) {
                log.error(`[BackgroundPriceService] Error calculating value for ${token.symbol}:`, error);
                // Don't set value to 0, preserve cached value
                continue;
              }
            } else {
              log.debug(`[BackgroundPriceService] No price for ${token.symbol}`);
              failedTokenCount++;
            }
          } catch (error) {
            log.warn(`[BackgroundPriceService] Failed to fetch price for ${token.symbol}:`, error);
            failedTokenCount++;
          }
        }

        // Update portfolio total for this account
        let totalValue = 0n;
        for (const token of cacheData.tokens) {
          try {
            // Ensure token.value is a BigInt
            let tokenValue = 0n;
            if (token.value !== undefined && token.value !== null) {
              if (typeof token.value === 'bigint') {
                tokenValue = token.value;
              } else {
                tokenValue = BigInt(token.value) || 0n;
              }
            }

            // Bounds checking for portfolio total
            if (totalValue <= BigInt(Number.MAX_SAFE_INTEGER) - tokenValue) {
              totalValue += tokenValue;
            } else {
              log.warn(`[BackgroundPriceService] Portfolio total overflow detected for account`);
              totalValue = BigInt(Number.MAX_SAFE_INTEGER);
              break;
            }
          } catch (error) {
            log.warn(`[BackgroundPriceService] Failed to add token value for ${token.symbol}:`, error);
          }
        }

        log.info(`[BackgroundPriceService] Portfolio total for account:`, {
          accountAddress: address,
          chainId,
          tokenCount: cacheData.tokens.length,
          totalValue: totalValue.toString(),
          totalValueUSD: Number(totalValue) / 100 // Convert cents to dollars for logging
        });

        // Always set the portfolio object with the calculated value
        cacheData.portfolio = {
          ...cacheData.portfolio,
          totalValue,
          lastCalculated: new Date().toISOString(),
          tokenCount: cacheData.tokens.length
        };
      }
    }

    // Save updated cache back to storage
    await browser.storage.local.set({
      yakklWalletCache: cache,
      lastPriceUpdate: Date.now()
    });

    log.info(`[BackgroundPriceService] Price and value update completed. Updated: ${updatedTokenCount}, Failed: ${failedTokenCount}`);
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
    return `${symbol}-USD`;
  }

  /**
   * Update prices and calculate values in cache (called by coordinator)
   */
  public async updatePricesAndValues(): Promise<void> {
    try {
      log.debug('[BackgroundPriceService] Starting coordinated price and value update');

      // Get current cache from storage
      const storage = await browser.storage.local.get(['yakklWalletCache']);
      const cache = storage.yakklWalletCache;

      if (!cache) {
        log.debug('[BackgroundPriceService] No cache available');
        return;
      }

      // Update prices and calculate values
      await this.updateTokenPrices(cache);

    } catch (error) {
      log.error('[BackgroundPriceService] Failed to update prices and values', false, error);
    }
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
            // Check cache first
            const cached = this.getCachedPrice(pair);
            let price;

            if (cached) {
              price = { price: cached.price, provider: cached.provider };
            } else if (this.pendingRequests.has(pair)) {
              // Wait for pending request
              price = await this.pendingRequests.get(pair);
            } else {
              // Create new request
              const pricePromise = this.priceManager!.getMarketPrice(pair);
              this.pendingRequests.set(pair, pricePromise);

              try {
                price = await pricePromise;
                if (price?.price > 0) {
                  this.setCachedPrice(pair, price.price, price.provider);
                }
              } finally {
                this.pendingRequests.delete(pair);
              }
            }

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
            this.pendingRequests.delete(pair);
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

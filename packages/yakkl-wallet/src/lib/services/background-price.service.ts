/**
 * Background Price Service
 * Fetches token prices using PriceManager with failover support
 * Updates token values in storage for UI display
 */

import browser from 'webextension-polyfill';
import { PriceManager } from '$lib/managers/PriceManager';
import { log } from '$lib/common/logger-wrapper';
import {
  STORAGE_YAKKL_TOKEN_CACHE,
  STORAGE_YAKKL_WALLET_CACHE,
  STORAGE_YAKKL_ADDRESS_TOKEN_CACHE
} from '$lib/common/constants';
import { BigNumber } from '$lib/common/bignumber';
// EthereumBigNumber removed - using generic BigNumber
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import Decimal from 'decimal.js';
import type { TokenCache } from '$lib/types';
import { safeUpdateToken, fixZeroValues, isValidTokenData, safeMergeTokens } from '$lib/utilities/cache-protection';

export class BackgroundPriceService {
  private static instance: BackgroundPriceService | null = null;
  private priceManager: PriceManager;
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;

  // Intervals
  private readonly TEST_INTERVAL = 15 * 1000; // 15 seconds for testing
  private readonly PROD_INTERVAL = 60 * 1000; // 60 seconds for production

  // Token to price ID mapping for common tokens
  private readonly TOKEN_PRICE_MAPPING: Record<string, string> = {
    // Native tokens
    'ETH': 'ETH-USD',
    'MATIC': 'MATIC-USD',
    'BNB': 'BNB-USD',

    // Stablecoins
    'USDC': 'USDC-USD',
    'USDT': 'USDT-USD',
    'DAI': 'DAI-USD',
    'BUSD': 'BUSD-USD',

    // Wrapped tokens
    'WETH': 'ETH-USD',
    'WMATIC': 'MATIC-USD',
    'WBNB': 'BNB-USD',

    // Popular tokens
    'LINK': 'LINK-USD',
    'UNI': 'UNI-USD',
    'AAVE': 'AAVE-USD',
    'SUSHI': 'SUSHI-USD',
    'CRV': 'CRV-USD',
    'MKR': 'MKR-USD',
    'COMP': 'COMP-USD',
    'SNX': 'SNX-USD',
    'YFI': 'YFI-USD',

    // Layer 2 tokens
    'ARB': 'ARB-USD',
    'OP': 'OP-USD',

    // Meme tokens (for testing)
    'SHIB': 'SHIB-USD',
    'DOGE': 'DOGE-USD',
    'PEPE': 'PEPE-USD'
  };

  private constructor() {
    this.priceManager = new PriceManager();
    // Note: PriceManager needs async initialization, done in start()
    log.info('[BackgroundPriceService] Service constructor called');
  }

  static getInstance(): BackgroundPriceService {
    if (!BackgroundPriceService.instance) {
      BackgroundPriceService.instance = new BackgroundPriceService();
    }
    return BackgroundPriceService.instance;
  }

  /**
   * Start automatic price updates
   */
  async start(): Promise<void> {
    log.info('[BackgroundPriceService] Starting price update service');

    // Initialize PriceManager with providers
    try {
      await this.priceManager.initialize();
      log.info('[BackgroundPriceService] PriceManager initialized with providers');
    } catch (error) {
      log.error('[BackgroundPriceService] Failed to initialize PriceManager:', error);
      throw error;
    }

    // Do initial update
    await this.updateAllPrices();

    // Start interval
    const interval = process.env.NODE_ENV === 'production' ? this.PROD_INTERVAL : this.TEST_INTERVAL;
    this.updateInterval = setInterval(() => {
      this.updateAllPrices();
    }, interval);

    log.info(`[BackgroundPriceService] Price updates scheduled every ${interval / 1000} seconds`);
  }

  /**
   * Stop automatic price updates
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      log.info('[BackgroundPriceService] Price update service stopped');
    }
  }

  /**
   * Update all token prices and calculate values
   */
  async updateAllPrices(): Promise<void> {
    if (this.isUpdating) {
      log.debug('[BackgroundPriceService] Update already in progress, skipping');
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      log.info('[BackgroundPriceService] Starting price update for all tokens');

      // Get both wallet cache and address token cache
      const storage = await browser.storage.local.get([STORAGE_YAKKL_WALLET_CACHE, STORAGE_YAKKL_ADDRESS_TOKEN_CACHE]);
      const walletCache = storage[STORAGE_YAKKL_WALLET_CACHE] as any;
      const addressTokenCache = storage[STORAGE_YAKKL_ADDRESS_TOKEN_CACHE] as any;

      if (!walletCache?.chainAccountCache) {
        log.debug('[BackgroundPriceService] No wallet cache found, skipping price update');
        return;
      }

      let updatedTokenCount = 0;
      let failedTokenCount = 0;

      // Process each chain
      for (const [chainId, chainData] of Object.entries(walletCache.chainAccountCache)) {
        // Process each account
        for (const [address, accountCache] of Object.entries(chainData as any)) {
          const cache = accountCache as any;

          if (!cache.tokens || cache.tokens.length === 0) {
            continue;
          }

          // Update prices for each token
          for (let i = 0; i < cache.tokens.length; i++) {
            const token = cache.tokens[i];
            try {
              // Prepare update data
              let updateData: any = { ...token };
              
              // Try to get quantity from addressTokenCache if balance is missing or zero
              if ((!token.balance || token.balance === '0' || token.balance === '0n') && addressTokenCache && Array.isArray(addressTokenCache)) {
                // Look for this token in addressTokenCache array
                const cachedToken = addressTokenCache.find((item: any) =>
                  item.walletAddress?.toLowerCase() === address.toLowerCase() &&
                  item.chainId === Number(chainId) &&
                  item.tokenAddress?.toLowerCase() === token.address?.toLowerCase()
                );

                if (cachedToken?.quantity) {
                  // Use quantity from addressTokenCache, convert from BigNumberish to formatted
                  const quantity = BigNumberishUtils.toBigInt(cachedToken.quantity);
                  if (quantity && quantity > 0n) {
                    const decimals = token.decimals || 18;
                    updateData.balance = BigNumberishUtils.fromWeiToNumber(quantity, decimals).toString();
                    log.debug(`[BackgroundPriceService] Using quantity from addressTokenCache for ${token.symbol}: ${updateData.balance}`);
                  }
                }
              }

              const price = await this.fetchTokenPrice(token);

              if (price !== null && price > 0) {
                // Update token with new price
                updateData.price = price;
                updateData.priceLastUpdated = new Date().toISOString();
              }
              
              // Use safe update to preserve valid cached data
              const updatedToken = safeUpdateToken(token, updateData);
              cache.tokens[i] = updatedToken;
              
              if (updatedToken.price && updatedToken.price > 0) {

                // Calculate value (balance * price) using proper BigNumber math
                try {
                  // Balance might be stored as 'balance' or 'qty' field
                  const tokenBalance = updatedToken.balance || (updatedToken as any).qty || (updatedToken as any).quantity;
                  let balanceDecimal: Decimal;

                  console.log(`[BackgroundPriceService] Processing token ${updatedToken.symbol}:`, {
                    balance: tokenBalance,
                    price: updatedToken.price,
                    address: updatedToken.address,
                    decimals: updatedToken.decimals
                  });

                  if (!tokenBalance || tokenBalance === '0' || tokenBalance === '0n') {
                    // Don't set value to 0, let cache protection handle it
                    console.log(`[BackgroundPriceService] Zero balance for ${updatedToken.symbol}, preserving cached value`);
                    continue;
                  }

                  // Get correct decimals for each token
                  let decimals = updatedToken.decimals;
                  if (typeof decimals === 'bigint') {
                    decimals = Number(decimals);
                  }
                  if (!decimals || decimals === 0) {
                    // Set known decimals for common tokens
                    switch (updatedToken.symbol?.toUpperCase()) {
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
                  if (BigNumberishUtils.isRawBalance(tokenBalance, decimals)) {
                    // Balance is in raw format (smallest units), convert it
                    balanceDecimal = new Decimal(BigNumberishUtils.toDecimal(tokenBalance, decimals));
                    console.log(`[BackgroundPriceService] Converting raw balance for ${token.symbol}: ${tokenBalance} (${decimals} decimals) -> ${balanceDecimal.toString()} tokens`);
                  } else {
                    // Balance is already human-readable
                    balanceDecimal = new Decimal(standardizedBalance);
                    console.log(`[BackgroundPriceService] Using human-readable balance for ${token.symbol}: ${standardizedBalance} tokens`);
                  }

                  // Multiply balance by price to get USD value
                  const valueDecimal = balanceDecimal.times(updatedToken.price);

                  // Store as cents (multiply by 100) as BigInt
                  const valueInCents = valueDecimal.times(100).toFixed(0);

                  // Bounds checking
                  if (new Decimal(valueInCents).gt(Number.MAX_SAFE_INTEGER)) {
                    console.log(`[BackgroundPriceService] Value too large for ${updatedToken.symbol}: ${valueDecimal.toString()}`);
                    cache.tokens[i].value = BigInt(Number.MAX_SAFE_INTEGER);
                  } else {
                    cache.tokens[i].value = BigInt(valueInCents);
                  }

                  // Ensure value is set on the token
                  if (!cache.tokens[i].value || cache.tokens[i].value === 0n) {
                    console.log(`[BackgroundPriceService] Token value is zero after calculation for ${updatedToken.symbol}:`, {
                      balance: tokenBalance,
                      balanceDecimal: balanceDecimal.toString(),
                      price,
                      valueDecimal: valueDecimal.toString(),
                      valueInCents
                    });
                  }

                  updatedTokenCount++;
                  console.log(`[BackgroundPriceService] CRITICAL VALUE UPDATE for ${updatedToken.symbol}:`, {
                    originalBalance: tokenBalance?.toString(),
                    decimals,
                    standardizedBalance: standardizedBalance,
                    balanceDecimal: balanceDecimal.toString(),
                    price: updatedToken.price,
                    valueDecimal: valueDecimal.toString(),
                    valueInCents,
                    finalValue: cache.tokens[i].value?.toString()
                  });
                } catch (error) {
                  log.error(`[BackgroundPriceService] Error calculating value for ${updatedToken.symbol}:`, error);
                  // Don't set value to 0, preserve cached value
                  continue;
                }
              } else {
                log.debug(`[BackgroundPriceService] No price for ${updatedToken.symbol}`);
                failedTokenCount++;
              }
            } catch (error) {
              log.warn(`[BackgroundPriceService] Failed to fetch price for ${token.symbol}:`, error);
              failedTokenCount++;
            }
          }

          // Update portfolio total for this account
          let totalValue = 0n;
          const tokenValueBreakdown: any[] = [];

          for (const token of cache.tokens) {
            try {
              // Ensure token.value is a BigInt
              let tokenValue = 0n;
              if (token.value !== undefined && token.value !== null) {
                if (typeof token.value === 'bigint') {
                  tokenValue = token.value;
                } else {
                  tokenValue = BigNumber.toBigInt(token.value) || 0n;
                }
              }

              tokenValueBreakdown.push({
                symbol: token.symbol,
                value: tokenValue.toString(),
                balance: token.balance,
                price: token.price,
                hasValue: token.value !== undefined
              });

              // Bounds checking for portfolio total
              if (totalValue <= BigInt(Number.MAX_SAFE_INTEGER) - tokenValue) {
                totalValue += tokenValue;
              } else {
                console.log(`[BackgroundPriceService] Portfolio total overflow detected for account`);
                totalValue = BigInt(Number.MAX_SAFE_INTEGER);
                break;
              }
            } catch (error) {
              console.log(`[BackgroundPriceService] Failed to add token value for ${token.symbol}:`, error);
            }
          }

          console.log(`[BackgroundPriceService] Portfolio total for account:`, {
            accountAddress: cache.account?.address,
            chainId,
            tokenCount: cache.tokens.length,
            tokensWithValues: cache.tokens.filter(t => t.value !== undefined && t.value !== null).length,
            tokensWithPrice: cache.tokens.filter(t => t.price !== undefined && t.price !== null && t.price > 0).length,
            tokenBreakdown: tokenValueBreakdown,
            totalValue: totalValue.toString(),
            totalValueUSD: Number(totalValue) / 100 // Convert cents to dollars for logging
          });

          // Always set the portfolio object with the calculated value
          cache.portfolio = {
            ...cache.portfolio,
            totalValue,
            lastCalculated: new Date().toISOString(),
            tokenCount: cache.tokens.length
          };
        }
      }

      // Save updated cache back to storage
      await browser.storage.local.set({
        [STORAGE_YAKKL_WALLET_CACHE]: walletCache,
        lastPriceUpdate: Date.now()
      });

      const duration = Date.now() - startTime;
      console.log(`[BackgroundPriceService] Price update completed in ${duration}ms. Updated: ${updatedTokenCount}, Failed: ${failedTokenCount}`);

    } catch (error) {
      log.error('[BackgroundPriceService] Error updating prices:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Fetch price for a single token using PriceManager
   */
  private async fetchTokenPrice(token: any): Promise<number | null> {
    try {
      // Check if token is native or has special handling
      if (token.isNative && token.symbol === 'ETH') {
        // For native ETH, always use ETH-USD
        const priceData = await this.priceManager.getMarketPrice('ETH-USD');
        return priceData.price;
      }

      // Look up price pair from mapping
      const pricePair = this.TOKEN_PRICE_MAPPING[token.symbol?.toUpperCase()];

      if (!pricePair) {
        // Try constructing pair from symbol
        const fallbackPair = `${token.symbol?.toUpperCase()}-USD`;
        log.debug(`[BackgroundPriceService] No mapping for ${token.symbol}, trying ${fallbackPair}`);

        try {
          const priceData = await this.priceManager.getMarketPrice(fallbackPair);
          return priceData.price;
        } catch {
          log.debug(`[BackgroundPriceService] Failed to fetch price for unmapped token ${token.symbol}`);
          return null;
        }
      }

      // Fetch price using mapped pair
      const priceData = await this.priceManager.getMarketPrice(pricePair);
      return priceData.price;

    } catch (error) {
      // PriceManager already handles retries with different providers
      log.debug(`[BackgroundPriceService] All providers failed for ${token.symbol}`);
      return null;
    }
  }

  /**
   * Force immediate price update (called from UI)
   */
  async forceUpdate(): Promise<void> {
    log.info('[BackgroundPriceService] Force update requested');
    
    // Ensure PriceManager is initialized
    if (!this.priceManager || this.priceManager.getAvailableProviders().length === 0) {
      try {
        await this.priceManager.initialize();
        log.info('[BackgroundPriceService] PriceManager initialized on force update');
      } catch (error) {
        log.error('[BackgroundPriceService] Failed to initialize PriceManager on force update:', error);
        return;
      }
    }
    
    await this.updateAllPrices();
  }

  /**
   * Add custom token price mapping
   */
  addTokenMapping(symbol: string, pricePair: string): void {
    this.TOKEN_PRICE_MAPPING[symbol.toUpperCase()] = pricePair;
    log.info(`[BackgroundPriceService] Added price mapping: ${symbol} -> ${pricePair}`);
  }
}

// Export singleton getter
export const getBackgroundPriceService = () => BackgroundPriceService.getInstance();

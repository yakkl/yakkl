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
import { EthereumBigNumber } from '$lib/common/bignumber-ethereum';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import Decimal from 'decimal.js';
import type { TokenCache } from '$lib/stores/wallet-cache.store';

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
    log.info('[BackgroundPriceService] Service initialized');
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
          for (const token of cache.tokens) {
            try {
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
                    token.balance = BigNumberishUtils.fromWeiToNumber(quantity, decimals).toString();
                    log.debug(`[BackgroundPriceService] Using quantity from addressTokenCache for ${token.symbol}: ${token.balance}`);
                  }
                }
              }
              
              const price = await this.fetchTokenPrice(token);
              
              if (price !== null && price > 0) {
                // Update token with new price
                token.price = price;
                token.priceLastUpdated = new Date().toISOString();
                
                // Calculate value (balance * price) using proper BigNumber math
                try {
                  // Balance might be stored as string, BigNumberish, or already in correct units
                  let balanceDecimal: Decimal;
                  
                  if (!token.balance || token.balance === '0' || token.balance === '0n') {
                    token.value = 0n;
                    log.debug(`[BackgroundPriceService] Zero balance for ${token.symbol}`);
                    continue;
                  }
                  
                  // Check if balance looks like wei (very large number)
                  if (BigNumberishUtils.isWeiValue(token.balance)) {
                    // Convert from wei to token units (assuming 18 decimals for ETH-like tokens)
                    const decimals = token.decimals || 18;
                    balanceDecimal = BigNumberishUtils.toDecimal(token.balance, decimals);
                    log.debug(`[BackgroundPriceService] Converting wei balance for ${token.symbol}: ${token.balance} wei -> ${balanceDecimal.toString()} tokens`);
                  } else {
                    // Balance is already in token units, just convert to Decimal
                    balanceDecimal = new Decimal(token.balance.toString());
                  }
                  
                  // Multiply balance by price to get USD value
                  const valueDecimal = balanceDecimal.times(price);
                  
                  // Store as cents (multiply by 100) as BigInt
                  const valueInCents = valueDecimal.times(100).toFixed(0);
                  
                  // Bounds checking
                  if (new Decimal(valueInCents).gt(Number.MAX_SAFE_INTEGER)) {
                    log.warn(`[BackgroundPriceService] Value too large for ${token.symbol}: ${valueDecimal.toString()}`);
                    token.value = BigInt(Number.MAX_SAFE_INTEGER);
                  } else {
                    token.value = BigInt(valueInCents);
                  }
                  
                  updatedTokenCount++;
                  log.debug(`[BackgroundPriceService] Updated ${token.symbol}: price=$${price}, balance=${balanceDecimal.toString()}, value=$${valueDecimal.toFixed(2)}`);
                } catch (error) {
                  log.error(`[BackgroundPriceService] Error calculating value for ${token.symbol}:`, error);
                  token.value = 0n;
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
          for (const token of cache.tokens) {
            try {
              const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
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
          
          cache.portfolio = {
            ...cache.portfolio,
            totalValue,
            lastCalculated: new Date().toISOString()
          };
        }
      }

      // Save updated cache back to storage
      await browser.storage.local.set({
        [STORAGE_YAKKL_WALLET_CACHE]: walletCache,
        lastPriceUpdate: Date.now()
      });

      const duration = Date.now() - startTime;
      log.info(`[BackgroundPriceService] Price update completed in ${duration}ms. Updated: ${updatedTokenCount}, Failed: ${failedTokenCount}`);

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
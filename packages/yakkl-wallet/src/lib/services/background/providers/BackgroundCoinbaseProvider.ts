/**
 * BackgroundCoinbaseProvider - Service worker compatible Coinbase price provider
 *
 * Uses robust fetch utility from yakkl-core with exponential backoff
 * Works in service worker context without window or import.meta.env
 */

import type { MarketPriceData, PriceProvider } from '$lib/common/interfaces';
import { log } from '$lib/common/logger-wrapper';
import { fetchJson } from '@yakkl/core';

export class BackgroundCoinbaseProvider implements PriceProvider {
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  getAPIKey(): string {
    // In service workers, we can't use import.meta.env
    // API key should be passed in constructor or stored in browser.storage
    return this.apiKey || '';
  }

  getName(): string {
    return 'Coinbase';
  }

  async getMarketPrice(pair: string): Promise<MarketPriceData> {
    try {
      if (!pair) {
        return {
          provider: this.getName(),
          price: 0,
          lastUpdated: new Date(),
          status: 404,
          message: `Invalid pair - ${pair}`
        };
      }

      // Convert pair format if needed
      pair = await this.getProviderPairFormat(pair);

      const [tokenIn, tokenOut] = pair.split('-');
      if (!tokenIn || !tokenOut) {
        return {
          provider: this.getName(),
          price: 0,
          lastUpdated: new Date(),
          status: 404,
          message: `Invalid pair - ${pair}`
        };
      }

      // Special handling for stablecoins
      if (tokenIn === 'USDC' && tokenOut === 'USD') {
        return {
          provider: this.getName(),
          price: 1.00,
          lastUpdated: new Date(),
          currency: tokenOut,
          status: 0,
          message: ''
        };
      }

      // Convert WETH to ETH for Coinbase
      if (tokenIn === 'WETH') {
        pair = `ETH-${tokenOut}`;
      }
      if (tokenIn === 'WBTC') {
        pair = `BTC-${tokenOut}`;
      }

      // Use robust fetchJson from yakkl-core
      const url = `https://api.coinbase.com/api/v3/brokerage/market/products?limit=1&product_ids=${pair}`;

      log.debug('[BackgroundCoinbaseProvider] Fetching price', false, { pair, url });

      // Use fetchJson with exponential backoff and retry logic
      const json = await fetchJson(url, {
        maxRetries: 3,
        timeout: 10000,
        logLevel: 'warn',
        onRetry: (attempt, error) => {
          log.warn('[BackgroundCoinbaseProvider] Retrying price fetch', false, {
            pair,
            attempt,
            error: error?.message
          });
        }
      });

      log.debug('[BackgroundCoinbaseProvider] Response received', false, {
        pair,
        num_products: json.num_products,
        products: json.products?.length
      });

      if (!json.num_products || json.num_products <= 0 || !json.products || json.products.length === 0) {
        return {
          provider: this.getName(),
          price: 0,
          lastUpdated: new Date(),
          status: 404,
          message: `No data found for - ${pair}`
        };
      }

      const price = parseFloat(json.products[0].price);

      log.info('[BackgroundCoinbaseProvider] Price fetched successfully', false, {
        pair,
        price,
        product_id: json.products[0].product_id
      });

      return {
        provider: this.getName(),
        price: price,
        lastUpdated: new Date(),
        currency: tokenOut,
        status: 0,
        message: ''
      };
    } catch (error: any) {
      log.error('[BackgroundCoinbaseProvider] Error fetching price', false, {
        pair,
        error: error.message,
        stack: error.stack
      });

      let status = 404;
      let message = `Error - ${error.message}`;

      if (error.message?.includes('429')) {
        status = 429;
        message = 'Too Many Requests - Rate limit exceeded';
      }

      return {
        provider: this.getName(),
        price: 0,
        lastUpdated: new Date(),
        status,
        message
      };
    }
  }

  async getProviderPairFormat(pair: string): Promise<string> {
    // Convert common formats to Coinbase format
    // Input: ETH/USD or ETH-USD
    // Output: ETH-USD
    return pair.replace('/', '-');
  }
}
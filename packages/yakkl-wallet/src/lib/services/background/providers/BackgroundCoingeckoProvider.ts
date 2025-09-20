/**
 * BackgroundCoingeckoProvider - Service worker compatible Coingecko price provider
 *
 * Uses robust fetch utility from yakkl-core with exponential backoff
 * Works in service worker context without window or import.meta.env
 */

import type { MarketPriceData, PriceProvider } from '$lib/common/interfaces';
import { log } from '$lib/common/logger-wrapper';
import { fetchJson } from '@yakkl/core';

export class BackgroundCoingeckoProvider implements PriceProvider {
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
    return 'Coingecko';
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

      const [name, currencySymbol] = await this.getProviderPairFormat(pair);
      if (!name || !currencySymbol) {
        return {
          provider: this.getName(),
          price: 0,
          lastUpdated: new Date(),
          status: 404,
          message: `Invalid pair - ${pair}`
        };
      }

      // Use public API if no API key (rate limited but works for basic needs)
      const apiKey = this.getAPIKey();
      const baseUrl = apiKey
        ? 'https://pro-api.coingecko.com/api/v3'
        : 'https://api.coingecko.com/api/v3';

      const url = `${baseUrl}/simple/price?ids=${name}&include_last_updated_at=true&vs_currencies=${currencySymbol}`;

      log.debug('[BackgroundCoingeckoProvider] Fetching price', false, {
        pair,
        name,
        currencySymbol,
        hasApiKey: !!apiKey
      });

      const headers: Record<string, string> = {};

      // Add API key header if available
      if (apiKey) {
        headers['x-cg-pro-api-key'] = apiKey;
      }

      // Use fetchJson with exponential backoff and retry logic
      const json = await fetchJson(url, {
        headers,
        maxRetries: 3,
        timeout: 10000,
        logLevel: 'warn',
        onRetry: (attempt, error) => {
          log.warn('[BackgroundCoingeckoProvider] Retrying price fetch', false, {
            pair,
            attempt,
            error: error?.message
          });
        }
      });

      log.debug('[BackgroundCoingeckoProvider] Response received', false, {
        pair,
        data: json
      });

      const priceData = json[name.toLowerCase()];

      if (!priceData || !priceData[currencySymbol.toLowerCase()]) {
        log.warn('[BackgroundCoingeckoProvider] No price data in response', false, {
          name: name.toLowerCase(),
          currency: currencySymbol.toLowerCase(),
          response: json
        });
        return {
          provider: this.getName(),
          price: 0,
          lastUpdated: new Date(),
          status: 404,
          message: `No price data for ${name}/${currencySymbol}`
        };
      }

      const price = parseFloat(priceData[currencySymbol.toLowerCase()]);
      const lastUpdated = priceData.last_updated_at
        ? new Date(priceData.last_updated_at * 1000)
        : new Date();

      log.info('[BackgroundCoingeckoProvider] Price fetched successfully', false, {
        pair,
        price,
        name,
        currencySymbol
      });

      return {
        provider: this.getName(),
        price: price,
        lastUpdated: lastUpdated,
        currency: currencySymbol,
        status: 0,
        message: 'Success'
      };
    } catch (error: any) {
      log.error('[BackgroundCoingeckoProvider] Error fetching price', false, {
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

  async getProviderPairFormat(pair: string): Promise<[string, string]> {
    // Convert pair format to Coingecko's expected format
    // Input: ETH/USD or ETH-USD
    // Output: ["ethereum", "usd"]

    const parts = pair.replace('/', '-').split('-');
    if (parts.length !== 2) {
      return ['', ''];
    }

    const [symbol, currencySymbol] = parts;
    let name = '';

    // Map common symbols to Coingecko IDs
    switch (symbol.toUpperCase()) {
      case 'ETH':
      case 'WETH':
        name = 'ethereum';
        break;
      case 'BTC':
      case 'WBTC':
        name = 'bitcoin';
        break;
      case 'USDC':
        name = 'usd-coin';
        break;
      case 'DAI':
        name = 'dai';
        break;
      case 'USDT':
        name = 'tether';
        break;
      case 'BUSD':
        name = 'binance-usd';
        break;
      case 'WBTC':
        name = 'wrapped-bitcoin';
        break;
      case 'MATIC':
        name = 'matic-network';
        break;
      case 'BNB':
        name = 'binancecoin';
        break;
      case 'AVAX':
        name = 'avalanche-2';
        break;
      case 'SOL':
        name = 'solana';
        break;
      case 'DOT':
        name = 'polkadot';
        break;
      case 'UNI':
        name = 'uniswap';
        break;
      case 'LINK':
        name = 'chainlink';
        break;
      case 'AAVE':
        name = 'aave';
        break;
      default:
        // Try using the symbol as-is (lowercase)
        name = symbol.toLowerCase();
    }

    return [name, currencySymbol.toLowerCase()];
  }
}
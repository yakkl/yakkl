/**
 * BackgroundPriceManager - Service worker compatible price manager
 *
 * Uses background-compatible price providers that work in service workers
 * Manages provider selection, weighting, and failover
 */

import type { PriceData, PriceProvider, WeightedProvider } from '$lib/common/interfaces';
import { BackgroundCoinbaseProvider } from './BackgroundCoinbaseProvider';
import { BackgroundCoingeckoProvider } from './BackgroundCoingeckoProvider';
import { log } from '$lib/common/logger-wrapper';

export class BackgroundPriceManager {
  private weightedProviders: WeightedProvider[];
  private totalWeight: number;
  private readonly DEFAULT_WEIGHT = 1;

  constructor(weightedProviders?: WeightedProvider[]) {
    this.weightedProviders = weightedProviders || [];
    this.totalWeight = this.calculateTotalWeight();
  }

  /**
   * Initialize the price manager asynchronously
   * API keys are loaded from environment variables at build time
   */
  async initialize(weightedProviders?: WeightedProvider[]): Promise<void> {
    const providers = weightedProviders || await this.getDefaultProviders();

    if (!providers || providers.length === 0) {
      throw new Error('At least one provider must be specified');
    }

    this.weightedProviders = this.normalizeWeights(providers);
    this.totalWeight = this.calculateTotalWeight();

    log.info('[BackgroundPriceManager] Initialized with providers', false, {
      providers: this.weightedProviders.map(wp => ({
        name: wp.provider.getName(),
        weight: wp.weight
      }))
    });
  }

  /**
   * Get default providers configured for background/service worker context
   * API keys are provided via environment variables at build time
   */
  async getDefaultProviders(): Promise<WeightedProvider[]> {
    // Get API keys from environment variables (compiled at build time by Webpack)
    // These are replaced during the build process and not exposed to the runtime
    // The actual values come from .env files and are never stored in browser storage
    // Background context uses Webpack, so we use process.env, not import.meta.env
    const coinbaseApiKey = process.env.VITE_COINBASE_API_KEY || '';
    const coingeckoApiKey = process.env.VITE_COINGECKO_API_KEY || '';

    const providers: WeightedProvider[] = [
      {
        provider: new BackgroundCoinbaseProvider(coinbaseApiKey),
        weight: 8
      },
      {
        provider: new BackgroundCoingeckoProvider(coingeckoApiKey),
        weight: 5
      }
    ];

    log.info('[BackgroundPriceManager] Providers initialized', false, {
      hasCoinbaseKey: !!coinbaseApiKey,
      hasCoingeckoKey: !!coingeckoApiKey
    });

    return providers;
  }

  private normalizeWeights(providers: WeightedProvider[]): WeightedProvider[] {
    const allZeroWeights = providers.every((wp) => wp.weight === 0);
    const allEqualWeights = providers.every((wp) => wp.weight === providers[0].weight);

    if (allZeroWeights || allEqualWeights) {
      // If all weights are zero or equal, assign default weight to all
      return providers.map((wp) => ({ ...wp, weight: this.DEFAULT_WEIGHT }));
    }

    // Replace any zero weights with the smallest non-zero weight
    const smallestNonZeroWeight = Math.min(
      ...providers.filter((wp) => wp.weight > 0).map((wp) => wp.weight)
    );
    return providers.map((wp) => ({
      ...wp,
      weight: wp.weight === 0 ? smallestNonZeroWeight : wp.weight
    }));
  }

  private calculateTotalWeight(): number {
    return this.weightedProviders.reduce((sum, wp) => sum + wp.weight, 0);
  }

  public getAvailableProviders(): PriceProvider[] {
    return this.weightedProviders.map((wp) => wp.provider);
  }

  /**
   * Get market price with fallback logic
   */
  async getMarketPrice(pair: string, availableProviders?: PriceProvider[]): Promise<PriceData> {
    let provider: PriceProvider | null = null;
    let providersToUse: PriceProvider[] = [];
    let lastError: any = null;

    try {
      providersToUse = availableProviders || this.getAvailableProviders();
      if (providersToUse.length === 0) {
        throw new Error('No providers available to fetch market price');
      }

      // Try providers in order of weight
      const sortedProviders = [...this.weightedProviders]
        .filter(wp => providersToUse.includes(wp.provider))
        .sort((a, b) => b.weight - a.weight);

      log.debug('[BackgroundPriceManager] Attempting to fetch price', false, {
        pair,
        providers: sortedProviders.map(wp => wp.provider.getName())
      });

      for (const weightedProvider of sortedProviders) {
        provider = weightedProvider.provider;

        try {
          log.debug(`[BackgroundPriceManager] Trying ${provider.getName()}`, false, { pair });

          const price = await provider.getMarketPrice(pair);

          // Check if we got a valid price
          if (price && price.price > 0) {
            log.info('[BackgroundPriceManager] Price fetched successfully', false, {
              pair,
              provider: provider.getName(),
              price: price.price
            });
            return price;
          } else {
            log.warn(`[BackgroundPriceManager] ${provider.getName()} returned no price`, false, {
              pair,
              response: price
            });
          }
        } catch (error) {
          lastError = error;
          log.warn(`[BackgroundPriceManager] ${provider.getName()} failed`, false, {
            pair,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue to next provider
        }
      }

      // All providers failed
      throw new Error(`All providers failed to fetch price for ${pair}. Last error: ${lastError?.message || 'Unknown'}`);

    } catch (error) {
      log.error('[BackgroundPriceManager] Failed to get market price', false, {
        pair,
        error: error instanceof Error ? error.message : String(error)
      });

      // Return a failed response
      return {
        provider: provider?.getName() || 'unknown',
        price: 0,
        lastUpdated: new Date(),
        status: 500,
        message: error instanceof Error ? error.message : 'Failed to fetch price'
      };
    }
  }

  /**
   * Get price from a specific weighted random provider (legacy compatibility)
   */
  private getWeightedRandomProvider(providers: PriceProvider[]): PriceProvider {
    if (!providers || providers.length === 0) {
      log.error('[BackgroundPriceManager] No providers available');
      throw new Error('No providers available to fetch market price');
    }

    if (providers.length === 1) {
      return providers[0];
    }

    try {
      const weightedProviders = this.weightedProviders.filter((wp) =>
        providers.includes(wp.provider)
      );
      const totalWeight = weightedProviders.reduce((sum, wp) => sum + wp.weight, 0);

      if (weightedProviders.every((wp) => wp.weight === weightedProviders[0].weight)) {
        // If all weights are equal, choose randomly
        return weightedProviders[Math.floor(Math.random() * weightedProviders.length)].provider;
      }

      let random = Math.random() * totalWeight;

      for (const wp of weightedProviders) {
        if (random < wp.weight) {
          return wp.provider;
        }
        random -= wp.weight;
      }

      // This should never happen if weights are set correctly
      return weightedProviders[0].provider;
    } catch (error) {
      log.error('[BackgroundPriceManager] Error selecting weighted random provider', false, error);
      throw error;
    }
  }

  /**
   * Batch fetch prices for multiple pairs with deduplication
   * Prevents multiple simultaneous requests for the same pair
   */
  async getMarketPrices(pairs: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    const uniquePairs = [...new Set(pairs)]; // Remove duplicates

    log.info(`[BackgroundPriceManager] Batch fetching prices for ${uniquePairs.length} unique pairs (${pairs.length} total requested)`);

    // Fetch prices concurrently but with a limit to respect API rate limits
    const batchSize = 2; // Reduced to be more conservative
    for (let i = 0; i < uniquePairs.length; i += batchSize) {
      const batch = uniquePairs.slice(i, i + batchSize);
      const promises = batch.map(async (pair) => {
        try {
          const price = await this.getMarketPrice(pair);
          results.set(pair, price);
          log.debug(`[BackgroundPriceManager] Batch: Fetched ${pair} = ${price.price}`);
        } catch (error) {
          log.error(`[BackgroundPriceManager] Failed to fetch price for ${pair}`, false, error);
          results.set(pair, {
            provider: 'unknown',
            price: 0,
            lastUpdated: new Date(),
            status: 500,
            message: 'Failed to fetch price'
          });
        }
      });

      await Promise.all(promises);

      // Add small delay between batches to respect rate limits
      if (i + batchSize < uniquePairs.length) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }

    log.info(`[BackgroundPriceManager] Batch fetch completed: ${results.size} prices fetched`);
    return results;
  }
}
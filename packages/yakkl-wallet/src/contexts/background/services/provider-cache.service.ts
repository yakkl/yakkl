/**
 * Provider Cache Service for Background Context
 * Manages provider connections and caching to optimize blockchain operations
 */

import { log } from '$lib/common/logger-wrapper';
import type { ProviderInterface } from '@yakkl/core';
import { ProviderRouter } from '@yakkl/routing';
import { backgroundProviderManager } from './provider-manager';

interface CachedProvider {
  chainId: number;
  provider: ProviderInterface;
  lastUsed: number;
  initialized: boolean;
}

export class ProviderCacheService {
  private static instance: ProviderCacheService;
  private providerCache = new Map<number, CachedProvider>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 10; // Maximum number of cached providers
  private providerRouter: ProviderRouter;

  private constructor() {
    // Initialize the provider router from yakkl-routing package
    this.providerRouter = new ProviderRouter({
      strategy: 'balanced',
      maxRetries: 3,
      failoverEnabled: true
    });
    this.startCacheMaintenance();
  }

  static getInstance(): ProviderCacheService {
    if (!ProviderCacheService.instance) {
      ProviderCacheService.instance = new ProviderCacheService();
    }
    return ProviderCacheService.instance;
  }

  /**
   * Get or initialize a provider for the given chain
   */
  async getProvider(chainId: number): Promise<ProviderInterface> {
    // Check if chain is supported first
    const cached = this.providerCache.get(chainId);

    // Return cached provider if still valid and connected
    if (cached && cached.initialized && cached.provider) {
      // Verify the cached provider is still connected (check if property exists first)
      const isConnected = cached.provider.isConnected !== undefined ? cached.provider.isConnected : true;
      if (isConnected) {
        cached.lastUsed = Date.now();
        return cached.provider;
      } else {
        log.warn('[ProviderCache] Cached provider is not connected, re-initializing', false, {
          chainId,
          chainName: this.getChainName(chainId)
        });
        // Remove invalid cached provider
        this.providerCache.delete(chainId);
      }
    }

    try {
      // First check if we have any providers registered
      // If not, try to initialize with background provider manager
      const stats = this.providerRouter.getStatistics();
      if (stats.totalProviders === 0) {
        // Try to initialize a provider using the background provider manager
        await backgroundProviderManager.initialize(chainId);
        const provider = backgroundProviderManager.getProvider();

        if (provider) {
          // Register the provider with the router
          this.providerRouter.registerProvider(provider);
        } else {
          throw new Error(`No provider available from background manager for chain ${chainId}`);
        }
      }

      // Use the provider router to get the best provider for this chain
      const provider = await this.providerRouter.getBestProvider(chainId, 'eth_getBlockNumber', []);

      if (!provider) {
        const errorMsg = `Provider router returned null for chain ${chainId} (${this.getChainName(chainId)})`;
        log.error('[ProviderCache] ' + errorMsg, false, {
          chainId,
          chainName: this.getChainName(chainId),
          totalProviders: stats.totalProviders
        });
        throw new Error(errorMsg);
      }

      // Verify provider is connected - check if property exists and is true
      const isConnected = provider.isConnected !== undefined ? provider.isConnected : true;
      if (!isConnected) {
        // Try to reconnect once
        try {
          await provider.connect(chainId);
          if (!provider.isConnected) {
            throw new Error('Still not connected after reconnect attempt');
          }
        } catch (reconnectError) {
          const errorMsg = `Provider for chain ${chainId} (${this.getChainName(chainId)}) could not be connected`;
          log.error('[ProviderCache] ' + errorMsg, false, {
            providerName: provider.metadata.name,
            reconnectError: reconnectError instanceof Error ? reconnectError.message : 'Unknown'
          });
          throw new Error(errorMsg);
        }
      }

      // Cache the provider
      this.providerCache.set(chainId, {
        chainId,
        provider,
        lastUsed: Date.now(),
        initialized: true
      });

      // Enforce cache size limit
      this.enforceCacheLimit();
      return provider;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if this is an initialization/startup error
      const isStartupError = errorMessage.includes('not available') ||
                           errorMessage.includes('not ready') ||
                           errorMessage.includes('Provider router') ||
                           errorMessage.includes('returned null') ||
                           errorMessage.includes('No providers available') ||
                           errorMessage.includes('Cannot read properties of null');

      const errorDetails = {
        chainId,
        chainName: this.getChainName(chainId),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage,
        routerStats: this.providerRouter.getStatistics()
      };

      // Use debug level for expected startup errors, error level for unexpected failures
      // During startup, provider initialization failures are expected and not critical
      if (isStartupError) {
        log.debug('[ProviderCache] Provider initialization deferred (service starting up):', false, errorDetails);
      } else {
        log.error('[ProviderCache] Failed to get provider - detailed context:', false, errorDetails);
      }
      // Remove failed cache entry if it exists
      this.providerCache.delete(chainId);
      throw new Error(`Provider cache failed for chain ${chainId}: ${errorMessage}`);
    }
  }

  /**
   * Get human-readable chain name
   */
  private getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      137: 'Polygon',
      80001: 'Mumbai Testnet',
      56: 'BSC',
      97: 'BSC Testnet',
      42161: 'Arbitrum',
      421613: 'Arbitrum Goerli',
      10: 'Optimism',
      420: 'Optimism Goerli',
      43114: 'Avalanche',
      43113: 'Avalanche Fuji'
    };
    return chainNames[chainId] || `${chainId}`;
  }

  /**
   * Get supported chain IDs for Alchemy provider
   */
  // private getSupportedAlchemyChains(): number[] {
  //   // Only chains that Alchemy actually supports
  //   return [
  //     1,        // Ethereum Mainnet
  //     5,        // Goerli (deprecated but still supported)
  //     11155111, // Sepolia
  //     137,      // Polygon Mainnet
  //     80001,    // Polygon Mumbai
  //     42161,    // Arbitrum One
  //     421613,   // Arbitrum Goerli
  //     10,       // Optimism
  //     420,      // Optimism Goerli
  //     8453,     // Base Mainnet
  //     84531     // Base Goerli
  //   ];
  // }


  /**
   * Pre-warm providers for common chains (only supported ones)
   */
  async preWarmProviders(chainIds?: number[]): Promise<void> {
    // Use only supported chains for pre-warming
    const defaultChains = [1, 137, 42161]; // Mainnet, Polygon, Arbitrum
    const chainsToWarm = chainIds || defaultChains;

    // Since we can't use async filter directly, check each chain for support
    const supportedChains: number[] = [];
    for (const chainId of chainsToWarm) {
      try {
        // Check if chain is supported - but don't fail if provider isn't available yet
        const isSupported = await this.checkChainSupportSafely(chainId);
        if (isSupported) {
          supportedChains.push(chainId);
        }
      } catch (error) {
        // If we can't check support, we'll try to pre-warm anyway
        supportedChains.push(chainId);
      }
    }

    if (supportedChains.length === 0) {
      return;
    }

    for (const chainId of supportedChains) {
      try {
        await this.getProvider(chainId);
        // Small delay between initializations to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        log.warn('[ProviderCache] Failed to pre-warm provider', false, { chainId, error });
      }
    }
  }

  /**
   * Safely check if a chain is supported without throwing
   */
  private async checkChainSupportSafely(chainId: number): Promise<boolean> {
    try {
      // Check if we can get a provider for this chain from the router
      const provider = await this.providerRouter.getBestProvider(chainId, 'eth_chainId');
      return provider !== null;
    } catch (error) {
      // For fallback, check if it's in our known supported chains
      const knownSupportedChains = [1, 5, 11155111, 137, 80001, 42161, 421613, 10, 420, 8453, 84531];
      return knownSupportedChains.includes(chainId);
    }
  }

  /**
   * Clear expired providers from cache
   */
  private cleanExpiredProviders(): void {
    const now = Date.now();
    const expired: number[] = [];

    this.providerCache.forEach((cached, chainId) => {
      if (now - cached.lastUsed > this.CACHE_TTL) {
        expired.push(chainId);
      }
    });

    expired.forEach(chainId => {
      this.providerCache.delete(chainId);
    });
  }

  /**
   * Enforce maximum cache size
   */
  private enforceCacheLimit(): void {
    if (this.providerCache.size <= this.MAX_CACHE_SIZE) {
      return;
    }

    // Sort by last used time and remove oldest
    const entries = Array.from(this.providerCache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    const toRemove = entries.slice(0, this.providerCache.size - this.MAX_CACHE_SIZE);

    toRemove.forEach(([chainId]) => {
      this.providerCache.delete(chainId);
    });
  }

  /**
   * Start periodic cache maintenance
   */
  private startCacheMaintenance(): void {
    // Clean expired providers every minute
    setInterval(() => {
      this.cleanExpiredProviders();
    }, 60000);

    // Pre-warm common providers on startup (delayed to avoid blocking)
    setTimeout(() => {
      this.preWarmProviders().catch(error => {
        log.warn('[ProviderCache] Pre-warm failed', false, error);
      });
    }, 5000);
  }

  /**
   * Clear all cached providers
   */
  clearCache(): void {
    this.providerCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; chains: number[] } {
    return {
      size: this.providerCache.size,
      chains: Array.from(this.providerCache.keys())
    };
  }
}

// Export singleton instance
export const providerCache = ProviderCacheService.getInstance();

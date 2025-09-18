import { DirectAlchemyProvider } from '$lib/sdk/providers/direct/DirectAlchemyProvider';
import type { ProviderInterface } from '@yakkl/core';
import { log } from '$lib/managers/Logger';
import browser from 'webextension-polyfill';
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from '$lib/common/constants';
import { getAlchemyApiKey as getConfiguredAlchemyKey } from '$lib/config/api-keys.config';

/**
 * Background-only provider manager
 * This should ONLY be used in the background service worker context
 * Client contexts should never directly access blockchain providers
 */
export class BackgroundProviderManager {
  private static instance: BackgroundProviderManager;
  private provider: ProviderInterface | null = null;
  private initialized = false;
  private initializing = false;
  private initializationPromise: Promise<void> | null = null;
  private currentChainId: number | null = null;

  private constructor() {}

  static getInstance(): BackgroundProviderManager {
    if (!BackgroundProviderManager.instance) {
      BackgroundProviderManager.instance = new BackgroundProviderManager();
    }
    return BackgroundProviderManager.instance;
  }

  /**
   * Initialize the provider for background context only
   */
  async initialize(chainId: number = 1): Promise<void> {
    // Check if already initialized for this specific chain
    if (this.initialized && this.currentChainId === chainId && this.provider && this.provider.isConnected) {
      return;
    }

    // If already initializing, wait for the existing initialization
    if (this.initializing && this.initializationPromise) {
      try {
        await this.initializationPromise;
        // Check if we now have the right chain after waiting
        if (this.currentChainId === chainId && this.provider && this.provider.isConnected) {
          return;
        }
      } catch (error) {
        log.warn('[BackgroundProviderManager] Previous initialization failed during wait', false, error);
      }
    }

    // If switching chains, clean up old provider first
    if (this.initialized && this.currentChainId !== chainId) {
      await this.cleanup();
    }

    // Set initializing flag and create promise
    this.initializing = true;
    this.initializationPromise = this.doInitialize(chainId);

    try {
      await this.initializationPromise;
      // Verify we're in the expected state after initialization
      if (!this.initialized || !this.provider || this.currentChainId !== chainId) {
        throw new Error(`Initialization completed but provider state is invalid - initialized: ${this.initialized}, hasProvider: ${!!this.provider}, currentChain: ${this.currentChainId}, expectedChain: ${chainId}`);
      }
    } finally {
      this.initializing = false;
      this.initializationPromise = null;
    }
  }

  private async doInitialize(chainId: number): Promise<void> {
    try {
      // Try to get Alchemy API key from environment
      const apiKey = this.getAlchemyApiKey();

      if (!apiKey) {
        const errorMsg = 'No provider API key found in environment variables';
        log.error('[BackgroundProviderManager] ' + errorMsg, false);
        throw new Error(errorMsg);
      }

      const blockchain = this.getBlockchainForChainId(chainId);
      log.info('[BackgroundProviderManager] Creating DirectAlchemyProvider', false, {
        chainId,
        blockchain,
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey.substring(0, 8) + '...'
      });

      // Create DirectAlchemyProvider
      this.provider = new DirectAlchemyProvider(chainId, apiKey, {
        blockchain,
        supportedChainIds: [chainId]
      });

      await this.provider.connect(chainId);
      // Verify connection state
      if (!this.provider.isConnected) {
        // Try a simple request to verify actual connectivity
        try {
          const testChainId = await this.provider.request({ method: 'eth_chainId' });
          const parsedChainId = parseInt(testChainId as string, 16);
          if (parsedChainId === chainId) {
            // Force the connection state if the provider is actually working
            (this.provider as any)._isConnected = true;
          } else {
            throw new Error(`Chain ID mismatch: expected ${chainId}, got ${parsedChainId}`);
          }
        } catch (testError) {
          throw new Error(`Provider connection completed but verification failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
        }
      }

      this.initialized = true;
      this.currentChainId = chainId;
      log.info('[BackgroundProviderManager] Provider initialized and connected successfully', false, {
        chainId,
        blockchain,
        providerName: this.provider.metadata.name,
        isConnected: this.provider.isConnected,
        initialized: this.initialized,
        currentChainId: this.currentChainId
      });
    } catch (error) {
      const errorDetails = {
        chainId,
        blockchain: this.getBlockchainForChainId(chainId),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        hasApiKey: !!this.getAlchemyApiKey()
      };
      log.error('[BackgroundProviderManager] Failed to initialize provider - detailed context:', false, errorDetails);
      // Clean up on failure
      this.initialized = false;
      this.provider = null;
      this.currentChainId = null;
      throw new Error(`Provider initialization failed for chain ${chainId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the provider (background context only)
   */
  getProvider(): ProviderInterface | null {
    if (!this.initialized) {
      log.error('[BackgroundProviderManager] Provider not initialized', false, {
        initialized: this.initialized,
        hasProvider: !!this.provider,
        currentChainId: this.currentChainId,
        isInitializing: this.initializing
      });
      return null;
    }
    if (!this.provider) {
      log.error('[BackgroundProviderManager] Provider is null despite being initialized', false, {
        initialized: this.initialized,
        currentChainId: this.currentChainId
      });
      // Reset initialization state since we're in an invalid state
      this.initialized = false;
      this.currentChainId = null;
      return null;
    }
    return this.provider;
  }

  /**
   * Get Alchemy API key from environment
   */
  private getAlchemyApiKey(): string | null {
    // First try the new config-based approach
    const configKey = getConfiguredAlchemyKey();
    if (configKey) {
      log.info('[BackgroundProviderManager] Found API key from api-keys.config');
      return configKey;
    }

    // Fallback to checking environment variables directly
    // This is for backwards compatibility and debugging
    const possibleKeys = [
      'VITE_ALCHEMY_API_KEY_ETHEREUM',
      'VITE_ALCHEMY_API_KEY_PROD_1',
      'VITE_ALCHEMY_API_KEY_PROD_2',
      'ALCHEMY_API_KEY_PROD_1',
      'ALCHEMY_API_KEY_PROD_2',
      'ALCHEMY_API_KEY_DEV'
    ];

    for (const key of possibleKeys) {
      let value = null;

      // Try import.meta.env first (Vite environment)
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        // Check both with and without VITE_ prefix in import.meta.env
        value = import.meta.env[key] || import.meta.env[`VITE_${key}`];
        if (value && value !== 'undefined') {
          log.info(`[BackgroundProviderManager] Found API key in import.meta.env: ${key}`);
          return value;
        }
      }

      // Try process.env as fallback
      if (typeof process !== 'undefined' && process.env) {
        // Check both with and without VITE_ prefix in process.env
        value = process.env[key] || process.env[`VITE_${key}`];
        if (value && value !== 'undefined') {
          log.info(`[BackgroundProviderManager] Found API key in process.env: ${key}`);
          return value;
        }
      }
    }

    // Log what we checked for debugging
    log.error('[BackgroundProviderManager] No API key found. Checked config and keys:', false, possibleKeys);
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      log.debug('[BackgroundProviderManager] Available import.meta.env keys:', false, Object.keys(import.meta.env));
    }
    if (typeof process !== 'undefined' && process.env) {
      log.debug('[BackgroundProviderManager] Available process.env keys (filtered):', false,
        Object.keys(process.env).filter(k => k.includes('ALCHEMY') || k.includes('API_KEY')));
    }

    return null;
  }

  /**
   * Get blockchain name for chain ID
   */
  private getBlockchainForChainId(chainId: number): string {
    const blockchainMap: Record<number, string> = {
      1: 'ethereum',
      5: 'ethereum',
      11155111: 'ethereum',
      137: 'polygon',
      80001: 'polygon',
      42161: 'arbitrum',
      421613: 'arbitrum',
      10: 'optimism',
      420: 'optimism',
      8453: 'base',
      84531: 'base',
      56: 'bsc',
      97: 'bsc'
    };

    return blockchainMap[chainId] || 'ethereum';
  }

  /**
   * Pre-initialize provider if yakklCurrentlySelected exists in storage
   * This ensures provider is ready before any client requests
   */
  async preInitialize(): Promise<void> {
    try {
      // Try to get currently selected data from storage
      const stored = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
      if (!stored || !stored[STORAGE_YAKKL_CURRENTLY_SELECTED]) {
        log.info('[BackgroundProviderManager] No currently selected data, skipping pre-init');
        return;
      }

      const currentlySelected = stored[STORAGE_YAKKL_CURRENTLY_SELECTED] as any;
      if (!currentlySelected?.shortcuts?.chainId) {
        log.info('[BackgroundProviderManager] No chainId in currently selected, skipping pre-init');
        return;
      }

      const chainId = currentlySelected.shortcuts.chainId;
      const address = currentlySelected.shortcuts.address;

      // Initialize the provider
      await this.initialize(chainId);

      // If we have an address, we can also pre-fetch the native balance
      if (address && this.provider) {
        try {
          const balance = await this.provider.getBalance(address);
          // Note: We don't save here - let the normal flow handle storage
        } catch (error) {
          log.warn('[BackgroundProviderManager] Failed to fetch balance:', false, error);
        }
      }
    } catch (error) {
      log.error('[BackgroundProviderManager] Initialization failed:', false, error);
      // Don't throw - this is optional optimization
    }
  }

  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return this.initialized && this.provider !== null;
  }

  /**
   * Get current chain ID
   */
  getCurrentChainId(): number | null {
    return this.currentChainId;
  }

  /**
   * Clean up and disconnect provider
   */
  async cleanup(): Promise<void> {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
      this.initialized = false;
      this.currentChainId = null;
    }
  }
}

// Export singleton instance for background context only
export const backgroundProviderManager = BackgroundProviderManager.getInstance();

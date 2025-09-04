import { DirectAlchemyProvider } from '$lib/sdk/providers/direct/DirectAlchemyProvider';
import type { IProvider } from '$lib/sdk/interfaces/IProvider';
import { log } from '$lib/managers/Logger';
import browser from 'webextension-polyfill';

/**
 * Background-only provider manager
 * This should ONLY be used in the background service worker context
 * Client contexts should never directly access blockchain providers
 */
export class BackgroundProviderManager {
  private static instance: BackgroundProviderManager;
  private provider: IProvider | null = null;
  private initialized = false;
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
    if (this.initialized && this.currentChainId === chainId) {
      log.debug('[BackgroundProviderManager] Already initialized for chain:', false, chainId);
      return;
    }

    // If switching chains, clean up old provider first
    if (this.initialized && this.currentChainId !== chainId) {
      log.info('[BackgroundProviderManager] Switching chains from', false, { from: this.currentChainId, to: chainId });
      await this.cleanup();
    }

    try {
      log.info('[BackgroundProviderManager] Initializing provider for chain:', false, chainId);
      
      // Try to get Alchemy API key from environment
      const apiKey = this.getAlchemyApiKey();
      
      if (!apiKey) {
        log.error('[BackgroundProviderManager] No Alchemy API key found in environment', false);
        throw new Error('No Alchemy API key available');
      }

      log.info('[BackgroundProviderManager] Creating DirectAlchemyProvider with API key');
      
      // Create DirectAlchemyProvider
      this.provider = new DirectAlchemyProvider(chainId, apiKey, {
        blockchain: this.getBlockchainForChainId(chainId),
        supportedChainIds: [chainId]
      });

      // Connect the provider
      log.info('[BackgroundProviderManager] Connecting provider...');
      await this.provider.connect(chainId);
      
      this.initialized = true;
      this.currentChainId = chainId;
      log.info('[BackgroundProviderManager] Provider initialized successfully for chain:', false, chainId);
    } catch (error) {
      log.error('[BackgroundProviderManager] Failed to initialize provider:', false, error);
      throw error;
    }
  }

  /**
   * Get the provider (background context only)
   */
  getProvider(): IProvider | null {
    if (!this.initialized) {
      log.warn('[BackgroundProviderManager] Provider not initialized');
      return null;
    }
    return this.provider;
  }

  /**
   * Get Alchemy API key from environment
   */
  private getAlchemyApiKey(): string | null {
    // Check for various Alchemy key formats in the environment
    const possibleKeys = [
      'VITE_ALCHEMY_API_KEY_ETHEREUM',
      'VITE_ALCHEMY_API_KEY_PROD_1', 
      'VITE_ALCHEMY_API_KEY_PROD_2',
      'ALCHEMY_API_KEY_PROD_1',
      'ALCHEMY_API_KEY_PROD_2'
    ];

    for (const key of possibleKeys) {
      // Try import.meta.env first (Vite environment)
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
        log.info(`[BackgroundProviderManager] Found API key: ${key}`);
        return import.meta.env[key];
      }
      
      // Try process.env as fallback
      if (typeof process !== 'undefined' && process.env && process.env[key]) {
        log.info(`[BackgroundProviderManager] Found API key: ${key}`);
        return process.env[key];
      }
    }

    // As a last resort, try the hardcoded key from the .env file
    // This is the VITE_ALCHEMY_API_KEY_ETHEREUM value
    const hardcodedKey = 'CJMbhcLze0h5M6Da7RPXNds25HL0cG1n';
    log.warn('[BackgroundProviderManager] Using hardcoded API key as fallback');
    return hardcodedKey;
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
      log.info('[BackgroundProviderManager] Pre-initializing provider from storage');
      
      // Try to get currently selected data from storage
      const stored = await browser.storage.local.get('yakkl-currently-selected');
      if (!stored || !stored['yakkl-currently-selected']) {
        log.info('[BackgroundProviderManager] No currently selected data, skipping pre-init');
        return;
      }

      const currentlySelected = stored['yakkl-currently-selected'] as any;
      if (!currentlySelected?.shortcuts?.chainId) {
        log.info('[BackgroundProviderManager] No chainId in currently selected, skipping pre-init');
        return;
      }

      const chainId = currentlySelected.shortcuts.chainId;
      const address = currentlySelected.shortcuts.address;
      
      log.info('[BackgroundProviderManager] Pre-initializing for chain:', false, { chainId, hasAddress: !!address });
      
      // Initialize the provider
      await this.initialize(chainId);
      
      // If we have an address, we can also pre-fetch the native balance
      if (address && this.provider) {
        log.info('[BackgroundProviderManager] Pre-fetching native balance for:', false, address);
        try {
          const balance = await this.provider.getBalance(address);
          log.info('[BackgroundProviderManager] Pre-fetched balance:', false, balance.toString());
          // Note: We don't save here - let the normal flow handle storage
        } catch (error) {
          log.warn('[BackgroundProviderManager] Failed to pre-fetch balance:', false, error);
        }
      }
      
      log.info('[BackgroundProviderManager] Pre-initialization complete');
    } catch (error) {
      log.error('[BackgroundProviderManager] Pre-initialization failed:', false, error);
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
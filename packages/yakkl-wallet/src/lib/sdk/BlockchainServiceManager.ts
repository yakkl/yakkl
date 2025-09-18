import type { ProviderInterface } from '@yakkl/core';
import type { ITransactionFetcher } from './interfaces/ITransactionFetcher';
import type { IPriceProvider } from './interfaces/IPriceProvider';
import type { IKeyManager } from './interfaces/IKeyManager';

import { EnhancedKeyManager } from './security/EnhancedKeyManager';
import { AlchemyProvider } from './providers/managed/AlchemyProvider';
import { AlchemyExplorer } from './providers/explorer/AlchemyExplorer';
import { GenericRPCProvider } from './providers/rpc/GenericRPCProvider';
import { DirectAlchemyProvider } from './providers/direct/DirectAlchemyProvider';
import { explorerRoutingManager } from './routing/ExplorerRoutingManager';
import { AlchemyPriceProvider } from './providers/price/AlchemyPriceProvider';
import { CoinbasePriceProvider } from './providers/price/CoinbasePriceProvider';
import { CoingeckoPriceProvider } from './providers/price/CoingeckoPriceProvider';
import type { PriceData, BatchPriceData, TokenPriceData } from './interfaces/IPriceProvider';

/**
 * Main orchestrator that coordinates network operations, price operations, and explorer operations
 * This is the primary interface that applications should use to interact with blockchain services
 */
export class BlockchainServiceManager {
  private static instance: BlockchainServiceManager | null = null;
  private initialized = false;
  private keyManager: IKeyManager;
  private providers = new Map<string, ProviderInterface>();
  private explorers = new Map<string, ITransactionFetcher>();
  private priceProviders = new Map<string, IPriceProvider>();
  private currentChainId = 1;
  private currentProvider: ProviderInterface | null = null;

  private constructor() {
    this.keyManager = EnhancedKeyManager.getInstance();
  }

  static getInstance(): BlockchainServiceManager {
    if (!BlockchainServiceManager.instance) {
      BlockchainServiceManager.instance = new BlockchainServiceManager();
    }
    return BlockchainServiceManager.instance;
  }

  /**
   * Initialize the blockchain service manager
   */
  async initialize(options: {
    defaultChainId?: number;
    autoSetupProviders?: boolean;
    enabledFeatures?: string[];
  } = {}): Promise<void> {
    console.log('[BlockchainServiceManager] initialize() called with options:', options);
    if (this.initialized) {
      console.log('[BlockchainServiceManager] Already initialized, returning');
      return;
    }

    const {
      defaultChainId = 1,
      autoSetupProviders = true,
      enabledFeatures = ['providers', 'explorers', 'prices']
    } = options;

    console.log('[BlockchainServiceManager] Initializing key manager...');
    // Initialize key manager first
    await this.keyManager.initialize();
    console.log('[BlockchainServiceManager] Key manager initialized');

    this.currentChainId = defaultChainId;
    console.log('[BlockchainServiceManager] Set currentChainId to:', defaultChainId);

    // Auto-setup providers if enabled
    if (autoSetupProviders) {
      console.log('[BlockchainServiceManager] Setting up default providers...');
      await this.setupDefaultProviders(enabledFeatures);
      console.log('[BlockchainServiceManager] Default providers setup complete');
    }

    this.initialized = true;
    console.log('[BlockchainServiceManager] Initialization complete. Current provider:', !!this.currentProvider);
  }

  /**
   * Setup default providers based on available API keys
   */
  private async setupDefaultProviders(enabledFeatures: string[]): Promise<void> {
    const availableProviders = await this.keyManager.getProviders();
    console.log('[BlockchainServiceManager] Available providers:', availableProviders);

    // Setup blockchain providers
    if (enabledFeatures.includes('providers')) {
      // First try to setup managed providers with API keys
      for (const providerName of availableProviders) {
        await this.setupProvider(providerName, this.currentChainId);
      }
      
      // If no provider was set up (no API keys), setup a minimal public RPC
      if (!this.currentProvider) {
        console.log('[BlockchainServiceManager] No managed providers configured, setting up default public RPC');
        await this.setupDefaultPublicRPC(this.currentChainId);
        console.log('[BlockchainServiceManager] After setupDefaultPublicRPC, currentProvider is:', !!this.currentProvider);
      }
    }

    // Setup explorers
    if (enabledFeatures.includes('explorers')) {
      for (const providerName of availableProviders) {
        await this.setupExplorer(providerName, this.currentChainId);
      }
    }

    // Setup price providers
    if (enabledFeatures.includes('prices')) {
      for (const providerName of availableProviders) {
        await this.setupPriceProvider(providerName);
      }
    }

    // Setup RPC fallbacks - DISABLED until production-ready RPC endpoints are configured
    // Uncomment when you have reliable RPC endpoints
    // await this.setupRPCFallbacks(this.currentChainId);
  }

  /**
   * Setup a provider for a specific chain
   */
  private async setupProvider(providerName: string, chainId: number): Promise<void> {
    try {
      const hasValidKeys = await this.keyManager.hasValidKeys(providerName);
      if (!hasValidKeys) {
        console.warn(`No valid keys for ${providerName}, skipping setup`);
        return;
      }

      let provider: ProviderInterface | null = null;

      switch (providerName.toLowerCase()) {
        case 'alchemy':
          provider = new AlchemyProvider(chainId, this.keyManager, {
            blockchain: this.getBlockchainForChainId(chainId),
            supportedChainIds: this.getSupportedChainIds(providerName)
          });
          break;

        // Add other managed providers here
        default:
          console.warn(`Unknown provider: ${providerName}`);
          return;
      }

      if (provider) {
        const providerKey = `${providerName}-${chainId}`;
        this.providers.set(providerKey, provider);
        await provider.connect(chainId);

        // Set as current provider if none is set
        if (!this.currentProvider) {
          this.currentProvider = provider;
        }
      }
    } catch (error) {
      console.error(`Failed to setup provider ${providerName}:`, error);
    }
  }

  /**
   * Setup an explorer for a specific chain
   */
  private async setupExplorer(providerName: string, chainId: number): Promise<void> {
    try {
      const hasValidKeys = await this.keyManager.hasValidKeys(providerName);
      if (!hasValidKeys) {
        return;
      }

      let explorer: ITransactionFetcher | null = null;

      switch (providerName.toLowerCase()) {
        case 'alchemy':
          explorer = new AlchemyExplorer(chainId, this.keyManager, {
            blockchain: this.getBlockchainForChainId(chainId)
          });
          break;

        // Add other explorers here
        default:
          return;
      }

      if (explorer) {
        const explorerKey = `${providerName}-${chainId}`;
        this.explorers.set(explorerKey, explorer);
        
        // Register with the routing manager
        explorerRoutingManager.registerExplorer(providerName, explorer);
      }
    } catch (error) {
      console.error(`Failed to setup explorer ${providerName}:`, error);
    }
  }

  /**
   * Setup a price provider
   */
  private async setupPriceProvider(providerName: string): Promise<void> {
    try {
      const hasValidKeys = await this.keyManager.hasValidKeys(providerName);
      if (!hasValidKeys) {
        return;
      }

      let priceProvider: IPriceProvider | null = null;

      switch (providerName.toLowerCase()) {
        case 'alchemy':
          priceProvider = new AlchemyPriceProvider(this.keyManager);
          break;
        case 'coinbase':
          priceProvider = new CoinbasePriceProvider(this.keyManager);
          break;
        case 'coingecko':
          priceProvider = new CoingeckoPriceProvider(this.keyManager);
          break;
        // Add other price providers here
        default:
          return;
      }

      if (priceProvider) {
        this.priceProviders.set(providerName, priceProvider);
      }
    } catch (error) {
      console.error(`Failed to setup price provider ${providerName}:`, error);
    }
  }

  /**
   * Setup a single default public RPC provider
   * NOTE: Currently disabled as public RPC endpoints are not production-ready
   */
  private async setupDefaultPublicRPC(chainId: number): Promise<void> {
    // Public RPC endpoints (llamarpc, blockpi, cloudflare, publicnode) are future features
    // and should not be used in production at this time
    console.warn('[BlockchainServiceManager] Public RPC fallback is disabled - no production-ready endpoints configured');
    
    // Instead of using public RPC, we'll try to use whatever Alchemy keys are available
    // even if they're not perfectly configured
    await this.setupAlchemyFallback(chainId);
  }

  /**
   * Setup Alchemy provider as fallback using any available keys
   */
  private async setupAlchemyFallback(chainId: number): Promise<void> {
    try {
      console.log('[BlockchainServiceManager] Attempting Alchemy fallback setup for chain:', chainId);
      
      // Try to get any Alchemy key available
      const apiKey = await this.getAnyAlchemyKey();
      if (!apiKey) {
        console.error('[BlockchainServiceManager] No Alchemy API keys found in environment');
        console.error('[BlockchainServiceManager] Expected keys: VITE_ALCHEMY_API_KEY_PROD_1, VITE_ALCHEMY_API_KEY_PROD_2, or VITE_ALCHEMY_API_KEY_ETHEREUM');
        return;
      }

      console.log('[BlockchainServiceManager] Found Alchemy API key, creating DirectAlchemyProvider...');
      
      // Use DirectAlchemyProvider which bypasses the KeyManager complexity
      const provider = new DirectAlchemyProvider(chainId, apiKey, {
        blockchain: this.getBlockchainForChainId(chainId),
        supportedChainIds: [chainId]
      });
      
      const providerKey = `direct-alchemy-${chainId}`;
      this.providers.set(providerKey, provider);
      
      // Connect the provider
      console.log('[BlockchainServiceManager] Connecting DirectAlchemyProvider...');
      await provider.connect(chainId);
      
      this.currentProvider = provider;
      console.log('[BlockchainServiceManager] Successfully set up DirectAlchemyProvider as fallback');
    } catch (error) {
      console.error('[BlockchainServiceManager] Failed to setup Alchemy fallback:', error);
    }
  }

  /**
   * Try to get any available Alchemy API key directly from environment
   */
  private async getAnyAlchemyKey(): Promise<string | null> {
    // Check for various Alchemy key formats in the environment
    const possibleKeys = [
      'VITE_ALCHEMY_API_KEY_ETHEREUM',
      'VITE_ALCHEMY_API_KEY_PROD_1', 
      'VITE_ALCHEMY_API_KEY_PROD_2',
      'VITE_ALCHEMY_API_KEY_POLYGON',
      'VITE_ALCHEMY_API_KEY_SOLANA',
      'VITE_ALCHEMY_API_KEY_ARBITRUM'
    ];

    for (const key of possibleKeys) {
      if (import.meta.env && import.meta.env[key]) {
        console.log(`[BlockchainServiceManager] Found API key: ${key}`);
        return import.meta.env[key];
      }
    }

    // Also check without VITE_ prefix as fallback
    const nonViteKeys = possibleKeys.map(k => k.replace('VITE_', ''));
    for (const key of nonViteKeys) {
      if (import.meta.env && import.meta.env[key]) {
        console.log(`[BlockchainServiceManager] Found API key: ${key}`);
        return import.meta.env[key];
      }
    }

    return null;
  }

  /**
   * Setup RPC fallback providers
   * NOTE: Currently disabled as public RPC endpoints are not production-ready
   */
  private async setupRPCFallbacks(chainId: number): Promise<void> {
    // Public RPC endpoints (llamarpc, blockpi, cloudflare, publicnode) are future features
    // and should not be used in production at this time
    console.log('[BlockchainServiceManager] RPC fallbacks are disabled - not production-ready');
    return;
  }

  /**
   * Get RPC fallback configurations for a chain
   * NOTE: These endpoints are not production-ready and should not be used
   */
  private getRPCFallbackConfigs(chainId: number): Array<{ name: string; endpoint: string }> {
    // Public RPC endpoints are disabled until they are production-ready
    // llamarpc, blockpi, cloudflare, publicnode are future features
    return [];
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
   * Get supported chain IDs for a provider
   */
  private getSupportedChainIds(providerName: string): number[] {
    const supportedChains: Record<string, number[]> = {
      alchemy: [1, 5, 11155111, 137, 80001, 42161, 421613, 10, 420, 8453, 84531],
      infura: [1, 5, 11155111, 137, 80001, 42161, 421613, 10, 420],
      quicknode: [1, 5, 137, 42161, 10, 8453, 56]
    };

    return supportedChains[providerName.toLowerCase()] || [1];
  }

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: number): Promise<void> {
    this.currentChainId = chainId;
    
    // Try to find an existing provider for this chain
    for (const [key, provider] of this.providers) {
      if (key.endsWith(`-${chainId}`) && provider.metadata.supportedChainIds.includes(chainId)) {
        await provider.connect(chainId);
        this.currentProvider = provider;
        explorerRoutingManager.setChainId(chainId);
        return;
      }
    }

    // If no provider found, setup new providers for this chain
    await this.setupDefaultProviders(['providers', 'explorers']);
  }

  /**
   * Get the current provider
   */
  getProvider(): ProviderInterface | null {
    return this.currentProvider;
  }

  /**
   * Get a specific provider by name and chain
   */
  getProviderByName(providerName: string, chainId?: number): ProviderInterface | null {
    const targetChainId = chainId || this.currentChainId;
    const key = `${providerName}-${targetChainId}`;
    return this.providers.get(key) || null;
  }

  /**
   * Get all available providers
   */
  getAllProviders(): Array<{ name: string; provider: ProviderInterface }> {
    const result: Array<{ name: string; provider: ProviderInterface }> = [];
    for (const [key, provider] of this.providers) {
      result.push({ name: key, provider });
    }
    return result;
  }

  /**
   * Get transaction history using the explorer routing manager
   */
  async getTransactionHistory(
    address: string,
    options?: {
      startBlock?: number;
      endBlock?: number;
      limit?: number;
      txType?: 'all' | 'normal' | 'internal' | 'erc20' | 'erc721';
    }
  ) {
    return await explorerRoutingManager.getTransactionHistory(address, options);
  }

  /**
   * Get token transfers using the explorer routing manager
   */
  async getTokenTransfers(
    address: string,
    options?: {
      contractAddress?: string;
      tokenType?: 'erc20' | 'erc721' | 'erc1155';
      limit?: number;
    }
  ) {
    return await explorerRoutingManager.getTokenTransfers(address, options);
  }

  /**
   * Get internal transactions using the explorer routing manager
   */
  async getInternalTransactions(
    address: string,
    options?: {
      startBlock?: number;
      endBlock?: number;
      limit?: number;
    }
  ) {
    return await explorerRoutingManager.getInternalTransactions(address, options);
  }

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(txHash: string) {
    return await explorerRoutingManager.getTransactionByHash(txHash);
  }

  /**
   * Get price for a single symbol
   */
  async getPrice(symbol: string): Promise<PriceData | null> {
    const batchResult = await this.getPrices([symbol]);
    return batchResult.get(symbol) || null;
  }

  /**
   * Get prices for multiple symbols using batch API
   */
  async getPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    if (symbols.length === 0) {
      return new Map();
    }

    // Group symbols by provider support and capabilities
    const result = new Map<string, PriceData>();
    const errors: string[] = [];

    // Try providers in order of preference (batch-capable first)
    for (const [providerName, provider] of this.priceProviders) {
      if (symbols.length === 0) break;

      try {
        // Use batch API for efficiency
        const batchResult = await provider.getBatchPrices(symbols);
        
        // Add successful results
        Object.entries(batchResult.prices).forEach(([pair, priceData]) => {
          result.set(pair, priceData);
          // Remove from symbols list since we got it
          const index = symbols.indexOf(pair);
          if (index > -1) {
            symbols.splice(index, 1);
          }
        });

        // Log errors but continue with other providers
        if (batchResult.errors) {
          Object.entries(batchResult.errors).forEach(([pair, error]) => {
            errors.push(`${providerName}: ${pair} - ${error}`);
          });
        }
      } catch (error) {
        console.warn(`Price provider ${providerName} failed:`, error);
        errors.push(`${providerName}: ${error}`);
      }
    }

    // Log remaining failures
    if (symbols.length > 0) {
      console.warn(`Failed to get prices for: ${symbols.join(', ')}`);
    }

    return result;
  }

  /**
   * Get token price by contract address
   */
  async getTokenPrice(
    contractAddress: string,
    chainId: number,
    vsCurrency: string = 'USD'
  ): Promise<TokenPriceData | null> {
    for (const [providerName, provider] of this.priceProviders) {
      try {
        return await provider.getTokenPrice(contractAddress, chainId, vsCurrency);
      } catch (error) {
        console.warn(`Token price provider ${providerName} failed:`, error);
        continue;
      }
    }
    return null;
  }

  /**
   * Get all available price providers
   */
  getPriceProviders(): Array<{ name: string; provider: IPriceProvider }> {
    const result: Array<{ name: string; provider: IPriceProvider }> = [];
    for (const [name, provider] of this.priceProviders) {
      result.push({ name, provider });
    }
    return result;
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    providers: { total: number; healthy: number };
    explorers: { total: number; healthy: number };
    priceProviders: { total: number; healthy: number };
    keyManager: { healthy: boolean; error?: string };
  }> {
    const providerHealthPromises = Array.from(this.providers.values()).map(p => 
      p.healthCheck().catch(() => ({ healthy: false }))
    );
    
    const priceProviderHealthPromises = Array.from(this.priceProviders.values()).map(p => 
      p.healthCheck().catch(() => ({ healthy: false }))
    );
    
    const [providerResults, priceProviderResults, explorerHealth, keyManagerHealth] = await Promise.all([
      Promise.all(providerHealthPromises),
      Promise.all(priceProviderHealthPromises),
      explorerRoutingManager.healthCheck(),
      this.keyManager.healthCheck()
    ]);

    const healthyProviders = providerResults.filter(r => r.healthy).length;
    const healthyPriceProviders = priceProviderResults.filter(r => r.healthy).length;

    return {
      healthy: healthyProviders > 0 && explorerHealth.healthy && keyManagerHealth.healthy,
      providers: {
        total: this.providers.size,
        healthy: healthyProviders
      },
      explorers: {
        total: explorerHealth.explorerCount,
        healthy: explorerHealth.healthyCount
      },
      priceProviders: {
        total: this.priceProviders.size,
        healthy: healthyPriceProviders
      },
      keyManager: keyManagerHealth
    };
  }

  /**
   * Get service statistics
   */
  getStats(): {
    currentChainId: number;
    providers: number;
    explorers: number;
    priceProviders: number;
    keyManager: string;
  } {
    return {
      currentChainId: this.currentChainId,
      providers: this.providers.size,
      explorers: this.explorers.size,
      priceProviders: this.priceProviders.size,
      keyManager: this.keyManager.constructor.name
    };
  }

  /**
   * Cleanup and disconnect all services
   */
  async cleanup(): Promise<void> {
    // Disconnect all providers
    const disconnectPromises = Array.from(this.providers.values()).map(provider => 
      provider.disconnect().catch(() => {})
    );
    
    await Promise.all(disconnectPromises);
    
    // Clear all maps
    this.providers.clear();
    this.explorers.clear();
    this.priceProviders.clear();
    
    this.currentProvider = null;
    this.initialized = false;
  }
}

// Export singleton instance getter
export const blockchainServiceManager = BlockchainServiceManager.getInstance();
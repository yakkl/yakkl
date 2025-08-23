import type { IProvider } from './interfaces/IProvider';
import type { ITransactionFetcher } from './interfaces/ITransactionFetcher';
import type { IPriceProvider } from './interfaces/IPriceProvider';
import type { IKeyManager } from './interfaces/IKeyManager';

import { EnhancedKeyManager } from './security/EnhancedKeyManager';
import { AlchemyProvider } from './providers/managed/AlchemyProvider';
import { AlchemyExplorer } from './providers/explorer/AlchemyExplorer';
import { GenericRPCProvider } from './providers/rpc/GenericRPCProvider';
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
  private providers = new Map<string, IProvider>();
  private explorers = new Map<string, ITransactionFetcher>();
  private priceProviders = new Map<string, IPriceProvider>();
  private currentChainId = 1;
  private currentProvider: IProvider | null = null;

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
    if (this.initialized) {
      return;
    }

    const {
      defaultChainId = 1,
      autoSetupProviders = true,
      enabledFeatures = ['providers', 'explorers', 'prices']
    } = options;

    // Initialize key manager first
    await this.keyManager.initialize();

    this.currentChainId = defaultChainId;

    // Auto-setup providers if enabled
    if (autoSetupProviders) {
      await this.setupDefaultProviders(enabledFeatures);
    }

    this.initialized = true;
  }

  /**
   * Setup default providers based on available API keys
   */
  private async setupDefaultProviders(enabledFeatures: string[]): Promise<void> {
    const availableProviders = await this.keyManager.getProviders();

    // Setup blockchain providers
    if (enabledFeatures.includes('providers')) {
      for (const providerName of availableProviders) {
        await this.setupProvider(providerName, this.currentChainId);
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

    // Setup RPC fallbacks - DISABLED for now until providers are properly configured
    // LlamaRPC and BlockPI need proper implementation before enabling
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

      let provider: IProvider | null = null;

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
   * Setup RPC fallback providers
   */
  private async setupRPCFallbacks(chainId: number): Promise<void> {
    const rpcConfigs = this.getRPCFallbackConfigs(chainId);
    
    for (const config of rpcConfigs) {
      try {
        const provider = GenericRPCProvider.createCustomProvider(
          config.endpoint,
          chainId,
          this.getBlockchainForChainId(chainId),
          { name: config.name }
        );
        
        const providerKey = `rpc-${config.name}-${chainId}`;
        this.providers.set(providerKey, provider);
        await provider.connect(chainId);
      } catch (error) {
        console.warn(`Failed to setup RPC fallback ${config.name}:`, error);
      }
    }
  }

  /**
   * Get RPC fallback configurations for a chain
   * NOTE: Currently DISABLED - LlamaRPC and BlockPI need proper implementation
   * These are placeholder configurations for future use
   */
  private getRPCFallbackConfigs(chainId: number): Array<{ name: string; endpoint: string }> {
    const configs: Record<number, Array<{ name: string; endpoint: string }>> = {
      1: [
        { name: 'llamarpc', endpoint: 'https://eth.llamarpc.com' },
        { name: 'blockpi', endpoint: 'https://ethereum.blockpi.network/v1/rpc/public' }
      ],
      137: [
        { name: 'llamarpc', endpoint: 'https://polygon.llamarpc.com' },
        { name: 'blockpi', endpoint: 'https://polygon.blockpi.network/v1/rpc/public' }
      ],
      8453: [
        { name: 'llamarpc', endpoint: 'https://base.llamarpc.com' },
        { name: 'blockpi', endpoint: 'https://base.blockpi.network/v1/rpc/public' }
      ]
    };

    return configs[chainId] || [];
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
      if (key.endsWith(`-${chainId}`) && provider.supportedChainIds.includes(chainId)) {
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
  getProvider(): IProvider | null {
    return this.currentProvider;
  }

  /**
   * Get a specific provider by name and chain
   */
  getProviderByName(providerName: string, chainId?: number): IProvider | null {
    const targetChainId = chainId || this.currentChainId;
    const key = `${providerName}-${targetChainId}`;
    return this.providers.get(key) || null;
  }

  /**
   * Get all available providers
   */
  getAllProviders(): Array<{ name: string; provider: IProvider }> {
    const result: Array<{ name: string; provider: IProvider }> = [];
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
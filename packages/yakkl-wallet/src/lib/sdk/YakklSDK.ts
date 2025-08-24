import { BlockchainServiceManager } from './BlockchainServiceManager';
import { EnhancedKeyManager } from './security/EnhancedKeyManager';
import { GenericRPCProvider } from './providers/rpc/GenericRPCProvider';
import type { IProvider } from './interfaces/IProvider';
import type { IKeyManager } from './interfaces/IKeyManager';
import type { PriceData, TokenPriceData } from './interfaces/IPriceProvider';

/**
 * YAKKL SDK - Main entry point for blockchain operations
 * Simple interface for developers with sensible defaults
 */
export class YakklSDK {
  private serviceManager: BlockchainServiceManager;
  private keyManager: IKeyManager;
  private initialized = false;

  constructor() {
    this.serviceManager = BlockchainServiceManager.getInstance();
    this.keyManager = EnhancedKeyManager.getInstance();
  }

  /**
   * Initialize the SDK with options
   */
  async initialize(options: {
    /** Default chain ID to connect to */
    chainId?: number;
    /** Custom RPC endpoints */
    rpcEndpoints?: Record<number, string>;
    /** Features to enable */
    features?: ('providers' | 'explorers' | 'prices')[];
    /** Auto-setup providers based on available API keys */
    autoSetup?: boolean;
  } = {}): Promise<void> {
    if (this.initialized) {
      return;
    }

    const {
      chainId = 1,
      rpcEndpoints,
      features = ['providers', 'explorers', 'prices'],
      autoSetup = true
    } = options;

    // Initialize service manager
    await this.serviceManager.initialize({
      defaultChainId: chainId,
      autoSetupProviders: autoSetup,
      enabledFeatures: features
    });

    // Add custom RPC endpoints if provided
    if (rpcEndpoints) {
      await this.addCustomRPCEndpoints(rpcEndpoints);
    }

    this.initialized = true;
  }

  /**
   * Add custom RPC endpoints
   */
  private async addCustomRPCEndpoints(endpoints: Record<number, string>): Promise<void> {
    for (const [chainId, endpoint] of Object.entries(endpoints)) {
      try {
        const provider = GenericRPCProvider.createCustomProvider(
          endpoint,
          parseInt(chainId),
          this.getBlockchainForChainId(parseInt(chainId)),
          { name: `custom-${chainId}` }
        );

        await provider.connect(parseInt(chainId));
        // You would register this with the service manager here
      } catch (error) {
        console.warn(`Failed to add custom RPC for chain ${chainId}:`, error);
      }
    }
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
   * Switch to a different blockchain
   */
  async switchChain(chainId: number): Promise<void> {
    this.ensureInitialized();
    await this.serviceManager.switchChain(chainId);
  }

  /**
   * Get the current provider
   */
  getProvider(): IProvider | null {
    this.ensureInitialized();
    return this.serviceManager.getProvider();
  }

  /**
   * Get a specific provider by name
   */
  getProviderByName(name: string, chainId?: number): IProvider | null {
    this.ensureInitialized();
    return this.serviceManager.getProviderByName(name, chainId);
  }

  /**
   * Get transaction history for an address
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
    this.ensureInitialized();
    return await this.serviceManager.getTransactionHistory(address, options);
  }

  /**
   * Get token transfers for an address
   */
  async getTokenTransfers(
    address: string,
    options?: {
      contractAddress?: string;
      tokenType?: 'erc20' | 'erc721' | 'erc1155';
      limit?: number;
    }
  ) {
    this.ensureInitialized();
    return await this.serviceManager.getTokenTransfers(address, options);
  }

  /**
   * Get internal transactions for an address
   */
  async getInternalTransactions(
    address: string,
    options?: {
      startBlock?: number;
      endBlock?: number;
      limit?: number;
    }
  ) {
    this.ensureInitialized();
    return await this.serviceManager.getInternalTransactions(address, options);
  }

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(txHash: string) {
    this.ensureInitialized();
    return await this.serviceManager.getTransactionByHash(txHash);
  }

  /**
   * Get price for a single symbol
   * @param symbol - Trading symbol (e.g., 'ETH', 'BTC')
   * @returns Price data or null if not found
   */
  async getPrice(symbol: string): Promise<PriceData | null> {
    this.ensureInitialized();
    return await this.serviceManager.getPrice(symbol);
  }

  /**
   * Get prices for multiple symbols using efficient batch API
   * @param symbols - Array of trading symbols
   * @returns Map of symbol to price data
   */
  async getPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    this.ensureInitialized();
    return await this.serviceManager.getPrices(symbols);
  }

  /**
   * Get token price by contract address
   * @param contractAddress - Token contract address
   * @param chainId - Chain ID
   * @param vsCurrency - Base currency (default: 'USD')
   * @returns Token price data or null if not found
   */
  async getTokenPrice(
    contractAddress: string,
    chainId: number,
    vsCurrency: string = 'USD'
  ): Promise<TokenPriceData | null> {
    this.ensureInitialized();
    return await this.serviceManager.getTokenPrice(contractAddress, chainId, vsCurrency);
  }

  /**
   * Get all available price providers
   */
  getPriceProviders() {
    this.ensureInitialized();
    return this.serviceManager.getPriceProviders();
  }

  /**
   * Health check for all services
   */
  async healthCheck() {
    this.ensureInitialized();
    return await this.serviceManager.healthCheck();
  }

  /**
   * Get SDK statistics
   */
  getStats() {
    this.ensureInitialized();
    return this.serviceManager.getStats();
  }

  /**
   * Cleanup and disconnect all services
   */
  async cleanup(): Promise<void> {
    if (this.initialized) {
      await this.serviceManager.cleanup();
      this.initialized = false;
    }
  }

  /**
   * Ensure SDK is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('YakklSDK not initialized. Call initialize() first.');
    }
  }

  // Convenience factory methods

  /**
   * Create a quick SDK instance with Ethereum mainnet
   */
  static async createForEthereum(options: {
    rpcUrl?: string;
    features?: ('providers' | 'explorers' | 'prices')[];
  } = {}): Promise<YakklSDK> {
    const sdk = new YakklSDK();
    
    const initOptions: any = {
      chainId: 1,
      features: options.features
    };

    if (options.rpcUrl) {
      initOptions.rpcEndpoints = { 1: options.rpcUrl };
    }

    await sdk.initialize(initOptions);
    return sdk;
  }

  /**
   * Create a quick SDK instance with Polygon mainnet
   */
  static async createForPolygon(options: {
    rpcUrl?: string;
    features?: ('providers' | 'explorers' | 'prices')[];
  } = {}): Promise<YakklSDK> {
    const sdk = new YakklSDK();
    
    const initOptions: any = {
      chainId: 137,
      features: options.features
    };

    if (options.rpcUrl) {
      initOptions.rpcEndpoints = { 137: options.rpcUrl };
    }

    await sdk.initialize(initOptions);
    return sdk;
  }

  /**
   * Create a quick SDK instance with Base mainnet
   */
  static async createForBase(options: {
    rpcUrl?: string;
    features?: ('providers' | 'explorers' | 'prices')[];
  } = {}): Promise<YakklSDK> {
    const sdk = new YakklSDK();
    
    const initOptions: any = {
      chainId: 8453,
      features: options.features
    };

    if (options.rpcUrl) {
      initOptions.rpcEndpoints = { 8453: options.rpcUrl };
    }

    await sdk.initialize(initOptions);
    return sdk;
  }

  /**
   * Create SDK with custom configuration
   */
  static async createCustom(config: {
    chainId: number;
    rpcUrl?: string;
    features?: ('providers' | 'explorers' | 'prices')[];
    autoSetup?: boolean;
  }): Promise<YakklSDK> {
    const sdk = new YakklSDK();
    
    const initOptions: any = {
      chainId: config.chainId,
      features: config.features,
      autoSetup: config.autoSetup
    };

    if (config.rpcUrl) {
      initOptions.rpcEndpoints = { [config.chainId]: config.rpcUrl };
    }

    await sdk.initialize(initOptions);
    return sdk;
  }
}

// Export default instance for simple usage
export const yakklSDK = new YakklSDK();

// Export all the main types and classes for advanced usage
export { BlockchainServiceManager } from './BlockchainServiceManager';
export { EnhancedKeyManager } from './security/EnhancedKeyManager';
export { GenericRPCProvider } from './providers/rpc/GenericRPCProvider';
export { AlchemyProvider } from './providers/managed/AlchemyProvider';
export { AlchemyExplorer } from './providers/explorer/AlchemyExplorer';
export { explorerRoutingManager } from './routing/ExplorerRoutingManager';

// Export price providers
export { AlchemyPriceProvider } from './providers/price/AlchemyPriceProvider';
export { CoinbasePriceProvider } from './providers/price/CoinbasePriceProvider';
export { CoingeckoPriceProvider } from './providers/price/CoingeckoPriceProvider';
export { LegacyPriceProviderAdapter } from './adapters/LegacyAdapter';

// Export all interfaces
export type { IProvider } from './interfaces/IProvider';
export type { ITransactionFetcher } from './interfaces/ITransactionFetcher';
export type { IPriceProvider, PriceData, TokenPriceData, BatchPriceData, HistoricalPriceData } from './interfaces/IPriceProvider';
export type { IKeyManager } from './interfaces/IKeyManager';

// Export core utilities
export { BigNumber, EthereumBigNumber } from './core/bignumber';
export { detectAndResolveChain } from './core/chain';
export { BigNumberishMath } from './core/math';
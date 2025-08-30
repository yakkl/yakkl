/**
 * Provider Manager Service
 * Manages blockchain providers using the @yakkl/core abstraction layer
 */

import {
  type IBlockchainProvider,
  type IMultiProviderManager,
  type ChainInfo,
  providerFactory,
  initializeDefaultProviders,
  EVMProvider
} from '@yakkl/core';
import type { Address } from '@yakkl/core';

/**
 * Provider manager service implementation
 */
export class ProviderManagerService implements IMultiProviderManager {
  private providers: Map<string | number, IBlockchainProvider> = new Map();
  private activeChainId: string | number | null = null;
  private static instance: ProviderManagerService;

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderManagerService {
    if (!ProviderManagerService.instance) {
      ProviderManagerService.instance = new ProviderManagerService();
    }
    return ProviderManagerService.instance;
  }

  private constructor() {
    // Initialize default providers on construction
    this.initialize();
  }

  /**
   * Initialize the provider manager
   */
  private async initialize(): Promise<void> {
    // Register default providers and chains
    initializeDefaultProviders();

    // Create providers for default chains
    const chains = providerFactory.getSupportedChains();
    for (const chain of chains) {
      try {
        const provider = providerFactory.createProvider(chain);
        this.addProvider(chain.chainId, provider);
      } catch (error) {
        console.warn(`Failed to create provider for chain ${chain.name}:`, error);
      }
    }

    // Set Ethereum mainnet as default
    this.setActiveProvider(1);
  }

  /**
   * Add a provider
   */
  addProvider(chainId: string | number, provider: IBlockchainProvider): void {
    this.providers.set(chainId, provider);
  }

  /**
   * Remove a provider
   */
  removeProvider(chainId: string | number): void {
    const provider = this.providers.get(chainId);
    if (provider) {
      provider.disconnect();
      this.providers.delete(chainId);
    }
  }

  /**
   * Get a provider by chain ID
   */
  getProvider(chainId: string | number): IBlockchainProvider | undefined {
    return this.providers.get(chainId);
  }

  /**
   * Get all providers
   */
  getAllProviders(): Map<string | number, IBlockchainProvider> {
    return new Map(this.providers);
  }

  /**
   * Set the active provider
   */
  setActiveProvider(chainId: string | number): void {
    if (!this.providers.has(chainId)) {
      throw new Error(`No provider registered for chain ${chainId}`);
    }
    this.activeChainId = chainId;
  }

  /**
   * Get the active provider
   */
  getActiveProvider(): IBlockchainProvider | undefined {
    if (!this.activeChainId) {
      return undefined;
    }
    return this.providers.get(this.activeChainId);
  }

  /**
   * Connect to a chain
   */
  async connectToChain(chainId: string | number): Promise<void> {
    const provider = this.getProvider(chainId);
    if (!provider) {
      throw new Error(`No provider for chain ${chainId}`);
    }
    
    await provider.connect();
    this.setActiveProvider(chainId);
  }

  /**
   * Get current accounts
   */
  async getAccounts(): Promise<Address[]> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active provider');
    }
    return await provider.getAccounts();
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: Address, tokenAddress?: Address): Promise<string> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active provider');
    }
    return await provider.getBalance(address, tokenAddress);
  }

  /**
   * Send a transaction
   */
  async sendTransaction(tx: any): Promise<string> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('No active provider');
    }
    return await provider.sendTransaction(tx);
  }

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: string | number): Promise<void> {
    // Check if provider exists for this chain
    let provider = this.getProvider(chainId);
    
    if (!provider) {
      // Try to create a new provider for this chain
      const chainInfo = providerFactory.getChainInfo(chainId);
      if (!chainInfo) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }
      
      provider = providerFactory.createProvider(chainInfo);
      this.addProvider(chainId, provider);
    }

    // Connect to the chain
    await provider.connect();
    
    // Set as active
    this.setActiveProvider(chainId);
  }

  /**
   * Add a custom chain
   */
  async addCustomChain(chainInfo: ChainInfo): Promise<void> {
    // Register the chain
    providerFactory.registerChain(chainInfo);
    
    // Create and add provider
    const provider = providerFactory.createProvider(chainInfo);
    this.addProvider(chainInfo.chainId, provider);
    
    // Connect to it
    await provider.connect();
  }

  /**
   * Get chain info for active chain
   */
  getActiveChainInfo(): ChainInfo | undefined {
    const provider = this.getActiveProvider();
    return provider?.chainInfo;
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: string | number): boolean {
    return this.providers.has(chainId) || providerFactory.isChainSupported(chainId);
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): ChainInfo[] {
    return providerFactory.getSupportedChains();
  }
}

// Export singleton instance
export const providerManager = ProviderManagerService.getInstance();
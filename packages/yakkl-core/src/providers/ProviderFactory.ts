/**
 * Provider factory implementation for creating blockchain providers
 */

import type {
  IProviderFactory,
  IBlockchainProvider,
  ChainInfo,
  ProviderConfig
} from '../interfaces/provider.interface';
import { ChainType } from '../interfaces/provider.interface';
import { EVMProvider } from './EVMProvider';

/**
 * Registry of provider constructors
 */
type ProviderConstructor = new (chainInfo: ChainInfo, config?: ProviderConfig) => IBlockchainProvider;

/**
 * Provider factory implementation
 */
export class ProviderFactory implements IProviderFactory {
  private providers: Map<ChainType, ProviderConstructor> = new Map();
  private supportedChains: Map<string | number, ChainInfo> = new Map();

  /**
   * Register a provider type
   */
  registerProvider(chainType: ChainType, constructor: ProviderConstructor): void {
    this.providers.set(chainType, constructor);
  }

  /**
   * Register a supported chain
   */
  registerChain(chainInfo: ChainInfo): void {
    this.supportedChains.set(chainInfo.chainId, chainInfo);
  }

  /**
   * Create a provider instance
   */
  createProvider(chainInfo: ChainInfo, config?: ProviderConfig): IBlockchainProvider {
    const ProviderClass = this.providers.get(chainInfo.type);
    
    if (!ProviderClass) {
      throw new Error(`No provider registered for chain type: ${chainInfo.type}`);
    }

    return new ProviderClass(chainInfo, config);
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): ChainInfo[] {
    return Array.from(this.supportedChains.values());
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chainId: string | number): boolean {
    return this.supportedChains.has(chainId);
  }

  /**
   * Get chain info by ID
   */
  getChainInfo(chainId: string | number): ChainInfo | undefined {
    return this.supportedChains.get(chainId);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.providers.clear();
    this.supportedChains.clear();
  }
}

/**
 * Singleton instance
 */
export const providerFactory = new ProviderFactory();

/**
 * Default chain configurations
 */
export const DEFAULT_CHAINS: ChainInfo[] = [
  {
    chainId: 1,
    name: 'Ethereum Mainnet',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    isTestnet: false,
    chainReference: 'ethereum'
  },
  {
    chainId: 137,
    name: 'Polygon',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    isTestnet: false,
    chainReference: 'polygon'
  },
  {
    chainId: 56,
    name: 'BNB Smart Chain',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ['https://bsc-dataseed.binance.org'],
    blockExplorerUrls: ['https://bscscan.com'],
    isTestnet: false,
    chainReference: 'bsc'
  },
  {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'AVAX',
      symbol: 'AVAX',
      decimals: 18
    },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
    isTestnet: false,
    chainReference: 'avalanche'
  },
  {
    chainId: 42161,
    name: 'Arbitrum One',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
    isTestnet: false,
    chainReference: 'arbitrum'
  },
  {
    chainId: 10,
    name: 'Optimism',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    isTestnet: false,
    chainReference: 'optimism'
  },
  // Testnets
  {
    chainId: 11155111,
    name: 'Sepolia',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    isTestnet: true,
    chainReference: 'sepolia'
  },
  {
    chainId: 80001,
    name: 'Mumbai',
    type: ChainType.EVM,
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    isTestnet: true,
    chainReference: 'mumbai'
  }
];

/**
 * Initialize factory with default chains
 */
export function initializeDefaultChains(): void {
  DEFAULT_CHAINS.forEach(chain => {
    providerFactory.registerChain(chain);
  });
}

/**
 * Initialize factory with default providers
 */
export function initializeDefaultProviders(): void {
  // Register EVM provider for all EVM chains
  providerFactory.registerProvider(ChainType.EVM, EVMProvider);
  
  // Initialize default chains
  initializeDefaultChains();
}
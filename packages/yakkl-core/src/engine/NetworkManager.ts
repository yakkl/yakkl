/**
 * NetworkManager - Manages blockchain networks and connections
 */

import { EventEmitter } from 'eventemitter3';
import { ethers } from 'ethers';
import type { WalletEngine } from './WalletEngine';
import type { Network, NetworkFeature } from './types';

export interface NetworkManagerEvents {
  'network:added': (network: Network) => void;
  'network:updated': (network: Network) => void;
  'network:removed': (networkId: string) => void;
  'network:switched': (network: Network) => void;
  'network:connected': (network: Network) => void;
  'network:disconnected': (network: Network) => void;
}

export class NetworkManager extends EventEmitter<NetworkManagerEvents> {
  private engine: WalletEngine;
  private networks = new Map<string, Network>();
  private providers = new Map<string, ethers.JsonRpcProvider>();
  private currentNetworkId: string | null = null;
  private initialized = false;

  constructor(engine: WalletEngine) {
    super();
    this.engine = engine;
  }

  /**
   * Initialize the network manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load default networks
      await this.loadDefaultNetworks();
      
      // Load custom networks from storage
      await this.loadCustomNetworks();
      
      // Load current network selection
      await this.loadCurrentNetwork();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize NetworkManager: ${error}`);
    }
  }

  /**
   * Get all supported networks
   */
  getSupported(): Network[] {
    return Array.from(this.networks.values())
      .sort((a, b) => {
        // Sort by: mainnet first, then testnet, then custom
        if (a.isMainnet && !b.isMainnet) return -1;
        if (!a.isMainnet && b.isMainnet) return 1;
        if (!a.isTestnet && b.isTestnet) return -1;
        if (a.isTestnet && !b.isTestnet) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Get network by ID
   */
  get(networkId: string): Network | null {
    return this.networks.get(networkId) || null;
  }

  /**
   * Get current network
   */
  getCurrent(): Network | null {
    if (!this.currentNetworkId) return null;
    return this.networks.get(this.currentNetworkId) || null;
  }

  /**
   * Switch to a different network
   */
  async switch(networkId: string): Promise<Network> {
    this.ensureInitialized();

    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error('Network not found');
    }

    // Test connection to network
    await this.testConnection(network);

    // Update current network
    this.currentNetworkId = networkId;
    await this.saveCurrentNetwork();

    this.emit('network:switched', network);
    return network;
  }

  /**
   * Add a custom network
   */
  async add(networkConfig: Omit<Network, 'id' | 'isCustom'>): Promise<Network> {
    this.ensureInitialized();

    // Validate network configuration
    await this.validateNetworkConfig(networkConfig);

    // Check if network already exists
    const existing = Array.from(this.networks.values())
      .find(n => n.chainId === networkConfig.chainId);
    
    if (existing) {
      throw new Error('Network with this chain ID already exists');
    }

    // Create network
    const network: Network = {
      id: this.generateNetworkId(),
      ...networkConfig,
      isCustom: true
    };

    // Store network
    this.networks.set(network.id, network);
    await this.saveCustomNetworks();

    this.emit('network:added', network);
    return network;
  }

  /**
   * Update a custom network
   */
  async update(networkId: string, updates: Partial<Network>): Promise<Network> {
    this.ensureInitialized();

    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error('Network not found');
    }

    if (!network.isCustom) {
      throw new Error('Cannot update built-in networks');
    }

    // Update network
    const updatedNetwork = {
      ...network,
      ...updates,
      id: network.id, // Prevent ID changes
      isCustom: true // Ensure it stays custom
    };

    // Validate updated configuration
    await this.validateNetworkConfig(updatedNetwork);

    this.networks.set(networkId, updatedNetwork);
    await this.saveCustomNetworks();

    this.emit('network:updated', updatedNetwork);
    return updatedNetwork;
  }

  /**
   * Remove a custom network
   */
  async remove(networkId: string): Promise<void> {
    this.ensureInitialized();

    const network = this.networks.get(networkId);
    if (!network) {
      throw new Error('Network not found');
    }

    if (!network.isCustom) {
      throw new Error('Cannot remove built-in networks');
    }

    // Remove provider if exists
    const provider = this.providers.get(networkId);
    if (provider) {
      provider.destroy();
      this.providers.delete(networkId);
    }

    // Remove network
    this.networks.delete(networkId);
    await this.saveCustomNetworks();

    // Switch to default network if this was current
    if (this.currentNetworkId === networkId) {
      const defaultNetwork = Array.from(this.networks.values())
        .find(n => n.isMainnet && !n.isCustom);
      if (defaultNetwork) {
        await this.switch(defaultNetwork.id);
      }
    }

    this.emit('network:removed', networkId);
  }

  /**
   * Get provider for network
   */
  getProvider(networkId?: string): ethers.JsonRpcProvider | null {
    const id = networkId || this.currentNetworkId;
    if (!id) return null;

    // Return existing provider if available
    if (this.providers.has(id)) {
      return this.providers.get(id)!;
    }

    // Create new provider
    const network = this.networks.get(id);
    if (!network) return null;

    try {
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      this.providers.set(id, provider);
      return provider;
    } catch (error) {
      console.error(`Failed to create provider for network ${id}:`, error);
      return null;
    }
  }

  /**
   * Test connection to a network
   */
  async testConnection(network: Network): Promise<boolean> {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpcUrl);
      const chainId = await provider.getNetwork();
      
      // Verify chain ID matches
      if (Number(chainId.chainId) !== network.chainId) {
        throw new Error('Chain ID mismatch');
      }

      return true;
    } catch (error) {
      throw new Error(`Network connection failed: ${error}`);
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(networkId?: string): Promise<{
    blockNumber: number;
    gasPrice: bigint;
    chainId: number;
  }> {
    const provider = this.getProvider(networkId);
    if (!provider) {
      throw new Error('No provider available');
    }

    try {
      const [blockNumber, feeData, network] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData(),
        provider.getNetwork()
      ]);

      return {
        blockNumber,
        gasPrice: feeData.gasPrice || 0n,
        chainId: Number(network.chainId)
      };
    } catch (error) {
      throw new Error(`Failed to get network stats: ${error}`);
    }
  }

  /**
   * Destroy the network manager
   */
  async destroy(): Promise<void> {
    // Destroy all providers
    for (const provider of this.providers.values()) {
      provider.destroy();
    }
    
    this.networks.clear();
    this.providers.clear();
    this.currentNetworkId = null;
    this.initialized = false;
    this.removeAllListeners();
  }

  /**
   * Private methods
   */
  private async loadDefaultNetworks(): Promise<void> {
    const defaultNetworks: Network[] = [
      // Ethereum Mainnet
      {
        id: 'ethereum',
        name: 'Ethereum',
        chainId: 1,
        symbol: 'ETH',
        rpcUrl: 'https://eth.llamarpc.com',
        blockExplorerUrl: 'https://etherscan.io',
        isTestnet: false,
        isMainnet: true,
        isCustom: false,
        iconUrl: '/networks/ethereum.png',
        gasToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId: 1,
          isNative: true,
          isStable: false
        },
        supportedFeatures: ['eip1559', 'eip2930', 'contracts', 'tokens', 'nft', 'defi', 'staking']
      },
      // Polygon
      {
        id: 'polygon',
        name: 'Polygon',
        chainId: 137,
        symbol: 'MATIC',
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorerUrl: 'https://polygonscan.com',
        isTestnet: false,
        isMainnet: true,
        isCustom: false,
        iconUrl: '/networks/polygon.png',
        gasToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'MATIC',
          name: 'Polygon',
          decimals: 18,
          chainId: 137,
          isNative: true,
          isStable: false
        },
        supportedFeatures: ['eip1559', 'eip2930', 'contracts', 'tokens', 'nft', 'defi', 'bridges']
      },
      // Arbitrum One
      {
        id: 'arbitrum',
        name: 'Arbitrum One',
        chainId: 42161,
        symbol: 'ETH',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        blockExplorerUrl: 'https://arbiscan.io',
        isTestnet: false,
        isMainnet: true,
        isCustom: false,
        iconUrl: '/networks/arbitrum.png',
        gasToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId: 42161,
          isNative: true,
          isStable: false
        },
        supportedFeatures: ['contracts', 'tokens', 'nft', 'defi', 'bridges']
      },
      // Sepolia Testnet
      {
        id: 'sepolia',
        name: 'Sepolia',
        chainId: 11155111,
        symbol: 'ETH',
        rpcUrl: 'https://rpc.sepolia.org',
        blockExplorerUrl: 'https://sepolia.etherscan.io',
        isTestnet: true,
        isMainnet: false,
        isCustom: false,
        iconUrl: '/networks/ethereum.png',
        gasToken: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          chainId: 11155111,
          isNative: true,
          isStable: false
        },
        supportedFeatures: ['eip1559', 'eip2930', 'contracts', 'tokens', 'nft']
      }
    ];

    for (const network of defaultNetworks) {
      this.networks.set(network.id, network);
    }
  }

  private async loadCustomNetworks(): Promise<void> {
    try {
      const stored = localStorage.getItem('yakkl:customNetworks');
      if (stored) {
        const customNetworks = JSON.parse(stored);
        for (const network of customNetworks) {
          this.networks.set(network.id, network);
        }
      }
    } catch (error) {
      console.warn('Failed to load custom networks:', error);
    }
  }

  private async saveCustomNetworks(): Promise<void> {
    try {
      const customNetworks = Array.from(this.networks.values())
        .filter(n => n.isCustom);
      localStorage.setItem('yakkl:customNetworks', JSON.stringify(customNetworks));
    } catch (error) {
      console.error('Failed to save custom networks:', error);
      throw error;
    }
  }

  private async loadCurrentNetwork(): Promise<void> {
    try {
      const stored = localStorage.getItem('yakkl:currentNetwork');
      if (stored && this.networks.has(stored)) {
        this.currentNetworkId = stored;
      } else {
        // Default to Ethereum mainnet
        const ethereum = Array.from(this.networks.values())
          .find(n => n.chainId === 1);
        if (ethereum) {
          this.currentNetworkId = ethereum.id;
        }
      }
    } catch (error) {
      console.warn('Failed to load current network:', error);
    }
  }

  private async saveCurrentNetwork(): Promise<void> {
    try {
      if (this.currentNetworkId) {
        localStorage.setItem('yakkl:currentNetwork', this.currentNetworkId);
      }
    } catch (error) {
      console.error('Failed to save current network:', error);
    }
  }

  private async validateNetworkConfig(config: Partial<Network>): Promise<void> {
    if (!config.name || !config.chainId || !config.rpcUrl) {
      throw new Error('Network name, chainId, and rpcUrl are required');
    }

    if (config.chainId <= 0) {
      throw new Error('Chain ID must be positive');
    }

    try {
      new URL(config.rpcUrl);
    } catch {
      throw new Error('Invalid RPC URL');
    }

    if (config.blockExplorerUrl) {
      try {
        new URL(config.blockExplorerUrl);
      } catch {
        throw new Error('Invalid block explorer URL');
      }
    }
  }

  private generateNetworkId(): string {
    return `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('NetworkManager not initialized');
    }
  }
}
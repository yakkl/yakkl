/**
 * Simple Provider Service for Background Context
 * Just connects to Alchemy - no caching, no complexity
 */

import { log } from '$lib/common/logger-wrapper';
import { ethers } from 'ethers';
import { getKeyManager } from '$lib/managers/KeyManager';

export class SimpleProviderService {
  private static instance: SimpleProviderService;
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private currentChainId: number | null = null;

  private constructor() {}

  static getInstance(): SimpleProviderService {
    if (!SimpleProviderService.instance) {
      SimpleProviderService.instance = new SimpleProviderService();
    }
    return SimpleProviderService.instance;
  }

  /**
   * Get provider for the specified chain
   * Creates a new provider if chain changes
   */
  async getProvider(chainId: number = 1): Promise<ethers.providers.JsonRpcProvider> {
    // If we already have a provider for this chain, return it
    if (this.provider && this.currentChainId === chainId) {
      return this.provider;
    }

    try {
      // Get API key from KeyManager
      const keyManager = await getKeyManager();
      const alchemyKey = keyManager.getKey('ALCHEMY_API_KEY_PROD_1');

      if (!alchemyKey) {
        log.warn('[SimpleProvider] No Alchemy API key found, using public endpoint');
      }

      // Map chainId to Alchemy network URL
      const networkUrl = this.getAlchemyUrl(chainId, alchemyKey);

      // Create new provider
      this.provider = new ethers.providers.JsonRpcProvider(networkUrl);
      this.currentChainId = chainId;

      log.info(`[SimpleProvider] Connected to chain ${chainId}`);

      return this.provider;
    } catch (error) {
      log.error('[SimpleProvider] Failed to create provider:', false, error);
      // Return a fallback provider
      this.provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
      this.currentChainId = 1;
      return this.provider;
    }
  }

  /**
   * Get Alchemy URL for the specified chain
   */
  private getAlchemyUrl(chainId: number, apiKey?: string): string {
    // If no API key, use public endpoints
    if (!apiKey) {
      const publicEndpoints: Record<number, string> = {
        1: 'https://eth.llamarpc.com',
        137: 'https://polygon-rpc.com',
        42161: 'https://arb1.arbitrum.io/rpc',
        10: 'https://mainnet.optimism.io',
        56: 'https://bsc-dataseed.binance.org',
        43114: 'https://api.avax.network/ext/bc/C/rpc'
      };
      return publicEndpoints[chainId] || publicEndpoints[1];
    }

    // Alchemy endpoints
    const alchemyNetworks: Record<number, string> = {
      1: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
      5: `https://eth-goerli.g.alchemy.com/v2/${apiKey}`,
      11155111: `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
      137: `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`,
      80001: `https://polygon-mumbai.g.alchemy.com/v2/${apiKey}`,
      42161: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
      421613: `https://arb-goerli.g.alchemy.com/v2/${apiKey}`,
      10: `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`,
      420: `https://opt-goerli.g.alchemy.com/v2/${apiKey}`,
      8453: `https://base-mainnet.g.alchemy.com/v2/${apiKey}`,
      84531: `https://base-goerli.g.alchemy.com/v2/${apiKey}`
    };

    // Return Alchemy URL or fallback to Ethereum mainnet
    return alchemyNetworks[chainId] || alchemyNetworks[1];
  }

  /**
   * Get balance for an address
   * Returns balance in Wei as a string (not formatted)
   */
  async getBalance(address: string, chainId: number = 1): Promise<string> {
    try {
      const provider = await this.getProvider(chainId);
      const balance = await provider.getBalance(address);
      // Return raw Wei value as string, not formatted
      return balance.toString();
    } catch (error) {
      log.error('[SimpleProvider] Failed to get balance:', false, { address, chainId, error });
      return '0';
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: string, ownerAddress: string, decimals: number, chainId: number = 1): Promise<string> {
    try {
      const provider = await this.getProvider(chainId);

      // ERC20 ABI for balanceOf
      const abi = ['function balanceOf(address owner) view returns (uint256)'];
      const contract = new ethers.Contract(tokenAddress, abi, provider);

      const balance = await contract.balanceOf(ownerAddress);
      return ethers.utils.formatUnits(balance, decimals);
    } catch (error) {
      log.error('[SimpleProvider] Failed to get token balance:', false, { tokenAddress, ownerAddress, chainId, error });
      return '0.0';
    }
  }

  /**
   * Clear provider (useful for cleanup)
   */
  clear(): void {
    this.provider = null;
    this.currentChainId = null;
  }
}

// Export singleton instance
export const simpleProvider = SimpleProviderService.getInstance();
/**
 * Blockchain Integration
 * Chain configurations and utilities from @yakkl/blockchain
 */

import { 
  chains,
  getChainById,
  getChainByNetwork,
  ethereum,
  polygon,
  arbitrum,
  optimism,
  base,
  type ChainConfig
} from '@yakkl/blockchain';

// Re-export imported chains (already imported above)
export { ethereum, polygon, arbitrum, optimism, base, chains };

/**
 * Get chain configuration for current network
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return getChainById(chainId);
}

/**
 * Initialize blockchain utilities
 */
export async function initializeBlockchain(): Promise<void> {
  // Blockchain initialization logic
  console.log('[Blockchain] Initialized with chain configurations');
}

// Export utilities
export {
  getChainById,
  getChainByNetwork,
  type ChainConfig
};
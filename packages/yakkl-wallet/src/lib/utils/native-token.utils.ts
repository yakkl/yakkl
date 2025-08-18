/**
 * Native Token Utilities
 * Provides utilities for handling native tokens across different chains
 * Replaces hardcoded 'ETH' values to support multi-chain functionality
 */

// Import Chain type from common interfaces
import { log } from '$lib/common/logger-wrapper';

// Define Chain type locally if not available
interface Chain {
  chainId: number;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Default native token symbols for known chain IDs
 * This is a fallback mapping in case chain.nativeCurrency is not available
 */
const NATIVE_TOKEN_SYMBOLS: Record<number, string> = {
  1: 'ETH',        // Ethereum Mainnet
  5: 'ETH',        // Goerli Testnet
  11155111: 'ETH', // Sepolia Testnet
  137: 'MATIC',    // Polygon Mainnet
  80001: 'MATIC',  // Polygon Mumbai Testnet
  56: 'BNB',       // BSC Mainnet
  97: 'BNB',       // BSC Testnet
  43114: 'AVAX',   // Avalanche C-Chain
  43113: 'AVAX',   // Avalanche Fuji Testnet
  250: 'FTM',      // Fantom Opera
  4002: 'FTM',     // Fantom Testnet
  42161: 'ETH',    // Arbitrum One
  421613: 'ETH',   // Arbitrum Goerli
  10: 'ETH',       // Optimism
  420: 'ETH',      // Optimism Goerli
  8453: 'ETH',     // Base Mainnet
  84531: 'ETH',    // Base Goerli
  324: 'ETH',      // zkSync Era Mainnet
  280: 'ETH',      // zkSync Era Testnet
};

/**
 * Get the native token symbol for a given chain
 * @param chain - The chain object or chain ID
 * @returns The native token symbol (e.g., 'ETH', 'MATIC', 'BNB')
 */
export function getNativeTokenSymbol(chain: Chain | number | null | undefined): string {
  try {
    // If no chain provided, default to ETH
    if (!chain) {
      log.debug('[NativeTokenUtils] No chain provided, defaulting to ETH', false);
      return 'ETH';
    }
    
    // If chain is a number (chain ID)
    if (typeof chain === 'number') {
      return NATIVE_TOKEN_SYMBOLS[chain] || 'ETH';
    }
    
    // If chain is an object with nativeCurrency
    if (chain.nativeCurrency?.symbol) {
      return chain.nativeCurrency.symbol;
    }
    
    // Fallback to chain ID lookup
    if (chain.chainId) {
      return NATIVE_TOKEN_SYMBOLS[chain.chainId] || 'ETH';
    }
    
    // Default fallback
    log.warn('[NativeTokenUtils] Could not determine native token symbol, defaulting to ETH', false, { chain });
    return 'ETH';
  } catch (error) {
    log.error('[NativeTokenUtils] Error getting native token symbol', false, error);
    return 'ETH';
  }
}

/**
 * Get the native token decimals for a given chain
 * @param chain - The chain object or chain ID
 * @returns The native token decimals (usually 18)
 */
export function getNativeTokenDecimals(chain: Chain | number | null | undefined): number {
  try {
    // Most native tokens use 18 decimals
    const DEFAULT_DECIMALS = 18;
    
    if (!chain) {
      return DEFAULT_DECIMALS;
    }
    
    // If chain is an object with nativeCurrency decimals
    if (typeof chain === 'object' && chain.nativeCurrency?.decimals) {
      return chain.nativeCurrency.decimals;
    }
    
    // Default to 18 decimals (standard for most chains)
    return DEFAULT_DECIMALS;
  } catch (error) {
    log.error('[NativeTokenUtils] Error getting native token decimals', false, error);
    return 18;
  }
}

/**
 * Get the native token name for a given chain
 * @param chain - The chain object or chain ID
 * @returns The native token name (e.g., 'Ethereum', 'Polygon', 'Binance Smart Chain')
 */
export function getNativeTokenName(chain: Chain | number | null | undefined): string {
  try {
    if (!chain) {
      return 'Ethereum';
    }
    
    // If chain is an object with nativeCurrency name
    if (typeof chain === 'object' && chain.nativeCurrency?.name) {
      return chain.nativeCurrency.name;
    }
    
    // Map chain ID to token name
    const tokenNameMap: Record<number, string> = {
      1: 'Ethereum',
      5: 'Goerli Ethereum',
      11155111: 'Sepolia Ethereum',
      137: 'Polygon',
      80001: 'Mumbai Polygon',
      56: 'Binance Smart Chain',
      97: 'BSC Testnet',
      43114: 'Avalanche',
      43113: 'Fuji Avalanche',
      250: 'Fantom',
      4002: 'Fantom Testnet',
      42161: 'Arbitrum',
      421613: 'Arbitrum Goerli',
      10: 'Optimism',
      420: 'Optimism Goerli',
      8453: 'Base',
      84531: 'Base Goerli',
      324: 'zkSync Era',
      280: 'zkSync Era Testnet',
    };
    
    const chainId = typeof chain === 'number' ? chain : chain.chainId;
    if (chainId && tokenNameMap[chainId]) {
      return tokenNameMap[chainId];
    }
    
    return 'Ethereum';
  } catch (error) {
    log.error('[NativeTokenUtils] Error getting native token name', false, error);
    return 'Ethereum';
  }
}

/**
 * Check if a token is the native token for a given chain
 * @param tokenSymbol - The token symbol to check
 * @param chain - The chain object or chain ID
 * @returns True if the token is the native token for the chain
 */
export function isNativeToken(tokenSymbol: string, chain: Chain | number | null | undefined): boolean {
  try {
    if (!tokenSymbol || !chain) {
      return false;
    }
    
    const nativeSymbol = getNativeTokenSymbol(chain);
    return tokenSymbol.toUpperCase() === nativeSymbol.toUpperCase();
  } catch (error) {
    log.error('[NativeTokenUtils] Error checking if token is native', false, error);
    return false;
  }
}

/**
 * Get the native token address (usually 0x0 or 0xEeeee...)
 * @param chain - The chain object or chain ID
 * @returns The native token address
 */
export function getNativeTokenAddress(chain?: Chain | number | null): string {
  // Most chains use this address to represent native tokens
  // Some use 0x0000000000000000000000000000000000000000
  return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
}

/**
 * Get native token info object
 * @param chain - The chain object or chain ID
 * @returns Object with native token information
 */
export function getNativeTokenInfo(chain: Chain | number | null | undefined) {
  return {
    symbol: getNativeTokenSymbol(chain),
    name: getNativeTokenName(chain),
    decimals: getNativeTokenDecimals(chain),
    address: getNativeTokenAddress(chain),
    isNative: true
  };
}
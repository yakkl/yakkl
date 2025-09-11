/**
 * Provider types and interfaces for blockchain interactions
 *
 * This file re-exports types from @yakkl/core for backward compatibility.
 * The core types have been consolidated in yakkl-core for consistency across packages.
 */

// Import unified types from yakkl-core
// ChainType is imported as a value since it's an enum
import { ChainType } from '@yakkl/core';

import type {
  ProviderInterface,
  EVMProviderInterface,
  BitcoinProviderInterface,
  SolanaProviderInterface,
  BlockTag,
  BigNumberish,
  TransactionRequest,
  TransactionResponse,
  TransactionReceipt,
  FeeData,
  Log,
  Filter,
  Block,
  BlockWithTransactions,
  ChainInfo,
  ProviderConfig,
  ProviderCostMetrics,
  ProviderHealthMetrics,
  ProviderMetadata
} from '@yakkl/core';

// Re-export imported types for backward compatibility
export type {
  BlockTag,
  BigNumberish,
  TransactionRequest,
  TransactionResponse,
  TransactionReceipt,
  FeeData,
  Log,
  Filter,
  Block,
  BlockWithTransactions,
  ChainInfo,
  ProviderConfig,
  ProviderCostMetrics,
  ProviderHealthMetrics,
  ProviderMetadata
};

// Re-export ChainType enum as a value
export { ChainType };

// Re-export specialized provider interfaces
export type {
  ProviderInterface,
  EVMProviderInterface,
  BitcoinProviderInterface,
  SolanaProviderInterface
};

// Legacy export for backward compatibility (DEPRECATED - use ProviderInterface)
/**
 * @deprecated Use ProviderInterface instead. IProvider is kept for backward compatibility only.
 */
export type IProvider = ProviderInterface;

// Event types that are local to this package
export type EventType = string | Array<string | string[]> | Filter;
export type Listener = (...args: any[]) => void;

// Network provider types
export interface NetworkProviderConfig extends ProviderConfig {
  name: string;
  blockchains: string[];
  chainIds: number[];
  url?: string;        // RPC endpoint URL
  priority?: number;   // Priority for routing decisions
}

// Price provider types
export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
  change24h?: number;
  volume24h?: number;
  marketCap?: number;
}

export interface PriceProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  symbols?: string[];
  currency?: string;
  interval?: number;
}

// Gas provider types
export interface GasEstimate {
  slow: bigint;
  standard: bigint;
  fast: bigint;
  baseFee?: bigint;
  priority?: {
    slow: bigint;
    standard: bigint;
    fast: bigint;
  };
}


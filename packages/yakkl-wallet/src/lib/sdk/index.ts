// YAKKL SDK - Main Export File
// This is the primary entry point for the YAKKL SDK

// Main SDK class and default instance
export { YakklSDK, yakklSDK } from './YakklSDK';

// Core service managers
export { BlockchainServiceManager } from './BlockchainServiceManager';
export { EnhancedKeyManager } from './security/EnhancedKeyManager';
export { explorerRoutingManager } from './routing/ExplorerRoutingManager';

// Provider implementations
export { AlchemyProvider } from './providers/managed/AlchemyProvider';
export { AlchemyExplorer } from './providers/explorer/AlchemyExplorer';
export { GenericRPCProvider, detectRPCProvider } from './providers/rpc/GenericRPCProvider';
export { AlchemyPriceProvider } from './providers/price/AlchemyPriceProvider';

// Base provider classes
export { BaseProvider, ManagedProvider, RPCProvider } from './providers/base';

// Interfaces
export type { IProvider } from './interfaces/IProvider';
export type {
  ITransactionFetcher,
  TransactionFetchOptions,
  TokenTransferOptions,
  InternalTransactionOptions,
  TransactionHistoryResponse,
  TokenTransferResponse,
  InternalTransactionResponse,
  TransactionDetail,
  TokenTransferDetail,
  InternalTransactionDetail
} from './interfaces/ITransactionFetcher';
export type {
  IPriceProvider,
  PriceData,
  TokenPriceData,
  HistoricalPriceData,
  BatchPriceData,
  HistoricalPriceOptions,
  WeightedPriceProvider
} from './interfaces/IPriceProvider';
export type {
  IKeyManager,
  KeyOperation,
  ProviderKeyConfig,
  ProviderKeyInfo,
  KeyStats,
  KeySelectionCriteria,
  KeyRotationStrategy
} from './interfaces/IKeyManager';

// Core utilities
export {
  BigNumber,
  EthereumBigNumber,
  type BigNumberish,
  type Numeric,
  type IBigNumber,
  CurrencyCode
} from './core/bignumber';
export { BigNumberishMath } from './core/math';
export {
  detectAndResolveChain,
  clearChainCache,
  getCacheSize,
  type ChainConfig,
  type ChainActivity,
  type ChainResolutionResult,
  type AddressDetectionResult
} from './core/chain';

// Re-export commonly used types from base providers
export type {
  BlockTag,
  TransactionRequest,
  TransactionResponse,
  FeeData,
  Log,
  Filter,
  Block,
  BlockWithTransactions,
  TransactionReceipt
} from './providers/base/BaseProvider';

// Version information
export const SDK_VERSION = '1.0.0';
export const SDK_NAME = 'YAKKL SDK';
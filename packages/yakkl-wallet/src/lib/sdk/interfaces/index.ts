// SDK Interfaces - Main Export File
// Import unified ProviderInterface from yakkl-core
import type { ProviderInterface } from '@yakkl/core';

// Re-export as IProvider for backward compatibility (DEPRECATED)
/**
 * @deprecated Use ProviderInterface from @yakkl/core instead
 */
export type { ProviderInterface as IProvider } from '@yakkl/core';

// Also export ProviderInterface directly for new code
export type { ProviderInterface } from '@yakkl/core';
export type {
  ITransactionFetcher,
  BaseTransactionOptions,
  TransactionFetchOptions,
  TokenTransferOptions,
  InternalTransactionOptions,
  TransactionDetail,
  TokenTransferDetail,
  InternalTransactionDetail,
  TransactionHistoryResponse,
  TokenTransferResponse,
  InternalTransactionResponse
} from './ITransactionFetcher';
export type {
  IPriceProvider,
  PriceData,
  TokenPriceData,
  PricePoint,
  HistoricalPriceData,
  BatchPriceData,
  HistoricalPriceOptions,
  WeightedPriceProvider
} from './IPriceProvider';
export type {
  IKeyManager,
  KeyOperation,
  ProviderKeyConfig,
  ProviderKeyInfo,
  KeyStats,
  KeyRotationStrategy,
  KeySelectionCriteria
} from './IKeyManager';
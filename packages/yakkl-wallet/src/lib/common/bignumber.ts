/**
 * BigNumber - Re-export from @yakkl/core
 * This file maintains backward compatibility while the code has been moved to @yakkl/core
 * 
 * MIGRATION NOTE: This file now re-exports from @yakkl/core
 * All the original functionality has been preserved, but the implementation
 * now lives in the shared @yakkl/core package to allow reuse across projects.
 */

// Import everything from @yakkl/core to work around SSR module resolution
import * as YakklCore from '@yakkl/core';

// Re-export with original names
export const BigNumber = YakklCore.BigNumber;
export type BigNumberish = YakklCore.BigNumberish;
export type Numeric = YakklCore.Numeric;
export const CurrencyCode = YakklCore.CurrencyCode;
export type IBigNumber = YakklCore.IBigNumber;
export type FiatFormatOptions = YakklCore.FiatFormatOptions;

// Also export as EthereumBigNumber for compatibility
export const EthereumBigNumber = YakklCore.BigNumber;
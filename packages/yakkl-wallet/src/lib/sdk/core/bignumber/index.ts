// SDK Core BigNumber - Re-export from @yakkl/core
import * as YakklCore from '@yakkl/core';

// Re-export with original names
export const BigNumber = YakklCore.BigNumber;
export type BigNumberish = YakklCore.BigNumberish;
export type Numeric = YakklCore.Numeric;
export type IBigNumber = YakklCore.IBigNumber;
export const CurrencyCode = YakklCore.CurrencyCode;
export type FiatFormatOptions = YakklCore.FiatFormatOptions;

// Export with legacy alias for compatibility
export const EthereumBigNumber = YakklCore.BigNumber;

// Re-export for convenience
export type SDKBigNumberish = YakklCore.BigNumberish;
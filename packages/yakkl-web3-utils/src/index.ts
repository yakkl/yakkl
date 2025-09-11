/**
 * @yakkl/web3-utils
 * Web3 and blockchain utilities for YAKKL ecosystem
 */

// Address utilities
export * from './address';

// Unit conversion utilities
export * from './units';

// Gas utilities
export * from './gas';

// Version
export const VERSION = '0.1.0';


// Export types
export type {
  GasPriceLevels,
  FeeData
} from './gas';

export type {
  UnitName
} from './units';
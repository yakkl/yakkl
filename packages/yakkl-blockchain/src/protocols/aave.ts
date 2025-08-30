/**
 * Aave Protocol Integration
 * Support for Aave V3 lending and borrowing
 */

import { LendingMarket, LendingPosition, ProtocolInfo } from './types';

export const AAVE_INFO: ProtocolInfo = {
  name: 'Aave',
  version: 'V3',
  chainIds: [1, 137, 42161, 10, 8453, 43114],
  website: 'https://aave.com',
  documentation: 'https://docs.aave.com',
  github: 'https://github.com/aave'
};

/**
 * Aave V3 Pool addresses
 */
export const AAVE_V3_POOL: Record<number, `0x${string}`> = {
  1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',     // Ethereum
  137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',   // Polygon
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Arbitrum
  10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',    // Optimism
  8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',  // Base
  43114: '0x794a61358D6845594F94dc1DB02A252b5b4814aD'  // Avalanche
};

/**
 * Aave V3 Pool Data Provider addresses
 */
export const AAVE_V3_DATA_PROVIDER: Record<number, `0x${string}`> = {
  1: '0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3',     // Ethereum
  137: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',   // Polygon
  42161: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654', // Arbitrum
  10: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654',    // Optimism
  8453: '0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac',  // Base
  43114: '0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654'  // Avalanche
};

/**
 * Aave Oracle addresses
 */
export const AAVE_ORACLE: Record<number, `0x${string}`> = {
  1: '0x54586bE62E3c3580375aE3723C145253060Ca0C2',     // Ethereum
  137: '0xb023e699F5a33916Ea823A16485e259257cA8Bd1',   // Polygon
  42161: '0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7', // Arbitrum
  10: '0xD81eb3728a631871a7eBBaD631b5f424909f0c77',    // Optimism
  8453: '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156',  // Base
  43114: '0xEBd36016B3eD09D4693Ed4251c67Bd858c3c7C9C'  // Avalanche
};

/**
 * Interest rate modes
 */
export enum InterestRateMode {
  NONE = 0,
  STABLE = 1,
  VARIABLE = 2
}

/**
 * Health factor thresholds
 */
export const HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1.0;
export const HEALTH_FACTOR_WARNING_THRESHOLD = 1.5;
export const HEALTH_FACTOR_SAFE_THRESHOLD = 2.0;

/**
 * Get Aave contract addresses for a chain
 */
export function getAaveAddresses(chainId: number) {
  return {
    pool: AAVE_V3_POOL[chainId],
    dataProvider: AAVE_V3_DATA_PROVIDER[chainId],
    oracle: AAVE_ORACLE[chainId]
  };
}

/**
 * Calculate health factor
 */
export function calculateHealthFactor(
  totalCollateralETH: bigint,
  totalDebtETH: bigint,
  liquidationThreshold: number
): number {
  if (totalDebtETH === 0n) {
    return Number.MAX_SAFE_INTEGER;
  }
  
  const threshold = BigInt(Math.floor(liquidationThreshold * 10000));
  const healthFactor = (totalCollateralETH * threshold) / (totalDebtETH * BigInt(10000));
  return Number(healthFactor * BigInt(100)) / 100;
}

/**
 * Calculate max borrowable amount
 */
export function calculateMaxBorrow(
  totalCollateralETH: bigint,
  totalDebtETH: bigint,
  ltv: number // Loan-to-value ratio
): bigint {
  const maxBorrowETH = (totalCollateralETH * BigInt(Math.floor(ltv * 10000))) / BigInt(10000);
  const availableBorrowETH = maxBorrowETH > totalDebtETH 
    ? maxBorrowETH - totalDebtETH 
    : 0n;
  return availableBorrowETH;
}

/**
 * Calculate borrow APY
 */
export function calculateBorrowAPY(borrowRate: bigint): number {
  // Aave uses ray units (1e27)
  const RAY = BigInt(10 ** 27);
  const SECONDS_PER_YEAR = BigInt(31536000);
  
  const ratePerSecond = borrowRate / SECONDS_PER_YEAR;
  const apy = Number(ratePerSecond * BigInt(100) / (RAY / BigInt(100))) / 100;
  return apy;
}

/**
 * Calculate supply APY
 */
export function calculateSupplyAPY(liquidityRate: bigint): number {
  // Aave uses ray units (1e27)
  const RAY = BigInt(10 ** 27);
  const SECONDS_PER_YEAR = BigInt(31536000);
  
  const ratePerSecond = liquidityRate / SECONDS_PER_YEAR;
  const apy = Number(ratePerSecond * BigInt(100) / (RAY / BigInt(100))) / 100;
  return apy;
}

/**
 * Get risk level based on health factor
 */
export function getRiskLevel(healthFactor: number): 'critical' | 'high' | 'medium' | 'low' {
  if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
    return 'critical';
  } else if (healthFactor < HEALTH_FACTOR_WARNING_THRESHOLD) {
    return 'high';
  } else if (healthFactor < HEALTH_FACTOR_SAFE_THRESHOLD) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Format reserve data
 */
export interface ReserveData {
  asset: `0x${string}`;
  aTokenAddress: `0x${string}`;
  stableDebtTokenAddress: `0x${string}`;
  variableDebtTokenAddress: `0x${string}`;
  liquidityRate: bigint;
  variableBorrowRate: bigint;
  stableBorrowRate: bigint;
  availableLiquidity: bigint;
  totalStableDebt: bigint;
  totalVariableDebt: bigint;
  liquidationThreshold: number;
  ltv: number;
  liquidationBonus: number;
  reserveFactor: number;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
}

/**
 * Common aTokens (receipt tokens)
 */
export const AAVE_ATOKENS: Record<string, Record<number, `0x${string}`>> = {
  'aUSDC': {
    1: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',     // Ethereum
    137: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',   // Polygon
    42161: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // Arbitrum
    10: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',    // Optimism
    8453: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB'  // Base
  },
  'aWETH': {
    1: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',     // Ethereum
    137: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',   // Polygon (WMATIC)
    42161: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', // Arbitrum
    10: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',    // Optimism
    8453: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7'  // Base
  },
  'aDAI': {
    1: '0x018008bfb33d285247A21d44E50697654f754e63',     // Ethereum
    137: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',   // Polygon
    42161: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE', // Arbitrum
    10: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',    // Optimism
    8453: '0x50390975D942E83D661D4Bde43BF73B0ef27b426'  // Base
  }
};
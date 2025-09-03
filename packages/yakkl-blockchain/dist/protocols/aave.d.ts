/**
 * Aave Protocol Integration
 * Support for Aave V3 lending and borrowing
 */
import { ProtocolInfo } from './types';
export declare const AAVE_INFO: ProtocolInfo;
/**
 * Aave V3 Pool addresses
 */
export declare const AAVE_V3_POOL: Record<number, `0x${string}`>;
/**
 * Aave V3 Pool Data Provider addresses
 */
export declare const AAVE_V3_DATA_PROVIDER: Record<number, `0x${string}`>;
/**
 * Aave Oracle addresses
 */
export declare const AAVE_ORACLE: Record<number, `0x${string}`>;
/**
 * Interest rate modes
 */
export declare enum InterestRateMode {
    NONE = 0,
    STABLE = 1,
    VARIABLE = 2
}
/**
 * Health factor thresholds
 */
export declare const HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1;
export declare const HEALTH_FACTOR_WARNING_THRESHOLD = 1.5;
export declare const HEALTH_FACTOR_SAFE_THRESHOLD = 2;
/**
 * Get Aave contract addresses for a chain
 */
export declare function getAaveAddresses(chainId: number): {
    pool: `0x${string}`;
    dataProvider: `0x${string}`;
    oracle: `0x${string}`;
};
/**
 * Calculate health factor
 */
export declare function calculateHealthFactor(totalCollateralETH: bigint, totalDebtETH: bigint, liquidationThreshold: number): number;
/**
 * Calculate max borrowable amount
 */
export declare function calculateMaxBorrow(totalCollateralETH: bigint, totalDebtETH: bigint, ltv: number): bigint;
/**
 * Calculate borrow APY
 */
export declare function calculateBorrowAPY(borrowRate: bigint): number;
/**
 * Calculate supply APY
 */
export declare function calculateSupplyAPY(liquidityRate: bigint): number;
/**
 * Get risk level based on health factor
 */
export declare function getRiskLevel(healthFactor: number): 'critical' | 'high' | 'medium' | 'low';
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
export declare const AAVE_ATOKENS: Record<string, Record<number, `0x${string}`>>;

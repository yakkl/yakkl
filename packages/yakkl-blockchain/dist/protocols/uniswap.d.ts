/**
 * Uniswap Protocol Integration
 * Support for Uniswap V2 and V3
 */
import { ProtocolInfo } from './types';
export declare const UNISWAP_INFO: ProtocolInfo;
/**
 * Uniswap V3 Factory addresses
 */
export declare const UNISWAP_V3_FACTORY: Record<number, `0x${string}`>;
/**
 * Uniswap V3 Router addresses
 */
export declare const UNISWAP_V3_ROUTER: Record<number, `0x${string}`>;
/**
 * Uniswap V2 Factory addresses
 */
export declare const UNISWAP_V2_FACTORY: Record<number, `0x${string}`>;
/**
 * Uniswap V2 Router addresses
 */
export declare const UNISWAP_V2_ROUTER: Record<number, `0x${string}`>;
/**
 * Fee tiers for Uniswap V3
 */
export declare enum UniswapV3FeeTier {
    LOWEST = 100,// 0.01%
    LOW = 500,// 0.05%
    MEDIUM = 3000,// 0.3%
    HIGH = 10000
}
/**
 * Get Uniswap contract addresses for a chain
 */
export declare function getUniswapAddresses(chainId: number, version?: 'V2' | 'V3'): {
    factory: `0x${string}`;
    router: `0x${string}`;
};
/**
 * Calculate price impact
 */
export declare function calculatePriceImpact(amountIn: bigint, amountOut: bigint, spotPrice: bigint, decimalsIn: number, decimalsOut: number): number;
/**
 * Calculate minimum amount out with slippage
 */
export declare function calculateMinimumAmountOut(amountOut: bigint, slippageTolerance?: number): bigint;
/**
 * Format pool address for Uniswap V3
 */
export declare function getV3PoolAddress(tokenA: `0x${string}`, tokenB: `0x${string}`, fee: UniswapV3FeeTier, factoryAddress: `0x${string}`): string;
/**
 * Check if a token pair has sufficient liquidity
 */
export declare function hasLiquidity(reserves0: bigint, reserves1: bigint, minLiquidityUSD?: number): boolean;
/**
 * Get optimal trade route
 */
export declare function getOptimalRoute(tokenIn: `0x${string}`, tokenOut: `0x${string}`, chainId: number): `0x${string}`[];

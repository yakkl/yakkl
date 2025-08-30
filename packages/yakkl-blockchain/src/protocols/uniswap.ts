/**
 * Uniswap Protocol Integration
 * Support for Uniswap V2 and V3
 */

import { SwapParams, SwapQuote, LiquidityParams, LiquidityPosition, ProtocolInfo } from './types';

export const UNISWAP_INFO: ProtocolInfo = {
  name: 'Uniswap',
  version: 'V3',
  chainIds: [1, 137, 42161, 10, 8453],
  website: 'https://uniswap.org',
  documentation: 'https://docs.uniswap.org',
  github: 'https://github.com/Uniswap'
};

/**
 * Uniswap V3 Factory addresses
 */
export const UNISWAP_V3_FACTORY: Record<number, `0x${string}`> = {
  1: '0x1F98431c8aD98523631AE4a59f267346ea31F984',     // Ethereum
  137: '0x1F98431c8aD98523631AE4a59f267346ea31F984',   // Polygon
  42161: '0x1F98431c8aD98523631AE4a59f267346ea31F984', // Arbitrum
  10: '0x1F98431c8aD98523631AE4a59f267346ea31F984',    // Optimism
  8453: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'  // Base
};

/**
 * Uniswap V3 Router addresses
 */
export const UNISWAP_V3_ROUTER: Record<number, `0x${string}`> = {
  1: '0xE592427A0AEce92De3Edee1F18E0157C05861564',     // Ethereum
  137: '0xE592427A0AEce92De3Edee1F18E0157C05861564',   // Polygon
  42161: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Arbitrum
  10: '0xE592427A0AEce92De3Edee1F18E0157C05861564',    // Optimism
  8453: '0x2626664c2603336E57B271c5C0b26F421741e481'  // Base
};

/**
 * Uniswap V2 Factory addresses
 */
export const UNISWAP_V2_FACTORY: Record<number, `0x${string}`> = {
  1: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',     // Ethereum
  137: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',   // Polygon (QuickSwap)
  42161: '0xf1D7CC64Fb4452F05c498126312eBE29f30Fbcf9', // Arbitrum (Sushiswap)
  10: '0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf',    // Optimism
  8453: '0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6'  // Base
};

/**
 * Uniswap V2 Router addresses
 */
export const UNISWAP_V2_ROUTER: Record<number, `0x${string}`> = {
  1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',     // Ethereum
  137: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',   // Polygon (QuickSwap)
  42161: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // Arbitrum (Sushiswap)
  10: '0x9c12939390052919aF3155f41Bf4160Fd3666A6f',    // Optimism (Velodrome)
  8453: '0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24'  // Base
};

/**
 * Fee tiers for Uniswap V3
 */
export enum UniswapV3FeeTier {
  LOWEST = 100,    // 0.01%
  LOW = 500,       // 0.05%
  MEDIUM = 3000,   // 0.3%
  HIGH = 10000     // 1%
}

/**
 * Get Uniswap contract addresses for a chain
 */
export function getUniswapAddresses(chainId: number, version: 'V2' | 'V3' = 'V3') {
  if (version === 'V3') {
    return {
      factory: UNISWAP_V3_FACTORY[chainId],
      router: UNISWAP_V3_ROUTER[chainId]
    };
  } else {
    return {
      factory: UNISWAP_V2_FACTORY[chainId],
      router: UNISWAP_V2_ROUTER[chainId]
    };
  }
}

/**
 * Calculate price impact
 */
export function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  spotPrice: bigint,
  decimalsIn: number,
  decimalsOut: number
): number {
  const executionPrice = (amountOut * BigInt(10 ** decimalsIn)) / amountIn;
  const spotPriceAdjusted = spotPrice * BigInt(10 ** decimalsOut) / BigInt(10 ** decimalsIn);
  const impact = Number((spotPriceAdjusted - executionPrice) * BigInt(10000) / spotPriceAdjusted) / 100;
  return Math.abs(impact);
}

/**
 * Calculate minimum amount out with slippage
 */
export function calculateMinimumAmountOut(
  amountOut: bigint,
  slippageTolerance: number = 0.5
): bigint {
  const slippageFactor = BigInt(Math.floor((100 - slippageTolerance) * 100));
  return amountOut * slippageFactor / BigInt(10000);
}

/**
 * Format pool address for Uniswap V3
 */
export function getV3PoolAddress(
  tokenA: `0x${string}`,
  tokenB: `0x${string}`,
  fee: UniswapV3FeeTier,
  factoryAddress: `0x${string}`
): string {
  // This is a simplified version. In production, you'd compute the CREATE2 address
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
  
  return `pool-${token0}-${token1}-${fee}`;
}

/**
 * Check if a token pair has sufficient liquidity
 */
export function hasLiquidity(
  reserves0: bigint,
  reserves1: bigint,
  minLiquidityUSD: number = 1000
): boolean {
  // Simplified check - in production, you'd use actual token prices
  return reserves0 > 0n && reserves1 > 0n;
}

/**
 * Get optimal trade route
 */
export function getOptimalRoute(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  chainId: number
): `0x${string}`[] {
  // Common routing tokens
  const WETH: Record<number, `0x${string}`> = {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    10: '0x4200000000000000000000000000000000000006',
    8453: '0x4200000000000000000000000000000000000006'
  };

  const USDC: Record<number, `0x${string}`> = {
    1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
  };

  const weth = WETH[chainId];
  const usdc = USDC[chainId];

  // Direct path
  if (tokenIn === tokenOut) return [tokenIn];
  
  // Try common routing paths
  if (weth && tokenIn !== weth && tokenOut !== weth) {
    return [tokenIn, weth, tokenOut];
  }
  
  if (usdc && tokenIn !== usdc && tokenOut !== usdc) {
    return [tokenIn, usdc, tokenOut];
  }

  // Direct swap
  return [tokenIn, tokenOut];
}
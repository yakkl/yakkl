/**
 * Protocol Types and Interfaces
 * Common types for DeFi protocol interactions
 */

export interface ProtocolInfo {
  name: string;
  version: string;
  chainIds: number[];
  website?: string;
  documentation?: string;
  github?: string;
}

export interface SwapParams {
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  amountIn: bigint;
  amountOutMin: bigint;
  recipient: `0x${string}`;
  deadline?: bigint;
  slippageTolerance?: number;
}

export interface SwapQuote {
  amountOut: bigint;
  path: `0x${string}`[];
  priceImpact: number;
  fee: bigint;
  gasEstimate?: bigint;
}

export interface LiquidityParams {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  amountA: bigint;
  amountB: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  recipient: `0x${string}`;
  deadline?: bigint;
}

export interface LiquidityPosition {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  liquidity: bigint;
  share: number;
  valueUSD?: number;
}

export interface LendingMarket {
  asset: `0x${string}`;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: bigint;
  totalBorrow: bigint;
  availableLiquidity: bigint;
  utilizationRate: number;
}

export interface LendingPosition {
  asset: `0x${string}`;
  supplied: bigint;
  borrowed: bigint;
  healthFactor: number;
  collateralValue: bigint;
  borrowLimit: bigint;
}

export interface StakingPool {
  stakingToken: `0x${string}`;
  rewardToken: `0x${string}`;
  totalStaked: bigint;
  rewardRate: bigint;
  periodFinish: bigint;
  minStakingPeriod?: bigint;
}

export interface StakingPosition {
  pool: `0x${string}`;
  staked: bigint;
  earned: bigint;
  unlockTime?: bigint;
}

export interface YieldStrategy {
  protocol: string;
  apy: number;
  tvl: bigint;
  risk: 'low' | 'medium' | 'high';
  assets: `0x${string}`[];
}
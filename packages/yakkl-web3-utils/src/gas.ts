/**
 * Gas estimation and calculation utilities
 */

/**
 * Gas price levels
 */
export interface GasPriceLevels {
  slow: bigint;
  standard: bigint;
  fast: bigint;
  instant?: bigint;
}

/**
 * EIP-1559 fee data
 */
export interface FeeData {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  baseFeePerGas?: bigint;
}

/**
 * Calculate total gas cost
 * @param gasLimit Gas limit
 * @param gasPrice Gas price in wei
 * @returns Total cost in wei
 */
export function calculateGasCost(gasLimit: bigint | number, gasPrice: bigint): bigint {
  const limit = typeof gasLimit === 'number' ? BigInt(gasLimit) : gasLimit;
  return limit * gasPrice;
}

/**
 * Estimate gas price levels from base price
 * @param baseGasPrice Base gas price in wei
 * @returns Gas price levels
 */
export function estimateGasPriceLevels(baseGasPrice: bigint): GasPriceLevels {
  return {
    slow: (baseGasPrice * 90n) / 100n,      // 90% of base
    standard: baseGasPrice,                  // 100% of base
    fast: (baseGasPrice * 125n) / 100n,     // 125% of base
    instant: (baseGasPrice * 150n) / 100n   // 150% of base
  };
}

/**
 * Calculate EIP-1559 fees
 * @param baseFee Current base fee
 * @param priorityLevel Priority level (slow, standard, fast)
 * @returns Fee data for EIP-1559 transaction
 */
export function calculateEIP1559Fees(
  baseFee: bigint,
  priorityLevel: 'slow' | 'standard' | 'fast' = 'standard'
): FeeData {
  // Priority fee tips
  const priorityFees = {
    slow: 1000000000n,     // 1 gwei
    standard: 1500000000n, // 1.5 gwei
    fast: 2000000000n      // 2 gwei
  };
  
  const maxPriorityFeePerGas = priorityFees[priorityLevel];
  
  // Max fee calculation (2x base fee + priority fee for safety margin)
  const maxFeePerGas = (baseFee * 2n) + maxPriorityFeePerGas;
  
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
    baseFeePerGas: baseFee
  };
}

/**
 * Format gas price for display
 * @param gasPrice Gas price in wei
 * @param unit Display unit (gwei or ether)
 * @returns Formatted gas price string
 */
export function formatGasPrice(gasPrice: bigint, unit: 'gwei' | 'ether' = 'gwei'): string {
  if (unit === 'gwei') {
    const gwei = gasPrice / 1000000000n;
    const remainder = gasPrice % 1000000000n;
    
    if (remainder === 0n) {
      return `${gwei} gwei`;
    }
    
    // Show up to 2 decimal places
    const decimal = (remainder * 100n) / 1000000000n;
    return `${gwei}.${decimal.toString().padStart(2, '0')} gwei`;
  }
  
  const ether = gasPrice / 1000000000000000000n;
  return `${ether} ETH`;
}

/**
 * Estimate gas buffer (add safety margin)
 * @param estimatedGas Estimated gas from provider
 * @param bufferPercent Buffer percentage (default 10%)
 * @returns Gas limit with buffer
 */
export function addGasBuffer(
  estimatedGas: bigint | number,
  bufferPercent: number = 10
): bigint {
  const gas = typeof estimatedGas === 'number' ? BigInt(estimatedGas) : estimatedGas;
  const buffer = (gas * BigInt(bufferPercent)) / 100n;
  return gas + buffer;
}

/**
 * Check if gas price is reasonable (not too high)
 * @param gasPrice Gas price to check
 * @param maxGwei Maximum acceptable gas price in gwei
 * @returns True if gas price is reasonable
 */
export function isReasonableGasPrice(gasPrice: bigint, maxGwei: number = 500): boolean {
  const maxWei = BigInt(maxGwei) * 1000000000n;
  return gasPrice <= maxWei;
}

/**
 * Get gas limit for common transaction types
 */
export const STANDARD_GAS_LIMITS = {
  transfer: 21000n,           // Standard ETH transfer
  erc20Transfer: 65000n,      // ERC20 token transfer
  erc20Approve: 45000n,       // ERC20 approval
  contractDeploy: 3000000n,   // Contract deployment (varies widely)
  swap: 250000n,              // DEX swap (estimate)
  nftMint: 150000n            // NFT minting (estimate)
} as const;

/**
 * Get recommended gas limit for transaction type
 * @param txType Transaction type
 * @param customLimit Optional custom limit
 * @returns Recommended gas limit
 */
export function getRecommendedGasLimit(
  txType: keyof typeof STANDARD_GAS_LIMITS,
  customLimit?: bigint
): bigint {
  if (customLimit) return customLimit;
  return STANDARD_GAS_LIMITS[txType];
}
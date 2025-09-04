/**
 * Address validation and formatting utilities
 */
/**
 * Check if a string is a valid Ethereum address
 * @param address The address to validate
 * @returns True if valid Ethereum address
 */
declare function isValidAddress(address: string): boolean;
/**
 * Check if an address is a contract address (basic check)
 * Note: This is a heuristic check based on common patterns
 * @param address The address to check
 * @returns True if likely a contract address
 */
declare function isContractAddress(address: string): boolean;
/**
 * Format an address for display (shortened with ellipsis)
 * @param address The address to format
 * @param startChars Number of characters to show at start (default 6)
 * @param endChars Number of characters to show at end (default 4)
 * @returns Formatted address like "0x1234...5678"
 */
declare function formatAddress(address: string, startChars?: number, endChars?: number): string;
/**
 * Convert address to checksum format (EIP-55)
 * @param address The address to convert
 * @returns Checksum formatted address
 */
declare function toChecksumAddress(address: string): string;
/**
 * Check if two addresses are the same (case-insensitive)
 * @param address1 First address
 * @param address2 Second address
 * @returns True if addresses are the same
 */
declare function isSameAddress(address1: string, address2: string): boolean;
/**
 * Get address type
 * @param address The address to check
 * @returns 'eoa' | 'contract' | 'invalid'
 */
declare function getAddressType(address: string): 'eoa' | 'contract' | 'invalid';

/**
 * Unit conversion utilities for Web3
 */
/**
 * Common unit conversions
 */
declare const UNITS: {
    readonly wei: 1n;
    readonly kwei: 1000n;
    readonly mwei: 1000000n;
    readonly gwei: 1000000000n;
    readonly szabo: 1000000000000n;
    readonly finney: 1000000000000000n;
    readonly ether: 1000000000000000000n;
};
type UnitName = keyof typeof UNITS;
/**
 * Convert from wei to another unit
 * @param wei Amount in wei (string or bigint)
 * @param unit Target unit
 * @returns Amount in target unit as string
 */
declare function fromWei(wei: string | bigint, unit?: UnitName): string;
/**
 * Convert to wei from another unit
 * @param amount Amount in source unit
 * @param unit Source unit
 * @returns Amount in wei as bigint
 */
declare function toWei(amount: string | number, unit?: UnitName): bigint;
/**
 * Format wei amount for display with proper decimals
 * @param wei Amount in wei
 * @param decimals Number of decimal places (default 18 for ETH)
 * @param displayDecimals Max decimal places to show (default 4)
 * @returns Formatted amount
 */
declare function formatUnits(wei: string | bigint, decimals?: number, displayDecimals?: number): string;
/**
 * Parse units from formatted string to wei
 * @param value Formatted value
 * @param decimals Number of decimals (default 18 for ETH)
 * @returns Value in wei as bigint
 */
declare function parseUnits(value: string, decimals?: number): bigint;
/**
 * Format a number with thousand separators
 * @param value Value to format
 * @param separator Separator character (default comma)
 * @returns Formatted string
 */
declare function formatWithCommas(value: string | number, separator?: string): string;

/**
 * Gas estimation and calculation utilities
 */
/**
 * Gas price levels
 */
interface GasPriceLevels {
    slow: bigint;
    standard: bigint;
    fast: bigint;
    instant?: bigint;
}
/**
 * EIP-1559 fee data
 */
interface FeeData {
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
declare function calculateGasCost(gasLimit: bigint | number, gasPrice: bigint): bigint;
/**
 * Estimate gas price levels from base price
 * @param baseGasPrice Base gas price in wei
 * @returns Gas price levels
 */
declare function estimateGasPriceLevels(baseGasPrice: bigint): GasPriceLevels;
/**
 * Calculate EIP-1559 fees
 * @param baseFee Current base fee
 * @param priorityLevel Priority level (slow, standard, fast)
 * @returns Fee data for EIP-1559 transaction
 */
declare function calculateEIP1559Fees(baseFee: bigint, priorityLevel?: 'slow' | 'standard' | 'fast'): FeeData;
/**
 * Format gas price for display
 * @param gasPrice Gas price in wei
 * @param unit Display unit (gwei or ether)
 * @returns Formatted gas price string
 */
declare function formatGasPrice(gasPrice: bigint, unit?: 'gwei' | 'ether'): string;
/**
 * Estimate gas buffer (add safety margin)
 * @param estimatedGas Estimated gas from provider
 * @param bufferPercent Buffer percentage (default 10%)
 * @returns Gas limit with buffer
 */
declare function addGasBuffer(estimatedGas: bigint | number, bufferPercent?: number): bigint;
/**
 * Check if gas price is reasonable (not too high)
 * @param gasPrice Gas price to check
 * @param maxGwei Maximum acceptable gas price in gwei
 * @returns True if gas price is reasonable
 */
declare function isReasonableGasPrice(gasPrice: bigint, maxGwei?: number): boolean;
/**
 * Get gas limit for common transaction types
 */
declare const STANDARD_GAS_LIMITS: {
    readonly transfer: 21000n;
    readonly erc20Transfer: 65000n;
    readonly erc20Approve: 45000n;
    readonly contractDeploy: 3000000n;
    readonly swap: 250000n;
    readonly nftMint: 150000n;
};
/**
 * Get recommended gas limit for transaction type
 * @param txType Transaction type
 * @param customLimit Optional custom limit
 * @returns Recommended gas limit
 */
declare function getRecommendedGasLimit(txType: keyof typeof STANDARD_GAS_LIMITS, customLimit?: bigint): bigint;

/**
 * @yakkl/web3-utils
 * Web3 and blockchain utilities for YAKKL ecosystem
 */

declare const VERSION = "0.1.0";

export { type FeeData, type GasPriceLevels, STANDARD_GAS_LIMITS, UNITS, type UnitName, VERSION, addGasBuffer, calculateEIP1559Fees, calculateGasCost, estimateGasPriceLevels, formatAddress, formatGasPrice, formatUnits, formatWithCommas, fromWei, getAddressType, getRecommendedGasLimit, isContractAddress, isReasonableGasPrice, isSameAddress, isValidAddress, parseUnits, toChecksumAddress, toWei };

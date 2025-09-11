/**
 * Unit conversion utilities for Web3
 */

/**
 * Common unit conversions
 */
export const UNITS = {
  wei: 1n,
  kwei: 1000n,
  mwei: 1000000n,
  gwei: 1000000000n,
  szabo: 1000000000000n,
  finney: 1000000000000000n,
  ether: 1000000000000000000n
} as const;

export type UnitName = keyof typeof UNITS;

/**
 * Convert from wei to another unit
 * @param wei Amount in wei (string or bigint)
 * @param unit Target unit
 * @returns Amount in target unit as string
 */
export function fromWei(wei: string | bigint, unit: UnitName = 'ether'): string {
  const weiAmount = typeof wei === 'string' ? BigInt(wei) : wei;
  const divisor = UNITS[unit];
  
  const wholePart = weiAmount / divisor;
  const remainder = weiAmount % divisor;
  
  if (remainder === 0n) {
    return wholePart.toString();
  }
  
  // Calculate decimal part
  const decimalPart = (remainder * 1000000n) / divisor;
  const decimalStr = decimalPart.toString().padStart(6, '0').replace(/0+$/, '');
  
  return decimalStr ? `${wholePart}.${decimalStr}` : wholePart.toString();
}

/**
 * Convert to wei from another unit
 * @param amount Amount in source unit
 * @param unit Source unit
 * @returns Amount in wei as bigint
 */
export function toWei(amount: string | number, unit: UnitName = 'ether'): bigint {
  const multiplier = UNITS[unit];
  
  if (typeof amount === 'number') {
    // Handle potential precision issues with numbers
    amount = amount.toString();
  }
  
  // Handle decimal values
  const parts = amount.split('.');
  if (parts.length === 1) {
    return BigInt(parts[0]) * multiplier;
  }
  
  if (parts.length > 2) {
    throw new Error('Invalid number format');
  }
  
  const wholePart = BigInt(parts[0]) * multiplier;
  const decimalPart = parts[1];
  
  // Calculate decimal value
  const decimalMultiplier = multiplier / (10n ** BigInt(decimalPart.length));
  const decimalValue = BigInt(decimalPart) * decimalMultiplier;
  
  return wholePart + decimalValue;
}

/**
 * Format wei amount for display with proper decimals
 * @param wei Amount in wei
 * @param decimals Number of decimal places (default 18 for ETH)
 * @param displayDecimals Max decimal places to show (default 4)
 * @returns Formatted amount
 */
export function formatUnits(
  wei: string | bigint, 
  decimals: number = 18,
  displayDecimals: number = 4
): string {
  const weiAmount = typeof wei === 'string' ? BigInt(wei) : wei;
  const divisor = 10n ** BigInt(decimals);
  
  const wholePart = weiAmount / divisor;
  const remainder = weiAmount % divisor;
  
  if (remainder === 0n) {
    return wholePart.toString();
  }
  
  // Calculate decimal part with precision
  const decimalDivisor = 10n ** BigInt(decimals - displayDecimals);
  const decimalPart = remainder / decimalDivisor;
  const decimalStr = decimalPart.toString().padStart(displayDecimals, '0').replace(/0+$/, '');
  
  return decimalStr ? `${wholePart}.${decimalStr}` : wholePart.toString();
}

/**
 * Parse units from formatted string to wei
 * @param value Formatted value
 * @param decimals Number of decimals (default 18 for ETH)
 * @returns Value in wei as bigint
 */
export function parseUnits(value: string, decimals: number = 18): bigint {
  const multiplier = 10n ** BigInt(decimals);
  
  const parts = value.split('.');
  if (parts.length === 1) {
    return BigInt(parts[0]) * multiplier;
  }
  
  if (parts.length > 2) {
    throw new Error('Invalid number format');
  }
  
  const wholePart = BigInt(parts[0]) * multiplier;
  let decimalPart = parts[1];
  
  // Pad or truncate decimal part to match decimals
  if (decimalPart.length > decimals) {
    decimalPart = decimalPart.slice(0, decimals);
  } else {
    decimalPart = decimalPart.padEnd(decimals, '0');
  }
  
  return wholePart + BigInt(decimalPart);
}

/**
 * Format a number with thousand separators
 * @param value Value to format
 * @param separator Separator character (default comma)
 * @returns Formatted string
 */
export function formatWithCommas(value: string | number, separator: string = ','): string {
  const str = value.toString();
  const parts = str.split('.');
  
  // Add separators to whole part
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  
  return parts.join('.');
}
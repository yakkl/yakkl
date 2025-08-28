/**
 * BigNumberish Utilities
 * Platform-agnostic utilities for handling big numbers
 * Moved from yakkl-wallet to allow sharing across projects
 */

import Decimal from 'decimal.js';
import { BigNumber, type BigNumberish } from './BigNumber';

export namespace BigNumberishUtils {
  export function toString(value: BigNumberish): string {
    return value?.toString() || '0' || '0n';
  }

  export function toBigInt(value: BigNumberish): bigint {
    const bigint = BigNumber.toBigInt(value);
    if (bigint === null) throw new Error('Invalid BigNumberish');
    return bigint;
  }

  export function toNumber(value: BigNumberish): number {
    if (value === null || value === undefined) {
      throw new Error('Invalid BigNumberish: null or undefined');
    }
    
    const num = BigNumber.toNumber(value);
    if (num === null) {
      throw new Error(`Invalid BigNumberish: could not convert ${value} (type: ${typeof value})`);
    }
    
    // Validate the result is a finite number
    if (!isFinite(num) || isNaN(num)) {
      throw new Error(`Invalid BigNumberish: result is not a finite number: ${num}`);
    }
    
    return num;
  }

  /**
   * Safe version of toNumber that returns 0 instead of throwing.
   * Use for UI sorting and display where errors should not crash the app.
   */
  export function toNumberSafe(value: BigNumberish | bigint | undefined | null): number {
    if (value === null || value === undefined) {
      return 0;
    }
    
    try {
      // Handle bigint type directly
      if (typeof value === 'bigint') {
        // Check for overflow
        if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
          return Number.MAX_SAFE_INTEGER;
        }
        if (value < BigInt(Number.MIN_SAFE_INTEGER)) {
          return Number.MIN_SAFE_INTEGER;
        }
        return Number(value);
      }
      
      // Handle string that might be a bigint literal
      if (typeof value === 'string' && value.endsWith('n')) {
        const bigintValue = BigInt(value.slice(0, -1));
        if (bigintValue > BigInt(Number.MAX_SAFE_INTEGER)) {
          return Number.MAX_SAFE_INTEGER;
        }
        if (bigintValue < BigInt(Number.MIN_SAFE_INTEGER)) {
          return Number.MIN_SAFE_INTEGER;
        }
        return Number(bigintValue);
      }
      
      const num = BigNumber.toNumber(value as BigNumberish);
      if (num === null || !isFinite(num) || isNaN(num)) {
        return 0;
      }
      return num;
    } catch (error) {
      console.warn('toNumberSafe: Failed to convert value, returning 0', value, error);
      return 0;
    }
  }

  export function add(a: BigNumberish, b: BigNumberish): bigint {
    return toBigInt(a) + toBigInt(b);
  }

  export function subtract(a: BigNumberish, b: BigNumberish): bigint {
    return toBigInt(a) - toBigInt(b);
  }

  export function multiply(a: BigNumberish, b: BigNumberish): bigint {
    return toBigInt(a) * toBigInt(b);
  }

  export function divide(a: BigNumberish, b: BigNumberish): bigint {
    const bBigInt = toBigInt(b);
    if (bBigInt === 0n) {
      throw new Error('Division by zero');
    }
    return toBigInt(a) / bBigInt;
  }

  export function mod(a: BigNumberish, b: BigNumberish): bigint {
    const bBigInt = toBigInt(b);
    if (bBigInt === 0n) {
      throw new Error('Modulo by zero');
    }
    return toBigInt(a) % bBigInt;
  }

  export function pow(base: BigNumberish, exponent: bigint): bigint {
    return toBigInt(base) ** exponent;
  }

  export function abs(value: BigNumberish): bigint {
    const bigIntValue = toBigInt(value);
    return bigIntValue < 0n ? -bigIntValue : bigIntValue;
  }

  export function min(a: BigNumberish, b: BigNumberish): bigint {
    const aBigInt = toBigInt(a);
    const bBigInt = toBigInt(b);
    return aBigInt < bBigInt ? aBigInt : bBigInt;
  }

  export function max(a: BigNumberish, b: BigNumberish): bigint {
    const aBigInt = toBigInt(a);
    const bBigInt = toBigInt(b);
    return aBigInt > bBigInt ? aBigInt : bBigInt;
  }

  export function isZero(value: BigNumberish): boolean {
    try {
      return toBigInt(value) === 0n;
    } catch {
      return true; // Treat invalid values as zero
    }
  }

  export function isNegative(value: BigNumberish): boolean {
    try {
      return toBigInt(value) < 0n;
    } catch {
      return false;
    }
  }

  export function isPositive(value: BigNumberish): boolean {
    try {
      return toBigInt(value) > 0n;
    } catch {
      return false;
    }
  }

  export function compare(a: BigNumberish, b: BigNumberish): number {
    const aBigInt = toBigInt(a);
    const bBigInt = toBigInt(b);
    if (aBigInt < bBigInt) return -1;
    if (aBigInt > bBigInt) return 1;
    return 0;
  }

  /**
   * Safe version of compare that handles invalid values
   * @param a First value to compare
   * @param b Second value to compare
   * @returns -1 if a < b, 0 if equal, 1 if a > b
   */
  export function compareSafe(a: BigNumberish | undefined | null, b: BigNumberish | undefined | null): number {
    try {
      // Handle undefined/null cases
      if (a === undefined || a === null) {
        if (b === undefined || b === null) return 0;
        return -1; // null/undefined is less than any value
      }
      if (b === undefined || b === null) {
        return 1; // any value is greater than null/undefined
      }
      
      return compare(a, b);
    } catch {
      // If conversion fails, treat as equal
      return 0;
    }
  }

  export function equals(a: BigNumberish, b: BigNumberish): boolean {
    try {
      return toBigInt(a) === toBigInt(b);
    } catch {
      return false;
    }
  }

  export function lt(a: BigNumberish, b: BigNumberish): boolean {
    return toBigInt(a) < toBigInt(b);
  }

  export function lte(a: BigNumberish, b: BigNumberish): boolean {
    return toBigInt(a) <= toBigInt(b);
  }

  export function gt(a: BigNumberish, b: BigNumberish): boolean {
    return toBigInt(a) > toBigInt(b);
  }

  export function gte(a: BigNumberish, b: BigNumberish): boolean {
    return toBigInt(a) >= toBigInt(b);
  }

  /**
   * Format a BigNumberish value for display with optional decimals
   */
  export function format(value: BigNumberish, decimals: number = 18): string {
    const bigIntValue = toBigInt(value);
    const divisor = 10n ** BigInt(decimals);
    const wholePart = bigIntValue / divisor;
    const fractionalPart = bigIntValue % divisor;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmed = fractionalStr.replace(/0+$/, '');
    
    if (trimmed.length === 0) {
      return wholePart.toString();
    }
    
    return `${wholePart}.${trimmed}`;
  }

  /**
   * Convert from wei (or smallest unit) to a decimal number
   * @param value The value in wei/smallest unit
   * @param decimals Number of decimals (default 18 for ETH)
   * @returns The value as a decimal number
   */
  export function fromWeiToNumber(value: BigNumberish, decimals: number = 18): number {
    const bigIntValue = toBigInt(value);
    const divisor = 10n ** BigInt(decimals);
    const wholePart = bigIntValue / divisor;
    const fractionalPart = bigIntValue % divisor;
    
    // Convert to decimal number
    const wholeNumber = Number(wholePart);
    const fractionalNumber = Number(fractionalPart) / Number(divisor);
    
    return wholeNumber + fractionalNumber;
  }

  /**
   * Check if a value is in raw balance format (wei/smallest unit)
   * @param value The value to check
   * @param decimals Number of decimals
   * @returns True if the value appears to be in raw format
   */
  export function isRawBalance(value: BigNumberish, decimals: number = 18): boolean {
    try {
      const str = toString(value);
      // If it's a very large integer string (more digits than expected for human-readable)
      // it's likely in wei/raw format
      return str.length > decimals - 2 && !str.includes('.');
    } catch {
      return false;
    }
  }

  /**
   * Standardize a balance to a consistent format
   * @param value The balance value
   * @param decimals Number of decimals
   * @returns Standardized balance string
   */
  export function standardizeBalance(value: BigNumberish, decimals: number = 18): string {
    try {
      // If it looks like raw balance, convert it
      if (isRawBalance(value, decimals)) {
        return format(value, decimals);
      }
      // Otherwise return as string
      return toString(value);
    } catch {
      return '0';
    }
  }

  /**
   * Convert to decimal representation
   * @param value The value to convert
   * @param decimals Number of decimals
   * @returns Decimal string representation
   */
  export function toDecimal(value: BigNumberish, decimals: number = 18): string {
    return format(value, decimals);
  }

  /**
   * Parse a string value with decimals to a BigNumberish
   */
  export function parseUnits(value: string, decimals: number = 18): bigint {
    // Remove any whitespace
    value = value.trim();
    
    // Handle scientific notation
    if (value.includes('e') || value.includes('E')) {
      const decimal = new Decimal(value);
      const multiplier = new Decimal(10).pow(decimals);
      const result = decimal.mul(multiplier);
      return BigInt(result.toFixed(0));
    }
    
    const parts = value.split('.');
    if (parts.length > 2) {
      throw new Error('Invalid decimal value');
    }
    
    const wholePart = parts[0] || '0';
    const fractionalPart = parts[1] || '';
    
    if (fractionalPart.length > decimals) {
      throw new Error(`Too many decimal places (max ${decimals})`);
    }
    
    const paddedFractional = fractionalPart.padEnd(decimals, '0');
    const combined = wholePart + paddedFractional;
    
    return BigInt(combined);
  }
}
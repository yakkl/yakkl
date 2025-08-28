/**
 * BigNumberish Utilities
 * Platform-agnostic utilities for handling big numbers
 * Moved from yakkl-wallet to allow sharing across projects
 */
import { type BigNumberish } from './BigNumber';
export declare namespace BigNumberishUtils {
    function toString(value: BigNumberish): string;
    function toBigInt(value: BigNumberish): bigint;
    function toNumber(value: BigNumberish): number;
    /**
     * Safe version of toNumber that returns 0 instead of throwing.
     * Use for UI sorting and display where errors should not crash the app.
     */
    function toNumberSafe(value: BigNumberish | bigint | undefined | null): number;
    function add(a: BigNumberish, b: BigNumberish): bigint;
    function subtract(a: BigNumberish, b: BigNumberish): bigint;
    function multiply(a: BigNumberish, b: BigNumberish): bigint;
    function divide(a: BigNumberish, b: BigNumberish): bigint;
    function mod(a: BigNumberish, b: BigNumberish): bigint;
    function pow(base: BigNumberish, exponent: bigint): bigint;
    function abs(value: BigNumberish): bigint;
    function min(a: BigNumberish, b: BigNumberish): bigint;
    function max(a: BigNumberish, b: BigNumberish): bigint;
    function isZero(value: BigNumberish): boolean;
    function isNegative(value: BigNumberish): boolean;
    function isPositive(value: BigNumberish): boolean;
    function compare(a: BigNumberish, b: BigNumberish): number;
    /**
     * Safe version of compare that handles invalid values
     * @param a First value to compare
     * @param b Second value to compare
     * @returns -1 if a < b, 0 if equal, 1 if a > b
     */
    function compareSafe(a: BigNumberish | undefined | null, b: BigNumberish | undefined | null): number;
    function equals(a: BigNumberish, b: BigNumberish): boolean;
    function lt(a: BigNumberish, b: BigNumberish): boolean;
    function lte(a: BigNumberish, b: BigNumberish): boolean;
    function gt(a: BigNumberish, b: BigNumberish): boolean;
    function gte(a: BigNumberish, b: BigNumberish): boolean;
    /**
     * Format a BigNumberish value for display with optional decimals
     */
    function format(value: BigNumberish, decimals?: number): string;
    /**
     * Convert from wei (or smallest unit) to a decimal number
     * @param value The value in wei/smallest unit
     * @param decimals Number of decimals (default 18 for ETH)
     * @returns The value as a decimal number
     */
    function fromWeiToNumber(value: BigNumberish, decimals?: number): number;
    /**
     * Check if a value is in raw balance format (wei/smallest unit)
     * @param value The value to check
     * @param decimals Number of decimals
     * @returns True if the value appears to be in raw format
     */
    function isRawBalance(value: BigNumberish, decimals?: number): boolean;
    /**
     * Standardize a balance to a consistent format
     * @param value The balance value
     * @param decimals Number of decimals
     * @returns Standardized balance string
     */
    function standardizeBalance(value: BigNumberish, decimals?: number): string;
    /**
     * Convert to decimal representation
     * @param value The value to convert
     * @param decimals Number of decimals
     * @returns Decimal string representation
     */
    function toDecimal(value: BigNumberish, decimals?: number): string;
    /**
     * Parse a string value with decimals to a BigNumberish
     */
    function parseUnits(value: string, decimals?: number): bigint;
}
//# sourceMappingURL=BigNumberishUtils.d.ts.map
// BigNumberishUtils.ts
import Decimal from 'decimal.js';
import { BigNumber, type BigNumberish } from './bignumber';

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
			
			const num = BigNumber.toNumber(value);
			if (num === null || !isFinite(num) || isNaN(num)) {
				return 0;
			}
			return num;
		} catch (error) {
			// Silently return 0 for UI stability
			return 0;
		}
	}

	export function toDecimal(value: BigNumberish, decimals = 18): Decimal {
		const bigint = toBigInt(value);
		return new Decimal(bigint.toString()).div(`1e${decimals}`);
	}

	export function compare(a: BigNumberish, b: BigNumberish): number {
		const bnA = toBigInt(a);
		const bnB = toBigInt(b);
		if (bnA < bnB) return -1;
		if (bnA > bnB) return 1;
		return 0;
	}

	/**
	 * Safe version of compare that handles undefined/null values.
	 * Use for array sorting where values might be missing.
	 */
	export function compareSafe(a: BigNumberish | bigint | undefined | null, b: BigNumberish | bigint | undefined | null): number {
		// Handle undefined/null cases
		if (a === undefined || a === null) {
			if (b === undefined || b === null) return 0;
			return -1; // undefined/null sorts before defined values
		}
		if (b === undefined || b === null) {
			return 1; // defined values sort after undefined/null
		}
		
		try {
			return compare(a, b);
		} catch (error) {
			// Fall back to safe number comparison
			const aNum = toNumberSafe(a);
			const bNum = toNumberSafe(b);
			return aNum < bNum ? -1 : aNum > bNum ? 1 : 0;
		}
	}

	export function add(a: BigNumberish, b: BigNumberish): bigint {
		return toBigInt(a) + toBigInt(b);
	}

	export function sub(a: BigNumberish, b: BigNumberish): bigint {
		return toBigInt(a) - toBigInt(b);
	}

	export function mul(a: BigNumberish, b: BigNumberish): bigint {
		const bnA = toBigInt(a);
		if (typeof b === 'number' && !Number.isInteger(b)) {
			throw new Error('Use toDecimal() for fractional math');
		}
		return bnA * BigNumber.toBigInt(b);
	}

	export function div(a: BigNumberish, b: BigNumberish): bigint {
		const bnB = toBigInt(b);
		if (bnB === BigInt(0)) throw new Error('Divide by zero');
		return toBigInt(a) / bnB;
	}

	export function abs(value: BigNumberish): bigint {
		const bigintValue = toBigInt(value);
		return bigintValue < 0n ? -bigintValue : bigintValue;
	}

	// Optional: Decimal-safe multiplication (fiat-style)
	export function mulDecimal(a: BigNumberish, b: BigNumberish, decimals = 18): Decimal {
		const decA = toDecimal(a, decimals);
		const decB = new Decimal(b.toString());
		return decA.times(decB);
	}

	// Sort helper for arrays of objects with a BigNumberish `value`
	export function sortByValueDesc<T extends { value: BigNumberish }>(arr: T[]): T[] {
		return [...arr].sort((a, b) => compare(b.value, a.value));
	}

	export function sortByValueAsc<T extends { value: BigNumberish }>(arr: T[]): T[] {
		return [...arr].sort((a, b) => compare(a.value, b.value));
	}

	// Convert from smallest unit (wei) to decimal number
	export function fromWeiToNumber(value: BigNumberish, decimals = 18): number {
		const decimalValue = toDecimal(value, decimals);
		return decimalValue.toNumber();
	}

	// Check if a value looks like it's in wei (large integer)
	export function isWeiValue(value: BigNumberish): boolean {
		const str = value?.toString() || '';
		return str.length > 10 && !str.includes('.') && /^\d+$/.test(str);
	}

	/**
	 * Detects if a balance is in raw smallest units (wei, satoshi, etc.) or human-readable format
	 * @param balance The balance value to check
	 * @param decimals The token decimals
	 * @returns true if the balance appears to be in raw format
	 */
	export function isRawBalance(balance: BigNumberish, decimals: number = 18): boolean {
		const str = balance?.toString() || '';
		
		// If it contains a decimal point, it's human-readable
		if (str.includes('.')) {
			return false;
		}
		
		// For 6 decimal tokens (USDC, USDT), raw values are typically > 1000000
		// For 8 decimal tokens (WBTC), raw values are typically > 100000
		// For 18 decimal tokens (ETH), raw values are typically > 1000000000
		
		const thresholds: Record<number, number> = {
			6: 1000, // 0.001 USDC minimum
			8: 10000, // 0.0001 BTC minimum  
			18: 1000000000, // 0.000000001 ETH minimum
		};
		
		const threshold = thresholds[decimals] || 1000000000;
		const numValue = parseFloat(str);
		
		// If the numeric value is greater than threshold and has no decimal, it's likely raw
		return !isNaN(numValue) && numValue > threshold;
	}

	/**
	 * Standardizes a balance to human-readable format
	 * @param balance The balance (could be raw or formatted)
	 * @param decimals The token decimals
	 * @returns Human-readable balance string
	 */
	export function standardizeBalance(balance: BigNumberish, decimals: number = 18): string {
		const str = balance?.toString() || '0';
		
		// If it's already human-readable (has decimal point), return as-is
		if (str.includes('.')) {
			return str;
		}
		
		// Check if it looks like a raw value
		if (isRawBalance(balance, decimals)) {
			// Convert from smallest units to human-readable
			return toDecimal(balance, decimals).toString();
		}
		
		// Otherwise, assume it's already in the correct format
		return str;
	}
}

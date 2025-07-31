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
		const num = BigNumber.toNumber(value);
		if (num === null) throw new Error('Invalid BigNumberish');
		return num;
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
}

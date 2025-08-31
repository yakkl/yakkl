// BigNumberishMath.ts
import Decimal from 'decimal.js';
import { type BigNumberish, BigNumber } from '../BigNumber';

/**
 * BigNumberishMath - Mathematical operations for BigNumberish types
 * Provides fluent API for arithmetic operations on large numbers
 */
export class BigNumberishMath {
	private value: bigint;

	private constructor(value: BigNumberish) {
		const bigint = BigNumber.toBigInt(value);
		if (bigint === null) throw new Error('Invalid BigNumberish');
		this.value = bigint;
	}

	static of(value: BigNumberish): BigNumberishMath {
		return new BigNumberishMath(value);
	}

	add(other: BigNumberish): BigNumberishMath {
		this.value += BigNumberishMath.of(other).toBigInt();
		return this;
	}

	sub(other: BigNumberish): BigNumberishMath {
		this.value -= BigNumberishMath.of(other).toBigInt();
		return this;
	}

	mul(other: BigNumberish): BigNumberishMath {
		const multiplier = BigNumberishMath.of(other).toBigInt();
		this.value *= multiplier;
		return this;
	}

	div(other: BigNumberish): BigNumberishMath {
		const divisor = BigNumberishMath.of(other).toBigInt();
		if (divisor === BigInt(0)) throw new Error('Divide by zero');
		this.value /= divisor;
		return this;
	}

	mod(other: BigNumberish): BigNumberishMath {
		const mod = BigNumberishMath.of(other).toBigInt();
		if (mod === BigInt(0)) throw new Error('Mod by zero');
		this.value %= mod;
		return this;
	}

	compare(other: BigNumberish): number {
		const otherValue = BigNumberishMath.of(other).toBigInt();
		if (this.value < otherValue) return -1;
		if (this.value > otherValue) return 1;
		return 0;
	}

	gt(other: BigNumberish): boolean {
		return this.compare(other) > 0;
	}

	gte(other: BigNumberish): boolean {
		return this.compare(other) >= 0;
	}

	lt(other: BigNumberish): boolean {
		return this.compare(other) < 0;
	}

	lte(other: BigNumberish): boolean {
		return this.compare(other) <= 0;
	}

	eq(other: BigNumberish): boolean {
		return this.compare(other) === 0;
	}

	toBigInt(): bigint {
		return this.value;
	}

	toNumber(): number {
		return Number(this.value);
	}

	toDecimal(decimals = 18): Decimal {
		return new Decimal(this.value.toString()).div(`1e${decimals}`);
	}

	toString(): string {
		return this.value.toString();
	}
}
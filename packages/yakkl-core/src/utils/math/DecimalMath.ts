// DecimalMath.ts
import Decimal from 'decimal.js';

/**
 * DecimalMath - Fluent API for decimal arithmetic operations
 * Provides precise decimal calculations without floating point errors
 */
export class DecimalMath {
	private value: Decimal;

	private constructor(val: Decimal | number | string) {
		this.value = new Decimal(val);
	}

	static of(val: Decimal | number | string): DecimalMath {
		return new DecimalMath(val);
	}

	add(val: Decimal | number | string): DecimalMath {
		this.value = this.value.plus(val);
		return this;
	}

	sub(val: Decimal | number | string): DecimalMath {
		this.value = this.value.minus(val);
		return this;
	}

	mul(val: Decimal | number | string): DecimalMath {
		this.value = this.value.times(val);
		return this;
	}

	div(val: Decimal | number | string): DecimalMath {
		this.value = this.value.div(val);
		return this;
	}

	pct(percent: number): DecimalMath {
		return this.mul(percent / 100);
	}

	round(decimals = 2): DecimalMath {
		this.value = this.value.toDecimalPlaces(decimals);
		return this;
	}

	gt(val: Decimal | number | string): boolean {
		return this.value.gt(val);
	}

	lt(val: Decimal | number | string): boolean {
		return this.value.lt(val);
	}

	toDecimal(): Decimal {
		return this.value;
	}

	toFixed(decimals = 2): string {
		return this.value.toFixed(decimals);
	}

	toNumber(): number {
		return this.value.toNumber();
	}

	toString(): string {
		return this.value.toString();
	}
}
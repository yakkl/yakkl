// TokenAmount.ts
import { BigNumberishMath } from './BigNumberishMath';
import { DecimalMath } from './DecimalMath';
import { type BigNumberish } from './bignumber';
import Decimal from 'decimal.js';

export class TokenAmount {
	private raw: bigint;
	private decimals: number;

	constructor(rawValue: BigNumberish, decimals: number = 18) {
		this.raw = BigNumberishMath.of(rawValue).toBigInt();
		this.decimals = decimals;
	}

	toDecimal(): DecimalMath {
		const ether = new Decimal(this.raw.toString()).div(`1e${this.decimals}`);
		return DecimalMath.of(ether);
	}

	toFiat(price: number | string): DecimalMath {
		return this.toDecimal().mul(price);
	}

	formatFiat(
		price: number | string,
		currency: string = 'USD',
		locale: string = 'en-US',
		decimals = 2
	): string {
		const fiat = this.toFiat(price).toNumber();
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency,
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		}).format(fiat);
	}

	toFixed(decimals = 4): string {
		return this.toDecimal().toFixed(decimals);
	}
}

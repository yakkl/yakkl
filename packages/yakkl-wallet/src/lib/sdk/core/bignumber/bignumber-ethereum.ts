// EthereumBigNumber.ts - SDK Core Ethereum BigNumber Implementation
import { BigNumber, CurrencyCode, type BigNumberish } from './bignumber';
import Decimal from 'decimal.js';

export interface FiatFormatOptions {
	locale?: string;
	decimalPlaces?: number;
	currencyStyle?: 'symbol' | 'code' | 'name'; // Choose how to display currency
	smallThreshold?: number; // Below this, display "< $0.01"
}

export class EthereumBigNumber extends BigNumber {
	// Instance methods
	toWei(): EthereumBigNumber {
		let ethValue: bigint;

		if (
			typeof this._value === 'number' ||
			(typeof this._value === 'string' && this._value.includes('.'))
		) {
			const valueString = this._value.toString();
			const [integerPart, fractionalPartRaw = ''] = valueString.split('.');
			const fractionalPart = fractionalPartRaw.padEnd(18, '0').slice(0, 18); // Wei has 18 decimals
			ethValue = BigInt(integerPart + fractionalPart);
		} else {
			ethValue = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
		}

		return new EthereumBigNumber(ethValue);
	}

	toGwei(): EthereumBigNumber {
		let ethValue: bigint;

		if (
			typeof this._value === 'number' ||
			(typeof this._value === 'string' && this._value.includes('.'))
		) {
			const valueString = this._value.toString();
			const [integerPart, fractionalPartRaw = ''] = valueString.split('.');
			const fractionalPart = fractionalPartRaw.padEnd(9, '0').slice(0, 9); // Gwei has 9 decimals
			ethValue = BigInt(integerPart + fractionalPart);
		} else {
			ethValue = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
		}

		return new EthereumBigNumber(ethValue);
	}

	toEther(): EthereumBigNumber {
		const weiValue = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
		return new EthereumBigNumber(weiValue / BigInt('1000000000000000000'));
	}

	toEtherString(): string {
		const weiValue = EthereumBigNumber.toBigInt(this._value) ?? BigInt(0);
		const etherValue = weiValue / BigInt('1000000000000000000');
		const remainder = weiValue % BigInt('1000000000000000000');

		// Construct the fractional part as a string
		const fractionalPart = remainder.toString().padStart(18, '0').slice(0, 18);

		// Combine the integer part and fractional part
		const etherString = `${etherValue}.${fractionalPart}`;
		return etherString;
	}

	static from(value: BigNumberish): EthereumBigNumber {
		if (typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value)) {
			return new EthereumBigNumber(BigInt(value));
		}
		if (value && typeof value === 'object' && '_hex' in value && '_isBigNumber' in value) {
			return new EthereumBigNumber(BigInt(value._hex));
		}
		return new EthereumBigNumber(BigNumber.toBigInt(value));
	}

	static fromWeiToEth(value: BigNumberish): EthereumBigNumber {
		const weiValue = EthereumBigNumber.from(value);
		const ethValue = weiValue.div(BigInt('1000000000000000000'));
		return new EthereumBigNumber(ethValue.toString());
	}

	static fromGwei(value: BigNumberish): EthereumBigNumber {
		const gweiValue = EthereumBigNumber.from(value);
		const ethValue = gweiValue.div(BigInt('1000000000'));
		return new EthereumBigNumber(ethValue.toString());
	}

	// Method to convert ether (in decimal, int) to wei
	static fromEther(value: BigNumberish): EthereumBigNumber {
		if (value === null || value === undefined) {
			throw new Error('Value cannot be null or undefined');
		}

		let etherString: string;

		if (typeof value === 'number' || typeof value === 'string') {
			etherString = value.toString();
		} else if (typeof value === 'bigint') {
			etherString = value.toString();
		} else if (value instanceof BigNumber) {
			etherString = value.toString();
		} else if (typeof value === 'object' && '_hex' in value && '_isBigNumber' in value) {
			etherString = BigInt(value._hex).toString();
		} else {
			throw new Error('Unsupported type for BigNumberish value');
		}

		// Ensure the string representation has a decimal point
		if (!etherString.includes('.')) {
			etherString += '.0';
		}

		// Split the string into the integer and fractional parts
		const [integerPart, fractionalPart] = etherString.split('.');
		// Normalize the fractional part to have exactly 18 digits, representing wei's precision
		const fractionalPartPadded = (fractionalPart + '0'.repeat(18)).slice(0, 18);
		// Combine and convert to BigInt
		const weiValue = BigInt(integerPart + fractionalPartPadded);

		return new EthereumBigNumber(weiValue);
	}

	static toWei(value: BigNumberish): EthereumBigNumber {
		let ethValue: bigint;

		if (typeof value === 'number' || (typeof value === 'string' && value.includes('.'))) {
			const valueString = value.toString();
			const [integerPart, fractionalPartRaw = ''] = valueString.split('.');
			const fractionalPart = fractionalPartRaw.padEnd(18, '0').slice(0, 18); // Wei has 18 decimals
			ethValue = BigInt(integerPart + fractionalPart);
		} else {
			ethValue = EthereumBigNumber.toBigInt(value) ?? BigInt(0);
		}

		return new EthereumBigNumber(ethValue);
	}

	static toGwei(value: BigNumberish): EthereumBigNumber {
		// Convert the value to a BigInt
		let ethValue: bigint;

		// If the value is a number or a string that represents a float, handle it
		if (typeof value === 'number' || (typeof value === 'string' && value.includes('.'))) {
			// Convert the value to a string if it is a number
			const valueString = value.toString();

			// Split the value into integer and fractional parts
			const [integerPart, fractionalPartRaw = ''] = valueString.split('.');

			// Truncate or pad the fractional part to 9 digits (to convert Gwei to Wei)
			const fractionalPart = fractionalPartRaw.padEnd(9, '0').slice(0, 9);

			// Combine the parts and convert to BigInt
			ethValue = BigInt(integerPart + fractionalPart);
		} else {
			// Convert directly to BigInt if no fractional part
			ethValue = EthereumBigNumber.toBigInt(value) ?? BigInt(0);
		}

		// Return as a new BigNumber instance
		return new EthereumBigNumber(ethValue);
	}

	static toEther(value: BigNumberish): EthereumBigNumber {
		const weiValue = EthereumBigNumber.from(value).toBigInt() ?? BigInt(0);
		return new EthereumBigNumber(weiValue / BigInt('1000000000000000000'));
	}

	static toDecimalEther(value: BigNumberish): Decimal {
		const wei = EthereumBigNumber.toBigInt(value) ?? BigInt(0);
		return new Decimal(wei.toString()).div('1e18');
	}

	static toEtherString(value: BigNumberish): string {
		const weiValue = EthereumBigNumber.from(value).toBigInt() ?? BigInt(0);
		const etherValue = weiValue / BigInt('1000000000000000000');
		const remainder = weiValue % BigInt('1000000000000000000');

		// Construct the fractional part as a string
		const fractionalPart = remainder.toString().padStart(18, '0').slice(0, 18);

		// Combine the integer part and fractional part
		const etherString = `${etherValue}.${fractionalPart}`;
		return etherString;
	}

	static toFiat(value: BigNumberish, price: number | string | BigNumberish): number {
		// CRITICAL FIX: Handle token balance (wei) and USD price correctly
		// value is in wei (18 decimals), price is in USD (not wei!)
		
		// Convert wei to ETH using Decimal for precision
		const ether = this.toDecimalEther(value);
		
		// Price is already in USD, not wei - just use it directly
		const priceDecimal = new Decimal(price.toString());
		
		// Calculate USD value = ETH amount * USD price
		const fiatValue = ether.times(priceDecimal);
		
		return fiatValue.toNumber();
	}

	static toFiatString(value: BigNumberish, price: number, decimals = 2): string {
		// Use the corrected toFiat method
		const fiat = EthereumBigNumber.toFiat(value, price);
		return fiat.toFixed(decimals);
	}

	static toFormattedFiat(
		value: BigNumberish,
		price: BigNumberish,
		currencyCode: CurrencyCode,
		locale: string = 'en-US',
		decimalPlaces: number = 2
	): string {
		// Convert wei to bigint
		const wei = EthereumBigNumber.toBigInt(value);
		if (wei === null) {
			throw new Error('Invalid BigNumberish token value');
		}

		// Convert wei to ETH (18 decimals)
		const ether = new Decimal(wei.toString()).div('1e18');
		
		// Price is in USD/fiat, not wei - use directly
		const decimalPrice = new Decimal(price.toString());
		
		// Calculate fiat value = ETH * price
		const fiatValue = ether.times(decimalPrice);

		// Format with appropriate currency settings
		const formatter = new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: decimalPlaces,
			maximumFractionDigits: decimalPlaces
		});

		return formatter.format(fiatValue.toNumber());
	}

	static toFormattedFiat2(
		value: BigNumberish,
		price: BigNumberish,
		currencyCode: CurrencyCode,
		options: FiatFormatOptions = {}
	): string {
		const {
			locale = 'en-US',
			decimalPlaces = 2,
			currencyStyle = 'symbol',
			smallThreshold = 0.01
		} = options;

		const wei = EthereumBigNumber.toBigInt(value);
		if (wei === null) {
			throw new Error('Invalid BigNumberish token value');
		}

		const ether = new Decimal(wei.toString()).div('1e18');
		const decimalPrice = new Decimal(price.toString());
		const fiatValue = ether.times(decimalPrice);

		// Handle small values
		if (fiatValue.lessThan(smallThreshold)) {
			const smallFormatted = new Intl.NumberFormat(locale, {
				style: 'currency',
				currency: currencyCode,
				currencyDisplay: currencyStyle,
				minimumFractionDigits: decimalPlaces,
				maximumFractionDigits: decimalPlaces
			}).format(smallThreshold);

			return `< ${smallFormatted}`;
		}

		const formatter = new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyCode,
			currencyDisplay: currencyStyle,
			minimumFractionDigits: decimalPlaces,
			maximumFractionDigits: decimalPlaces
		});

		return formatter.format(fiatValue.toNumber());
	}

	static toHex(value: BigNumberish): string {
		const bigintValue = BigNumber.toBigInt(value);
		if (bigintValue === null) {
			throw new Error('Invalid BigNumberish value');
		}
		let hexString = bigintValue.toString(16);
		if (hexString.length % 2 !== 0) {
			hexString = '0' + hexString;
		}
		return '0x' + hexString;
	}
}
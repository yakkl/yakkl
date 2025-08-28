// BigNumber.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

// Define the Numeric type
export type Numeric = number | bigint;

// Define the BigNumberish type
export type BigNumberish =
	| string
	| Numeric
	| BigNumber
	| { _hex: string; _isBigNumber: boolean }
	| null;

export enum CurrencyCode {
	USD = 'USD',
	EUR = 'EUR',
	GBP = 'GBP'
	// Add more as needed
}

export interface FiatFormatOptions {
	locale?: string;
	decimalPlaces?: number;
	currencyStyle?: 'symbol' | 'code' | 'name'; // Choose how to display currency
	smallThreshold?: number; // Below this, display "< $0.01"
}

export interface IBigNumber {
	value: BigNumberish;
	toNumber(): number | null;
	toBigInt(decimals?: number): bigint | null;
	fromValue(value: BigNumberish): void;
	max(other: BigNumberish): BigNumber;
	min(other: BigNumberish): BigNumber;
	add(other: BigNumberish): BigNumber;
	subtract(other: BigNumberish): BigNumber;
	sub(other: BigNumberish): BigNumber;
	div(other: BigNumberish): BigNumber;
	mul(other: BigNumberish): BigNumber;
	mod(other: BigNumberish): BigNumber;
	toString(): string;
	toHex(isEthereum?: boolean): string;
}

// Implement the BigNumber class with basic static and instance methods
export class BigNumber implements IBigNumber {
	protected _value: BigNumberish;

	constructor(value: BigNumberish = null) {
		this._value = value;
	}

	// Getter for value
	get value(): BigNumberish {
		return this._value;
	}

	// Setter for value
	set value(newValue: BigNumberish) {
		this._value = newValue;
	}

	compare(other: BigNumberish, decimals: number = 18): number {
		const a = this.toBigInt(decimals);
		const b = BigNumber.from(other).toBigInt(decimals);
		if (a === null || b === null) {
			throw new Error('Cannot compare null values');
		}
		if (a < b) return -1;
		if (a > b) return 1;
		return 0;
	}

	// Type guard to check if value is BigNumber
	static isBigNumber(value: any): value is BigNumber {
		return value instanceof BigNumber;
	}

	// Type guard to check if value is an object with hex property
	static isHexObject(value: any): value is { hex: string; type: string } {
		return typeof value === 'object' && value !== null && 'hex' in value && 'type' in value;
	}

	// Method to convert the value to a number
	toNumber(): number | null {
		if (this._value === null) {
			return null;
		}

		if (typeof this._value === 'string' || typeof this._value === 'number') {
			return Number(this._value);
		}

		if (typeof this._value === 'bigint') {
			return Number(this._value);
		}

		if (BigNumber.isBigNumber(this._value)) {
			return this._value.toNumber();
		}

		if (BigNumber.isHexObject(this._value)) {
			return Number(BigInt((this._value as any).hex));
		}

		return null;
	}

	// Method to convert the value to a bigint
	toBigInt(decimals: number = 18): bigint | null {
		if (this._value === null) {
			return null;
		}

		if (typeof this._value === 'string') {
			// Handle decimal strings
			if (this._value.includes('.')) {
				const [integerPart, fractionalPart] = this._value.split('.');
				const factor = BigInt(10 ** decimals);
				return (
					BigInt(integerPart) * factor +
					BigInt((fractionalPart + '0'.repeat(decimals)).slice(0, decimals))
				);
			}
			return BigInt(this._value);
		}

		if (typeof this._value === 'number') {
			if (!Number.isInteger(this._value)) {
				const str = this._value.toString();
				const [integerPart, fractionalPart = ''] = str.split('.');
				const factor = BigInt(10 ** decimals);
				return BigInt(integerPart) * factor + BigInt((fractionalPart + '0'.repeat(decimals)).slice(0, decimals));
			}
			return BigInt(this._value);
		}

		if (typeof this._value === 'bigint') {
			return this._value;
		}

		if (BigNumber.isBigNumber(this._value)) {
			return this._value.toBigInt(decimals);
		}

		if (BigNumber.isHexObject(this._value)) {
			return BigInt((this._value as any).hex);
		}

		return null;
	}

	// Method to set the value from a BigNumberish type
	fromValue(value: BigNumberish): void {
		this._value = value;
	}

	// Method to get the maximum of two BigNumberish values
	max(other: BigNumberish): BigNumber {
		return BigNumber.max(this._value, other);
	}

	// Method to get the minimum of two BigNumberish values
	min(other: BigNumberish): BigNumber {
		return BigNumber.min(this._value, other);
	}

	// Method to add another BigNumberish value to this value
	add(other: BigNumberish): BigNumber {
		return BigNumber.add(this._value, other);
	}

	// Method to subtract another BigNumberish value from this value
	subtract(other: BigNumberish): BigNumber {
		return BigNumber.subtract(this._value, other);
	}

	// Alias for subtract
	sub(other: BigNumberish): BigNumber {
		return this.subtract(other);
	}

	// Method to divide this value by another BigNumberish value
	div(other: BigNumberish): BigNumber {
		return BigNumber.div(this._value, other);
	}

	// Method to multiply this value by another BigNumberish value
	mul(other: BigNumberish): BigNumber {
		return BigNumber.mul(this._value, other);
	}

	// Method to get the modulo of this value by another BigNumberish value
	mod(other: BigNumberish): BigNumber {
		return BigNumber.mod(this._value, other);
	}

	// Method to convert the value to a string
	toString(): string {
		// Handle string values
		if (typeof this._value === 'string') {
			return this._value;
		}

		// For all other types, convert to bigint first
		const bigintValue = this.toBigInt();
		if (bigintValue === null) {
			return '';
		}

		return bigintValue.toString();
	}

	// Method to convert the value to a hex string
	toHex(isEthereum: boolean = true): string {
		if (this._value === null) {
			return '';
		}

		// Handle string values
		if (typeof this._value === 'string') {
			return this._value;
		}

		// Handle number and bigint values
		const bigintValue = this.toBigInt();
		if (bigintValue === null) {
			return '';
		}

		let hexString = bigintValue.toString(16);

		// Ensure even length for the hex string if Ethereum-compatible
		if (isEthereum && hexString.length % 2 !== 0) {
			hexString = '0' + hexString;
		}

		return '0x' + hexString;
	}

	// Static method to create a BigNumber instance
	static from(value: BigNumberish): BigNumber {
		if (BigNumber.isHexObject(value)) {
			return new BigNumber(BigInt((value as any).hex));
		}
		return new BigNumber(value);
	}

	// Static method to convert a BigNumberish to a number
	static toNumber(value: BigNumberish): number | null {
		if (value === null || value === undefined) {
			return null;
		}

		try {
			if (typeof value === 'string') {
				const num = Number(value);
				return isFinite(num) ? num : null;
			}
			
			if (typeof value === 'number') {
				return isFinite(value) ? value : null;
			}

			if (typeof value === 'bigint') {
				// Check if bigint is within safe integer range
				if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
					console.warn('BigInt value exceeds safe integer range:', value);
					// Return the clamped value rather than null for better UX
					return value > 0 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
				}
				return Number(value);
			}

			if (BigNumber.isBigNumber(value)) {
				return value.toNumber();
			}

			if (BigNumber.isHexObject(value)) {
				return Number(BigInt((value as any).hex));
			}
		} catch (error) {
			console.error('Error converting to number:', error);
			return null;
		}

		return null;
	}

	// Static method to convert a BigNumberish to a bigint
	static toBigInt(value: BigNumberish, decimals: number = 0): bigint | null {
		if (value === null) {
			return null;
		}

		try {
			if (typeof value === 'string') {
				// Check for decimal point even when decimals is 0
				if (value.includes('.')) {
					if (decimals > 0) {
						// Convert with specified decimals
						const [integerPart, fractionalPart] = value.split('.');
						const factor = BigInt(10 ** decimals);
						return (
							BigInt(integerPart) * factor +
							BigInt((fractionalPart + '0'.repeat(decimals)).slice(0, decimals))
						);
					} else {
						// No decimals specified, but value has decimal - floor it
						const [integerPart] = value.split('.');
						return BigInt(integerPart || '0');
					}
				}
				// No decimal point, convert directly
				return BigInt(value);
			}

			if (typeof value === 'number') {
				if (decimals > 0 && !Number.isInteger(value)) {
					const str = value.toString();
					const [integerPart, fractionalPart = ''] = str.split('.');
					const factor = BigInt(10 ** decimals);
					return BigInt(integerPart) * factor + BigInt((fractionalPart + '0'.repeat(decimals)).slice(0, decimals));
				}
				return BigInt(Math.floor(value));
			}

			if (typeof value === 'bigint') {
				return value;
			}

			if (BigNumber.isBigNumber(value)) {
				return value.toBigInt(decimals);
			}

			if (BigNumber.isHexObject(value)) {
				return BigInt((value as any).hex);
			}
		} catch (error) {
			console.error('Error converting to BigInt:', error);
			return null;
		}

		return null;
	}

	// Static method to get the maximum of two BigNumberish values
	static max(a: BigNumberish, b: BigNumberish): BigNumber {
		const aBigInt = BigNumber.toBigInt(a) ?? BigInt(0);
		const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
		return new BigNumber(aBigInt > bBigInt ? aBigInt : bBigInt);
	}

	// Static method to get the minimum of two BigNumberish values
	static min(a: BigNumberish, b: BigNumberish): BigNumber {
		const aBigInt = BigNumber.toBigInt(a) ?? BigInt(0);
		const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
		return new BigNumber(aBigInt < bBigInt ? aBigInt : bBigInt);
	}

	// Static method to add two BigNumberish values
	static add(a: BigNumberish, b: BigNumberish): BigNumber {
		const aBigInt = BigNumber.toBigInt(a) ?? BigInt(0);
		const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
		return new BigNumber(aBigInt + bBigInt);
	}

	// Static method to subtract two BigNumberish values
	static subtract(a: BigNumberish, b: BigNumberish): BigNumber {
		const aBigInt = BigNumber.toBigInt(a) ?? BigInt(0);
		const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
		return new BigNumber(aBigInt - bBigInt);
	}

	// Alias for subtract
	static sub(a: BigNumberish, b: BigNumberish): BigNumber {
		return BigNumber.subtract(a, b);
	}

	// Static method to divide two BigNumberish values
	static div(a: BigNumberish, b: BigNumberish): BigNumber {
		const aBigInt = BigNumber.toBigInt(a) ?? BigInt(0);
		const bBigInt = BigNumber.toBigInt(b) ?? BigInt(1); // Avoid division by zero
		return new BigNumber(aBigInt / bBigInt);
	}

	// Static method to multiply two BigNumberish values
	static mul(a: BigNumberish, b: BigNumberish): BigNumber {
		const aBigInt = BigNumber.toBigInt(a) ?? BigInt(0);
		const bBigInt = BigNumber.toBigInt(b) ?? BigInt(0);
		return new BigNumber(aBigInt * bBigInt);
	}

	// Static method to get the modulo of two BigNumberish values
	static mod(a: BigNumberish, b: BigNumberish): BigNumber {
		const aBigInt = BigNumber.toBigInt(a) ?? BigInt(0);
		const bBigInt = BigNumber.toBigInt(b) ?? BigInt(1); // Avoid modulo by zero
		return new BigNumber(aBigInt % bBigInt);
	}

	// Static method to check if a value is zero
	static isZero(value: BigNumberish): boolean {
		const bigintValue = BigNumber.toBigInt(value);
		return bigintValue === BigInt(0);
	}

	// Static method to check if a value is negative
	static isNegative(value: BigNumberish): boolean {
		const bigintValue = BigNumber.toBigInt(value);
		return bigintValue !== null && bigintValue < BigInt(0);
	}

	// Static method to get the absolute value
	static abs(value: BigNumberish): BigNumber {
		const bigintValue = BigNumber.toBigInt(value) ?? BigInt(0);
		return new BigNumber(bigintValue < BigInt(0) ? -bigintValue : bigintValue);
	}

	// Static method to negate a value
	static negate(value: BigNumberish): BigNumber {
		const bigintValue = BigNumber.toBigInt(value) ?? BigInt(0);
		return new BigNumber(-bigintValue);
	}

	// Static method to calculate power
	static pow(base: BigNumberish, exponent: number): BigNumber {
		if (!Number.isInteger(exponent) || exponent < 0) {
			throw new Error('Exponent must be a non-negative integer');
		}
		const baseBigInt = BigNumber.toBigInt(base) ?? BigInt(0);
		return new BigNumber(baseBigInt ** BigInt(exponent));
	}

	// Ethereum-specific instance methods
	toWei(): BigNumber {
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
			ethValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
		}

		return new BigNumber(ethValue);
	}

	toGwei(): BigNumber {
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
			ethValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
		}

		return new BigNumber(ethValue);
	}

	toEther(): BigNumber {
		const weiValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
		return new BigNumber(weiValue / BigInt('1000000000000000000'));
	}

	toEtherString(): string {
		const weiValue = BigNumber.toBigInt(this._value) ?? BigInt(0);
		const etherValue = weiValue / BigInt('1000000000000000000');
		const remainder = weiValue % BigInt('1000000000000000000');

		// Construct the fractional part as a string
		const fractionalPart = remainder.toString().padStart(18, '0').slice(0, 18);

		// Combine the integer part and fractional part
		const etherString = `${etherValue}.${fractionalPart}`;
		return etherString;
	}

	// Ethereum-specific static methods  
	static fromEther(value: BigNumberish): BigNumber {
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
			etherString = BigInt((value as any)._hex).toString();
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

		return new BigNumber(weiValue);
	}

	static toWei(value: BigNumberish): BigNumber {
		let ethValue: bigint;

		if (typeof value === 'number' || (typeof value === 'string' && value.includes('.'))) {
			const valueString = value.toString();
			const [integerPart, fractionalPartRaw = ''] = valueString.split('.');
			const fractionalPart = fractionalPartRaw.padEnd(18, '0').slice(0, 18); // Wei has 18 decimals
			ethValue = BigInt(integerPart + fractionalPart);
		} else {
			ethValue = BigNumber.toBigInt(value) ?? BigInt(0);
		}

		return new BigNumber(ethValue);
	}

	static toGwei(value: BigNumberish): BigNumber {
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
			ethValue = BigNumber.toBigInt(value) ?? BigInt(0);
		}

		// Return as a new BigNumber instance
		return new BigNumber(ethValue);
	}

	static toEther(value: BigNumberish): BigNumber {
		const weiValue = BigNumber.from(value).toBigInt() ?? BigInt(0);
		return new BigNumber(weiValue / BigInt('1000000000000000000'));
	}

	static fromGwei(value: number | string): BigNumber {
		// Convert Gwei to Wei (1 Gwei = 10^9 Wei)
		const gweiString = value.toString();
		const [integerPart, fractionalPart = ''] = gweiString.split('.');
		const fractionalPadded = fractionalPart.padEnd(9, '0').slice(0, 9);
		const weiValue = BigInt(integerPart + fractionalPadded);
		return new BigNumber(weiValue);
	}

	static toEtherString(value: BigNumberish): string {
		const weiValue = BigNumber.from(value).toBigInt() ?? BigInt(0);
		const etherValue = weiValue / BigInt('1000000000000000000');
		const remainder = weiValue % BigInt('1000000000000000000');

		// Construct the fractional part as a string
		const fractionalPart = remainder.toString().padStart(18, '0').slice(0, 18);

		// Combine the integer part and fractional part
		const etherString = `${etherValue}.${fractionalPart}`;
		return etherString;
	}

	// Static method to create a BigNumber from a hex string
	static fromHex(hex: string): BigNumber {
		if (typeof hex !== 'string' || !/^0x[0-9a-fA-F]+$/.test(hex)) {
			throw new Error('Invalid hex string');
		}
		return new BigNumber(BigInt(hex));
	}

	// Instance method to convert the current value to fiat
	toFiat(price: number): number {
		// Convert wei to ETH first
		const etherValue = parseFloat(this.toEtherString());
		if (isNaN(etherValue)) {
			throw new Error('Invalid BigNumberish value');
		}
		return etherValue * price;
	}

	// Static toFiat method for compatibility  
	static toFiat(value: BigNumberish, price: number | string | BigNumberish): number {
		// CRITICAL FIX: Handle token balance (wei) and USD price correctly
		// value is in wei (18 decimals), price is in USD (not wei!)
		
		// Convert wei to ETH for precision
		const etherString = BigNumber.toEtherString(value);
		const etherValue = parseFloat(etherString);
		
		// Price is already in USD, not wei - just use it directly
		const priceNumber = typeof price === 'number' ? price : Number(price?.toString() ?? 0);
		
		// Calculate USD value = ETH amount * USD price
		return etherValue * priceNumber;
	}

	// Static toFormattedFiat for compatibility
	static toFormattedFiat(
		value: BigNumberish,
		price: BigNumberish,
		currencyCode: CurrencyCode,
		locale: string = 'en-US',
		decimalPlaces: number = 2
	): string {
		const fiatValue = BigNumber.toFiat(value, price);

		// Format with appropriate currency settings
		const formatter = new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: decimalPlaces,
			maximumFractionDigits: decimalPlaces
		});

		return formatter.format(fiatValue);
	}

	// Instance method to convert the current value to formatted fiat
	toFormattedFiat(price: number, currencyCode: CurrencyCode, locale: string = ''): string {
		const fiatValue = this.toFiat(price);
		const formatter = new Intl.NumberFormat(locale || undefined, {
			style: 'currency',
			currency: currencyCode
		});
		return formatter.format(fiatValue);
	}

	// Helper method to multiply a value (in ETH or token units) by price to get USD value
	// This handles decimal string values properly
	mulByPrice(price: number | string, decimals: number = 18): BigNumber {
		// Convert price to BigNumber-compatible format
		const priceBN = BigNumber.from(price);

		// If the current value is a decimal string (like "0.017191425943385866"),
		// we need to convert it to wei/smallest unit first
		const valueInSmallestUnit = this.toBigInt(decimals);
		if (valueInSmallestUnit === null) {
			throw new Error('Cannot convert value to bigint');
		}

		// Convert price to smallest unit (multiply by 10^decimals)
		const priceInSmallestUnit = priceBN.toBigInt(decimals);
		if (priceInSmallestUnit === null) {
			throw new Error('Cannot convert price to bigint');
		}

		// Multiply the two values
		const result = valueInSmallestUnit * priceInSmallestUnit;

		// The result is now in (smallest unit)^2, so we need to divide by 10^decimals
		// to get back to the correct scale
		const divisor = BigInt('1' + '0'.repeat(decimals));
		const scaledResult = result / divisor;

		return new BigNumber(scaledResult);
	}

	// Convert from smallest unit (wei) to decimal string (ETH)
	static fromWei(weiValue: BigNumberish, decimals: number = 18): string {
		const wei = BigNumber.toBigInt(weiValue, 0); // Already in smallest unit
		if (wei === null) return '0';

		const divisor = BigInt('1' + '0'.repeat(decimals));
		const wholePart = wei / divisor;
		const fractionalPart = wei % divisor;

		// Format fractional part with leading zeros
		const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
		// Remove trailing zeros
		const trimmedFractional = fractionalStr.replace(/0+$/, '');

		if (trimmedFractional === '') {
			return wholePart.toString();
		} else {
			return `${wholePart}.${trimmedFractional}`;
		}
	}

	// Convert current value from smallest unit to decimal string
	toDecimalString(decimals: number = 18): string {
		const bigintValue = this.toBigInt(0); // Assume already in smallest unit
		if (bigintValue === null) return '0';
		return BigNumber.fromWei(bigintValue, decimals);
	}
}
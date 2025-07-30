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

export interface IBigNumber {
	value: BigNumberish;
	toNumber(): number | null;
	toBigInt(): bigint | null;
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
	toHex(): string;
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
			return Number(BigInt(this._value.hex));
		}

		return null;
	}

	// Method to convert the value to a bigint
	toBigInt(decimals: number = 18): bigint | null {
		if (this._value === null) {
			return null;
		}

		if (typeof this._value === 'string') {
			// Handle cases where the string value may contain decimals
			if (this._value.includes('.')) {
				const [integerPart, fractionalPart = ''] = this._value.split('.');
				const factor = BigInt('1' + '0'.repeat(decimals));
				const scaledValue =
					BigInt(integerPart) * factor +
					BigInt((fractionalPart + '0'.repeat(decimals)).slice(0, decimals));
				return scaledValue;
			} else {
				return BigInt(this._value);
			}
		}

		if (typeof this._value === 'number') {
			if (!Number.isInteger(this._value)) {
				const factor = Math.pow(10, decimals);
				return BigInt(Math.round(this._value * factor));
			} else {
				return BigInt(this._value);
			}
		}

		if (typeof this._value === 'bigint') {
			return this._value;
		}

		if (BigNumber.isBigNumber(this._value)) {
			return this._value.toBigInt(decimals);
		}

		if (BigNumber.isHexObject(this._value)) {
			return BigInt(this._value.hex);
		}

		return null;
	}

	// Method to set the value
	fromValue(value: BigNumberish): void {
		this._value = value;
	}

	// Instance method to get the maximum of the current value and another BigNumberish value
	max(other: BigNumberish): BigNumber {
		return BigNumber.max(this._value, other);
	}

	// Instance method to get the minimum of the current value and another BigNumberish value
	min(other: BigNumberish): BigNumber {
		return BigNumber.min(this._value, other);
	}

	// Instance method to add another BigNumberish value to the current value
	add(other: BigNumberish): BigNumber {
		return BigNumber.add(this._value, other);
	}

	// Instance method to subtract another BigNumberish value from the current value
	subtract(other: BigNumberish): BigNumber {
		return BigNumber.subtract(this._value, other);
	}

	// Instance method to subtract another BigNumberish value from the current value - to be more compatible with other classes
	sub(other: BigNumberish): BigNumber {
		return this.subtract(other);
	}

	// Instance method to divide the current value by another BigNumberish value
	div(other: BigNumberish): BigNumber {
		return BigNumber.div(this._value, other);
	}

	// Instance method to multiply the current value by another BigNumberish value
	mul(other: BigNumberish): BigNumber {
		return BigNumber.mul(this._value, other);
	}

	// Instance method to calculate the modulus of the current value by another BigNumberish value
	mod(other: BigNumberish): BigNumber {
		return BigNumber.mod(this._value, other);
	}

	// Instance method to convert the value to a string
	toString(): string {
		// For strings, return them as-is to preserve decimal formatting
		if (typeof this._value === 'string') {
			return this._value;
		}

		// For other types, convert to bigint first
		const bigintValue = this.toBigInt();
		if (bigintValue === null) {
			return '';
		}
		return bigintValue.toString();
	}

	// Instance method to convert the value to a hex string
	toHex(isEthereum: boolean = true): string {
		// Handle null values
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
			return new BigNumber(BigInt(value.hex));
		}
		return new BigNumber(value);
	}

	// Static method to convert a BigNumberish to a number
	static toNumber(value: BigNumberish): number | null {
		if (value === null) {
			return null;
		}

		if (typeof value === 'string' || typeof value === 'number') {
			return Number(value);
		}

		if (typeof value === 'bigint') {
			return Number(value);
		}

		if (BigNumber.isBigNumber(value)) {
			return value.toNumber();
		}

		if (BigNumber.isHexObject(value)) {
			return Number(BigInt(value.hex));
		}

		return null;
	}

	// Static method to convert a BigNumberish to a bigint
	static toBigInt(value: BigNumberish, decimals: number = 18): bigint | null {
		if (value === null) {
			return null;
		}

		if (typeof value === 'number') {
			if (!Number.isInteger(value)) {
				const factor = Math.pow(10, decimals);
				return BigInt(Math.round(value * factor));
			} else {
				return BigInt(value);
			}
		}

		if (typeof value === 'string') {
			// Handle cases where the string value may contain decimals
			if (value.includes('.')) {
				const [integerPart, fractionalPart = ''] = value.split('.');
				const factor = BigInt('1' + '0'.repeat(decimals));
				const scaledValue =
					BigInt(integerPart) * factor +
					BigInt((fractionalPart + '0'.repeat(decimals)).slice(0, decimals));
				return scaledValue;
			} else {
				return BigInt(value);
			}
		}

		if (typeof value === 'bigint') {
			return value;
		}

		if (BigNumber.isBigNumber(value)) {
			return value.toBigInt();
		}

		if (BigNumber.isHexObject(value)) {
			return BigInt(value.hex);
		}

		return null;
	}

	// Static method to get the maximum of two BigNumberish values
	static max(value1: BigNumberish, value2: BigNumberish): BigNumber {
		const bigint1 = BigNumber.toBigInt(value1);
		const bigint2 = BigNumber.toBigInt(value2);

		if (bigint1 === null || bigint2 === null) {
			throw new Error('Invalid BigNumberish value');
		}

		return new BigNumber(bigint1 > bigint2 ? bigint1 : bigint2);
	}

	// Static method to get the minimum of two BigNumberish values
	static min(value1: BigNumberish, value2: BigNumberish): BigNumber {
		const bigint1 = BigNumber.toBigInt(value1);
		const bigint2 = BigNumber.toBigInt(value2);

		if (bigint1 === null || bigint2 === null) {
			throw new Error('Invalid BigNumberish value');
		}

		return new BigNumber(bigint1 < bigint2 ? bigint1 : bigint2);
	}

	// Static method to add two BigNumberish values
	static add(value1: BigNumberish, value2: BigNumberish): BigNumber {
		const bigint1 = BigNumber.toBigInt(value1);
		const bigint2 = BigNumber.toBigInt(value2);

		if (bigint1 === null || bigint2 === null) {
			throw new Error('Invalid BigNumberish value');
		}

		return new BigNumber(bigint1 + bigint2);
	}

	// Static method to subtract one BigNumberish value from another
	static subtract(value1: BigNumberish, value2: BigNumberish): BigNumber {
		const bigint1 = BigNumber.toBigInt(value1);
		const bigint2 = BigNumber.toBigInt(value2);

		if (bigint1 === null || bigint2 === null) {
			throw new Error('Invalid BigNumberish value');
		}

		return new BigNumber(bigint1 - bigint2);
	}

	static sub(value1: BigNumberish, value2: BigNumberish): BigNumber {
		return BigNumber.subtract(value1, value2);
	}

	// Static method to divide one BigNumberish value by another
	static div(value1: BigNumberish, value2: BigNumberish): BigNumber {
		const bigint1 = BigNumber.toBigInt(value1);
		const bigint2 = BigNumber.toBigInt(value2);

		if (bigint1 === null || bigint2 === null || bigint2 === BigInt(0)) {
			throw new Error('Invalid BigNumberish value or division by zero');
		}

		return new BigNumber(bigint1 / bigint2);
	}

	// Static method to multiply two BigNumberish values
	static mul(value1: BigNumberish, value2: BigNumberish): BigNumber {
		const bigint1 = BigNumber.toBigInt(value1);
		const bigint2 = BigNumber.toBigInt(value2);

		if (bigint1 === null || bigint2 === null) {
			throw new Error('Invalid BigNumberish value');
		}

		return new BigNumber(bigint1 * bigint2);
	}

	// Static method to calculate the modulus of one BigNumberish value by another
	static mod(value1: BigNumberish, value2: BigNumberish): BigNumber {
		const bigint1 = BigNumber.toBigInt(value1);
		const bigint2 = BigNumber.toBigInt(value2);

		if (bigint1 === null || bigint2 === null || bigint2 === BigInt(0)) {
			throw new Error('Invalid BigNumberish value or modulus by zero');
		}

		return new BigNumber(bigint1 % bigint2);
	}

	// Static method to convert BigNumberish value to hex string
	static toHex(value: BigNumberish): string {
		const bigintValue = BigNumber.toBigInt(value);
		if (bigintValue === null) {
			throw new Error('Invalid BigNumberish value');
		}
		return '0x' + bigintValue.toString(16);
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
		const numberValue = this.toNumber();
		if (numberValue === null) {
			throw new Error('Invalid BigNumberish value');
		}
		return numberValue * price;
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

// Examples of use...
// let ethValue: EthereumBigNumber = new EthereumBigNumber(1);
// console.log('To Wei:', ethValue.toWei().toBigInt()); // Output: 1000000000000000000n
// console.log('To Gwei:', ethValue.toGwei().toBigInt()); // Output: 1000000000n
// console.log('To Ether:', ethValue.toWei().toEther().toBigInt()); // Output: 1n

// let btcValue: BitcoinBigNumber = new BitcoinBigNumber(1);
// console.log('To Satoshi:', btcValue.toSatoshi().toBigInt()); // Output: 100000000n
// console.log('To Bitcoin:', btcValue.toSatoshi().toBitcoin().toBigInt()); // Output: 1n

// let solValue: SolanaBigNumber = new SolanaBigNumber(1);
// console.log('To Lamport:', solValue.toLamport().toBigInt()); // Output: 1000000000n
// console.log('To SOL:', solValue.toLamport().toSOL().toBigInt()); // Output: 1n

// let optimismValue: OptimismBigNumber = new OptimismBigNumber(1);
// console.log('To Gwei Optimism:', optimismValue.toGweiOptimism().toBigInt()); // Output: 1000000000n
// console.log('To Wei Optimism:', optimismValue.toWeiOptimism().toBigInt()); // Output: 1000000000000000000n

// let polygonValue: PolygonBigNumber = new PolygonBigNumber(1);
// console.log('To Gwei Polygon:', polygonValue.toGweiPolygon().toBigInt()); // Output: 1000000000n
// console.log('To Wei Polygon:', polygonValue.toWeiPolygon().toBigInt()); // Output: 1000000000000000000n

// let avalancheValue: AvalancheBigNumber = new AvalancheBigNumber(1);
// console.log('To Gwei Avalanche:', avalancheValue.toGweiAvalanche().toBigInt()); // Output: 1000000000n
// console.log('To Wei Avalanche:', avalancheValue.toWeiAvalanche().toBigInt()); // Output: 1000000000000000000n

// let baseValue: BaseBigNumber = new BaseBigNumber(1);
// console.log('To Gwei Base:', baseValue.toGweiBase().toBigInt()); // Output: 1000000000n
// console.log('To Wei Base:', baseValue.toWeiBase().toBigInt()); // Output: 1000000000000000000n

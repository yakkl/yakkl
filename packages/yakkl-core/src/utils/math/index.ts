/**
 * Math utilities for yakkl-core
 * Exports mathematical operations and utilities for working with large numbers
 */

export { BigNumberishMath } from './BigNumberishMath';
export { DecimalMath } from './DecimalMath';

// Re-export some common math utilities
export function convertBasisPointsToDecimal(basisPoints: number): number {
	if (basisPoints < 1) {
		// Already in decimal form
		return basisPoints;
	}
	return basisPoints / 10000;
}

/**
 * Ensures a value is in hex format with '0x' prefix
 * @param value - The value to convert to hex format
 * @returns The value in hex format
 */
export function ensureHexFormat(value: any): string {
	if (typeof value === 'string') {
		// If it's already a hex string, return as is
		if (value.startsWith('0x')) {
			return value;
		}
		// If it's a decimal string, convert to hex
		if (/^\d+$/.test(value)) {
			return `0x${parseInt(value, 10).toString(16)}`;
		}
		// If it's already a hex string without 0x prefix, add it
		if (/^[0-9a-fA-F]+$/.test(value)) {
			return `0x${value}`;
		}
	}

	if (typeof value === 'number') {
		return `0x${value.toString(16)}`;
	}

	// For any other type, try to convert to string and then to hex
	const stringValue = String(value);
	if (/^\d+$/.test(stringValue)) {
		return `0x${parseInt(stringValue, 10).toString(16)}`;
	}

	// If we can't convert, return as is
	return String(value);
}
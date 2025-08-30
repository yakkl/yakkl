/**
 * Generic validation utilities for yakkl-core
 * Provides type-safe validation for objects and values
 */

import type { BigNumberish } from '../BigNumber';

// Validation Types
export type ValidationRuleType =
	| 'number'
	| 'bigint'
	| 'string'
	| 'boolean'
	| 'array'
	| 'object'
	| 'bignumberish';

// Validation Constraint Types
export type ValidationConstraint<T> = {
	type?: ValidationRuleType;
	required?: boolean;
	min?: T;
	max?: T;
	equals?: T;
	notEquals?: T;
	oneOf?: T[];
	notOneOf?: T[];
	customValidation?: (value: T) => boolean;
};

// Generic Validation Rules Type
export type ValidationRules<T> = {
	[K in keyof T]?: ValidationConstraint<T[K]>;
};

// Validation Result
export interface ValidationResult {
	isValid: boolean;
	error: string;
}

/**
 * Safely converts a value to BigInt
 * @param value - The value to convert
 * @returns BigInt or undefined if conversion fails
 */
export function safeConvertToBigInt(value: BigNumberish): bigint | undefined {
	try {
		if (value === null || value === undefined) {
			return undefined;
		}

		switch (typeof value) {
			case 'bigint':
				return value;
			case 'number':
				if (!Number.isInteger(value)) {
					return undefined;
				}
				return BigInt(value);
			case 'string':
				if (value === '') {
					return undefined;
				}
				// Handle hex strings
				if (value.startsWith('0x')) {
					return BigInt(value);
				}
				// Handle decimal strings
				if (/^\d+$/.test(value)) {
					return BigInt(value);
				}
				return undefined;
			default:
				return undefined;
		}
	} catch {
		return undefined;
	}
}

/**
 * Generic object validation function
 * @param data Object to validate
 * @param rules Validation rules for the object
 * @returns Validation result
 */
export function validateObject<T extends Record<string, any>>(
	data: T,
	rules: ValidationRules<T>
): ValidationResult {
	// Validation function for a single rule
	const validateValue = <V>(value: V, rule: ValidationConstraint<V>): boolean => {
		// Handle undefined or null
		if (value === undefined || value === null) {
			return !rule.required;
		}

		let bigIntValue: bigint | undefined;

		// Type checking with more robust handling
		if (rule.type) {
			switch (rule.type) {
				case 'number':
					if (typeof value !== 'number' || isNaN(value as number)) return false;
					break;
				case 'bigint':
				case 'bignumberish':
					bigIntValue = safeConvertToBigInt(value as BigNumberish);
					if (bigIntValue === undefined) return false;
					// Reassign value for further checks
					value = bigIntValue as V;
					break;
				case 'string':
					if (typeof value !== 'string') return false;
					break;
				case 'boolean':
					if (typeof value !== 'boolean') return false;
					break;
				case 'array':
					if (!Array.isArray(value)) return false;
					break;
				case 'object':
					if (typeof value !== 'object' || value === null) return false;
					break;
			}
		}

		// Min/Max validation with safe bigint conversion
		if (rule.min !== undefined) {
			if (typeof rule.min === 'number' && (value as number) < (rule.min as number)) return false;

			// For bigint and bignumberish
			if (rule.type === 'bigint' || rule.type === 'bignumberish') {
				const minBigInt = safeConvertToBigInt(rule.min as BigNumberish);
				const valueBigInt = safeConvertToBigInt(value as BigNumberish);

				if (minBigInt === undefined || valueBigInt === undefined) return false;
				if (valueBigInt < minBigInt) return false;
			}
		}

		if (rule.max !== undefined) {
			if (typeof rule.max === 'number' && (value as number) > (rule.max as number)) return false;

			// For bigint and bignumberish
			if (rule.type === 'bigint' || rule.type === 'bignumberish') {
				const maxBigInt = safeConvertToBigInt(rule.max as BigNumberish);
				const valueBigInt = safeConvertToBigInt(value as BigNumberish);

				if (maxBigInt === undefined || valueBigInt === undefined) return false;
				if (valueBigInt > maxBigInt) return false;
			}
		}

		// Equality checks
		if (rule.equals !== undefined && value !== rule.equals) return false;
		if (rule.notEquals !== undefined && value === rule.notEquals) return false;

		// One of / Not One of checks
		if (rule.oneOf !== undefined && !rule.oneOf.includes(value)) return false;
		if (rule.notOneOf !== undefined && rule.notOneOf.includes(value)) return false;

		// Custom validation
		if (rule.customValidation && !rule.customValidation(value)) return false;

		return true;
	};

	// Validate all rules
	for (const [key, rule] of Object.entries(rules)) {
		const value = data[key];

		if (!validateValue(value, rule as ValidationConstraint<any>)) {
			// Generate user-friendly error message
			let errorMessage = `Invalid ${key}: `;

			if (value === undefined || value === null) {
				errorMessage += (rule as ValidationConstraint<any>).required
					? 'is required'
					: 'is missing but not required';
			} else {
				const currentRule = rule as ValidationConstraint<any>;
				if (currentRule.min !== undefined) errorMessage += `must be at least ${currentRule.min}`;
				if (currentRule.max !== undefined) errorMessage += `must be at most ${currentRule.max}`;
				if (currentRule.equals !== undefined) errorMessage += `must equal ${currentRule.equals}`;
				if (currentRule.notEquals !== undefined)
					errorMessage += `cannot equal ${currentRule.notEquals}`;
				if (currentRule.oneOf !== undefined)
					errorMessage += `must be one of ${currentRule.oneOf.join(', ')}`;
				if (currentRule.notOneOf !== undefined)
					errorMessage += `cannot be one of ${currentRule.notOneOf.join(', ')}`;
			}

			return {
				isValid: false,
				error: errorMessage
			};
		}
	}

	return {
		isValid: true,
		error: ''
	};
}

/**
 * Validates an Ethereum address
 * @param address - The address to validate
 * @returns True if valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
	if (!address || typeof address !== 'string') {
		return false;
	}
	// Check if it's a valid Ethereum address (0x followed by 40 hex chars)
	return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates a transaction hash
 * @param hash - The transaction hash to validate
 * @returns True if valid transaction hash
 */
export function isValidTransactionHash(hash: string): boolean {
	if (!hash || typeof hash !== 'string') {
		return false;
	}
	// Check if it's a valid transaction hash (0x followed by 64 hex chars)
	return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validates a numeric value is within a range
 * @param value - The value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
	return value >= min && value <= max;
}

/**
 * Validates a string is not empty
 * @param value - The string to validate
 * @returns True if string is not empty
 */
export function isNotEmpty(value: string): boolean {
	return value !== null && value !== undefined && value.trim().length > 0;
}

/**
 * Validates an email address
 * @param email - The email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}
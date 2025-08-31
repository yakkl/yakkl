/**
 * Generic validation utilities for yakkl-core
 * Provides type-safe validation for objects and values
 */
import type { BigNumberish } from '../BigNumber';
export type ValidationRuleType = 'number' | 'bigint' | 'string' | 'boolean' | 'array' | 'object' | 'bignumberish';
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
export type ValidationRules<T> = {
    [K in keyof T]?: ValidationConstraint<T[K]>;
};
export interface ValidationResult {
    isValid: boolean;
    error: string;
}
/**
 * Safely converts a value to BigInt
 * @param value - The value to convert
 * @returns BigInt or undefined if conversion fails
 */
export declare function safeConvertToBigInt(value: BigNumberish): bigint | undefined;
/**
 * Generic object validation function
 * @param data Object to validate
 * @param rules Validation rules for the object
 * @returns Validation result
 */
export declare function validateObject<T extends Record<string, any>>(data: T, rules: ValidationRules<T>): ValidationResult;
/**
 * Validates an Ethereum address
 * @param address - The address to validate
 * @returns True if valid Ethereum address
 */
export declare function isValidAddress(address: string): boolean;
/**
 * Validates a transaction hash
 * @param hash - The transaction hash to validate
 * @returns True if valid transaction hash
 */
export declare function isValidTransactionHash(hash: string): boolean;
/**
 * Validates a numeric value is within a range
 * @param value - The value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is within range
 */
export declare function isInRange(value: number, min: number, max: number): boolean;
/**
 * Validates a string is not empty
 * @param value - The string to validate
 * @returns True if string is not empty
 */
export declare function isNotEmpty(value: string): boolean;
/**
 * Validates an email address
 * @param email - The email to validate
 * @returns True if valid email format
 */
export declare function isValidEmail(email: string): boolean;
//# sourceMappingURL=index.d.ts.map
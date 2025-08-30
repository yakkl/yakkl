/**
 * Validation utilities - Re-exports from @yakkl/core plus wallet-specific validators
 * 
 * MIGRATION NOTE: Generic validation utilities have been moved to @yakkl/core
 * This file now re-exports from @yakkl/core and adds wallet-specific validation functions
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BigNumberish } from '$lib/common/bignumber';
import type { SwapPriceData, SwapToken } from '$lib/common/interfaces';

// Import and re-export generic validation utilities from @yakkl/core
import {
	type ValidationRuleType,
	type ValidationConstraint,
	type ValidationRules,
	type ValidationResult,
	validateObject,
	safeConvertToBigInt,
	isValidAddress,
	isValidTransactionHash,
	isInRange,
	isNotEmpty,
	isValidEmail
} from '@yakkl/core';

// Re-export for backward compatibility
export {
	type ValidationRuleType,
	type ValidationConstraint,
	type ValidationRules,
	type ValidationResult,
	validateObject,
	safeConvertToBigInt,
	isValidAddress,
	isValidTransactionHash,
	isInRange,
	isNotEmpty,
	isValidEmail
};


// Specific validation for SwapQuote
export function validateSwapQuote(quote: SwapPriceData): ValidationResult {
	return validateObject(quote, {
		amountIn: {
			required: true,
			type: 'bignumberish',
			min: 0n,
			customValidation: (amount: BigNumberish) => {
				const bigIntAmount = safeConvertToBigInt(amount);
				return bigIntAmount !== undefined && bigIntAmount > 0n;
			}
		},
		amountOut: {
			required: true,
			type: 'bignumberish',
			min: 0n,
			customValidation: (amount: BigNumberish) => {
				const bigIntAmount = safeConvertToBigInt(amount);
				return bigIntAmount !== undefined && bigIntAmount > 0n;
			}
		},
		tokenIn: {
			required: true,
			type: 'object',
			customValidation: (token: SwapToken) => {
				return !!(token && token.address && token.symbol);
			}
		},
		tokenOut: {
			required: true,
			type: 'object',
			customValidation: (token: SwapToken) => {
				return !!(token && token.address && token.symbol);
			}
		},
		fee: {
			oneOf: [500, 3000, 10000]
		}
	});
}

// Comprehensive example usages below...
// function exampleUsage() {
//   const swapQuote: SwapPriceData = { /* your swap quote data */ };
//   const validationResult = validateSwapQuote( swapQuote );

//   if ( !validationResult.isValid ) {
//     console.log( 'Validation failed:', validationResult.error );
//   }
// }

// function exampleUsage() {
//   // Basic object validation
//   interface User {
//     name: string;
//     age: number;
//     email?: string;
//   }

//   const user: User = {
//     name: 'John Doe',
//     age: 30
//   };

//   const userValidation = validateObject( user, {
//     name: {
//       required: true,
//       type: 'string',
//       min: 2,
//       max: 50
//     },
//     age: {
//       required: true,
//       type: 'number',
//       min: 18,
//       max: 120
//     },
//     email: {
//       type: 'string',
//       customValidation: ( email ) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test( email )
//     }
//   } );

//   // Swap quote validation
//   const swapQuote: SwapPriceData = { /* your swap quote data */ };
//   const swapValidation = validateSwapQuote( swapQuote );

//   // Advanced validation with multiple constraints
//   interface Product {
//     name: string;
//     price: number;
//     categories: string[];
//   }

//   const product: Product = {
//     name: 'Awesome Product',
//     price: 19.99,
//     categories: [ 'Electronics', 'Gadgets' ]
//   };

//   const productValidation = validateObject( product, {
//     name: {
//       required: true,
//       type: 'string',
//       min: 3,
//       max: 100
//     },
//     price: {
//       required: true,
//       type: 'number',
//       min: 0,
//       max: 1000
//     },
//     categories: {
//       type: 'array',
//       customValidation: ( cats ) => cats.length > 0,
//       oneOf: [ 'Electronics', 'Clothing', 'Books', 'Gadgets' ]
//     }
//   } );

//   // Logging results
//   console.log( 'User Validation:', userValidation );
//   console.log( 'Swap Quote Validation:', swapValidation );
//   console.log( 'Product Validation:', productValidation );
// }

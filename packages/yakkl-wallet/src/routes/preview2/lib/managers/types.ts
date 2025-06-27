// V2-specific type definitions that override v1 types
import type { Token } from './Token';
import type { BigNumberish, TransactionReceipt, TransactionResponse } from '$lib/common';

// Override SwapParams to use v2 Token type
export interface SwapParams {
	tokenIn: Token;
	tokenOut: Token;
	amount: BigNumberish;
	fee: number;
	slippage: number;
	deadline: number;
	recipient: string;
	feeRecipient: string;
	feeAmount: BigNumberish;

	// These 3 are transaction related and not swap related
	gasLimit: BigNumberish;
	maxFeePerGas: BigNumberish;
	maxPriorityFeePerGas: BigNumberish;
}

// Re-export other types from $lib/common that don't have Token dependencies
export type {
	BigNumberish,
	PoolInfoData,
	PriceData,
	SwapPriceData,
	SwapToken,
	TransactionReceipt,
	TransactionRequest,
	TransactionResponse
} from '$lib/common';
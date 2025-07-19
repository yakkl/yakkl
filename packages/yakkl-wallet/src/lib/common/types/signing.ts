/**
 * Shared types for signing operations
 * These types are used by both UI and background contexts
 */

export type SigningRequest = {
	type: string; // 'personal_sign' | 'eth_signTypedData_v4'
	params: any[];
	requestId: string;
	token: string;
};

export type SigningResponse = {
	result?: any;
	error?: {
		code: number;
		message: string;
	};
};
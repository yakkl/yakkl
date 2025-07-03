// src/errors/ProviderRpcError.ts
export class ProviderRpcError extends Error {
	public code: number;
	public data?: unknown;

	constructor(code: number, message: string, data?: unknown) {
		super(message);
		this.code = code;
		this.data = data;
		this.name = 'ProviderRpcError';
	}
}

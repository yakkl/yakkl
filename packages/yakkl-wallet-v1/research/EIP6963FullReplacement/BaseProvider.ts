// src/providers/base/BaseProvider.ts
import EventEmitter from 'events';
import type { RequestArguments, ProviderRpcError, WalletState } from '../../types/ethereum';
import { RateLimiter } from './ProviderUtils';

export abstract class BaseProvider extends EventEmitter {
	protected state: WalletState;
	protected readonly rateLimiter: RateLimiter;
	protected requestId: number;
	protected readonly pendingRequests: Map<
		string,
		{
			resolve: (value: unknown) => void;
			reject: (error: Error) => void;
		}
	>;

	constructor() {
		super();
		this.state = {
			isConnected: false,
			accounts: [],
			chainId: 1,
			networkVersion: '1'
		};
		this.rateLimiter = new RateLimiter();
		this.requestId = 0;
		this.pendingRequests = new Map();
	}

	protected abstract sendRequest(method: string, params?: unknown[] | object): Promise<unknown>;

	public async request(args: RequestArguments): Promise<unknown> {
		if (!this.rateLimiter.consume()) {
			throw this.createError(-32005, 'Request rate limit exceeded');
		}

		try {
			const { method, params } = args;
			return await this.sendRequest(method, params);
		} catch (error) {
			throw this.normalizeError(error);
		}
	}

	protected createError(code: number, message: string, data?: unknown): ProviderRpcError {
		const error = new Error(message) as ProviderRpcError;
		error.code = code;
		error.data = data;
		return error;
	}

	protected normalizeError(error: unknown): ProviderRpcError {
		if (this.isProviderRpcError(error)) {
			return error;
		}
		return this.createError(-32603, error instanceof Error ? error.message : 'Unknown error');
	}

	private isProviderRpcError(error: unknown): error is ProviderRpcError {
		return error instanceof Error && 'code' in error;
	}

	protected updateState(newState: Partial<WalletState>): void {
		const oldState = { ...this.state };
		this.state = { ...this.state, ...newState };

		if (
			newState.accounts &&
			JSON.stringify(newState.accounts) !== JSON.stringify(oldState.accounts)
		) {
			this.emit('accountsChanged', newState.accounts);
		}

		if (newState.chainId && newState.chainId !== oldState.chainId) {
			this.emit('chainChanged', `0x${newState.chainId.toString(16)}`);
		}
	}
}

// src/providers/YakklWalletProvider.ts
import EventEmitter from 'events';
import { RateLimiter } from './RateLimiter';
import { ProviderRpcError } from '../errors/ProviderRpcError';
import type { RequestArguments, ProviderMessage, WalletState } from '../types/ethereum';

export class YakklWalletProvider extends EventEmitter {
	private readonly _rateLimiter: RateLimiter;
	private _state: WalletState;
	private _requestId: number;
	private _pendingRequests: Map<
		string,
		{
			resolve: (value: unknown) => void;
			reject: (reason?: any) => void;
		}
	>;

	constructor() {
		super();
		this._rateLimiter = new RateLimiter();
		this._requestId = 0;
		this._pendingRequests = new Map();
		this._state = {
			isConnected: false,
			accounts: [],
			chainId: 1,
			networkVersion: '1'
		};

		this.initializeProvider();
	}

	private initializeProvider(): void {
		window.addEventListener('message', this.handleProviderMessage.bind(this));
		this.setMaxListeners(100);
	}

	private handleProviderMessage(event: MessageEvent): void {
		if (
			event?.source !== window ||
			event?.origin !== window.location.origin ||
			!event?.data?.type
		) {
			return;
		}

		const message = event.data as ProviderMessage;

		if (message.type === 'YAKKL_RESPONSE') {
			const handler = this._pendingRequests.get(message.id);
			if (!handler) return;

			this._pendingRequests.delete(message.id);

			if (message.error) {
				handler.reject(
					new ProviderRpcError(message.error.code, message.error.message, message.error.data)
				);
			} else {
				handler.resolve(message.result);
			}
		}
	}

	public async request(args: RequestArguments): Promise<unknown> {
		if (!this._rateLimiter.consume()) {
			throw new ProviderRpcError(429, 'Request rate limit exceeded');
		}

		try {
			return await this.handleRequest(args);
		} catch (error) {
			throw new ProviderRpcError(
				(error as ProviderRpcError).code || -32603,
				(error as Error).message
			);
		}
	}

	private async handleRequest(args: RequestArguments): Promise<unknown> {
		const { method, params } = args;

		switch (method) {
			case 'eth_chainId':
				return `0x${this._state.chainId.toString(16)}`;

			case 'eth_accounts':
				return this._state.accounts;

			case 'eth_requestAccounts':
				return this.requestAccounts();

			default:
				return this.sendRequest(method, params);
		}
	}

	private async sendRequest(method: string, params?: unknown[] | object): Promise<unknown> {
		const id = (++this._requestId).toString();

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this._pendingRequests.delete(id);
				reject(new ProviderRpcError(-32603, 'Request timeout'));
			}, 30000);

			this._pendingRequests.set(id, {
				resolve: (value) => {
					clearTimeout(timeout);
					resolve(value);
				},
				reject: (error) => {
					clearTimeout(timeout);
					reject(error);
				}
			});

			window.postMessage(
				{
					id,
					type: 'YAKKL_REQUEST',
					method,
					params
				},
				window.location.origin
			);
		});
	}

	private async requestAccounts(): Promise<string[]> {
		const accounts = (await this.sendRequest('eth_requestAccounts')) as string[];

		if (accounts?.length) {
			this._state.accounts = accounts;
			this._state.isConnected = true;
			this.emit('accountsChanged', accounts);
		}

		return accounts;
	}

	public isConnected(): boolean {
		return this._state.isConnected;
	}
}

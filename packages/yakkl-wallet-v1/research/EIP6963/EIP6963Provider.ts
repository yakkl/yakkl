// src/providers/EIP6963Provider.ts
import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
	EIP6963ProviderInfo,
	EIP6963ProviderDetail,
	EIP1193Provider,
	ProviderState,
	ProviderRpcError
} from '../types/eip6963';

export class EIP6963Provider extends EventEmitter implements EIP1193Provider {
	private readonly info: EIP6963ProviderInfo;
	private readonly state: ProviderState;
	private requestId: number;
	private readonly pendingRequests: Map<
		string,
		{
			resolve: (value: unknown) => void;
			reject: (error: Error) => void;
		}
	>;

	constructor() {
		super();
		this.info = {
			uuid: uuidv4(),
			name: 'Yakkl Smart Wallet',
			icon: 'data:image/svg+xml;base64,...', // Your base64 encoded icon
			rdns: 'com.yakkl'
		};

		this.state = {
			isConnected: false,
			accounts: [],
			chainId: 1,
			networkVersion: '1'
		};

		this.requestId = 0;
		this.pendingRequests = new Map();

		this.initializeProvider();
	}

	private initializeProvider(): void {
		// Set up message listeners
		window.addEventListener('message', this.handleMessage.bind(this));

		// Listen for provider requests
		window.addEventListener('eip6963:requestProvider', this.handleRequestProvider.bind(this));
	}

	private handleMessage = (event: MessageEvent): void => {
		if (event.source !== window || event.origin !== window.location.origin || !event.data?.type) {
			return;
		}

		if (event.data.type === 'YAKKL_RESPONSE:EIP6963') {
			const { id, result, error } = event.data;
			const request = this.pendingRequests.get(id);

			if (request) {
				this.pendingRequests.delete(id);
				if (error) {
					request.reject(new Error(error.message));
				} else {
					request.resolve(result);
				}
			}
		}
	};

	private handleRequestProvider = (): void => {
		this.announce();
	};

	public announce(): void {
		const announceEvent = new CustomEvent('eip6963:announceProvider', {
			detail: {
				info: this.info,
				provider: this
			}
		});
		window.dispatchEvent(announceEvent);
	}

	public async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
		try {
			const { method, params } = args;

			// Handle certain methods locally
			switch (method) {
				case 'eth_chainId':
					return `0x${this.state.chainId.toString(16)}`;

				case 'eth_accounts':
					return this.state.accounts;

				default:
					return this.sendRequest(method, params);
			}
		} catch (error) {
			throw this.normalizeError(error);
		}
	}

	private async sendRequest(method: string, params?: unknown[]): Promise<unknown> {
		const id = (++this.requestId).toString();

		return new Promise((resolve, reject) => {
			// Set timeout for request
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(new Error('Request timeout'));
			}, 30000);

			this.pendingRequests.set(id, {
				resolve: (value) => {
					clearTimeout(timeout);
					resolve(value);
				},
				reject: (error) => {
					clearTimeout(timeout);
					reject(error);
				}
			});

			// Send request to content script
			window.postMessage(
				{
					type: 'YAKKL_REQUEST:EIP6963',
					id,
					method,
					params
				},
				window.location.origin
			);
		});
	}

	private normalizeError(error: unknown): ProviderRpcError {
		if (error instanceof Error) {
			return {
				name: 'ProviderRpcError',
				message: error.message,
				code: -32603,
				stack: error.stack
			};
		}
		return {
			name: 'ProviderRpcError',
			message: 'Unknown error',
			code: -32603
		};
	}

	// EIP-1193 required methods
	public on(eventName: string, listener: (args: unknown) => void): void {
		super.on(eventName, listener);
	}

	public removeListener(eventName: string, listener: (args: unknown) => void): void {
		super.removeListener(eventName, listener);
	}
}

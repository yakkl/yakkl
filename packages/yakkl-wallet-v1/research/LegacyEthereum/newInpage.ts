// src/inpage.ts
import EventEmitter from 'events';
import { VERSION } from '$lib/common/constants';
import { supportedChainId } from '$lib/common/utils';
import type { LegacyWalletProvider, LegacyWindowEthereum, RequestArguments } from '$lib/common';
import { ProviderRpcError } from '$lib/common';
import { RateLimiter } from './providers/RateLimiter';

const windowOrigin = window.location.origin;

class YakklWalletProvider extends EventEmitter {
	private _pendingRequests: Map<
		string,
		{
			resolve: (value: unknown) => void;
			reject: (value: unknown) => void;
		}
	>;
	private _rateLimiter: RateLimiter;
	private _connected: boolean;
	private _requestId: number;
	private _initialized: boolean;

	public chainId: number;
	public networkVersion: string;
	public selectedAddresses: string[];
	public providers: YakklWalletProvider[];

	constructor() {
		super();
		this._pendingRequests = new Map();
		this._rateLimiter = new RateLimiter(100, 0.01);
		this._connected = false;
		this._requestId = 0;
		this._initialized = false;

		this.chainId = 1;
		this.networkVersion = '1';
		this.selectedAddresses = [];
		this.providers = [this];

		// Standard MetaMask compatibility properties
		this.isMetaMask = true;
		this._metamask = { isUnlocked: () => true };
		this.isWeb3 = true;
		this.isYakkl = true;

		this.initializeProvider();
	}

	private initializeProvider(): void {
		window.addEventListener('message', this.handleProviderMessage.bind(this));
		this.setMaxListeners(100);
		this._initialized = true;
	}

	private handleProviderMessage = (event: MessageEvent): void => {
		if (
			event?.source !== window ||
			event?.origin !== windowOrigin ||
			event?.data?.type !== 'YAKKL_RESPONSE'
		) {
			return;
		}

		try {
			const { id, error, result } = event.data;
			const handlers = this._pendingRequests.get(id);

			if (handlers) {
				this._pendingRequests.delete(id);
				if (error) {
					handlers.reject(new ProviderRpcError(-32603, error));
				} else {
					const processedResult = this.handleResults(event);
					handlers.resolve(processedResult);
				}
			}
		} catch (e) {
			console.error('Error handling provider message:', e);
		}
	};

	public async request(args: RequestArguments): Promise<unknown> {
		if (!this._rateLimiter.consume()) {
			throw new ProviderRpcError(429, 'Request rate limit exceeded');
		}

		try {
			this.validateRequest(args);
			return await this.handleRequest(args);
		} catch (e) {
			this.disconnect();
			return Promise.reject(e);
		}
	}

	// ... rest of your existing YakklWalletProvider methods ...
}

class EthereumProviderManager {
	private providers: Map<string, LegacyWindowEthereum>;
	private currentProvider: YakklWalletProvider;

	constructor() {
		this.providers = new Map();
		this.currentProvider = new YakklWalletProvider();

		this.initializeProvider();
	}

	private initializeProvider(): void {
		if (typeof window === 'undefined') return;

		// Store existing provider if present
		if (window.ethereum) {
			this.providers.set('existing', window.ethereum);
		}

		const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');

		if (descriptor?.configurable) {
			this.setupProviderProxy();
		} else {
			this.forceProviderReplacement();
		}
	}

	private setupProviderProxy(): void {
		const proxy = new Proxy(this.currentProvider, {
			get: (target, prop) => {
				if (prop === 'providers') {
					return Array.from(this.providers.values());
				}
				return Reflect.get(target, prop);
			}
		});

		Object.defineProperty(window, 'ethereum', {
			value: proxy,
			writable: false,
			configurable: true,
			enumerable: true
		});
	}

	private forceProviderReplacement(): void {
		try {
			// Remove existing ethereum object
			delete (window as any).ethereum;
			this.setupProviderProxy();
		} catch (error) {
			console.error('Failed to force provider replacement:', error);
		}
	}
}

// Initialize provider
window.addEventListener('DOMContentLoaded', () => {
	try {
		// Create provider manager instance
		const manager = new EthereumProviderManager();

		// Announce provider is ready
		window.dispatchEvent(new Event('ethereum#initialized'));
	} catch (error) {
		console.error('Failed to initialize Yakkl provider:', error);
	}
});

// Export for type declarations
declare global {
	interface Window {
		ethereum?: LegacyWindowEthereum;
	}
}

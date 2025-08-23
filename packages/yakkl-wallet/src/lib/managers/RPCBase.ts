// rpc/RPCBase.ts
import { log } from '$lib/common/logger-wrapper';
import { EnhancedKeyManager } from '$lib/sdk/security/EnhancedKeyManager';
import { ProviderConfigAdapter, type CompatibleProviderConfig } from '$lib/sdk/types/adapters';

export interface RPCOptions {
	baseURL: string;
	apiKey?: string;
	headers?: Record<string, string>;
	maxRetries?: number;
	timeout?: number; // milliseconds
}

export interface ProviderConfig {
	baseURL: string;
	apiKey: string | null;
	network: string;
}

export class RPCBase {
	protected baseURL: string;
	protected apiKey?: string;
	protected headers: Record<string, string>;
	protected maxRetries: number;
	protected timeout: number;

	// NOTE: If you have an API key, you need to provide it in the options either as a string for apiKey, in the baseURL, or in the headers (if in the headers then apiKey must be '' | undefined)
	constructor(options: RPCOptions) {
		this.baseURL = options.baseURL;
		this.apiKey = options.apiKey; // NOTE: This is optional, if not provided, we will use the baseURL directly
		this.headers = options.headers || { 'Content-Type': 'application/json' }; // You need to override all headers if you provide this
		this.maxRetries = options.maxRetries ?? 3;
		this.timeout = options.timeout ?? 10000;
	}

	async fetchWithRetry(
		body: Record<string, any>,
		headers: Record<string, string> = {},
		retries = this.maxRetries,
		backoffMs = 500
	): Promise<any> {
		const url = this.apiKey ? `${this.baseURL}/${this.apiKey}` : this.baseURL;
		const options: RequestInit = {
			method: 'POST',
			headers: headers || this.headers,
			body: JSON.stringify(body)
		};

		for (let attempt = 1; attempt <= retries; attempt++) {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), this.timeout);
				const response = await fetch(url, { ...options, signal: controller.signal });
				clearTimeout(timeout);

				if (!response.ok) {
					const errorText = await response.text();
					log.error(`[RPCBase] Non-OK HTTP status`, false, { status: response.status, errorText });
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const json = await response.json();
				if (json.error) {
					log.error(`[RPCBase] JSON-RPC error`, false, json.error);
					throw new Error(json.error.message || 'Unknown JSON-RPC error');
				}

				return json.result;
			} catch (err) {
				if (attempt === retries) {
					log.error(`[RPCBase] Failed after ${attempt} attempts`, false, err);
					throw err;
				}
				const delay = backoffMs * 2 ** (attempt - 1);
				log.warn(
					`[RPCBase] Retry ${attempt}/${retries} after error: ${err}. Waiting ${delay}ms...`
				);
				await new Promise((res) => setTimeout(res, delay));
			}
		}
	}

	// headers is optional, default is the headers set in the constructor
	public async request(
		method: string,
		params: any[] = [],
		headers: Record<string, string> = {},
		retries: number = this.maxRetries,
		backoffMs: number = 500
	): Promise<any> {
		const payload = {
			jsonrpc: '2.0',
			id: Date.now(),
			method,
			params
		};

		log.info(`[RPCBase] Sending request:`, false, { method, params });

		return this.fetchWithRetry(payload, headers);
	}

	/**
	 * Get standardized provider configuration for any provider and chain
	 * This centralizes all provider URL patterns and API key retrieval
	 */
	static async getProviderConfig(provider: string, chainId: number): Promise<ProviderConfig | null> {
		// Try cached config first
		const cached = ProviderConfigAdapter.getCachedConfig(provider, chainId);
		if (cached) {
			return cached;
		}
		
		return this.loadProviderConfig(provider, chainId);
	}

	/**
	 * Get cached provider configuration synchronously
	 */
	static getProviderConfigSync(provider: string, chainId: number): ProviderConfig | null {
		return ProviderConfigAdapter.getCachedConfig(provider, chainId);
	}

	/**
	 * Load provider configuration (internal method)
	 */
	static async loadProviderConfig(provider: string, chainId: number): Promise<ProviderConfig | null> {
		const providerLower = provider.toLowerCase();
		let apiKey: string | null = null;
		let baseURL = '';
		let network = '';

		// Get API key based on provider using EnhancedKeyManager
		const keyManager = EnhancedKeyManager.getInstance();
		await keyManager.initialize();
		
		switch (providerLower) {
			case 'alchemy':
				apiKey = await keyManager.getKey('alchemy', 'read');
				break;
			case 'infura':
				apiKey = process.env.INFURA_API_KEY || process.env.VITE_INFURA_API_KEY || null;
				break;
			case 'quicknode':
				apiKey = process.env.QUICKNODE_API_KEY || process.env.VITE_QUICKNODE_API_KEY || null;
				break;
			case 'yakkl':
				apiKey = process.env.YAKKL_RPC_KEY || null;
				break;
			default:
				log.warn(`[RPCBase] Unknown provider: ${provider}`);
				return null;
		}

		if (!apiKey) {
			log.error(`[RPCBase] No API key found for provider: ${provider}`);
			return null;
		}

		// Build URL based on provider and chain
		switch (providerLower) {
			case 'alchemy':
				switch (chainId) {
					case 1:
						baseURL = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
						network = 'mainnet';
						break;
					case 11155111:
						baseURL = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
						network = 'sepolia';
						break;
					case 137:
						baseURL = `https://polygon-mainnet.g.alchemy.com/v2/${apiKey}`;
						network = 'polygon';
						break;
					case 80001:
						baseURL = `https://polygon-mumbai.g.alchemy.com/v2/${apiKey}`;
						network = 'polygon-mumbai';
						break;
					case 42161:
						baseURL = `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
						network = 'arbitrum';
						break;
					case 10:
						baseURL = `https://opt-mainnet.g.alchemy.com/v2/${apiKey}`;
						network = 'optimism';
						break;
					default:
						// Default to mainnet
						baseURL = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
						network = 'mainnet';
				}
				break;

			case 'infura':
				switch (chainId) {
					case 1:
						baseURL = `https://mainnet.infura.io/v3/${apiKey}`;
						network = 'mainnet';
						break;
					case 11155111:
						baseURL = `https://sepolia.infura.io/v3/${apiKey}`;
						network = 'sepolia';
						break;
					case 137:
						baseURL = `https://polygon-mainnet.infura.io/v3/${apiKey}`;
						network = 'polygon';
						break;
					case 80001:
						baseURL = `https://polygon-mumbai.infura.io/v3/${apiKey}`;
						network = 'polygon-mumbai';
						break;
					case 42161:
						baseURL = `https://arbitrum-mainnet.infura.io/v3/${apiKey}`;
						network = 'arbitrum';
						break;
					case 10:
						baseURL = `https://optimism-mainnet.infura.io/v3/${apiKey}`;
						network = 'optimism';
						break;
					default:
						// Default to mainnet
						baseURL = `https://mainnet.infura.io/v3/${apiKey}`;
						network = 'mainnet';
				}
				break;

			case 'quicknode':
				// QuickNode URLs are custom per user, this is a template
				switch (chainId) {
					case 1:
						baseURL = `https://eth-mainnet.quicknode.pro/${apiKey}`;
						network = 'mainnet';
						break;
					case 11155111:
						baseURL = `https://sepolia.quicknode.pro/${apiKey}`;
						network = 'sepolia';
						break;
					case 137:
						baseURL = `https://polygon-mainnet.quicknode.pro/${apiKey}`;
						network = 'polygon';
						break;
					default:
						baseURL = `https://eth-mainnet.quicknode.pro/${apiKey}`;
						network = 'mainnet';
				}
				break;

			case 'yakkl':
				// Future YAKKL RPC endpoints
				switch (chainId) {
					case 1:
						baseURL = `https://rpc.yakkl.com/ethereum/mainnet?key=${apiKey}`;
						network = 'mainnet';
						break;
					case 11155111:
						baseURL = `https://rpc.yakkl.com/ethereum/sepolia?key=${apiKey}`;
						network = 'sepolia';
						break;
					case 137:
						baseURL = `https://rpc.yakkl.com/polygon/mainnet?key=${apiKey}`;
						network = 'polygon';
						break;
					default:
						baseURL = `https://rpc.yakkl.com/ethereum/mainnet?key=${apiKey}`;
						network = 'mainnet';
				}
				break;
		}

		const config = {
			baseURL,
			apiKey,
			network
		};
		
		// Cache the config
		ProviderConfigAdapter.cacheConfig(`${provider}-${chainId}`, config);
		
		return config;
	}

	/**
	 * Initialize provider configs - should be called at startup
	 */
	static async initializeConfigs(): Promise<void> {
		const providers = ['alchemy', 'infura'];
		const chainIds = [1, 5, 137, 80001]; // Common chain IDs
		
		for (const provider of providers) {
			for (const chainId of chainIds) {
				try {
					await this.getProviderConfig(provider, chainId);
				} catch (error) {
					log.warn(`[RPCBase] Failed to initialize ${provider} config for chain ${chainId}`);
				}
			}
		}
	}
}

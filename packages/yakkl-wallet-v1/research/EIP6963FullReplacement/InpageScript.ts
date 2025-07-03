// src/inpage/InpageScript.ts
import { EIP6963Provider } from '../providers/EIP6963Provider';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import type { EIP6963ProviderDetail, EIP1193Provider } from '../types/eip6963';

class InpageScript {
	private provider: EIP6963Provider;
	private registry: ProviderRegistry;
	private initialized: boolean;

	constructor() {
		this.provider = new EIP6963Provider(window.location.origin);
		this.registry = ProviderRegistry.getInstance();
		this.initialized = false;
		this.initialize();
	}

	private initialize(): void {
		try {
			// Register our provider
			this.registry.registerProvider(this.provider, this.provider.getInfo());

			// Set up window.ethereum
			this.setupWindowEthereum();

			// Announce provider
			this.provider.announce();

			this.initialized = true;
		} catch (error) {
			console.error('Failed to initialize inpage script:', error);
		}
	}

	private setupWindowEthereum(): void {
		if (typeof window.ethereum !== 'undefined') {
			// Store existing provider
			const existingProvider = window.ethereum;
			this.registry.registerProvider(existingProvider as EIP1193Provider, {
				uuid: 'existing-provider',
				name: 'Existing Provider',
				icon: '',
				rdns: 'unknown'
			});
		}

		// Create proxy for window.ethereum
		const ethereumProxy = new Proxy(this.provider, {
			get: (target, prop) => {
				if (prop === 'providers') {
					return this.registry.getAllProviders();
				}
				return Reflect.get(target, prop);
			}
		});

		// Define window.ethereum
		Object.defineProperty(window, 'ethereum', {
			value: ethereumProxy,
			writable: false,
			configurable: true,
			enumerable: true
		});

		// Dispatch initialization event
		window.dispatchEvent(new Event('ethereum#initialized'));
	}
}

// Initialize inpage script
const inpageScript = new InpageScript();

// Define global type
declare global {
	interface Window {
		ethereum?: EIP1193Provider;
	}
}

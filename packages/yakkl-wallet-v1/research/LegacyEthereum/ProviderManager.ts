// src/providers/ProviderManager.ts
import { YakklWalletProvider } from './YakklWalletProvider';
import type { LegacyWindowEthereum } from '../types/ethereum';

export class ProviderManager {
	private static instance: ProviderManager;
	private providers: Map<string, LegacyWindowEthereum>;
	private currentProvider: YakklWalletProvider;

	private constructor() {
		this.providers = new Map();
		this.currentProvider = new YakklWalletProvider();
		this.initializeProvider();
	}

	public static getInstance(): ProviderManager {
		if (!ProviderManager.instance) {
			ProviderManager.instance = new ProviderManager();
		}
		return ProviderManager.instance;
	}

	private initializeProvider(): void {
		if (typeof window === 'undefined') return;

		// Store existing provider if present
		if (window.ethereum) {
			this.providers.set('existing', window.ethereum);
		}

		// Install our provider
		Object.defineProperty(window, 'ethereum', {
			value: this.createProviderProxy(),
			writable: false,
			configurable: true,
			enumerable: true
		});
	}

	private createProviderProxy(): LegacyWindowEthereum {
		return new Proxy(this.currentProvider, {
			get: (target, prop) => {
				if (prop === 'providers') {
					return Array.from(this.providers.values());
				}
				return Reflect.get(target, prop);
			}
		});
	}

	public addProvider(name: string, provider: LegacyWindowEthereum): void {
		this.providers.set(name, provider);
	}

	public removeProvider(name: string): void {
		this.providers.delete(name);
	}

	public getCurrentProvider(): LegacyWindowEthereum {
		return this.currentProvider;
	}
}

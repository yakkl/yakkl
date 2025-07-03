// src/providers/ProviderRegistry.ts
import type { EIP6963ProviderDetail, EIP1193Provider } from '../types/eip6963';

export class ProviderRegistry {
	private static instance: ProviderRegistry;
	private readonly providers: Map<string, EIP6963ProviderDetail>;
	private readonly activeProvider: EIP1193Provider | null;

	private constructor() {
		this.providers = new Map();
		this.activeProvider = null;
		this.initialize();
	}

	public static getInstance(): ProviderRegistry {
		if (!ProviderRegistry.instance) {
			ProviderRegistry.instance = new ProviderRegistry();
		}
		return ProviderRegistry.instance;
	}

	private initialize(): void {
		window.addEventListener('eip6963:requestProvider', this.handleRequestProvider.bind(this));
	}

	public registerProvider(provider: EIP1193Provider, info: EIP6963ProviderInfo): void {
		const detail: EIP6963ProviderDetail = { info, provider };
		this.providers.set(info.uuid, detail);
	}

	private handleRequestProvider(): void {
		this.providers.forEach((detail) => {
			const event = new CustomEvent('eip6963:announceProvider', { detail });
			window.dispatchEvent(event);
		});
	}

	public getProvider(uuid: string): EIP1193Provider | undefined {
		return this.providers.get(uuid)?.provider;
	}

	public setActiveProvider(uuid: string): void {
		const provider = this.getProvider(uuid);
		if (provider) {
			this.activeProvider = provider;
		}
	}
}

// src/providers/ProviderRegistry.ts
import type { EIP6963ProviderDetail, EIP1193Provider } from '../types/eip6963';
import { EIP6963Provider } from './EIP6963Provider';

export class ProviderRegistry {
	private static instance: ProviderRegistry;
	private readonly providers: Map<string, EIP6963ProviderDetail>;

	private constructor() {
		this.providers = new Map();
		this.initialize();
	}

	public static getInstance(): ProviderRegistry {
		if (!ProviderRegistry.instance) {
			ProviderRegistry.instance = new ProviderRegistry();
		}
		return ProviderRegistry.instance;
	}

	private initialize(): void {
		// Create and register our EIP-6963 provider
		const provider = new EIP6963Provider();
		this.registerProvider(provider);

		// Listen for provider requests
		window.addEventListener('eip6963:requestProvider', this.handleRequestProvider.bind(this));
	}

	private registerProvider(provider: EIP1193Provider): void {
		const detail: EIP6963ProviderDetail = {
			info: {
				uuid: provider.info.uuid,
				name: provider.info.name,
				icon: provider.info.icon,
				rdns: provider.info.rdns
			},
			provider
		};

		this.providers.set(detail.info.uuid, detail);
	}

	private handleRequestProvider(): void {
		// Announce all registered providers
		this.providers.forEach((detail) => {
			const announceEvent = new CustomEvent('eip6963:announceProvider', {
				detail
			});
			window.dispatchEvent(announceEvent);
		});
	}

	public getProvider(uuid: string): EIP1193Provider | undefined {
		return this.providers.get(uuid)?.provider;
	}
}

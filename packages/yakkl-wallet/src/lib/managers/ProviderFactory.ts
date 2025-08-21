/* eslint-disable @typescript-eslint/no-explicit-any */
// ProviderFactory.ts
import type { Provider } from './Provider';
import { Alchemy } from './providers/network/alchemy/Alchemy';
import { Infura } from './providers/network/infura/Infura';
import { log } from '$lib/common/logger-wrapper';
// Import other providers here

interface ProviderOptions {
	name: string;
	apiKey?: string | null;
	chainId?: number;
}
/**
 * Factory class to create instances of different providers.
 */
class ProviderFactory {
	static createProvider(options: ProviderOptions): Provider {
		const { name, apiKey, chainId } = options;
		let provider: any;

		// Support both uppercase and lowercase names
		const normalizedName = name.toLowerCase();
		
		switch (normalizedName) {
			case 'alchemy':
				provider = new Alchemy({ apiKey, chainId });
				try {
					provider.initializeProvider();
				} catch (error) {
					log.warn(`[ProviderFactory] Failed to initialize Alchemy provider:`, false, error);
					throw error;
				}
				return provider;
			
			case 'infura':
				// For now, return Alchemy as fallback since Infura is not implemented
				// and we want to avoid authentication popups
				log.warn('[ProviderFactory] Infura requested but not implemented, falling back to Alchemy');
				provider = new Alchemy({ apiKey, chainId });
				try {
					provider.initializeProvider();
				} catch (error) {
					log.warn(`[ProviderFactory] Failed to initialize fallback Alchemy provider:`, false, error);
					throw error;
				}
				return provider;
			
			case 'quicknode':
				// QuickNode not implemented, fallback to Alchemy
				log.warn('[ProviderFactory] QuickNode requested but not implemented, falling back to Alchemy');
				provider = new Alchemy({ apiKey, chainId });
				try {
					provider.initializeProvider();
				} catch (error) {
					log.warn(`[ProviderFactory] Failed to initialize fallback Alchemy provider:`, false, error);
					throw error;
				}
				return provider;
			
			default:
				throw new Error(`Unsupported provider: ${name}`);
		}
	}
}

export default ProviderFactory;

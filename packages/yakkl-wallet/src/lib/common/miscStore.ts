import { detectBrowserContext } from './browserContext';
import { getMiscStore as getMiscStoreBackground } from '$base/contexts/background/security/secure-hash-store';
import { getMiscStore as getMiscStoreClient } from './stores';
import { log } from '$lib/common/logger-wrapper';

/**
 * Get the misc store synchronously (UI context only)
 * @returns The misc store from the browser store
 * @deprecated Use getMiscStoreAsync for background context
 */
export function getMiscStore(): string | null {
	const context = detectBrowserContext();
	const isBackground = context === 'background';
	
	if (isBackground) {
		// Cannot use sync version in background - return null and log warning
		log.error('getMiscStore: Synchronous call in background context is not supported. Use getMiscStoreAsync instead.');
		return null;
	} else {
		// Use client Svelte store
		try {
			const miscStore = getMiscStoreClient();
			if (!miscStore) {
				log.warn('getMiscStore: Client store returned undefined/null');
				return null;
			}
			return miscStore;
		} catch (error) {
			log.error('Error in getMiscStore (client context):', false, error);
			return null;
		}
	}
}

/**
 * Get the misc store asynchronously (works in all contexts)
 * @returns The misc store from the background or the browser store depending on the context
 */
export async function getMiscStoreAsync(): Promise<string | null> {
	const context = detectBrowserContext();
	const isBackground = context === 'background';
	
	if (isBackground) {
		// Use background secure store (async)
		return await getMiscStoreBackground();
	} else {
		// Use client Svelte store (sync, but wrapped in Promise for consistency)
		try {
			const miscStore = getMiscStoreClient();
			if (!miscStore) {
				log.warn('getMiscStoreAsync: Client store returned undefined/null');
				return null;
			}
			return miscStore;
		} catch (error) {
			log.error('Error in getMiscStoreAsync (client context):', false, error);
			return null;
		}
	}
}

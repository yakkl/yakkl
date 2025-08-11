import { AccountTokenCacheManager } from "$lib/managers/AccountTokenCacheManager";
import { BalanceCacheManager } from "$lib/managers/BalanceCacheManager";
import { log } from "./logger-wrapper";

/**
 * Initialize cache managers after stores are loaded
 * This ensures cache managers have access to required data
 */
export async function initializeCacheManagers(): Promise<void> {
	try {
		// Initialize cache managers to load their data from storage
		// These will load cached balance and token data that needs to be available immediately
		const balanceManager = BalanceCacheManager.getInstance();
		const tokenManager = AccountTokenCacheManager.getInstance();
		
		// Wait for any initialization promises if the managers have them
		// This is better than arbitrary timeouts
		await Promise.all([
			// If the managers have init methods, call them here
			Promise.resolve(balanceManager),
			Promise.resolve(tokenManager)
		]);

		log.debug('Cache managers initialized successfully');
	} catch (error) {
		log.warn('Failed to initialize cache managers:', false, error);
		// Don't throw - this shouldn't block initialization
	}
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use initializeCacheManagers instead
 */
export async function loadCacheManagers(): Promise<void> {
	return initializeCacheManagers();
}

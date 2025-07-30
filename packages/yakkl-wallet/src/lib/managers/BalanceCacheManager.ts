import { log } from '$lib/managers/Logger';
import type { CachedBalanceData } from '$lib/utilities/accountData';
import { getObjectFromExtensionStorage, setObjectInExtensionStorage, removeFromExtensionStorage } from '$lib/common/stores';

export class BalanceCacheManager {
	private static instance: BalanceCacheManager;
	private readonly CACHE_KEY = 'yakklBalanceCache';
	private readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
	private readonly STALE_DURATION = 2 * 60 * 1000; // 2 minutes
	private cache: Map<string, CachedBalanceData> = new Map();

	private constructor() {
		// Start loading asynchronously, but don't block constructor
		this.initializeAsync();
	}

	public static getInstance(): BalanceCacheManager {
		if (!BalanceCacheManager.instance) {
			BalanceCacheManager.instance = new BalanceCacheManager();
		}
		return BalanceCacheManager.instance;
	}

	/**
	 * Initialize asynchronously without blocking constructor
	 */
	private initializeAsync(): void {
		this.loadFromStorage().catch(error => {
			// Log error but don't fail - cache will just start empty
			console.warn('BalanceCacheManager: Failed to load from storage, starting with empty cache:', error);
		});
	}

	/**
	 * Get cached balance data for an address
	 */
	public getCachedBalance(address: string): CachedBalanceData | null {
		const cached = this.cache.get(address.toLowerCase());
		if (!cached) return null;

		// Check if cache is expired
		const age = Date.now() - cached.timestamp;
		if (age > this.CACHE_EXPIRY) {
			this.cache.delete(address.toLowerCase());
			this.saveToStorage().catch(error => {
				console.warn('BalanceCacheManager: Failed to save cache after expiry cleanup:', error);
			});
			return null;
		}

		return cached;
	}

	/**
	 * Check if cached data is stale (older than 2 minutes)
	 */
	public isStale(address: string): boolean {
		const cached = this.cache.get(address.toLowerCase());
		if (!cached) return false;

		const age = Date.now() - cached.timestamp;
		return age > this.STALE_DURATION;
	}

	/**
	 * Set balance data in cache
	 */
	public setCachedBalance(address: string, balance: bigint, price: number): void {
		const cacheData: CachedBalanceData = {
			address: address.toLowerCase(),
			balance,
			price,
			timestamp: Date.now()
		};

		this.cache.set(address.toLowerCase(), cacheData);
		this.saveToStorage().catch(error => {
			console.warn('BalanceCacheManager: Failed to save cache after setting balance:', error);
		});
	}

	/**
	 * Clear all cached data
	 */
	public async clearCache(): Promise<void> {
		this.cache.clear();
		try {
			await removeFromExtensionStorage(this.CACHE_KEY);
		} catch (error) {
			// Fallback to localStorage
			localStorage.removeItem(this.CACHE_KEY);
		}
		log.info('[BalanceCacheManager] Cache cleared');
	}

	/**
	 * Clear cached data for specific address
	 */
	public clearCachedBalance(address: string): void {
		this.cache.delete(address.toLowerCase());
		this.saveToStorage().catch(error => {
			console.warn('BalanceCacheManager: Failed to save cache after clearing balance:', error);
		});
	}

	/**
	 * Update price for all cached entries (called when price changes)
	 */
	public updatePriceForAllEntries(newPrice: number): void {
		let updated = 0;

		for (const [, data] of this.cache.entries()) {
			if (data.price !== newPrice) {
				data.price = newPrice;
				updated++;
			}
		}

		if (updated > 0) {
			this.saveToStorage().catch(error => {
				console.warn('BalanceCacheManager: Failed to save cache after price update:', error);
			});
		}
	}

	/**
	 * Get all cached addresses
	 */
	public getCachedAddresses(): string[] {
		return Array.from(this.cache.keys());
	}

	/**
	 * Clean up expired entries
	 */
	public cleanupExpired(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [address, data] of this.cache.entries()) {
			if (now - data.timestamp > this.CACHE_EXPIRY) {
				this.cache.delete(address);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			this.saveToStorage().catch(error => {
				console.warn('BalanceCacheManager: Failed to save cache after cleanup:', error);
			});
		}
	}

	/**
	 * Preload balances for given addresses (returns cached data immediately)
	 */
	public preloadBalances(addresses: string[]): Map<string, CachedBalanceData> {
		const preloaded = new Map<string, CachedBalanceData>();

		for (const address of addresses) {
			const cached = this.getCachedBalance(address);
			if (cached) {
				preloaded.set(address.toLowerCase(), cached);
			}
		}

		return preloaded;
	}

	/**
	 * Load cache from localStorage
	 */
	private async loadFromStorage(): Promise<void> {
		try {
			const stored = await getObjectFromExtensionStorage<string>(this.CACHE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				this.cache = new Map(
					Object.entries(parsed).map(([address, data]: [string, any]) => [
						address,
						{
							...data,
							balance: BigInt(data.balance) // Convert balance back to BigInt
						}
					])
				);

				// Clean up expired entries on load
				this.cleanupExpired();

				log.debug(`[BalanceCacheManager] Loaded ${this.cache.size} entries from storage`);
			}
		} catch (error) {
			log.warn('[BalanceCacheManager] Failed to load cache from storage:', false, error);
			this.cache = new Map();
		}
	}

	/**
	 * Save cache to localStorage
	 */
	private async saveToStorage(): Promise<void> {
		try {
			const serializable = Object.fromEntries(
				Array.from(this.cache.entries()).map(([address, data]) => [
					address,
					{
						...data,
						balance: data.balance.toString() // Convert BigInt to string for JSON
					}
				])
			);

			await setObjectInExtensionStorage(this.CACHE_KEY, JSON.stringify(serializable));
		} catch (error) {
			log.warn('[BalanceCacheManager] Failed to save cache to storage:', false, error);
		}
	}

	/**
	 * Get cache statistics
	 */
	public getCacheStats(): {
		totalEntries: number;
		freshEntries: number;
		staleEntries: number;
		expiredEntries: number;
	} {
		const now = Date.now();
		let fresh = 0;
		let stale = 0;
		let expired = 0;

		for (const data of this.cache.values()) {
			const age = now - data.timestamp;
			if (age > this.CACHE_EXPIRY) {
				expired++;
			} else if (age > this.STALE_DURATION) {
				stale++;
			} else {
				fresh++;
			}
		}

		return {
			totalEntries: this.cache.size,
			freshEntries: fresh,
			staleEntries: stale,
			expiredEntries: expired
		};
	}
}

// Export singleton getter - lazy initialization to avoid browser API access at module load time
export function getBalanceCacheManager(): BalanceCacheManager {
	return BalanceCacheManager.getInstance();
}

// For backward compatibility, create a proxy that lazily initializes
export const balanceCacheManager = new Proxy({} as BalanceCacheManager, {
	get(_, prop) {
		const instance = BalanceCacheManager.getInstance();
		return Reflect.get(instance, prop, instance);
	},
	set(_, prop, value) {
		const instance = BalanceCacheManager.getInstance();
		return Reflect.set(instance, prop, value, instance);
	}
});

import { log } from '$lib/managers/Logger';
import type { CachedBalanceData } from '$lib/utilities/accountData';

export class BalanceCacheManager {
	private static instance: BalanceCacheManager | null = null;
	private readonly CACHE_KEY = 'yakkl_balance_cache';
	private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (increased from 5 to reduce API calls)
	private readonly STALE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 2 to reduce background refreshes)
	private cache: Map<string, CachedBalanceData> = new Map();

	private constructor() {
		this.loadFromStorage();
	}

	public static getInstance(): BalanceCacheManager {
		if (!BalanceCacheManager.instance) {
			BalanceCacheManager.instance = new BalanceCacheManager();
		}
		return BalanceCacheManager.instance;
	}

	/**
	 * Get cached balance data for an address
	 */
	public getCachedBalance(address: string): CachedBalanceData | null {
		const cached = this.cache.get(address.toLowerCase());
		if (!cached) return null;

		// Check if cache is expired
		const age = Date.now() - cached.timestamp;
		if (age > this.CACHE_DURATION) {
			this.cache.delete(address.toLowerCase());
			this.saveToStorage();
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
			timestamp: Date.now(),
			price
		};

		this.cache.set(address.toLowerCase(), cacheData);
		this.saveToStorage();

		log.debug('[BalanceCacheManager] Cached balance for address:', false, {
			address: address.toLowerCase(),
			balance: balance.toString(),
			price
		});
	}

	/**
	 * Clear all cached data
	 */
	public clearCache(): void {
		this.cache.clear();
		localStorage.removeItem(this.CACHE_KEY);
		log.info('[BalanceCacheManager] Cache cleared');
	}

	/**
	 * Clear cached data for specific address
	 */
	public clearCachedBalance(address: string): void {
		this.cache.delete(address.toLowerCase());
		this.saveToStorage();
	}

	/**
	 * Update price for all cached entries (called when price changes)
	 */
	public updatePriceForAllEntries(newPrice: number): void {
		let updated = 0;

		for (const [address, data] of this.cache.entries()) {
			// Only update if price actually changed
			if (data.price !== newPrice) {
				this.cache.set(address, {
					...data,
					price: newPrice,
					timestamp: Date.now() // Refresh timestamp since value changed
				});
				updated++;
			}
		}

		if (updated > 0) {
			this.saveToStorage();
			log.info(`[BalanceCacheManager] Updated price for ${updated} cached entries to ${newPrice}`);
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
			if (now - data.timestamp > this.CACHE_DURATION) {
				this.cache.delete(address);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			this.saveToStorage();
			log.info(`[BalanceCacheManager] Cleaned up ${cleaned} expired entries`);
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

		log.debug(
			`[BalanceCacheManager] Preloaded ${preloaded.size}/${addresses.length} balances from cache`
		);
		return preloaded;
	}

	/**
	 * Load cache from localStorage
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(this.CACHE_KEY);
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
	private saveToStorage(): void {
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

			localStorage.setItem(this.CACHE_KEY, JSON.stringify(serializable));
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
			if (age > this.CACHE_DURATION) {
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

// Export singleton instance
export const balanceCacheManager = BalanceCacheManager.getInstance();

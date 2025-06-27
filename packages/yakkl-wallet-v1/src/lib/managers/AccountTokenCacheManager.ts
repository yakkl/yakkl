import { log } from '$lib/managers/Logger';
import type { TokenData } from '$lib/common/interfaces';
import type { BigNumberish } from '$lib/common/bignumber';

export interface CachedTokenData extends TokenData {
	timestamp: number;
	accountAddress: string;
}

export interface AccountTokenCache {
	[accountAddress: string]: {
		tokens: Map<string, CachedTokenData>;
		lastUpdated: number;
		portfolioValue?: number;
		portfolioValueCurrency?: string;
	};
}

export class AccountTokenCacheManager {
	private static instance: AccountTokenCacheManager | null = null;
	private readonly CACHE_KEY = 'yakkl_account_token_cache';
	private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (increased from 5 to reduce API calls)
	private readonly STALE_DURATION = 10 * 60 * 1000; // 10 minutes (increased from 2 to reduce background refreshes)
	private readonly PORTFOLIO_CACHE_DURATION = 20 * 60 * 1000; // 20 minutes for portfolio calculations (increased from 10)
	private cache: AccountTokenCache = {};

	private constructor() {
		this.loadFromStorage();
	}

	public static getInstance(): AccountTokenCacheManager {
		if (!AccountTokenCacheManager.instance) {
			AccountTokenCacheManager.instance = new AccountTokenCacheManager();
		}
		return AccountTokenCacheManager.instance;
	}

	/**
	 * Get cached tokens for a specific account
	 */
	public getCachedTokensForAccount(accountAddress: string): TokenData[] | null {
		const account = this.cache[accountAddress.toLowerCase()];
		if (!account) return null;

		// Check if cache is expired
		const age = Date.now() - account.lastUpdated;
		if (age > this.CACHE_DURATION) {
			delete this.cache[accountAddress.toLowerCase()];
			this.saveToStorage();
			return null;
		}

		return Array.from(account.tokens.values()).map((token) => {
			const { timestamp, ...tokenData } = token;
			return tokenData as TokenData;
		});
	}

	/**
	 * Get a specific cached token for an account
	 */
	public getCachedToken(accountAddress: string, tokenAddress: string): TokenData | null {
		const account = this.cache[accountAddress.toLowerCase()];
		if (!account) return null;

		const token = account.tokens.get(tokenAddress.toLowerCase());
		if (!token) return null;

		// Check if cache is expired
		const age = Date.now() - token.timestamp;
		if (age > this.CACHE_DURATION) {
			account.tokens.delete(tokenAddress.toLowerCase());
			this.saveToStorage();
			return null;
		}

		const { timestamp, ...tokenData } = token;
		return tokenData as TokenData;
	}

	/**
	 * Check if cached data is stale for an account
	 */
	public isAccountTokensStale(accountAddress: string): boolean {
		const account = this.cache[accountAddress.toLowerCase()];
		if (!account) return false;

		const age = Date.now() - account.lastUpdated;
		return age > this.STALE_DURATION;
	}

	/**
	 * Check if a specific token is stale for an account
	 */
	public isTokenStale(accountAddress: string, tokenAddress: string): boolean {
		const account = this.cache[accountAddress.toLowerCase()];
		if (!account) return false;

		const token = account.tokens.get(tokenAddress.toLowerCase());
		if (!token) return false;

		const age = Date.now() - token.timestamp;
		return age > this.STALE_DURATION;
	}

	/**
	 * Cache tokens for a specific account
	 */
	public setCachedTokensForAccount(accountAddress: string, tokens: TokenData[]): void {
		const normalizedAddress = accountAddress.toLowerCase();
		const timestamp = Date.now();

		if (!this.cache[normalizedAddress]) {
			this.cache[normalizedAddress] = {
				tokens: new Map(),
				lastUpdated: timestamp
			};
		}

		// Clear existing tokens and add new ones
		this.cache[normalizedAddress].tokens.clear();
		this.cache[normalizedAddress].lastUpdated = timestamp;

		tokens.forEach((token) => {
			if (token.address) {
				const cachedToken: CachedTokenData = {
					...token,
					timestamp,
					accountAddress: normalizedAddress
				};
				this.cache[normalizedAddress].tokens.set(token.address.toLowerCase(), cachedToken);
			}
		});

		this.saveToStorage();

		log.debug('[AccountTokenCacheManager] Cached tokens for account:', false, {
			address: normalizedAddress,
			tokenCount: tokens.length
		});
	}

	/**
	 * Update a specific token for an account
	 */
	public updateTokenForAccount(accountAddress: string, token: TokenData): void {
		const normalizedAddress = accountAddress.toLowerCase();
		const timestamp = Date.now();

		if (!this.cache[normalizedAddress]) {
			this.cache[normalizedAddress] = {
				tokens: new Map(),
				lastUpdated: timestamp
			};
		}

		if (token.address) {
			const cachedToken: CachedTokenData = {
				...token,
				timestamp,
				accountAddress: normalizedAddress
			};

			this.cache[normalizedAddress].tokens.set(token.address.toLowerCase(), cachedToken);
			this.cache[normalizedAddress].lastUpdated = timestamp;
			this.saveToStorage();

			log.debug('[AccountTokenCacheManager] Updated token for account:', false, {
				address: normalizedAddress,
				tokenSymbol: token.symbol,
				tokenAddress: token.address
			});
		}
	}

	/**
	 * Cache portfolio value for an account
	 */
	public setCachedPortfolioValue(
		accountAddress: string,
		value: number,
		currency: string = 'USD'
	): void {
		const normalizedAddress = accountAddress.toLowerCase();

		if (!this.cache[normalizedAddress]) {
			this.cache[normalizedAddress] = {
				tokens: new Map(),
				lastUpdated: Date.now()
			};
		}

		this.cache[normalizedAddress].portfolioValue = value;
		this.cache[normalizedAddress].portfolioValueCurrency = currency;
		this.saveToStorage();

		log.debug('[AccountTokenCacheManager] Cached portfolio value for account:', false, {
			address: normalizedAddress,
			value,
			currency
		});
	}

	/**
	 * Get cached portfolio value for an account
	 */
	public getCachedPortfolioValue(
		accountAddress: string
	): { value: number; currency: string } | null {
		const account = this.cache[accountAddress.toLowerCase()];
		if (!account || account.portfolioValue === undefined) return null;

		// Check if portfolio cache is expired
		const age = Date.now() - account.lastUpdated;
		if (age > this.PORTFOLIO_CACHE_DURATION) {
			if (account.portfolioValue !== undefined) {
				delete account.portfolioValue;
				delete account.portfolioValueCurrency;
				this.saveToStorage();
			}
			return null;
		}

		return {
			value: account.portfolioValue,
			currency: account.portfolioValueCurrency || 'USD'
		};
	}

	/**
	 * Check if portfolio value is stale for an account
	 */
	public isPortfolioValueStale(accountAddress: string): boolean {
		const account = this.cache[accountAddress.toLowerCase()];
		if (!account || account.portfolioValue === undefined) return false;

		const age = Date.now() - account.lastUpdated;
		return age > this.STALE_DURATION;
	}

	/**
	 * Remove a specific token from account cache
	 */
	public removeTokenFromAccount(accountAddress: string, tokenAddress: string): void {
		const account = this.cache[accountAddress.toLowerCase()];
		if (!account) return;

		account.tokens.delete(tokenAddress.toLowerCase());
		account.lastUpdated = Date.now();
		this.saveToStorage();

		log.debug('[AccountTokenCacheManager] Removed token from account cache:', false, {
			accountAddress: accountAddress.toLowerCase(),
			tokenAddress: tokenAddress.toLowerCase()
		});
	}

	/**
	 * Clear all cached data for a specific account
	 */
	public clearAccountCache(accountAddress: string): void {
		delete this.cache[accountAddress.toLowerCase()];
		this.saveToStorage();
		log.info('[AccountTokenCacheManager] Cleared cache for account:', false, {
			address: accountAddress.toLowerCase()
		});
	}

	/**
	 * Clear all cached data
	 */
	public clearAllCache(): void {
		this.cache = {};
		localStorage.removeItem(this.CACHE_KEY);
		log.info('[AccountTokenCacheManager] All cache cleared');
	}

	/**
	 * Get all cached account addresses
	 */
	public getCachedAccountAddresses(): string[] {
		return Object.keys(this.cache);
	}

	/**
	 * Clean up expired entries
	 */
	public cleanupExpired(): void {
		const now = Date.now();
		let cleanedAccounts = 0;
		let cleanedTokens = 0;

		for (const [accountAddress, account] of Object.entries(this.cache)) {
			// Check if entire account cache is expired
			if (now - account.lastUpdated > this.CACHE_DURATION) {
				delete this.cache[accountAddress];
				cleanedAccounts++;
				continue;
			}

			// Clean up individual expired tokens
			for (const [tokenAddress, token] of account.tokens.entries()) {
				if (now - token.timestamp > this.CACHE_DURATION) {
					account.tokens.delete(tokenAddress);
					cleanedTokens++;
				}
			}

			// Clean up expired portfolio values
			if (
				account.portfolioValue !== undefined &&
				now - account.lastUpdated > this.PORTFOLIO_CACHE_DURATION
			) {
				delete account.portfolioValue;
				delete account.portfolioValueCurrency;
			}
		}

		if (cleanedAccounts > 0 || cleanedTokens > 0) {
			this.saveToStorage();
			log.info(
				`[AccountTokenCacheManager] Cleaned up ${cleanedAccounts} accounts and ${cleanedTokens} tokens`
			);
		}
	}

	/**
	 * Preload tokens for multiple accounts
	 */
	public preloadTokensForAccounts(accountAddresses: string[]): Map<string, TokenData[]> {
		const preloaded = new Map<string, TokenData[]>();

		for (const address of accountAddresses) {
			const tokens = this.getCachedTokensForAccount(address);
			if (tokens) {
				preloaded.set(address.toLowerCase(), tokens);
			}
		}

		log.debug(
			`[AccountTokenCacheManager] Preloaded tokens for ${preloaded.size}/${accountAddresses.length} accounts`
		);
		return preloaded;
	}

	/**
	 * Update token prices for all cached tokens
	 */
	public updateTokenPricesForAllAccounts(
		priceUpdates: Map<string, { price: number; change?: any }>
	): void {
		let updatedCount = 0;

		for (const [accountAddress, account] of Object.entries(this.cache)) {
			for (const [tokenAddress, token] of account.tokens.entries()) {
				const priceUpdate = priceUpdates.get(tokenAddress);
				if (priceUpdate) {
					token.price = {
						price: priceUpdate.price,
						provider: 'cache-update',
						lastUpdated: new Date()
					};
					if (priceUpdate.change) {
						token.change = priceUpdate.change;
					}
					token.timestamp = Date.now(); // Refresh timestamp since price changed
					updatedCount++;
				}
			}
		}

		if (updatedCount > 0) {
			this.saveToStorage();
			log.info(`[AccountTokenCacheManager] Updated prices for ${updatedCount} cached tokens`);
		}
	}

	/**
	 * Get cache statistics
	 */
	public getCacheStats(): {
		totalAccounts: number;
		totalTokens: number;
		freshAccounts: number;
		staleAccounts: number;
		expiredAccounts: number;
	} {
		const now = Date.now();
		let totalTokens = 0;
		let fresh = 0;
		let stale = 0;
		let expired = 0;

		for (const account of Object.values(this.cache)) {
			totalTokens += account.tokens.size;
			const age = now - account.lastUpdated;

			if (age > this.CACHE_DURATION) {
				expired++;
			} else if (age > this.STALE_DURATION) {
				stale++;
			} else {
				fresh++;
			}
		}

		return {
			totalAccounts: Object.keys(this.cache).length,
			totalTokens,
			freshAccounts: fresh,
			staleAccounts: stale,
			expiredAccounts: expired
		};
	}

	/**
	 * Load cache from localStorage
	 */
	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem(this.CACHE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);

				// Convert the stored data back to the proper structure
				this.cache = {};
				for (const [accountAddress, accountData] of Object.entries(parsed)) {
					const typedAccountData = accountData as any;
					this.cache[accountAddress] = {
						lastUpdated: typedAccountData.lastUpdated,
						portfolioValue: typedAccountData.portfolioValue,
						portfolioValueCurrency: typedAccountData.portfolioValueCurrency,
						tokens: new Map()
					};

					// Restore tokens map
					if (typedAccountData.tokens) {
						for (const [tokenAddress, tokenData] of Object.entries(typedAccountData.tokens)) {
							const typedTokenData = tokenData as any;
							// Convert balance back to BigInt if it exists
							if (typedTokenData.balance && typeof typedTokenData.balance === 'string') {
								typedTokenData.balance = BigInt(typedTokenData.balance);
							}
							this.cache[accountAddress].tokens.set(tokenAddress, typedTokenData);
						}
					}
				}

				// Clean up expired entries on load
				this.cleanupExpired();

				log.debug(
					`[AccountTokenCacheManager] Loaded cache for ${Object.keys(this.cache).length} accounts`
				);
			}
		} catch (error) {
			log.warn('[AccountTokenCacheManager] Failed to load cache from storage:', false, error);
			this.cache = {};
		}
	}

	/**
	 * Save cache to localStorage
	 */
	private saveToStorage(): void {
		try {
			// Convert Maps to objects for JSON serialization
			const serializable: any = {};

			for (const [accountAddress, account] of Object.entries(this.cache)) {
				serializable[accountAddress] = {
					lastUpdated: account.lastUpdated,
					portfolioValue: account.portfolioValue,
					portfolioValueCurrency: account.portfolioValueCurrency,
					tokens: {}
				};

				// Convert token Map to object and handle BigInt serialization
				for (const [tokenAddress, token] of account.tokens.entries()) {
					const serializableToken = { ...token };

					// Convert BigInt to string for JSON serialization
					if (serializableToken.balance && typeof serializableToken.balance === 'bigint') {
						serializableToken.balance = serializableToken.balance.toString() as any;
					}

					serializable[accountAddress].tokens[tokenAddress] = serializableToken;
				}
			}

			localStorage.setItem(this.CACHE_KEY, JSON.stringify(serializable));
		} catch (error) {
			log.warn('[AccountTokenCacheManager] Failed to save cache to storage:', false, error);
		}
	}
}

// Export singleton instance
export const accountTokenCacheManager = AccountTokenCacheManager.getInstance();

import { writable, derived, get } from 'svelte/store';
import {
	getYakklCurrentlySelected,
	setObjectInExtensionStorage as setObjectInClientStorage,
	getObjectFromExtensionStorage as getObjectFromClientStorage
} from '$lib/common/stores';
import {
	setObjectInLocalStorage as setObjectInBackgroundStorage,
	getObjectFromLocalStorage as getObjectFromBackgroundStorage
} from '$lib/common/backgroundStorage';
import type { YakklAccount, TokenDisplay, TransactionDisplay, ChainDisplay } from '$lib/types';
import type {
	PortfolioRollup,
	TransactionRollup,
	PrimaryAccountRollup,
	PrimaryTransactionRollup,
	AccountMetadata,
	ViewType,
	RollupContext
} from '$lib/types/rollup.types';
import { VERSION } from '$lib/common';
import { log } from '$lib/common/logger-wrapper';
import { BigNumber, type BigNumberish } from '$lib/common/bignumber';
// import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import { EthereumBigNumber } from '$lib/common/bignumber-ethereum';
import { PortfolioRollupService } from '$lib/services/portfolio-rollup.service';
import { toSmallestUnit, DEFAULT_CURRENCY } from '$lib/config/currencies';

// Cache version for migrations
const CACHE_VERSION = VERSION;
const CACHE_KEY = 'yakklWalletCache';

// Helper functions to use appropriate storage based on context
const isBackgroundContext = typeof window === 'undefined';

async function setObjectInStorage<T extends Record<string, any>>(key: string, obj: T | string): Promise<void> {
	if (isBackgroundContext) {
		return setObjectInBackgroundStorage(key, obj);
	} else {
		await setObjectInClientStorage(key, obj);
		// Client storage returns void | boolean, but we normalize to void
		return;
	}
}

async function getObjectFromStorage<T>(key: string): Promise<T | null> {
	if (isBackgroundContext) {
		return getObjectFromBackgroundStorage<T>(key);
	} else {
		return getObjectFromClientStorage<T>(key);
	}
}

// Interfaces
export interface WalletCacheController {
	// Current active selections
	activeChainId: number;
	activeAccountAddress: string;

	// Master cache keyed by chainId -> accountAddress
	chainAccountCache: {
		[chainId: number]: {
			[accountAddress: string]: AccountCache;
		};
	};

	// Legacy - kept for backward compatibility
	portfolio: {
		totalValue: BigNumberish;
		lastCalculated: Date;
		tokenCount: number;
	};

	// Enhanced Portfolio Rollup Structure
	portfolioRollups: {
		// Grand total across everything
		grandTotal: PortfolioRollup;

		// By aggregation type - using objects instead of Maps for JSON serialization
		byAccount: { [accountAddress: string]: PortfolioRollup };  // Per account across all chains
		byChain: { [chainId: number]: PortfolioRollup };    // Per chain across all accounts
		byAccountChain: { [key: string]: PortfolioRollup }; // Key: `${address}_${chainId}`

		// Hierarchical rollups for primary/derived accounts
		primaryAccountRollups: { [primaryAddress: string]: PrimaryAccountRollup };

		// Watch list rollups (includeInPortfolio: true only)
		watchListRollup: PortfolioRollup;

		// Last calculation timestamp
		lastCalculated: Date;
	};

	// Transaction Rollups - Parallel to portfolio rollups
	transactionRollups: {
		// Transaction aggregations matching portfolio views - using objects for JSON serialization
		byAccount: { [accountAddress: string]: TransactionRollup };
		byChain: { [chainId: number]: TransactionRollup };
		byAccountChain: { [key: string]: TransactionRollup }; // Key: `${address}_${chainId}`

		// Hierarchical transaction rollups
		primaryAccountTransactions: { [primaryAddress: string]: PrimaryTransactionRollup };

		// Watch list transactions
		watchListTransactions: TransactionRollup;

		// Recent activity cache for quick UI access
		recentActivity: {
			all: TransactionDisplay[];
			byViewType: { [viewType: string]: TransactionDisplay[] };
			lastUpdated: Date;
		};
	};

	// Account metadata for quick lookups
	accountMetadata: AccountMetadata;

	// Metadata
	lastSync: Date;
	version: string;

	// Loading states
	isInitializing: boolean;
	hasEverLoaded: boolean;
}

export interface AccountCache {
	// Account info
	account: YakklAccount;
	chainId: number;

	// Token data for this account on this chain
	tokens: TokenCache[];

	// Portfolio calculations
	portfolio: {
		totalValue: BigNumberish;
		lastCalculated: Date;
		tokenCount: number;
	};

	// Transaction cache
	transactions: TransactionCache;

	// Last updates
	lastTokenRefresh: Date;
	lastTransactionRefresh: Date;
	lastPriceUpdate: Date;
}

export interface TokenCache {
	address: string;
	symbol: string;
	name: string;
	decimals: number; // Stay number (decimal places count)

	// Balance data
	balance: string; // Keep as string for storage
	balanceLastUpdated: Date;

	// Price data
	price: number; // Price is a number since it has only 2+ decimal places
	priceLastUpdated: Date;
	price24hChange?: number; // Changed from number for precision

	// Calculated value
	value: BigNumberish; // Changed from number - CRITICAL (balance * price)

	// UI display data
	icon?: string;
	isNative: boolean;
	chainId: number; // Stay number (chain ID is integer)
}

export interface TransactionCache {
	transactions: TransactionDisplay[];
	lastBlock: number;
	hasMore: boolean;
	total: number; // Total count of transactions
}

// Helper functions
function getDefaultPortfolioRollup(): PortfolioRollup {
	return {
		totalValue: 0n,
		tokenCount: 0,
		accountCount: 0,
		chainCount: 0,
		nativeTokenValue: 0n,
		erc20TokenValue: 0n,
		lastCalculated: new Date()
	};
}

function getDefaultTransactionRollup(): TransactionRollup {
	return {
		totalCount: 0,
		pendingCount: 0,
		confirmedCount: 0,
		failedCount: 0,
		totalVolume: 0n,
		transactions: [],
		hasMore: false,
		lastUpdated: new Date()
	};
}

function getDefaultCache(): WalletCacheController {
	return {
		activeChainId: 1, // Default to Ethereum mainnet
		activeAccountAddress: '',
		chainAccountCache: {},
		portfolio: {
			totalValue: 0n,
			lastCalculated: new Date(),
			tokenCount: 0
		},
		portfolioRollups: {
			grandTotal: getDefaultPortfolioRollup(),
			byAccount: {},
			byChain: {},
			byAccountChain: {},
			primaryAccountRollups: {},
			watchListRollup: getDefaultPortfolioRollup(),
			lastCalculated: new Date()
		},
		transactionRollups: {
			byAccount: {},
			byChain: {},
			byAccountChain: {},
			primaryAccountTransactions: {},
			watchListTransactions: getDefaultTransactionRollup(),
			recentActivity: {
				all: [],
				byViewType: {},
				lastUpdated: new Date()
			}
		},
		accountMetadata: {
			primaryAccounts: [],
			derivedAccounts: {},
			watchListAccounts: [],
			includeInPortfolioFlags: {},
			accountDetails: {}
		},
		lastSync: new Date(),
		version: CACHE_VERSION,
		isInitializing: false,
		hasEverLoaded: false
	};
}

function getDefaultAccountCache(account: YakklAccount, chainId: number): AccountCache {
	return {
		account,
		chainId,
		tokens: [],
		portfolio: {
			totalValue: 0n,
			lastCalculated: new Date(),
			tokenCount: 0
		},
		transactions: {
			transactions: [],
			lastBlock: 0,
			hasMore: true,
			total: 0
		},
		lastTokenRefresh: new Date(),
		lastTransactionRefresh: new Date(),
		lastPriceUpdate: new Date()
	};
}

// Utility to convert date strings back to Date objects
function hydrateDates(obj: any): any {
	if (obj instanceof Date) return obj;
	if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
		return new Date(obj);
	}
	if (Array.isArray(obj)) {
		return obj.map(hydrateDates);
	}
	if (obj && typeof obj === 'object') {
		const hydrated: any = {};
		for (const key in obj) {
			hydrated[key] = hydrateDates(obj[key]);
		}
		return hydrated;
	}
	return obj;
}

// Utility to serialize dates to ISO strings for storage
function serializeDates(obj: any): any {
	if (obj instanceof Date) {
		return obj.toISOString();
	}
	if (Array.isArray(obj)) {
		return obj.map(serializeDates);
	}
	if (obj && typeof obj === 'object' && obj.constructor === Object) {
		const serialized: any = {};
		for (const key in obj) {
			serialized[key] = serializeDates(obj[key]);
		}
		return serialized;
	}
	return obj;
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return function executedFunction(...args: Parameters<T>) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}

// Main store creation
function createWalletCacheStore() {
	const { subscribe, set, update } = writable<WalletCacheController>(getDefaultCache());

	// Check if we're in a browser environment
	const isBrowser = typeof window !== 'undefined';

	// Debounced save to prevent excessive writes
	const saveToStorage = debounce(async (state: WalletCacheController) => {
		if (!isBrowser) return;

		try {
			// CRITICAL FIX: Less restrictive validation - save cache more liberally
			// This prevents the wallet from losing data after refresh
			let hasValidData = false;

			if (state.chainAccountCache) {
				Object.values(state.chainAccountCache).forEach((chainData) => {
					Object.values(chainData).forEach((accountData: any) => {
						// Check for various types of valid data - more permissive now
						const hasAccount = accountData?.account?.address;
						const hasPortfolioValue = accountData?.portfolio?.totalValue > 0;
						const hasTokensWithBalance = accountData?.tokens?.some(
							(t: any) => t.balance && parseFloat(t.balance) > 0
						);
						const hasTokensWithPrice = accountData?.tokens?.some((t: any) => {
							if (!t.price) return false;
							try {
								return (t.price || 0) > 0;
							} catch {
								return false;
							}
						});
						const hasNativeToken = accountData?.tokens?.some((t: any) => t.isNative);
						const hasTokensWithValue = accountData?.tokens?.some((t: any) => {
							if (!t.value) return false;
							try {
								return (t.value || 0n) > 0n;
							} catch {
								return false;
							}
						});
						const hasAnyTokens = accountData?.tokens?.length > 0;
						const hasTokenMetadata = accountData?.tokens?.some(
							(t: any) => t.symbol && t.name && t.address
						);
						const hasTransactions = accountData?.transactions?.transactions?.length > 0;
						const hasPortfolioData = accountData?.portfolio?.lastCalculated;

						// CRITICAL: More permissive validation - save if we have ANY meaningful data:
						// - Account exists (preserve account structure)
						// - Portfolio has been calculated (even if value is 0)
						// - Any token exists (preserve token metadata)
						// - Any transaction history exists
						// - Previous conditions for backwards compatibility
						if (
							hasAccount ||
							hasPortfolioData ||
							hasTransactions ||
							hasPortfolioValue ||
							hasTokensWithBalance ||
							hasTokensWithPrice ||
							hasNativeToken ||
							hasTokensWithValue ||
							hasAnyTokens ||
							hasTokenMetadata
						) {
							hasValidData = true;
						}
					});
				});
			}

			// CRITICAL: Also check rollup data - if we have any rollups, preserve them
			if (!hasValidData && state.portfolioRollups) {
				const hasRollupData =
					BigNumber.toBigInt(state.portfolioRollups.grandTotal?.totalValue) > 0n ||
					Object.keys(state.portfolioRollups.byAccount || {}).length > 0 ||
					Object.keys(state.portfolioRollups.byChain || {}).length > 0 ||
					Object.keys(state.portfolioRollups.byAccountChain || {}).length > 0;

				if (hasRollupData) {
					hasValidData = true;
					log.info('[WalletCache] Saving due to rollup data', false);
				}
			}

			// CRITICAL: If we have any account metadata, preserve it
			if (!hasValidData && state.accountMetadata) {
				const hasMetadata =
					state.accountMetadata.primaryAccounts?.length > 0 ||
					Object.keys(state.accountMetadata.derivedAccounts || {}).length > 0 ||
					state.accountMetadata.watchListAccounts?.length > 0;

				if (hasMetadata) {
					hasValidData = true;
					log.info('[WalletCache] Saving due to account metadata', false);
				}
			}

			// Only save if we have valid data (now much more permissive)
			if (hasValidData) {
				// Serialize dates before saving
				const serializedState = serializeDates(state);
				await setObjectInStorage(CACHE_KEY, serializedState);

				// Log what type of data we're saving for debugging
				const chainCount = Object.keys(state.chainAccountCache).length;
				const accountCount = Object.values(state.chainAccountCache).reduce(
					(sum, chainData) => sum + Object.keys(chainData).length,
					0
				);

				log.info('[WalletCache] Saved to extension storage with valid data', false, {
					chains: chainCount,
					accounts: accountCount,
					activeChain: state.activeChainId,
					activeAccount: state.activeAccountAddress
				});
			} else {
				// CRITICAL: Even if we don't have "valid" data, still preserve structure if it exists
				// This prevents complete data loss on refresh
				const hasStructure =
					state.activeAccountAddress ||
					state.activeChainId !== 1 || // Not default chain
					state.hasEverLoaded;

				if (hasStructure) {
					log.info('[WalletCache] Saving wallet structure even without data to prevent complete loss', false);
					// Serialize dates before saving
					const serializedState = serializeDates(state);
					await setObjectInStorage(CACHE_KEY, serializedState);
				} else {
					log.info('[WalletCache] Skipping save - no valid data to persist', false);
				}
			}
		} catch (error) {
			log.warn('[WalletCache] Failed to save:', false, error);
		}
	}, 500);

	// Load from storage on initialization
	async function loadFromStorage() {
		if (!isBrowser) return;

		try {
			const cached = await getObjectFromStorage<WalletCacheController>(CACHE_KEY);

			// Check if cache exists and has data
			if (cached) {
				// Cache exists, just load it
				const hydrated = hydrateDates(cached);
				set(hydrated);
				log.info(`[WalletCache] Loaded from ${isBackgroundContext ? 'background' : 'client'} storage`, false);
			} else {
				// No cache exists, create new one
				log.info('[WalletCache] Initializing with new enhanced cache structure', false);
				const newCache = getDefaultCache();
				set(newCache);
				await setObjectInStorage(CACHE_KEY, newCache);
			}

			// Sync with current account from persisted storage
			const currentlySelected = await getYakklCurrentlySelected();
			if (currentlySelected?.shortcuts?.address) {
				update((cache) => ({
					...cache,
					activeAccountAddress: currentlySelected.shortcuts.address.toLowerCase()
				}));
				log.info(
					'[WalletCache] Synced active account from storage:',
					false,
					currentlySelected.shortcuts.address
				);
			}

			// Sync with current chain if available
			if (currentlySelected?.shortcuts?.chainId) {
				update((cache) => ({
					...cache,
					activeChainId: currentlySelected.shortcuts.chainId
				}));
				log.info(
					'[WalletCache] Synced active chain from storage:',
					false,
					currentlySelected.shortcuts.chainId
				);
			}
		} catch (error) {
			log.warn('[WalletCache] Failed to load:', false, error);
		}
	}

	// Initialize
	if (isBrowser) {
		loadFromStorage();
	}

	// Auto-save on changes
	subscribe((state) => {
		if (isBrowser) {
			saveToStorage(state);
		}
	});

	return {
		subscribe,

		// Initialize cache from storage
		async initialize() {
			await loadFromStorage();

			// Ensure we're synced with the current account after initialization
			const currentlySelected = await getYakklCurrentlySelected();
			if (currentlySelected?.shortcuts?.address) {
				const currentState = get({ subscribe });
				if (
					currentState.activeAccountAddress !== currentlySelected.shortcuts.address.toLowerCase()
				) {
					update((cache) => ({
						...cache,
						activeAccountAddress: currentlySelected.shortcuts.address.toLowerCase()
					}));
					console.log(
						'[WalletCache] Re-synced active account on initialize:',
						currentlySelected.shortcuts.address
					);
				}
			}
		},

		// Switch active account without clearing cache
		switchAccount(address: string) {
			update((cache) => ({
				...cache,
				activeAccountAddress: address.toLowerCase()
			}));
		},

		// Switch active chain without clearing cache
		switchChain(chainId: number) {
			update((cache) => ({
				...cache,
				activeChainId: chainId
			}));
		},

		// Initialize account cache if it doesn't exist
		initializeAccountCache(account: YakklAccount, chainId: number) {
			update((cache) => {
				const newCache = { ...cache };
				const address = account.address.toLowerCase();

				if (!newCache.chainAccountCache[chainId]) {
					newCache.chainAccountCache[chainId] = {};
				}

				if (!newCache.chainAccountCache[chainId][address]) {
					newCache.chainAccountCache[chainId][address] = getDefaultAccountCache(account, chainId);
					console.log(`[WalletCache] Initialized cache for ${address} on chain ${chainId}`);
				}

				return newCache;
			});
		},

		// Update tokens for specific account/chain
		updateTokens(chainId: number, address: string, tokens: TokenCache[]) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();

				if (!newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
					console.warn(`[WalletCache] No cache for ${normalizedAddress} on chain ${chainId}`);
					return cache;
				}

				const accountCache = newCache.chainAccountCache[chainId][normalizedAddress];

				// IMPORTANT: Always accept token updates to prevent data loss
				// The only time we should reject is if we're getting completely empty data
				// which would indicate a failed API call
				const isCompletelyEmpty = tokens.length === 0 ||
					tokens.every(token => !token.address && !token.symbol && !token.name);

				if (isCompletelyEmpty && accountCache.tokens.length > 0) {
					log.warn(
						'[WalletCache] Rejecting empty token update - would lose existing data',
						false
					);
					return cache;
				}

				// Always update if we have any token data - even with 0 balances
				// Token metadata, prices, and the existence of tokens is valuable information
				log.info(
					`[WalletCache] Updating tokens for ${normalizedAddress} on chain ${chainId}`,
					false,
					{ tokenCount: tokens.length }
				);

				// Create a map of existing tokens for quick lookup
				const existingTokenMap = new Map(
					accountCache.tokens.map(t => [t.address.toLowerCase(), t])
				);

				// Validate and fix token values - ensure values are in USD not wei
				const validatedTokens = tokens.map((token) => {
					// Check if we have an existing token with a balance
					const existingToken = existingTokenMap.get(token.address.toLowerCase());

					// CRITICAL: Preserve existing balance if new balance is not provided or is 0
					let balance = BigNumber.toBigInt(token.balance || '0');
					if (balance === 0n && existingToken && existingToken.balance) {
						// Preserve the existing balance
						balance = BigNumber.toBigInt(existingToken.balance) || 0n;
						log.debug(
							`[WalletCache] Preserving existing balance for ${token.symbol}`,
							false,
							{ existingBalance: existingToken.balance, address: token.address }
						);
					}

					// Convert price from BigNumberish to number
					const price = token.price || 0;

					// Calculate expected value (balance * price) using precision-safe arithmetic
					// toFiat now correctly handles wei balance and USD price
					const fiatValue = EthereumBigNumber.toFiat(balance, price);
					// Store as smallest unit for the currency (cents for USD)
					const expectedValue = toSmallestUnit(fiatValue, DEFAULT_CURRENCY);

					// CRITICAL: value should be in USD, not wei
					// Always calculate value from balance * price
					let value = expectedValue;

					// If token.value is provided, check if it might be in wei
					if (token.value !== undefined && token.value !== null) {
						const providedValue = BigNumber.toBigInt(token.value) || 0n;

						// Check if the provided value seems to be in wei (way too large)
						// If value is more than 1000x the expected, it's likely in wei
						if (providedValue > 0n && expectedValue > 0n && providedValue > expectedValue * 1000n) {
							log.warn(
								`[WalletCache] Token ${token.symbol} value appears to be in wei (${providedValue}), using calculated value (${expectedValue})`,
								false
							);
							value = expectedValue;
						} else if (balance > 0n && price > 0) {
							// Sanity check: if calculated value differs significantly, use calculated
							const tolerance = 0.01; // 1% tolerance for rounding
							const ratio = providedValue / expectedValue;
							if (ratio < (1 - tolerance) || ratio > (1 + tolerance)) {
								log.warn(
									`[WalletCache] Token ${token.symbol} stored value (${providedValue}) differs from calculated (${expectedValue}), using calculated`,
									false
								);
								value = expectedValue;
							} else {
								// Value seems reasonable, use it
								value = providedValue;
							}
						}
					}

					return {
						...token,
						value: value
					};
				});

				accountCache.tokens = validatedTokens;
				accountCache.lastTokenRefresh = new Date();

				// ALWAYS recalculate portfolio total when tokens are updated
				// This ensures UI shows accurate values immediately
				accountCache.portfolio = {
					totalValue: validatedTokens.reduce((sum, token) => {
						const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
						return BigNumber.toBigInt(sum) + tokenValue;
					}, 0n),
					lastCalculated: new Date(),
					tokenCount: validatedTokens.length
				};

				// Log portfolio update
				const tokensWithValue = validatedTokens.filter((token) => {
					const tokenValue = BigNumber.toBigInt(token.value || 0n) || 0n;
					return tokenValue > 0n;
				}).length;

				log.info(
					`[WalletCache] Updated portfolio: $${accountCache.portfolio.totalValue.toString()} (${tokensWithValue} tokens with value out of ${validatedTokens.length} total)`,
					false
				);

				// Trigger rollup update for this account
				// Note: We do this after the update to ensure rollups use fresh data
				setTimeout(() => {
					this.updateAccountRollup(normalizedAddress);
				}, 0);

				return newCache;
			});
		},

		// Update only native token price without touching other cache data
		updateNativeTokenPrice(chainId: number, address: string, price: number) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();
				const accountCache = newCache.chainAccountCache[chainId]?.[normalizedAddress];

				if (!accountCache) {
					log.warn('[WalletCache] No cache for native token price update', false, {
						chainId,
						address
					});
					return cache;
				}

				// Find and update only the native token
				let updated = false;
				accountCache.tokens = accountCache.tokens.map((token) => {
					if (token.isNative) {
						const balance = BigNumber.toBigInt(token.balance) || 0n;
						updated = true;
						const fiatValue = EthereumBigNumber.toFiat(balance, price);
						return {
							...token,
							price: price,
							priceLastUpdated: new Date(),
							value: toSmallestUnit(fiatValue, DEFAULT_CURRENCY)
						};
					}
					return token;
				});

				if (updated) {
					// DON'T recalculate portfolio here - let other systems handle portfolio totals
					// Just update the price update timestamp
					accountCache.lastPriceUpdate = new Date();
					log.info(
						'[WalletCache] Updated native token price only (portfolio calculation skipped)',
						false,
						{ chainId, address, price }
					);
				}

				return newCache;
			});
		},

		// Update token prices for all accounts on a chain
		updateTokenPrices(chainId: number, priceMap: Map<string, number>) {
			update((cache) => {
				const newCache = { ...cache };
				const chainCache = newCache.chainAccountCache[chainId];

				if (!chainCache) return cache;

				// Update prices for all accounts on this chain
				Object.keys(chainCache).forEach((address) => {
					const accountCache = chainCache[address];

					accountCache.tokens = accountCache.tokens.map((token) => {
						const tokenKey = token.address.toLowerCase();
						const newPrice = priceMap.get(tokenKey);

						if (newPrice !== undefined) {
							const balance = BigNumber.toBigInt(token.balance) || 0n;
							// Use precision-safe calculation for value
							const fiatValue = EthereumBigNumber.toFiat(balance, newPrice);
							// Store as smallest unit for the currency
							let value = toSmallestUnit(fiatValue, DEFAULT_CURRENCY);

							return {
								...token,
								price: newPrice,
								priceLastUpdated: new Date(),
								value: value
							};
						}

						return token;
					});

					// Always recalculate portfolio when prices update (this is a complete price refresh)
					accountCache.portfolio = {
						totalValue: accountCache.tokens.reduce((sum, token) => {
							const tokenValue = BigNumber.toBigInt(token.value || 0n) || 0n;
							return BigNumber.toBigInt(sum) + tokenValue;
						}, 0n),
						lastCalculated: new Date(),
						tokenCount: accountCache.tokens.length
					};

					accountCache.lastPriceUpdate = new Date();
				});

				// Trigger chain rollup update after price updates
				// Note: We debounce this to avoid excessive recalculation
				setTimeout(() => {
					this.updateChainRollup(chainId);
				}, 100);

				return newCache;
			});
		},

		// Force portfolio recalculation for a specific account/chain
		// Use this when you know all tokens have been loaded and want to ensure accurate portfolio
		forcePortfolioRecalculation(chainId: number, address: string) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();
				const accountCache = newCache.chainAccountCache[chainId]?.[normalizedAddress];

				if (!accountCache) {
					log.warn('[WalletCache] No cache for portfolio recalculation', false, {
						chainId,
						address
					});
					return cache;
				}

				// Force recalculate portfolio regardless of token count
				accountCache.portfolio = {
					totalValue: accountCache.tokens.reduce((sum, token) => {
						const tokenValue = BigNumber.toBigInt(token.value || 0n) || 0n;
						return BigNumber.toBigInt(sum) + tokenValue;
					}, 0n),
					lastCalculated: new Date(),
					tokenCount: accountCache.tokens.length
				};

				log.info(
					`[WalletCache] Forced portfolio recalculation: $${accountCache.portfolio.totalValue.toString()} (${accountCache.tokens.length} tokens)`,
					false
				);

				return newCache;
			});
		},

		// Update transactions for specific account/chain
		updateTransactions(
			chainId: number,
			address: string,
			transactions: TransactionDisplay[],
			lastBlock: number
		) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();

				if (!newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
					console.warn(`[WalletCache] No cache for ${normalizedAddress} on chain ${chainId}`);
					return cache;
				}

				const accountCache = newCache.chainAccountCache[chainId][normalizedAddress];

				// Merge new transactions with existing (remove duplicates)
				const existingHashes = new Set(accountCache.transactions.transactions.map((tx) => tx.hash));
				const newTransactions = transactions.filter((tx) => !existingHashes.has(tx.hash));

				accountCache.transactions = {
					transactions: [...accountCache.transactions.transactions, ...newTransactions].sort(
						(a, b) => b.timestamp - a.timestamp
					), // Sort by newest first
					lastBlock: Math.max(accountCache.transactions.lastBlock, lastBlock),
					hasMore: true, // Will be determined by the sync manager
					total: accountCache.transactions.total + newTransactions.length
				};

				accountCache.lastTransactionRefresh = new Date();

				return newCache;
			});
		},

		// Get account cache
		getAccountCache(chainId: number, address: string): AccountCache | null {
			const state = get({ subscribe });
			return state.chainAccountCache[chainId]?.[address.toLowerCase()] || null;
		},

		// Clear all cache (user action only)
		clearAllCache() {
			set(getDefaultCache());
			console.log('[WalletCache] All cache cleared by user');
		},

		// Clear specific account cache (user action only)
		clearAccountCache(chainId: number, address: string) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();

				if (newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
					delete newCache.chainAccountCache[chainId][normalizedAddress];
					console.log(`[WalletCache] Cleared cache for ${normalizedAddress} on chain ${chainId}`);
				}

				return newCache;
			});
		},

		// Set initialization state
		setInitializing(isInitializing: boolean) {
			update((cache) => ({
				...cache,
				isInitializing
			}));
		},

		// Set has ever loaded state
		setHasEverLoaded(hasEverLoaded: boolean) {
			update((cache) => ({
				...cache,
				hasEverLoaded
			}));
		},

		// Recalculate all portfolio values
		async recalculateAllPortfolios() {
			update((cache) => {
				const newCache = { ...cache };

				// Recalculate portfolio for each account on each chain
				for (const [chainId, accounts] of Object.entries(newCache.chainAccountCache)) {
					for (const [address, accountCache] of Object.entries(accounts)) {
						const totalValue = accountCache.tokens.reduce((sum, token) => {
							const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
							return BigNumber.toBigInt(sum) + tokenValue;
						}, 0n);

						accountCache.portfolio = {
							totalValue,
							lastCalculated: new Date(),
							tokenCount: accountCache.tokens.length
						};
					}
				}

				newCache.lastSync = new Date();
				return newCache;
			});

			log.debug('[WalletCache] Recalculated all portfolio values');

			// Trigger complete rollup recalculation
			await this.calculateAllRollups();
		},

		// Load cache from storage (for external updates)
		async loadFromStorage() {
			await loadFromStorage();
		},

		// Get the current cache state
		async getCache(): Promise<WalletCacheController | null> {
			return get({ subscribe });
		},

		// Synchronous version for immediate access
		getCacheSync(): WalletCacheController {
			return get({ subscribe });
		},

		// ============= ROLLUP METHODS =============

		/**
		 * Calculate all portfolio rollups
		 * This is the main method to recalculate all rollups from scratch
		 */
		async calculateAllRollups() {
			const rollupService = PortfolioRollupService.getInstance();

			update((cache) => {
				const newCache = { ...cache };

				// Initialize rollup structures if they don't exist
				if (!newCache.portfolioRollups) {
					newCache.portfolioRollups = {
						grandTotal: getDefaultPortfolioRollup(),
						byAccount: {},
						byChain: {},
						byAccountChain: {},
						primaryAccountRollups: {},
						watchListRollup: getDefaultPortfolioRollup(),
						lastCalculated: new Date()
					};
				}

				// Calculate grand total
				newCache.portfolioRollups.grandTotal = rollupService.calculateGrandTotal(newCache);

				// Calculate per-account rollups
				const allAccounts = new Set<string>();
				Object.values(newCache.chainAccountCache).forEach(chainData => {
					Object.keys(chainData).forEach(address => allAccounts.add(address));
				});

				for (const address of allAccounts) {
					const accountRollup = rollupService.calculateAccountRollup(address, newCache);
					newCache.portfolioRollups.byAccount[address.toLowerCase()] = accountRollup;
				}

				// Calculate per-chain rollups
				for (const chainId of Object.keys(newCache.chainAccountCache)) {
					const chainRollup = rollupService.calculateChainRollup(Number(chainId), newCache);
					newCache.portfolioRollups.byChain[Number(chainId)] = chainRollup;
				}

				// Calculate account+chain combinations
				for (const [chainId, chainData] of Object.entries(newCache.chainAccountCache)) {
					for (const address of Object.keys(chainData)) {
						const key = `${address.toLowerCase()}_${chainId}`;
						const rollup = rollupService.calculateAccountChainRollup(
							address,
							Number(chainId),
							newCache
						);
						newCache.portfolioRollups.byAccountChain[key] = rollup;
					}
				}

				// Calculate primary account hierarchies
				if (newCache.accountMetadata?.primaryAccounts) {
					for (const primaryAddress of newCache.accountMetadata.primaryAccounts) {
						const derivedAddresses: string[] = [];
						// Find derived accounts for this primary
						if (newCache.accountMetadata.derivedAccounts) {
							for (const [derived, primary] of Object.entries(newCache.accountMetadata.derivedAccounts)) {
								if (primary.toLowerCase() === primaryAddress.toLowerCase()) {
									derivedAddresses.push(derived);
								}
							}
						}

						const hierarchyRollup = rollupService.calculatePrimaryAccountHierarchy(
							primaryAddress,
							derivedAddresses,
							newCache
						);
						newCache.portfolioRollups.primaryAccountRollups[primaryAddress.toLowerCase()] = hierarchyRollup;
					}
				}

				// Calculate watch list rollup
				if (newCache.accountMetadata?.watchListAccounts) {
					newCache.portfolioRollups.watchListRollup = rollupService.calculateWatchListRollup(
						new Set(newCache.accountMetadata.watchListAccounts),
						newCache
					);
				}

				// Update timestamp
				newCache.portfolioRollups.lastCalculated = new Date();

				// Update legacy portfolio field for backward compatibility
				newCache.portfolio = {
					totalValue: newCache.portfolioRollups.grandTotal.totalValue,
					lastCalculated: newCache.portfolioRollups.lastCalculated,
					tokenCount: newCache.portfolioRollups.grandTotal.tokenCount
				};

				log.info('[WalletCache] All rollups calculated', false, {
					grandTotal: newCache.portfolioRollups.grandTotal.totalValue.toString(),
					accounts: allAccounts.size,
					chains: Object.keys(newCache.chainAccountCache).length
				});

				return newCache;
			});
		},

		/**
		 * Update token balances while preserving existing quantities
		 * This ensures we never reset balances to 0 unless explicitly instructed
		 */
		updateTokenBalances(chainId: number, address: string, newBalances: Map<string, BigNumberish>) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();

				if (!newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
					console.warn(`[WalletCache] No cache for ${normalizedAddress} on chain ${chainId}`);
					return cache;
				}

				const accountCache = newCache.chainAccountCache[chainId][normalizedAddress];

				accountCache.tokens = accountCache.tokens.map((token) => {
					const tokenKey = token.address.toLowerCase();
					const newBalance = newBalances.get(tokenKey);

					if (newBalance !== undefined) {
						const newBalanceBigInt = BigNumber.toBigInt(newBalance);

						// CRITICAL: Only update if new balance is non-zero or if explicitly set to 0
						if (newBalanceBigInt && newBalanceBigInt > 0n) {
							// Update to new non-zero balance
							const balanceStr = newBalanceBigInt.toString();
							const price = token.price || 0;
							// toFiat now correctly handles wei balance and USD price
							const fiatValue = EthereumBigNumber.toFiat(newBalanceBigInt, price);
							// Store as smallest unit for the currency
							const value = toSmallestUnit(fiatValue, DEFAULT_CURRENCY);

							return {
								...token,
								balance: balanceStr,
								balanceLastUpdated: new Date(),
								value: value
							};
						} else if (newBalanceBigInt === 0n && newBalances.has(tokenKey)) {
							// Only set to 0 if explicitly provided in the update
							log.info(
								`[WalletCache] Explicitly setting ${token.symbol} balance to 0`,
								false,
								{ address: token.address }
							);
							return {
								...token,
								balance: '0',
								balanceLastUpdated: new Date(),
								value: 0n
							};
						}
					}

					// No update provided - keep existing balance
					return token;
				});

				// Recalculate portfolio
				accountCache.portfolio = {
					totalValue: accountCache.tokens.reduce((sum, token) => {
						const tokenValue = BigNumber.toBigInt(token.value || 0n) || 0n;
						return BigNumber.toBigInt(sum) + tokenValue;
					}, 0n),
					lastCalculated: new Date(),
					tokenCount: accountCache.tokens.length
				};

				return newCache;
			});
		},

		/**
		 * Update rollup for a specific account
		 * More efficient than recalculating everything
		 */
		async updateAccountRollup(address: string) {
			const rollupService = PortfolioRollupService.getInstance();
			const normalizedAddress = address.toLowerCase();

			update((cache) => {
				const newCache = { ...cache };

				// Ensure rollup structure exists
				if (!newCache.portfolioRollups) {
					return cache; // Need to run calculateAllRollups first
				}

				// Update account rollup
				const accountRollup = rollupService.calculateAccountRollup(address, newCache);
				newCache.portfolioRollups.byAccount[normalizedAddress] = accountRollup;

				// Update account+chain combinations for this account
				for (const chainId of Object.keys(newCache.chainAccountCache)) {
					if (newCache.chainAccountCache[Number(chainId)][normalizedAddress]) {
						const key = `${normalizedAddress}_${chainId}`;
						const rollup = rollupService.calculateAccountChainRollup(
							address,
							Number(chainId),
							newCache
						);
						newCache.portfolioRollups.byAccountChain[key] = rollup;
					}
				}

				// Check if this is a primary account
				if (newCache.accountMetadata?.primaryAccounts?.includes(normalizedAddress)) {
					const derivedAddresses: string[] = [];
					if (newCache.accountMetadata.derivedAccounts) {
						for (const [derived, primary] of Object.entries(newCache.accountMetadata.derivedAccounts)) {
							if (primary.toLowerCase() === normalizedAddress) {
								derivedAddresses.push(derived);
							}
						}
					}

					const hierarchyRollup = rollupService.calculatePrimaryAccountHierarchy(
						address,
						derivedAddresses,
						newCache
					);
					newCache.portfolioRollups.primaryAccountRollups[normalizedAddress] = hierarchyRollup;
				}

				// Check if this is a derived account
				const primaryAddress = newCache.accountMetadata?.derivedAccounts?.[normalizedAddress];
				if (primaryAddress) {
					// Recalculate the primary account hierarchy
					const derivedAddresses: string[] = [];
					if (newCache.accountMetadata.derivedAccounts) {
						for (const [derived, primary] of Object.entries(newCache.accountMetadata.derivedAccounts)) {
							if (primary.toLowerCase() === primaryAddress.toLowerCase()) {
								derivedAddresses.push(derived);
							}
						}
					}

					const hierarchyRollup = rollupService.calculatePrimaryAccountHierarchy(
						primaryAddress,
						derivedAddresses,
						newCache
					);
					newCache.portfolioRollups.primaryAccountRollups[primaryAddress.toLowerCase()] = hierarchyRollup;
				}

				// Recalculate grand total (since an account changed)
				newCache.portfolioRollups.grandTotal = rollupService.calculateGrandTotal(newCache);

				// Update chains that contain this account
				for (const [chainId, chainData] of Object.entries(newCache.chainAccountCache)) {
					if (chainData[normalizedAddress]) {
						const chainRollup = rollupService.calculateChainRollup(Number(chainId), newCache);
						newCache.portfolioRollups.byChain[Number(chainId)] = chainRollup;
					}
				}

				// Update watch list if this is a watch account
				if (newCache.accountMetadata?.watchListAccounts?.includes(normalizedAddress)) {
					newCache.portfolioRollups.watchListRollup = rollupService.calculateWatchListRollup(
						new Set(newCache.accountMetadata.watchListAccounts),
						newCache
					);
				}

				// Update timestamp
				newCache.portfolioRollups.lastCalculated = new Date();

				// Update legacy portfolio field
				newCache.portfolio = {
					totalValue: newCache.portfolioRollups.grandTotal.totalValue,
					lastCalculated: newCache.portfolioRollups.lastCalculated,
					tokenCount: newCache.portfolioRollups.grandTotal.tokenCount
				};

				log.debug('[WalletCache] Account rollup updated', false, { address: normalizedAddress });

				return newCache;
			});
		},

		/**
		 * Update rollup for a specific chain
		 */
		async updateChainRollup(chainId: number) {
			const rollupService = PortfolioRollupService.getInstance();

			update((cache) => {
				const newCache = { ...cache };

				// Ensure rollup structure exists
				if (!newCache.portfolioRollups) {
					return cache;
				}

				// Update chain rollup
				const chainRollup = rollupService.calculateChainRollup(chainId, newCache);
				newCache.portfolioRollups.byChain[chainId] = chainRollup;

				// Update account+chain combinations for this chain
				const chainData = newCache.chainAccountCache[chainId];
				if (chainData) {
					for (const address of Object.keys(chainData)) {
						const key = `${address.toLowerCase()}_${chainId}`;
						const rollup = rollupService.calculateAccountChainRollup(
							address,
							chainId,
							newCache
						);
						newCache.portfolioRollups.byAccountChain[key] = rollup;
					}
				}

				// Recalculate grand total
				newCache.portfolioRollups.grandTotal = rollupService.calculateGrandTotal(newCache);

				// Update timestamp
				newCache.portfolioRollups.lastCalculated = new Date();

				// Update legacy portfolio field
				newCache.portfolio = {
					totalValue: newCache.portfolioRollups.grandTotal.totalValue,
					lastCalculated: newCache.portfolioRollups.lastCalculated,
					tokenCount: newCache.portfolioRollups.grandTotal.tokenCount
				};

				log.debug('[WalletCache] Chain rollup updated', false, { chainId });

				return newCache;
			});
		},

		/**
		 * Get portfolio view for specific view type
		 */
		getPortfolioView(viewType: ViewType, context?: RollupContext): PortfolioRollup | null {
			const state = get({ subscribe });
			if (!state.portfolioRollups) {
				return null;
			}

			const rollupService = PortfolioRollupService.getInstance();

			// Try to get from cache first
			switch (viewType) {
				case 'current':
					if (context?.accountAddress && context?.chainId) {
						const key = `${context.accountAddress.toLowerCase()}_${context.chainId}`;
						return state.portfolioRollups.byAccountChain[key] || null;
					}
					break;
				case 'chain':
					if (context?.chainId) {
						return state.portfolioRollups.byChain[context.chainId] || null;
					}
					break;
				case 'account':
					if (context?.accountAddress) {
						return state.portfolioRollups.byAccount[context.accountAddress.toLowerCase()] || null;
					}
					break;
				case 'all':
					return state.portfolioRollups.grandTotal;
				case 'watchlist':
					return state.portfolioRollups.watchListRollup;
				case 'hierarchy':
					if (context?.accountAddress) {
						return state.portfolioRollups.primaryAccountRollups[context.accountAddress.toLowerCase()] || null;
					}
					break;
			}

			// If not in cache, calculate on demand
			return rollupService.getRollupForView(viewType, state, context);
		},

		/**
		 * Update account metadata
		 * This is critical for tracking primary/derived/watch relationships
		 */
		updateAccountMetadata(metadata: Partial<AccountMetadata>) {
			update((cache) => {
				const newCache = { ...cache };

				if (!newCache.accountMetadata) {
					newCache.accountMetadata = {
						primaryAccounts: [],
						derivedAccounts: {},
						watchListAccounts: [],
						includeInPortfolioFlags: {},
						accountDetails: {}
					};
				}

				// Update each field if provided
				if (metadata.primaryAccounts) {
					newCache.accountMetadata.primaryAccounts = metadata.primaryAccounts;
				}
				if (metadata.derivedAccounts) {
					newCache.accountMetadata.derivedAccounts = metadata.derivedAccounts;
				}
				if (metadata.watchListAccounts) {
					newCache.accountMetadata.watchListAccounts = metadata.watchListAccounts;
				}
				if (metadata.includeInPortfolioFlags) {
					newCache.accountMetadata.includeInPortfolioFlags = metadata.includeInPortfolioFlags;
				}
				if (metadata.accountDetails) {
					newCache.accountMetadata.accountDetails = metadata.accountDetails;
				}

				log.debug('[WalletCache] Account metadata updated', false);

				return newCache;
			});
		},

		/**
		 * Set include in portfolio flag for a watch account
		 */
		setIncludeInPortfolio(address: string, include: boolean) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();

				if (!newCache.accountMetadata) {
					newCache.accountMetadata = {
						primaryAccounts: [],
						derivedAccounts: {},
						watchListAccounts: [],
						includeInPortfolioFlags: {},
						accountDetails: {}
					};
				}

				newCache.accountMetadata.includeInPortfolioFlags[normalizedAddress] = include;

				// Trigger rollup recalculation for watch list and grand total
				if (newCache.portfolioRollups && newCache.accountMetadata.watchListAccounts) {
					const rollupService = PortfolioRollupService.getInstance();

					newCache.portfolioRollups.watchListRollup = rollupService.calculateWatchListRollup(
						new Set(newCache.accountMetadata.watchListAccounts),
						newCache
					);

					newCache.portfolioRollups.grandTotal = rollupService.calculateGrandTotal(newCache);

					// Update legacy portfolio field
					newCache.portfolio = {
						totalValue: newCache.portfolioRollups.grandTotal.totalValue,
						lastCalculated: new Date(),
						tokenCount: newCache.portfolioRollups.grandTotal.tokenCount
					};
				}

				log.debug('[WalletCache] Include in portfolio flag updated', false, {
					address: normalizedAddress,
					include
				});

				return newCache;
			});
		}
	};
}

// Create the main store
export const walletCacheStore = createWalletCacheStore();

// Export for background service
export const WalletCacheStore = walletCacheStore;

// Derived stores for UI consumption
export const currentAccount = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
	return chainAccountCache[activeChainId]?.[activeAccountAddress]?.account || null;
});

export const currentAccountTokens = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
	return chainAccountCache[activeChainId]?.[activeAccountAddress]?.tokens || [];
});

// Enhanced: Use rollup data if available, fallback to direct calculation
export const currentPortfolioValue = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, portfolioRollups, chainAccountCache } = $cache;

	// Try to get from rollup first (faster)
	if (portfolioRollups && portfolioRollups.byAccountChain) {
		const key = `${activeAccountAddress.toLowerCase()}_${activeChainId}`;
		const rollup = portfolioRollups.byAccountChain[key]; // Access as object property, not Map
		if (rollup) {
			const value = BigNumber.toBigInt(rollup.totalValue) || 0n;
			console.log('currentPortfolioValue from rollup (cents) >>>>>>>>>>', value, '→ dollars:', Number(value) / 100);
			return value;
		}
	}

	// Fallback to direct calculation
	const value = BigNumber.toBigInt(chainAccountCache[activeChainId]?.[activeAccountAddress]?.portfolio.totalValue || 0n) || 0n;
	console.log('currentPortfolioValue (cents) >>>>>>>>>>', value, '→ dollars:', Number(value) / 100);
	return value;
});

export const currentAccountTransactions = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
	return chainAccountCache[activeChainId]?.[activeAccountAddress]?.transactions.transactions || [];
});

// Enhanced: Use rollup data for better performance
export const multiChainPortfolioValue = derived(walletCacheStore, ($cache) => {
	const { activeAccountAddress, portfolioRollups, chainAccountCache } = $cache;
	if (!activeAccountAddress) return 0n;

	// Try to get from rollup first (pre-calculated)
	if (portfolioRollups) {
		const rollup = portfolioRollups.byAccount[activeAccountAddress.toLowerCase()];
		if (rollup) {
			return BigNumber.toBigInt(rollup.totalValue) || 0n;
		}
	}

	// Fallback to calculation
	let totalValue = 0n;
	Object.values(chainAccountCache).forEach((chainData) => {
		const accountData = chainData[activeAccountAddress];
		if (accountData) {
			totalValue += BigNumber.toBigInt(accountData.portfolio.totalValue) || 0n;
		}
	});

	return totalValue;
});

// All tokens across all chains for current account
export const multiChainTokens = derived(walletCacheStore, ($cache) => {
	const { activeAccountAddress, chainAccountCache } = $cache;
	if (!activeAccountAddress) return [];

	const allTokens: TokenCache[] = [];

	Object.entries(chainAccountCache).forEach(([chainId, chainData]) => {
		const accountData = chainData[activeAccountAddress];
		if (accountData) {
			allTokens.push(...accountData.tokens);
		}
	});

	return allTokens;
});

// Enhanced: Use rollup breakdown for network view
export const portfolioByNetwork = derived(walletCacheStore, ($cache) => {
	const { activeAccountAddress, portfolioRollups, chainAccountCache } = $cache;
	if (!activeAccountAddress) return new Map<number, BigInt>();

	// Try to get from rollup breakdown first
	if (portfolioRollups && portfolioRollups.byAccount) {
		const accountRollup = portfolioRollups.byAccount[activeAccountAddress.toLowerCase()];
		if (accountRollup?.breakdown?.byChain) {
			return new Map(
				Object.entries(accountRollup.breakdown.byChain).map(
					([chainId, value]) => [Number(chainId), BigNumber.toBigInt(value) || 0n]
				)
			);
		}
	}

	// Fallback to calculation
	const networkTotals = new Map<number, BigInt>();
	Object.entries(chainAccountCache).forEach(([chainId, chainData]) => {
		const accountData = chainData[activeAccountAddress];
		if (accountData && BigNumber.toBigInt(accountData.portfolio.totalValue) > 0n) {
			networkTotals.set(Number(chainId), BigNumber.toBigInt(accountData.portfolio.totalValue) || 0n);
		}
	});

	return networkTotals;
});

// ============= NEW ROLLUP-BASED DERIVED STORES =============

// Current chain total (all accounts on current chain)
export const currentChainTotal = derived(walletCacheStore, ($cache) => {
	const { activeChainId, portfolioRollups } = $cache;

	if (portfolioRollups) {
		const rollup = portfolioRollups.byChain[activeChainId];
		if (rollup) {
			return BigNumber.toBigInt(rollup.totalValue) || 0n;
		}
	}

	// Fallback: calculate from cache
	let total = 0n;
	const chainData = $cache.chainAccountCache[activeChainId];
	if (chainData) {
		Object.values(chainData).forEach(accountCache => {
			// Skip watch accounts not included in portfolio
			const address = accountCache.account?.address?.toLowerCase();
			if (address && $cache.accountMetadata?.watchListAccounts?.includes(address)) {
				const includeInPortfolio = $cache.accountMetadata.includeInPortfolioFlags?.[address];
				if (!includeInPortfolio) return;
			}
			total += BigNumber.toBigInt(accountCache.portfolio.totalValue) || 0n;
		});
	}

	return total;
});

// Grand portfolio total (all accounts, all chains)
export const grandPortfolioTotal = derived(walletCacheStore, ($cache) => {
	if ($cache.portfolioRollups?.grandTotal) {
		return BigNumber.toBigInt($cache.portfolioRollups.grandTotal.totalValue) || 0n;
	}

	// Fallback to legacy portfolio field
	return BigNumber.toBigInt($cache.portfolio?.totalValue || 0n) || 0n;
});

// Watch list total
export const watchListTotal = derived(walletCacheStore, ($cache) => {
	if ($cache.portfolioRollups?.watchListRollup) {
		return BigNumber.toBigInt($cache.portfolioRollups.watchListRollup.totalValue) || 0n;
	}

	return 0n;
});

// Primary account hierarchy (with derived accounts)
export const primaryAccountHierarchy = derived(walletCacheStore, ($cache) => {
	const { activeAccountAddress, portfolioRollups, accountMetadata } = $cache;
	if (!activeAccountAddress) return null;

	const normalizedAddress = activeAccountAddress.toLowerCase();

	// Check if this is a primary account
	if (accountMetadata?.primaryAccounts?.includes(normalizedAddress)) {
		return portfolioRollups?.primaryAccountRollups?.[normalizedAddress] || null;
	}

	// Check if this is a derived account - get its primary
	const primaryAddress = accountMetadata?.derivedAccounts?.[normalizedAddress];
	if (primaryAddress) {
		return portfolioRollups?.primaryAccountRollups?.[primaryAddress.toLowerCase()] || null;
	}

	return null;
});

// Portfolio breakdown by token across all chains
export const portfolioByToken = derived(walletCacheStore, ($cache) => {
	const { portfolioRollups } = $cache;

	if (portfolioRollups?.grandTotal?.breakdown?.byTokenAddress) {
		return portfolioRollups.grandTotal.breakdown.byTokenAddress;
	}

	return new Map<string, BigNumberish>();
});

// View-specific portfolio value
export const portfolioForView = derived(walletCacheStore, ($cache) => {
	// This returns a function that can be called with a view type
	return (viewType: ViewType, context?: RollupContext) => {
		return walletCacheStore.getPortfolioView(viewType, context);
	};
});

// Check if cache exists for current selection
export const hasCacheForCurrent = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
	return !!chainAccountCache[activeChainId]?.[activeAccountAddress];
});

// Last update times
export const lastUpdateTimes = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
	const accountCache = chainAccountCache[activeChainId]?.[activeAccountAddress];

	return {
		tokens: accountCache?.lastTokenRefresh || null,
		prices: accountCache?.lastPriceUpdate || null,
		transactions: accountCache?.lastTransactionRefresh || null,
		portfolio: accountCache?.portfolio.lastCalculated || null
	};
});

// Derived store for loading state
export const isInitializing = derived(walletCacheStore, ($cache) => $cache.isInitializing);

export const hasEverLoaded = derived(walletCacheStore, ($cache) => $cache.hasEverLoaded);

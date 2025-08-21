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
import { AccountTypeCategory } from '$lib/common/types';
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
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import * as ethers from 'ethers';
import { EthereumBigNumber } from '$lib/common/bignumber-ethereum';
import { PortfolioRollupService } from '$lib/services/portfolio-rollup.service';
import { toSmallestUnit, DEFAULT_CURRENCY } from '$lib/config/currencies';
import { compareWalletCacheData, hasChanged, compareTokenData } from '$lib/utils/deepCompare';

// Cache version for migrations
const CACHE_VERSION = VERSION;
const CACHE_KEY = 'yakklWalletCache';

console.log('[WalletCache] WalletCacheStore loaded');

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
		breakdown: { byTokenAddress: {} },
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

// Utility to convert date strings back to Date objects and restore BigInt values
function hydrateDates(obj: any): any {
  try {
    if (obj instanceof Date) return obj;
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return new Date(obj);
    }
    // Handle BigInt restoration for value fields
    if (typeof obj === 'string' && obj.endsWith('n')) {
      try {
        return BigInt(obj.slice(0, -1));
      } catch {
        return obj;
      }
    }
    if (Array.isArray(obj)) {
      return obj.map(hydrateDates);
    }
    if (obj && typeof obj === 'object') {
      const hydrated: any = {};
      for (const key in obj) {
        // Special handling for known BigInt fields
        if (key === 'value' || key === 'totalValue') {
          const val = obj[key];
          if (typeof val === 'string' && /^\d+$/.test(val)) {
            hydrated[key] = BigInt(val);
          } else if (typeof val === 'number') {
            hydrated[key] = BigInt(val);
          } else {
            hydrated[key] = hydrateDates(val);
          }
        } else {
          hydrated[key] = hydrateDates(obj[key]);
        }
      }
      return hydrated;
    }
    return obj;
  } catch (error) {
    console.log('[WalletCache] Failed to hydrate dates:', error);
    return obj;
  }
}

// Utility to serialize dates to ISO strings and BigInt values for storage
function serializeDates(obj: any): any {
  try {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    // Handle BigInt serialization
    if (typeof obj === 'bigint') {
      return obj.toString();
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
  } catch (error) {
    console.log('[WalletCache] Failed to serialize dates:', error);
    return obj;
  }
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

	// Debounced save to prevent excessive writes with improved performance
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
	}, 250); // CRITICAL FIX: Reduced debounce time for better UI responsiveness

	// Load from storage on initialization
	async function loadFromStorage() {
		if (!isBrowser) return;

		try {
			const cached = await getObjectFromStorage<WalletCacheController>(CACHE_KEY);

			// Check if cache exists and has data
			if (cached) {
				// Cache exists, just load it
				const hydrated = hydrateDates(cached);

				// CRITICAL DEBUG: Log what we loaded from storage
				console.log('[WalletCache] CRITICAL - Loaded from storage:', {
					hasCache: !!hydrated,
					activeAccount: hydrated.activeAccountAddress,
					activeChain: hydrated.activeChainId,
					chainCount: Object.keys(hydrated.chainAccountCache || {}).length,
					context: isBackgroundContext ? 'background' : 'client'
				});

				// Debug: Check specific token data
				if (hydrated.activeAccountAddress && hydrated.activeChainId) {
					const accountCache = hydrated.chainAccountCache?.[hydrated.activeChainId]?.[hydrated.activeAccountAddress];
					if (accountCache) {
						console.log('[WalletCache] CRITICAL - Active account cache:', {
							tokenCount: accountCache.tokens?.length || 0,
							portfolioValue: accountCache.portfolio?.totalValue?.toString(),
							firstThreeTokens: accountCache.tokens?.slice(0, 3).map(t => ({
								symbol: t.symbol,
								balance: t.balance,
								balanceType: typeof t.balance,
								price: t.price,
								value: t.value?.toString()
							}))
						});
					} else {
						console.log('[WalletCache] CRITICAL - No cache found for active account');
					}
				}

				set(hydrated);
				log.info(`[WalletCache] Loaded from ${isBackgroundContext ? 'background' : 'client'} storage`, false);

				// CRITICAL FIX: Check if we have token data but missing rollups and force recalculation
				const hasTokenData = Object.values(hydrated.chainAccountCache).some(chainData =>
					Object.values(chainData).some(accountCache => accountCache.tokens?.length > 0)
				);

				const hasValidRollups = hydrated.portfolioRollups?.grandTotal?.totalValue !== undefined;

				if (hasTokenData && !hasValidRollups) {
					log.info('[WalletCache] Token data found but rollups missing - will trigger calculation after initialization', false);
				}
			} else {
				// No cache exists, create new one
				log.info('[WalletCache] Initializing with new enhanced cache structure', false);
        console.log('[WalletCache] Initializing with new enhanced cache structure');
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
        console.log('[WalletCache] Synced active chain from storage:', currentlySelected.shortcuts.chainId);
			}
		} catch (error) {
			log.warn('[WalletCache] Failed to load:', false, error);
      console.log('[WalletCache] Failed to load:', error);
		}
	}

	// Initialize
	if (isBrowser) {
		loadFromStorage();
	}

	// Auto-save on changes - save in both browser and background contexts
	subscribe((state) => {
		// Save regardless of context - both browser and background need to persist
		saveToStorage(state);
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

			// CRITICAL FIX: Force rollup calculations after initialization
			// This ensures UI shows portfolio values immediately on load
			const currentState = get({ subscribe });
			const hasTokenData = Object.values(currentState.chainAccountCache).some(chainData =>
				Object.values(chainData).some(accountCache => accountCache.tokens?.length > 0)
			);

			if (hasTokenData) {
				log.info('[WalletCache] Token data found during initialization - calculating rollups', false);
				// Use setTimeout to avoid blocking initialization
				setTimeout(async () => {
					await this.calculateAllRollups();
					// Force recalculation of all portfolio values from token data
					await this.recalculateAllPortfolios();
					log.info('[WalletCache] Initialization rollups and portfolio recalculation completed', false);
				}, 50);
			} else {
				log.info('[WalletCache] No token data found during initialization', false, {
					chainAccountCache: Object.keys(currentState.chainAccountCache),
					activeAccount: currentState.activeAccountAddress,
					activeChain: currentState.activeChainId
				});
			}
		},

		// Update cache from storage (called by storage sync service)
		async updateFromStorage(newCache: WalletCacheController) {
			// Validate the new cache has data
			if (!newCache || typeof newCache !== 'object') {
				log.warn('[WalletCache] Invalid cache data from storage');
				return;
			}

			// Get current cache to compare
			const currentCache = get({ subscribe });

			// CRITICAL FIX: Only update if data has actually changed
			if (!compareWalletCacheData(currentCache, newCache)) {
				log.debug('[WalletCache] No changes detected in storage update, skipping reactive update');
				return;
			}

			// Update the store with the new cache data
			update((currentCache) => {
				// Preserve initialization flags from current state
				const updatedCache = {
					...newCache,
					isInitializing: currentCache.isInitializing,
					hasEverLoaded: currentCache.hasEverLoaded || true
				};

				// Hydrate dates
				const hydrated = hydrateDates(updatedCache);

				log.debug('[WalletCache] Updated from storage change - data actually changed', false, {
					activeAccount: hydrated.activeAccountAddress,
					activeChain: hydrated.activeChainId,
					hasRollups: !!hydrated.portfolioRollups?.grandTotal
				});

				return hydrated;
			});
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

				// IMPORTANT: Enhanced protection against data loss from incomplete updates
				const isCompletelyEmpty = tokens.length === 0 ||
					tokens.every(token => !token.address && !token.symbol && !token.name);

				// Check if we have existing tokens with value or balance
				const hasExistingValue = accountCache.tokens.some(t => {
					const value = BigNumber.toBigInt(t.value || 0) || 0n;
					const balance = BigNumber.toBigInt(t.balance || 0) || 0n;
					return value > 0n || balance > 0n;
				});

				// Check if portfolio has value
				const portfolioValue = BigNumber.toBigInt(accountCache.portfolio.totalValue || 0) || 0n;
				const hasPortfolioValue = portfolioValue > 0n;

				// Check if all new tokens have zero balance AND value (suspicious)
				const allNewTokensZero = tokens.length > 0 && tokens.every(t => {
					const balance = BigNumber.toBigInt(t.balance || 0) || 0n;
					const value = BigNumber.toBigInt(t.value || 0) || 0n;
					return balance === 0n && value === 0n;
				});

				// Track the update source for debugging
				const stackTrace = new Error().stack?.split('\n').slice(2, 4).join(' <- ');
				log.info('[WalletCache] Token update check:', false, {
					hasExistingValue,
					hasPortfolioValue,
					existingTokenCount: accountCache.tokens.length,
					incomingTokenCount: tokens.length,
					allNewTokensZero,
					caller: stackTrace
				});

				if (isCompletelyEmpty && accountCache.tokens.length > 0) {
					log.error(
						'[WalletCache] BLOCKING empty token update - would lose existing data',
						false,
						{ existingCount: accountCache.tokens.length }
					);
					return cache;
				}

				// Enhanced protection: Prevent clearing existing data when getting all zeros
				if ((hasExistingValue || hasPortfolioValue) && allNewTokensZero) {
					log.error(
						'[WalletCache] BLOCKING all-zero update - preserving existing values',
						false,
						{
							existingPortfolioValue: accountCache.portfolio.totalValue.toString(),
							existingTokensWithValue: accountCache.tokens.filter(t => {
								const val = BigNumber.toBigInt(t.value || 0) || 0n;
								return val > 0n;
							}).map(t => ({ symbol: t.symbol, value: t.value, balance: t.balance })),
							newTokens: tokens.slice(0, 3).map(t => ({ symbol: t.symbol, balance: t.balance, value: t.value })),
							address: normalizedAddress,
							source: stackTrace
						}
					);
					return cache;
				}

				// CRITICAL FIX: Check if token data has actually changed to prevent unnecessary updates
				const hasTokenDataChanged = compareTokenData(accountCache.tokens, tokens);
				if (!hasTokenDataChanged) {
					log.debug(
						`[WalletCache] Token data unchanged for ${normalizedAddress} on chain ${chainId}, skipping update`,
						false
					);
					return cache;
				}

				// Always update if we have any token data - even with 0 balances
				// Token metadata, prices, and the existence of tokens is valuable information
				log.info(
					`[WalletCache] Updating tokens for ${normalizedAddress} on chain ${chainId} - data changed`,
					false,
					{ tokenCount: tokens.length }
				);

				// Create a map of existing tokens for quick lookup
				const existingTokenMap = new Map(
					accountCache.tokens.map(t => [t.address.toLowerCase(), t])
				);

				// SIMPLIFIED value calculation helper - ALWAYS calculate when we have balance AND price
				const calculateTokenValue = (balance: string | undefined, price: number | undefined, decimals: number = 18): bigint => {
					if (!balance || balance === '0' || !price || price === 0) {
						return 0n;
					}

					console.log('[WalletCache] Calculating token value: ========================================>>>>>', { balance, price, decimals });

					try {
						let balanceInEth: string;

						// Simple detection: decimal point = human readable, no decimal + >10 digits = wei
						if (balance.includes('.')) {
							// Already in human readable format (e.g., "0.125" ETH)
							balanceInEth = balance;
						} else if (balance.length > 10) {
							// Likely wei format (e.g., "125000000000000000"), convert to ETH
							const balanceWei = BigInt(balance);
							balanceInEth = ethers.utils.formatUnits(balanceWei, decimals);
						} else {
							// Small whole number, treat as human readable
							balanceInEth = balance;
						}

						console.log('[WalletCache] Calculating token value balanceInEth: ========================================>>>>>', { balanceInEth, price });
						
						// EthereumBigNumber.toFiat expects balance in ETH (not wei!)
						// It will multiply the ETH amount by the price
						const fiatValue = parseFloat(balanceInEth) * price;
						
						console.log('[WalletCache] Calculating token value fiat: ========================================>>>>>', { fiatValue });
						
						// Convert to cents (multiply by 100) and store as BigInt
						const valueInCents = Math.round(fiatValue * 100);
						const value = BigInt(valueInCents);
						
						console.log('[WalletCache] Calculating token value value: ========================================>>>>>', { value });
						return value;
					} catch (error) {
						console.warn(`[WalletCache] Failed to calculate value:`, { balance, price, error });
						return 0n;
					}
				};

				// SIMPLIFIED token validation - focus on ALWAYS calculating value
				const validatedTokens = tokens.map((token) => {
					const existingToken = existingTokenMap.get(token.address.toLowerCase());

					// Get balance - prefer new, fallback to existing
					let balance = token.balance;
					if (!balance && existingToken?.balance) {
						balance = existingToken.balance;
					}
					balance = balance || '0';

					// Get price - prefer new, fallback to existing
					let price = token.price;
					if ((price === undefined || price === null || price === 0) && existingToken?.price) {
						price = existingToken.price;
					}
					price = price || 0;

					// ALWAYS recalculate value when we have both balance AND price
					const value = calculateTokenValue(balance, price, token.decimals || 18);

					// Log value calculation for debugging
					console.log(`[WalletCache] Token ${token.symbol} value calc:`, {
						balance,
						price,
						value: value.toString(),
						hasValue: value > 0n
					})

					return {
						...token,
						balance,
						price,
						value
					};
				});

				// CRITICAL DEBUG: Enhanced logging to trace token storage
				console.log('[WalletCache] CRITICAL - Storing validated tokens:', {
					chainId,
					address,
					tokenCount: validatedTokens.length,
					tokens: validatedTokens.map(t => ({
						symbol: t.symbol,
						balance: t.balance,
						balanceType: typeof t.balance,
						price: t.price,
						value: t.value?.toString() || '0',
						hasBalance: !!t.balance && t.balance !== '0'
					}))
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

				// Trigger rollup update for this account immediately
				// CRITICAL FIX: Don't use setTimeout - execute immediately for UI responsiveness
				this.updateAccountRollup(normalizedAddress);

				// Also update legacy portfolio value for backward compatibility
				this.recalculatePortfolioFromTokens(chainId, normalizedAddress);

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
						// Balance is stored as formatted string, need to convert to wei
						let balanceWei: bigint;
						if (typeof token.balance === 'string' && token.balance.includes('.')) {
							// Balance is formatted (e.g., "0.0125" ETH), convert to wei
							const decimals = token.decimals || 18;
							balanceWei = ethers.utils.parseUnits(token.balance, decimals).toBigInt();
						} else {
							// Balance might already be in wei or another format
							balanceWei = BigNumber.toBigInt(token.balance) || 0n;
						}
						updated = true;
						const fiatValue = EthereumBigNumber.toFiat(balanceWei, price);
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
					// ALWAYS recalculate portfolio when native token price changes
					// This prevents the $0.00 flickering issue
					accountCache.portfolio = {
						totalValue: accountCache.tokens.reduce((sum, token) => {
							const tokenValue = BigNumber.toBigInt(token.value || 0n) || 0n;
							return BigNumber.toBigInt(sum) + tokenValue;
						}, 0n),
						lastCalculated: new Date(),
						tokenCount: accountCache.tokens.length
					};

					accountCache.lastPriceUpdate = new Date();
					log.info(
						'[WalletCache] Updated native token price and recalculated portfolio',
						false,
						{ chainId, address, price, newTotal: accountCache.portfolio.totalValue.toString() }
					);

					// Trigger rollup update after native price change immediately
					// CRITICAL FIX: Execute immediately for UI responsiveness
					this.updateAccountRollup(normalizedAddress);

					// Also recalculate portfolio from fresh token data
					this.recalculatePortfolioFromTokens(chainId, normalizedAddress);
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

					// Check if we have existing value before update
					const portfolioValue = BigNumber.toBigInt(accountCache.portfolio.totalValue || 0) || 0n;
					const hadValue = portfolioValue > 0n;

					accountCache.tokens = accountCache.tokens.map((token) => {
						const tokenKey = token.address.toLowerCase();
						const newPrice = priceMap.get(tokenKey);

						if (newPrice !== undefined && newPrice > 0) {
							// Balance is stored as formatted string, need to convert to wei
							let balanceWei: bigint;
							if (typeof token.balance === 'string' && token.balance.includes('.')) {
								// Balance is formatted (e.g., "0.0125" ETH), convert to wei
								const decimals = token.decimals || 18;
								balanceWei = ethers.utils.parseUnits(token.balance, decimals).toBigInt();
							} else {
								// Balance might already be in wei or another format
								balanceWei = BigNumber.toBigInt(token.balance) || 0n;
							}
							// Use precision-safe calculation for value
							const fiatValue = EthereumBigNumber.toFiat(balanceWei, newPrice);
							// Store as smallest unit for the currency
							let value = toSmallestUnit(fiatValue, DEFAULT_CURRENCY);

							return {
								...token,
								price: newPrice,
								priceLastUpdated: new Date(),
								value: value
							};
						} else if (newPrice === 0 && token.price && token.price > 0) {
							// PROTECTION: Don't update to zero price if we had a valid price
							log.warn(
								`[WalletCache] Ignoring zero price update for ${token.symbol}, keeping ${token.price}`,
								false
							);
						}

						return token;
					});

					// Recalculate portfolio - but protect against losing value
					const newTotalValue = accountCache.tokens.reduce((sum, token) => {
						const tokenValue = BigNumber.toBigInt(token.value || 0n) || 0n;
						return BigNumber.toBigInt(sum) + tokenValue;
					}, 0n);

					// PROTECTION: Don't update to zero if we had value before
					if (hadValue && newTotalValue === 0n) {
						log.error(
							'[WalletCache] Price update would zero portfolio - SKIPPING recalculation',
							false,
							{
								address,
								oldValue: accountCache.portfolio.totalValue.toString(),
								tokenCount: accountCache.tokens.length
							}
						);
						// Keep existing portfolio value
					} else {
						accountCache.portfolio = {
							totalValue: newTotalValue,
							lastCalculated: new Date(),
							tokenCount: accountCache.tokens.length
						};
					}

					accountCache.lastPriceUpdate = new Date();
				});

				// Trigger chain rollup update after price updates immediately
				// CRITICAL FIX: Execute immediately for UI responsiveness
				this.updateChainRollup(chainId);

				// Also recalculate portfolio values from token data
				Object.keys(chainCache).forEach((address) => {
					this.recalculatePortfolioFromTokens(chainId, address);
				});

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

				// CRITICAL DEBUG: Log transaction update attempt
				console.log('[WalletCache] updateTransactions called:', {
					chainId,
					address: normalizedAddress,
					newTransactionsCount: transactions.length,
					lastBlock,
					firstNewTx: transactions[0] ? {
						hash: transactions[0].hash,
						value: transactions[0].value,
						timestamp: transactions[0].timestamp
					} : null
				});

				if (!newCache.chainAccountCache[chainId]?.[normalizedAddress]) {
					console.warn(`[WalletCache] No cache for ${normalizedAddress} on chain ${chainId} - creating new cache`);
					// Create the cache structure if it doesn't exist
					if (!newCache.chainAccountCache[chainId]) {
						newCache.chainAccountCache[chainId] = {};
					}
					// Create a minimal account object for the cache
					const minimalAccount: YakklAccount = {
						id: normalizedAddress, // Use address as ID for minimal account
						persona: '',
						index: 0,
						blockchain: 'Ethereum',
						smartContract: false,
						address: normalizedAddress,
						alias: '',
						accountType: AccountTypeCategory.PRIMARY,
						name: '',
						description: '',
						primaryAccount: null, // null for primary accounts
						data: {} as any, // Minimal data placeholder
						isActive: true,
						connectedDomains: [],
						includeInPortfolio: true,
						version: '1.0.0',
						createDate: new Date().toISOString(),
						updateDate: new Date().toISOString()
					};
					newCache.chainAccountCache[chainId][normalizedAddress] = getDefaultAccountCache(minimalAccount, chainId);
				}

				const accountCache = newCache.chainAccountCache[chainId][normalizedAddress];

				// CRITICAL: Enhanced protection for transaction persistence
				const hasExistingTransactions = accountCache.transactions.transactions.length > 0;
				const isEmptyUpdate = transactions.length === 0;

				// Track update source for debugging
				const stackTrace = new Error().stack?.split('\n').slice(2, 4).join(' <- ');

				if (isEmptyUpdate && hasExistingTransactions) {
					log.error(
						'[WalletCache] BLOCKING empty transaction update - preserving existing transactions',
						false,
						{
							existingCount: accountCache.transactions.transactions.length,
							firstThreeTxs: accountCache.transactions.transactions.slice(0, 3).map(tx => ({
								hash: tx.hash.substring(0, 10) + '...',
								to: tx.to,
								value: tx.value
							})),
							chainId,
							address: normalizedAddress,
							source: stackTrace
						}
					);
					// Still update the lastBlock if it's newer
					if (lastBlock > accountCache.transactions.lastBlock) {
						accountCache.transactions.lastBlock = lastBlock;
						accountCache.lastTransactionRefresh = new Date();
					}
					return newCache;
				}

				// If we have new transactions, merge them properly
				if (transactions.length > 0) {
					// Create a map of all transactions by hash for deduplication
					const txMap = new Map<string, TransactionDisplay>();

					// Add existing transactions first
					accountCache.transactions.transactions.forEach(tx => {
						txMap.set(tx.hash, tx);
					});

					// Add/update with new transactions (newer data wins)
					transactions.forEach(tx => {
						txMap.set(tx.hash, tx);
					});

					// Convert back to array and sort
					const mergedTransactions = Array.from(txMap.values()).sort(
						(a, b) => b.timestamp - a.timestamp
					);

					accountCache.transactions = {
						transactions: mergedTransactions,
						lastBlock: Math.max(accountCache.transactions.lastBlock, lastBlock),
						hasMore: accountCache.transactions.hasMore !== false, // Preserve hasMore unless explicitly false
						total: mergedTransactions.length
					};

					// CRITICAL DEBUG: Log detailed transaction storage
					console.log('[WalletCache] Stored transactions in cache:', {
						chainId,
						address: normalizedAddress,
						storedCount: mergedTransactions.length,
						firstStoredTx: mergedTransactions[0] ? {
							hash: mergedTransactions[0].hash,
							value: mergedTransactions[0].value,
							timestamp: mergedTransactions[0].timestamp,
							from: mergedTransactions[0].from,
							to: mergedTransactions[0].to
						} : null,
						cacheLocation: `chainAccountCache[${chainId}][${normalizedAddress}].transactions`
					});

					log.info(
						`[WalletCache] Updated transactions for ${normalizedAddress}`,
						false,
						{ previous: accountCache.transactions.transactions.length, new: transactions.length, merged: mergedTransactions.length }
					);
				}

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

		/**
		 * SIMPLE: Recalculate all token values for all accounts
		 * Call this after price updates or balance changes
		 */
		async recalculateAllTokenValues() {
			update((cache) => {
				const newCache = { ...cache };

				// Simple helper to calculate value - use ETH not wei!
				const calcValue = (balance: string, price: number, decimals: number = 18): bigint => {
					if (!balance || balance === '0' || !price || price === 0) return 0n;

					try {
						let balanceInEth: string;
						
						if (balance.includes('.')) {
							// Already in ETH/token format
							balanceInEth = balance;
						} else if (balance.length > 10) {
							// Wei format, convert to ETH
							const balanceWei = BigInt(balance);
							balanceInEth = ethers.utils.formatUnits(balanceWei, decimals);
						} else {
							// Small whole number
							balanceInEth = balance;
						}

						// Simple multiplication: balance (in ETH/tokens) * price = USD value
						const fiatValue = parseFloat(balanceInEth) * price;
						// Convert to cents
						const valueInCents = Math.round(fiatValue * 100);
						return BigInt(valueInCents);
					} catch {
						return 0n;
					}
				};

				// Iterate through all accounts and tokens
				let totalRecalculated = 0;
				for (const [chainId, accounts] of Object.entries(newCache.chainAccountCache)) {
					for (const [address, accountCache] of Object.entries(accounts)) {
						for (const token of accountCache.tokens) {
							// ALWAYS recalculate if we have balance AND price
							if (token.balance && token.balance !== '0' && token.price && token.price > 0) {
								const newValue = calcValue(token.balance, token.price, token.decimals || 18);
								if (newValue !== token.value) {
									console.log(`[WalletCache] Recalculated ${token.symbol} value: ${token.value} -> ${newValue}`);
									token.value = newValue;
									totalRecalculated++;
								}
							}
						}

						// Recalculate portfolio total for this account
						accountCache.portfolio.totalValue = accountCache.tokens.reduce((sum, token) => {
							const newSum = sum + (BigNumberishUtils.toBigInt(token.value) || 0n);
              console.log('[WalletCache] Recalculated portfolio total: ========================================>>>>>', { sum, tokenValue: BigNumberishUtils.toBigInt(token.value), newSum, tokenValueStr: token.value.toString() });
              return newSum;
						}, 0n);
					}
				}

				console.log(`[WalletCache] Recalculated values for ${totalRecalculated} tokens - newCache.portfolio.totalValue: ========================================>>>>>`, { newCache: newCache });
				return newCache;
			});
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
						Array.from(new Set(newCache.accountMetadata.watchListAccounts)),
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
						Array.from(new Set(newCache.accountMetadata.watchListAccounts)),
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
			// Get the full cache state
			const cache = get({ subscribe });
			return rollupService.getRollupForView(viewType, state, cache);
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
						Array.from(new Set(newCache.accountMetadata.watchListAccounts)),
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
		},

		/**
		 * Recalculate portfolio value from tokens for a specific account/chain
		 * This ensures the portfolio.totalValue matches the sum of token values
		 */
		recalculatePortfolioFromTokens(chainId: number, address: string) {
			update((cache) => {
				const newCache = { ...cache };
				const normalizedAddress = address.toLowerCase();
				const accountCache = newCache.chainAccountCache[chainId]?.[normalizedAddress];

				if (!accountCache) return newCache;

				// Recalculate portfolio total from current token values
				const newTotalValue = accountCache.tokens.reduce((sum, token) => {
					const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
					return BigNumber.toBigInt(sum) + tokenValue;
				}, 0n);

				// Update portfolio with fresh calculation
				accountCache.portfolio = {
					totalValue: newTotalValue,
					lastCalculated: new Date(),
					tokenCount: accountCache.tokens.length
				};

				log.debug(`[WalletCache] Recalculated portfolio for ${normalizedAddress} on chain ${chainId}:`, false, {
					totalValue: newTotalValue.toString(),
					tokenCount: accountCache.tokens.length,
					tokensWithValue: accountCache.tokens.filter(t => BigNumber.toBigInt(t.value || 0) > 0n).length
				});

				return newCache;
			});
		},

		/**
		 * Update cache from Portfolio Data Coordinator
		 * This method is called by the coordinator to apply validated updates
		 */
		async updateFromCoordinator(data: Partial<WalletCacheController>) {
			update((cache) => {
				const newCache = { ...cache, ...data };

				// Ensure dates are properly hydrated
				const hydrated = hydrateDates(newCache);

				log.debug('[WalletCache] Updated from coordinator', false, {
					hasRollups: !!hydrated.portfolioRollups?.grandTotal,
					grandTotal: hydrated.portfolioRollups?.grandTotal?.totalValue?.toString()
				});

				return hydrated;
			});
		},

		/**
		 * Recalculate rollups after price updates
		 * More efficient than full portfolio recalculation
		 */
		async recalculateRollupsFromPrices() {
			update((cache) => {
				const newCache = { ...cache };
				const rollupService = PortfolioRollupService.getInstance();

				// Only recalculate value rollups, not token counts or balances
				if (newCache.portfolioRollups) {
					// Recalculate grand total
					newCache.portfolioRollups.grandTotal = rollupService.calculateGrandTotal(newCache);

					// Update per-account rollups
					for (const address of Object.keys(newCache.portfolioRollups.byAccount)) {
						newCache.portfolioRollups.byAccount[address] = rollupService.calculateAccountRollup(address, newCache);
					}

					// Update per-chain rollups
					for (const chainId of Object.keys(newCache.portfolioRollups.byChain)) {
						newCache.portfolioRollups.byChain[Number(chainId)] = rollupService.calculateChainRollup(Number(chainId), newCache);
					}

					// Update timestamp
					newCache.portfolioRollups.lastCalculated = new Date();

					// Update legacy portfolio field
					newCache.portfolio = {
						totalValue: newCache.portfolioRollups.grandTotal.totalValue,
						lastCalculated: newCache.portfolioRollups.lastCalculated,
						tokenCount: newCache.portfolioRollups.grandTotal.tokenCount
					};
				}

				log.debug('[WalletCache] Rollups recalculated from prices', false);

				return newCache;
			});
		},

		/**
		 * Recalculate portfolios after balance updates
		 */
		async recalculatePortfoliosFromBalances() {
			// For balance updates, we need to recalculate token values first
			update((cache) => {
				const newCache = { ...cache };

				// Update portfolio values for all accounts
				for (const [chainId, chainData] of Object.entries(newCache.chainAccountCache)) {
					for (const [address, accountCache] of Object.entries(chainData)) {
						// Recalculate portfolio total
						accountCache.portfolio = {
							totalValue: accountCache.tokens.reduce((sum, token) => {
								const tokenValue = BigNumber.toBigInt(token.value || 0n) || 0n;
								return BigNumber.toBigInt(sum) + tokenValue;
							}, 0n),
							lastCalculated: new Date(),
							tokenCount: accountCache.tokens.length
						};
					}
				}

				return newCache;
			});

			// Then recalculate all rollups
			await this.calculateAllRollups();
		},

		/**
		 * Update a single transaction from coordinator
		 */
		async updateTransactionFromCoordinator(transactionData: any) {
			update((cache) => {
				const newCache = { ...cache };

				// Find and update the transaction
				const { chainId, address, hash } = transactionData;

				if (newCache.chainAccountCache[chainId]?.[address]?.transactions?.transactions) {
					const transactions = newCache.chainAccountCache[chainId][address].transactions.transactions;
					const index = transactions.findIndex(tx => tx.hash === hash);

					if (index >= 0) {
						transactions[index] = { ...transactions[index], ...transactionData };
					} else {
						// Add new transaction
						transactions.unshift(transactionData);
						// Keep only last 100 transactions
						if (transactions.length > 100) {
							transactions.length = 100;
						}
					}

					// Update last refresh time
					newCache.chainAccountCache[chainId][address].lastTransactionRefresh = new Date();
				}

				log.debug('[WalletCache] Transaction updated from coordinator', false, { hash });

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
	const tokens = chainAccountCache[activeChainId]?.[activeAccountAddress]?.tokens || [];

	// CRITICAL DEBUG: Enhanced logging to trace missing balances
	if (tokens.length > 0) {
		console.log('[WalletCache] currentAccountTokens CRITICAL DEBUG:', {
			activeChainId,
			activeAccountAddress,
			tokenCount: tokens.length,
			tokensDetailed: tokens.map(t => ({
				symbol: t.symbol,
				address: t.address,
				balance: t.balance,
				balanceType: typeof t.balance,
				hasBalance: !!t.balance,
				price: t.price,
				value: t.value,
				valueType: typeof t.value
			}))
		});
	} else {
		console.log('[WalletCache] currentAccountTokens: NO TOKENS FOUND', {
			activeChainId,
			activeAccountAddress,
			hasChainCache: !!chainAccountCache[activeChainId],
			hasAccountCache: !!chainAccountCache[activeChainId]?.[activeAccountAddress]
		});
	}

	return tokens;
});

// Derived store for current account transactions
export const currentAccountTransactions = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, chainAccountCache } = $cache;
	const transactions = chainAccountCache[activeChainId]?.[activeAccountAddress]?.transactions?.transactions || [];

	// Debug logging for transactions
	if (transactions.length > 0) {
		console.log('[WalletCache] currentAccountTransactions:', {
			activeChainId,
			activeAccountAddress,
			transactionCount: transactions.length,
			firstTx: transactions[0] ? {
				hash: transactions[0].hash,
				value: transactions[0].value,
				timestamp: transactions[0].timestamp
			} : null
		});
	}

	return transactions;
});

// Derived store for ALL transactions organized by network and account
export const allTransactionsByNetworkAndAccount = derived(walletCacheStore, ($cache) => {
	const { chainAccountCache } = $cache;
	const result: Record<number, Record<string, TransactionDisplay[]>> = {};

  console.log('[WalletCache] allTransactionsByNetworkAndAccount: ========================================>>>>>', { chainAccountCache });

	// Organize transactions by chainId and account address
	for (const [chainId, accounts] of Object.entries(chainAccountCache)) {
		const chainIdNum = Number(chainId);
		if (!result[chainIdNum]) {
			result[chainIdNum] = {};
		}

		for (const [address, accountCache] of Object.entries(accounts)) {
			const transactions = accountCache.transactions?.transactions || [];
			if (transactions.length > 0) {
				result[chainIdNum][address] = transactions;
				console.log(`[WalletCache] Found ${transactions.length} transactions for ${address} on chain ${chainIdNum}`);
			}
		}
	}

  console.log('[WalletCache] allTransactionsByNetworkAndAccount: ========================================>>>>>', { result });
	return result;
});

// Track last known good values to prevent flickering
let lastKnownPortfolioValue: bigint = 0n;
let lastKnownAccount: string | null = null;

// Enhanced: Use rollup data if available, fallback to direct calculation
export const currentPortfolioValue = derived(walletCacheStore, ($cache) => {
	const { activeChainId, activeAccountAddress, portfolioRollups, chainAccountCache } = $cache;

	// Validate inputs first
	if (!activeChainId || !activeAccountAddress) {
		console.log('currentPortfolioValue: Missing activeChainId or activeAccountAddress, using last known:', lastKnownPortfolioValue, {
			activeChainId,
			activeAccountAddress
		});
		return lastKnownPortfolioValue;  // Return last known instead of 0
	}

	// Reset if account changed
	if (lastKnownAccount && lastKnownAccount !== activeAccountAddress) {
		lastKnownPortfolioValue = 0n;
	}
	lastKnownAccount = activeAccountAddress;

	// Try to get from rollup first (faster) with better error handling
	if (portfolioRollups && portfolioRollups.byAccountChain) {
		const key = `${activeAccountAddress.toLowerCase()}_${activeChainId}`;
		const rollup = portfolioRollups.byAccountChain[key];
		const availableKeys = Object.keys(portfolioRollups.byAccountChain);

		console.log('currentPortfolioValue: Checking rollup data', {
			key,
			availableKeys,
			hasRollup: !!rollup,
			rollupValue: rollup?.totalValue?.toString()
		});

		if (rollup && rollup.totalValue !== undefined && rollup.totalValue !== null) {
			const value = BigNumber.toBigInt(rollup.totalValue) || 0n;
			// Update last known value if we have a real value
			if (value > 0n) {
				lastKnownPortfolioValue = value;
			}
			console.log('currentPortfolioValue from rollup (cents) >>>>>>>>>>', value, '→ dollars:', Number(value) / 100, 'key:', key);
			return value > 0n ? value : lastKnownPortfolioValue;
		} else {
			console.log('currentPortfolioValue: Rollup found but no totalValue', { key, rollup, availableKeys });
		}
	} else {
		console.log('currentPortfolioValue: No portfolioRollups available', {
			hasPortfolioRollups: !!portfolioRollups,
			hasbyAccountChain: !!portfolioRollups?.byAccountChain
		});
	}

	// Fallback to direct calculation with better error handling
	const accountCache = chainAccountCache[activeChainId]?.[activeAccountAddress];
	if (!accountCache) {
		console.log('currentPortfolioValue: No account cache available, using last known', {
			activeChainId,
			activeAccountAddress,
			lastKnown: lastKnownPortfolioValue,
			availableChains: Object.keys(chainAccountCache)
		});
		return lastKnownPortfolioValue;  // Return last known instead of 0
	}

	// CRITICAL: Calculate fresh value from token data, don't rely on cached portfolio value
	let freshValue = 0n;
	if (accountCache.tokens && accountCache.tokens.length > 0) {
		freshValue = accountCache.tokens.reduce((sum, token) => {
			const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
			return BigNumber.toBigInt(sum) + tokenValue;
		}, 0n);

		console.log('currentPortfolioValue: Calculated fresh value from tokens', {
			freshValue: freshValue.toString(),
			tokenCount: accountCache.tokens.length,
			tokensWithValue: accountCache.tokens.filter(t => BigNumber.toBigInt(t.value || 0) > 0n).length,
			tokens: accountCache.tokens.map(t => ({
				symbol: t.symbol,
				value: BigNumber.toBigInt(t.value || 0).toString(),
				balance: t.balance,
				price: t.price
			}))
		});
	}

	const portfolioTotal = accountCache.portfolio?.totalValue;
	const cachedValue = BigNumber.toBigInt(portfolioTotal || 0) || 0n;

	// Use the fresh calculated value, which should be more accurate
	const value = freshValue > 0n ? freshValue : cachedValue;

	// Update last known value if we have a real value
	if (value > 0n) {
		lastKnownPortfolioValue = value;
	}

	console.log('currentPortfolioValue fallback (cents) >>>>>>>>>>', value, '→ dollars:', Number(value) / 100, {
		activeChainId,
		activeAccountAddress,
		freshValue: freshValue.toString(),
		cachedValue: cachedValue.toString(),
		finalValue: value.toString()
	});

	return value > 0n ? value : lastKnownPortfolioValue;
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

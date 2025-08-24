import type { YakklAccount } from '$lib/common';
import type { Wallet } from '$lib/managers/Wallet';
import { yakklPricingStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import { balanceCacheManager } from '$lib/managers/BalanceCacheManager';
import { log } from '$lib/managers/Logger';

export interface AccountData {
	id?: string;
	persona?: string; // The persona that is associated with the account
	account: YakklAccount;
	quantity: bigint;
	quantityFormatted: string;
	totalValue: number;
	totalValueFormatted: string;
	// Enhanced loading states
	isLoading: boolean;
	lastUpdated: Date | null;
	loadingError: string | null;
	isCached: boolean;
	isStale: boolean; // True if cache is older than 5 minutes
}

export interface CachedBalanceData {
	address: string;
	balance: bigint;
	timestamp: number;
	price: number;
}

// Helper function to determine if an error should be shown to the user
function shouldShowErrorToUser(error: any): boolean {
	const errorMessage = error?.message || error?.toString() || '';

	// Network/API errors that should be handled silently
	const networkErrors = [
		'missing response',
		'timeout',
		'TIMEOUT',
		'SERVER_ERROR',
		'NETWORK_ERROR',
		'Failed to fetch',
		'fetch',
		'Connection failed',
		'Request timeout',
		'eth_getBalance',
		'call revert exception',
		'alchemy.com',
		'infura.io',
		'requestBody',
		'serverError',
		'code=SERVER_ERROR',
		'version=web/',
		'JsonRpcError',
		'RPC Error',
		'getBalance',
		'Balance fetch'
	];

	return !networkErrors.some((pattern) =>
		errorMessage.toLowerCase().includes(pattern.toLowerCase())
	);
}

export async function collectAccountData(
	accounts: YakklAccount[],
	wallet: Wallet
): Promise<AccountData[]> {
	const price = get(yakklPricingStore)?.price ?? 0;
	const currency = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	const accountDataPromises = accounts.map(async (account) => {
		try {
			const quantity = await wallet.getBalance(account.address);
			const quantityFormatted = (Number(quantity) / 1e18).toFixed(6);
			const totalValue = (Number(quantity) / 1e18) * price;
			const totalValueFormatted = currency.format(totalValue);

			return {
				account,
				quantity,
				quantityFormatted,
				totalValue,
				totalValueFormatted,
				isLoading: false,
				lastUpdated: new Date(),
				loadingError: null as string | null,
				isCached: false,
				isStale: false
			};
		} catch (error) {
			// Only log non-network errors, suppress network timeouts
			if (shouldShowErrorToUser(error)) {
				log.error('[collectAccountData] Balance fetch error:', false, error);
			}

			return {
				account,
				quantity: 0n,
				quantityFormatted: '0.000000',
				totalValue: 0,
				totalValueFormatted: currency.format(0),
				isLoading: false,
				lastUpdated: new Date(),
				loadingError: 'Network error',
				isCached: false,
				isStale: false
			};
		}
	});

	return Promise.all(accountDataPromises);
}

/**
 * Enhanced function that provides immediate cached data and progressive updates
 */
export async function collectAccountDataProgressive(
	accounts: YakklAccount[],
	wallet: Wallet,
	onUpdate: (data: AccountData[]) => void
): Promise<AccountData[]> {
	const price = get(yakklPricingStore)?.price ?? 0;
	const currency = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	// Step 1: Create initial data array with cached balances or loading states
	const initialData: AccountData[] = await Promise.all(accounts.map(async (account) => {
		const cached = await balanceCacheManager.getCachedBalance(account.address);

		if (cached) {
			const quantityFormatted = (Number(cached.balance) / 1e18).toFixed(6);
			const totalValue = (Number(cached.balance) / 1e18) * price;
			const totalValueFormatted = currency.format(totalValue);
			const isStale = balanceCacheManager.isStale(account.address);

			return {
				account,
				quantity: cached.balance,
				quantityFormatted,
				totalValue,
				totalValueFormatted,
				isLoading: false, // Don't show skeleton when we have cached data
				lastUpdated: new Date(cached.timestamp),
				loadingError: null as string | null,
				isCached: true,
				isStale
			};
		} else {
			return {
				account,
				quantity: 0n,
				quantityFormatted: '0.000000',
				totalValue: 0,
				totalValueFormatted: currency.format(0),
				isLoading: true,
				lastUpdated: null as Date | null,
				loadingError: null as string | null,
				isCached: false,
				isStale: false
			};
		}
	}));

	// Step 2: Start progressive balance loading with timeout (only if cached data is old)
	const loadingPromises = initialData.map(async (accountData, index) => {
		// Only fetch if we have no cache or cache is very stale (> 10 minutes)
		const veryStale =
			accountData.lastUpdated && Date.now() - accountData.lastUpdated.getTime() > 10 * 60 * 1000;

		if (!veryStale && accountData.isCached) {
			return; // Skip if we have reasonably fresh cached data
		}

		try {
			// Set loading state for very background updates only
			if (!accountData.isCached) {
				accountData.isLoading = true;
				onUpdate([...initialData]);
			}

			// Race between balance fetch and timeout
			const balancePromise = wallet.getBalance(accountData.account.address);
			const timeoutPromise = new Promise<bigint>((_, reject) => {
				setTimeout(() => reject(new Error('Balance fetch timeout')), 8000);
			});

			const quantity = await Promise.race([balancePromise, timeoutPromise]);

			// Update cache
			balanceCacheManager.setCachedBalance(accountData.account.address, quantity, price);

			// Calculate formatted values
			const quantityFormatted = (Number(quantity) / 1e18).toFixed(6);
			const totalValue = (Number(quantity) / 1e18) * price;
			const totalValueFormatted = currency.format(totalValue);

			// Update account data
			initialData[index] = {
				...accountData,
				quantity,
				quantityFormatted,
				totalValue,
				totalValueFormatted,
				isLoading: false,
				lastUpdated: new Date(),
				loadingError: null as string | null,
				isCached: false,
				isStale: false
			};

			// Notify of update
			onUpdate([...initialData]);
		} catch (error) {
			// Only log non-network errors, suppress network timeouts
			if (shouldShowErrorToUser(error)) {
				log.warn(
					`[collectAccountDataProgressive] Failed to load balance for ${accountData.account.address}:`,
					false,
					error
				);
			}

			const errorMessage = error instanceof Error ? error.message : 'Failed to load balance';
			const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT');

			// For timeouts, show cached data if available, otherwise a user-friendly message
			const displayError = isTimeout
				? accountData.isCached
					? null
					: 'Network slow, using cached data'
				: 'Network error';

			// Update with error state
			initialData[index] = {
				...accountData,
				isLoading: false,
				loadingError: displayError
			};

			// Notify of update
			onUpdate([...initialData]);
		}
	});

	// Clean up expired cache entries in the background
	Promise.all(loadingPromises).then(() => {
		balanceCacheManager.cleanupExpired();
	});

	return initialData;
}

/**
 * Create account data with membership restrictions
 */
export function createAccountDataWithRestrictions(
	accounts: YakklAccount[],
	membershipLevel: string,
	maxAccountsForBasic: number = 3
): {
	visibleAccounts: YakklAccount[];
	restrictedAccounts: YakklAccount[];
	isRestricted: boolean;
} {
	const isBasicMember = membershipLevel === 'basic_member';

	if (!isBasicMember || accounts.length <= maxAccountsForBasic) {
		return {
			visibleAccounts: accounts,
			restrictedAccounts: [],
			isRestricted: false
		};
	}

	return {
		visibleAccounts: accounts.slice(0, maxAccountsForBasic),
		restrictedAccounts: accounts.slice(maxAccountsForBasic),
		isRestricted: true
	};
}

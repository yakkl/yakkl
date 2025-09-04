import { writable, get } from 'svelte/store';
import { yakklCombinedTokenStore, setYakklCombinedTokenStorage, getYakklTokenCache, setYakklTokenCacheStorage } from '$lib/common/stores';
import { log } from '$lib/managers/Logger';
import { PriceManager } from '$lib/managers/PriceManager';
import { createPriceUpdater } from './createPriceUpdater';
import { TimerManager } from '$lib/managers/TimerManager';
import type { TokenData } from '$lib/common/interfaces';
import { TIMER_TOKEN_PRICE_CYCLE_TIME } from './constants';
import { balanceCacheManager } from '$lib/managers/BalanceCacheManager';

let priceManager: PriceManager | null = null;
let priceUpdater: { subscribe: any; fetchPrices: (tokens: TokenData[]) => Promise<TokenData[]> } | null = null;

const fetchingActive = writable(false); // Prevents duplicate fetches

// Initialize priceManager and priceUpdater before any usage
async function initializePriceUpdater() {
	if (!priceManager) {
		priceManager = new PriceManager();
		// Initialize the price manager with providers
		try {
			await priceManager.initialize();
		} catch (error) {
			log.error('[tokenPriceManager] Failed to initialize PriceManager:', false, error);
		}
	}
	if (!priceUpdater) {
		priceUpdater = createPriceUpdater(priceManager);
	}
}

// NOTE: May want to pass in priceManager as a parameter to allow for different configurations
export async function updateTokenPrices() {
	// Ensure timer and priceUpdater are initialized before use
	await ensureTimerInitialized();
	
	if (!priceUpdater) {
		await initializePriceUpdater();
	}

	if (get(fetchingActive)) return; // Prevent concurrent fetches
	fetchingActive.set(true);

	try {
		log.info('updateTokenPrices: Starting price update');
		const tokens: TokenData[] = get(yakklCombinedTokenStore); // Ensure we're working with the correct store
		if (tokens.length === 0) {
			log.info('updateTokenPrices: No tokens to update');
			return;
		}

		const updatedTokens: TokenData[] = await priceUpdater!.fetchPrices(tokens);
		if (!updatedTokens || updatedTokens.length === 0) {
			log.warn('updateTokenPrices: Fetched prices returned empty.');
			return;
		}

		// Update the store
		yakklCombinedTokenStore.update(() => updatedTokens);

		// Persist to localStorage
		await setYakklCombinedTokenStorage(updatedTokens);

		// Update token cache with new prices using precise BigNumber arithmetic
		try {
			const cache = await getYakklTokenCache();

			// Update prices in cache using EthereumBigNumber for precision
			const updatedCache = cache.map(entry => {
				const updatedToken = updatedTokens.find(t =>
					t.address === entry.tokenAddress &&
					t.chainId === entry.chainId
				);

				if (updatedToken && updatedToken.price?.price) {
					// CRITICAL FIX: Handle token quantity (wei) and USD price separately
					// entry.quantity is in wei (18 decimals), price is in USD (2 decimals)
					const quantityStr = String(entry.quantity);
					const quantityWei = BigInt(quantityStr);
					const priceUSD = Number(updatedToken.price.price);

					// Calculate value in USD using proper decimal handling
					// Convert wei to ETH, then multiply by USD price
					const ethAmount = Number(quantityWei) / 1e18;
					const valueUSD = ethAmount * priceUSD;

					// Store as cents (bigint) to maintain precision
					const valueCents = BigInt(Math.round(valueUSD * 100));

					return {
						...entry,
						price: updatedToken.price.price,
						value: valueCents,  // Store as cents (bigint)
						lastPriceUpdate: new Date(),
						priceProvider: updatedToken.price.provider || 'unknown'
					};
				}
				return entry;
			});

			// Force update to ensure new prices override old cached values
			await setYakklTokenCacheStorage(updatedCache, true);
			log.info('[tokenPriceManager] Force updated token cache with new prices, entries:', false, updatedCache.length);
		} catch (error) {
			log.error('[tokenPriceManager] Failed to update token cache:', false, error);
		}

		// Update cached balances with new token prices using proper USD handling
		const ethToken = updatedTokens.find((token) => token.isNative && token.symbol === 'ETH');
		if (ethToken && ethToken.price?.price) {
			// CRITICAL FIX: ethToken.price.price is a USD value (e.g., 4381.26), NOT wei!
			// Do NOT use EthereumBigNumber.from() which assumes 18 decimals
			const ethPriceUSD = Number(ethToken.price.price);

			if (ethPriceUSD && ethPriceUSD > 0) {
				// Store price as integer cents to avoid floating-point errors
				const ethPriceCents = Math.round(ethPriceUSD * 100);

				// Update balance cache with the USD price
				balanceCacheManager.updatePriceForAllEntries(ethPriceUSD);
				log.debug('[updateTokenPrices] Updated cached entries with ETH price:', false, {
					newPriceUSD: ethPriceUSD,
					newPriceCents: ethPriceCents,
					ethTokenValue: ethToken.value?.toString()
				});
			}
		}

		log.info('updateTokenPrices: Successfully updated and persisted token prices');
	} catch (error) {
		log.error('updateTokenPrices: Failed to update token prices', false, error);
	} finally {
		fetchingActive.set(false);
	}
}

// Get the TimerManager instance
const timerManager = TimerManager.getInstance();

// Setup price updater timer - defer initialization until first use
let timerInitialized = false;

async function ensureTimerInitialized() {
	if (timerInitialized) return;
	
	if (!timerManager.hasTimer('tokenPriceUpdater')) {
		log.info('Setting up token price updater timer');
		await initializePriceUpdater(); // Use the new initialization function
		// Setup a timer to call `updateTokenPrices()` every 15s
		timerManager.addTimer(
			'tokenPriceUpdater',
			async () => {
				await updateTokenPrices();
			},
			TIMER_TOKEN_PRICE_CYCLE_TIME
		);
	}

	if (!timerManager.isRunning('tokenPriceUpdater')) {
		log.info('Starting token price updater timer');
		timerManager.startTimer('tokenPriceUpdater');
	}
	
	timerInitialized = true;
}

// Export a function to start the price updates
export async function startPriceUpdates() {
	await ensureTimerInitialized();
}

// CRITICAL FIX: Do NOT run updateTokenPrices immediately at module level
// This causes "Cannot access before initialization" errors because stores aren't ready yet
// Instead, the initial update should be triggered after stores are initialized
// This is now handled by components that import this module after initialization
// 
// The previous immediate call was causing:
// ReferenceError: Cannot access 'yakklCombinedTokenStore' before initialization

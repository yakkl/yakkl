import { writable, get } from 'svelte/store';
import { yakklCombinedTokenStore, setYakklCombinedTokenStorage } from '$lib/common/stores';
import { log } from '$lib/managers/Logger';
import { PriceManager } from '$lib/managers/PriceManager';
import { createPriceUpdater } from './createPriceUpdater';
import { TimerManager } from '$lib/managers/TimerManager';
import type { TokenData } from '$lib/common/interfaces';
import { TIMER_TOKEN_PRICE_CYCLE_TIME } from './constants';

let priceManager: PriceManager | null = null;
let priceUpdater: any | null = null;

const fetchingActive = writable(false); // Prevents duplicate fetches

// NOTE: May want to pass in priceManager as a parameter to allow for different configurations
export async function updateTokenPrices() {
	if (get(fetchingActive)) return; // Prevent concurrent fetches
	fetchingActive.set(true);

	try {
		log.info('updateTokenPrices: Starting price update');
		const tokens: TokenData[] = get(yakklCombinedTokenStore); // Ensure we're working with the correct store
		if (tokens.length === 0) {
			log.info('updateTokenPrices: No tokens to update');
			return;
		}

		const updatedTokens: TokenData[] = await priceUpdater.fetchPrices(tokens);
		if (!updatedTokens || updatedTokens.length === 0) {
			log.warn('updateTokenPrices: Fetched prices returned empty.');
			return;
		}

		// Update the store
		yakklCombinedTokenStore.update(() => updatedTokens);

		// Persist to localStorage
		await setYakklCombinedTokenStorage(updatedTokens);
		
		// Update token cache with new prices
		try {
			const { getYakklTokenCache, setYakklTokenCacheStorage } = await import('$lib/common/stores');
			const cache = await getYakklTokenCache();
			
			// Update prices in cache
			const updatedCache = cache.map(entry => {
				const updatedToken = updatedTokens.find(t => 
					t.address === entry.tokenAddress && 
					t.chainId === entry.chainId
				);
				
				if (updatedToken && updatedToken.price?.price) {
					return {
						...entry,
						price: updatedToken.price.price,
						value: entry.quantity * updatedToken.price.price,
						lastPriceUpdate: new Date(),
						priceProvider: updatedToken.price.provider || 'unknown'
					};
				}
				return entry;
			});
			
			await setYakklTokenCacheStorage(updatedCache);
			log.debug('[tokenPriceManager] Updated token cache with new prices');
		} catch (error) {
			log.error('[tokenPriceManager] Failed to update token cache:', false, error);
		}

		// Update cached balances with new token prices
		const { balanceCacheManager } = await import('$lib/managers/BalanceCacheManager');
		const ethToken = updatedTokens.find((token) => token.isNative && token.symbol === 'ETH');
		if (ethToken && ethToken.value && ethToken.value > 0) {
			balanceCacheManager.updatePriceForAllEntries(ethToken.value);
			log.debug('[updateTokenPrices] Updated cached entries with ETH price:', false, {
				newPrice: ethToken.value
			});
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

if (!timerManager.hasTimer('tokenPriceUpdater')) {
	log.info('Setting up token price updater timer');
	if (!priceManager) {
		priceManager = new PriceManager();
	}
	if (!priceUpdater) {
		priceUpdater = createPriceUpdater(priceManager);
	}
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

// Run initial update immediately to populate prices
updateTokenPrices().then(() => {
	log.info('Initial token price update completed');
}).catch(error => {
	log.error('Initial token price update failed:', false, error);
});
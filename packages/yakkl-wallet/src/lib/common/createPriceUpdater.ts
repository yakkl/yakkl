import { writable } from 'svelte/store';
import type { TokenData } from './interfaces';
import type { PriceManager } from '$lib/managers/PriceManager';
import { log } from '$lib/managers/Logger';

// Utility for debouncing
function debounce(func: (...args: any[]) => void, delay: number) {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: any[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
}

export function createPriceUpdater(priceManager: PriceManager) {
	const tokens = writable<TokenData[]>([]);
	const { subscribe, set } = tokens;

	async function fetchPrices(tokensArray: TokenData[]): Promise<TokenData[]> {
		const BATCH_SIZE = 8; // Adjust batch size for performance
		const updatedTokens: TokenData[] = [];

		if (!tokensArray || tokensArray.length === 0) {
			log.error('fetchPrices - No tokens to process. Exiting early.');
			return [];
		}

		for (let i = 0; i < tokensArray.length; i += BATCH_SIZE) {
			const batch = tokensArray.slice(i, i + BATCH_SIZE);

			try {
				const batchResults = await Promise.all(
					batch.map(async (token) => {
						return fetchTokenData(token, priceManager);
					})
				);

				updatedTokens.push(...batchResults);
			} catch (error) {
				log.error('fetchPrices - Error processing batch:', false, batch, false, error);
			}
		}
		return updatedTokens;
	}

	async function fetchTokenData(token: TokenData, priceManager: PriceManager): Promise<TokenData> {
		const pair = `${token.symbol}-USD`;
		try {
			const marketPrice = await priceManager.getMarketPrice(pair);
			const price = marketPrice?.price ?? 0;

			// Balance is already in human-readable format (e.g., "1.5" ETH)
			// Don't divide by decimals again
			const balance = Number(token.balance || 0);
			const value = balance * price;

			// Keep existing change data from token
			const change = token.change || [];
			
			return {
				...token,
				price: {
					price: price,
					provider: marketPrice?.provider ?? '',
					lastUpdated: new Date(),
					isNative: token.isNative || false,
					chainId: token.chainId,
					currency: 'USD',
					status: 200,
					message: ''
				},
				change,
				value,
				formattedValue: new Intl.NumberFormat('en-US', {
					style: 'currency',
					currency: 'USD'
				}).format(value)
			};
		} catch (error) {
			log.error(`fetchTokenData - Failed to fetch price for ${token.symbol}`, false, error);
			return {
				...token,
				price: { 
					price: 0, 
					provider: '', 
					lastUpdated: new Date(),
					isNative: token.isNative || false,
					chainId: token.chainId,
					currency: 'USD',
					status: 0,
					message: error instanceof Error ? error.message : 'Failed to fetch price'
				},
				value: 0
			};
		}
	}

	// Debounced fetch to reduce frequent updates
	const debouncedFetchPrices = debounce(fetchPrices, 5000);

	return { subscribe, fetchPrices };
}

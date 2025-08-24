import type { PriceData, PriceProvider, WeightedProvider } from '$lib/common/interfaces';
import { CoinbasePriceProvider } from './providers/price/coinbase/CoinbasePriceProvider';
import { CoingeckoPriceProvider } from './providers/price/coingecko/CoingeckoPriceProvider';
import { log } from '$lib/managers/Logger';
// import { KrakenPriceProvider } from './providers/price/kraken/KrakenPriceProvider';

// NOTE: Not importing blockchain providers for pricing to avoid API charges
// AlchemyPriceProvider and similar should only be used for blockchain operations

export class PriceManager {
	private weightedProviders: WeightedProvider[];
	private totalWeight: number;
	private readonly DEFAULT_WEIGHT = 1;

	constructor(weightedProviders?: WeightedProvider[]) {
		// Initialize with empty providers, will be set asynchronously
		this.weightedProviders = weightedProviders || [];
		this.totalWeight = this.calculateTotalWeight();
	}

	/**
	 * Initialize the price manager asynchronously
	 */
	async initialize(weightedProviders?: WeightedProvider[]): Promise<void> {
		const providers = weightedProviders || await PriceManager.getDefaultProviders();
		
		if (!providers || providers.length === 0) {
			throw new Error('At least one provider must be specified');
		}

		this.weightedProviders = this.normalizeWeights(providers);
		this.totalWeight = this.calculateTotalWeight();
	}

	static async getDefaultProviders(): Promise<WeightedProvider[]> {
		const providers: WeightedProvider[] = [
			{ provider: new CoinbasePriceProvider(), weight: 8 },
			{ provider: new CoingeckoPriceProvider(), weight: 5 }
			// { provider: new KrakenPriceProvider(), weight: 1 },
			// Add other providers with their weights...
		];

		// NOTE: Not using blockchain providers (Alchemy, Infura, etc.) for pricing
		// to avoid API charges. These providers should only be used for blockchain
		// operations like transactions, balances, etc.
		// Price data should come from free providers like Coinbase, Coingecko, etc.

		return providers;
	}

	private normalizeWeights(providers: WeightedProvider[]): WeightedProvider[] {
		const allZeroWeights = providers.every((wp) => wp.weight === 0);
		const allEqualWeights = providers.every((wp) => wp.weight === providers[0].weight);

		if (allZeroWeights || allEqualWeights) {
			// If all weights are zero or equal, assign default weight to all
			return providers.map((wp) => ({ ...wp, weight: this.DEFAULT_WEIGHT }));
		}

		// Replace any zero weights with the smallest non-zero weight
		const smallestNonZeroWeight = Math.min(
			...providers.filter((wp) => wp.weight > 0).map((wp) => wp.weight)
		);
		return providers.map((wp) => ({
			...wp,
			weight: wp.weight === 0 ? smallestNonZeroWeight : wp.weight
		}));
	}

	private calculateTotalWeight(): number {
		return this.weightedProviders.reduce((sum, wp) => sum + wp.weight, 0);
	}

	public getAvailableProviders(): PriceProvider[] {
		return this.weightedProviders.map((wp) => wp.provider);
	}

	async getMarketPrice(pair: string, availableProviders?: PriceProvider[]): Promise<PriceData> {
		let provider: PriceProvider | null = null;
		let providersToUse: PriceProvider[] = [];

		try {
			providersToUse = availableProviders || this.getAvailableProviders();
			if (providersToUse.length === 0) {
				throw new Error('No providers available to fetch market price');
			}

			provider = this.getWeightedRandomProvider(providersToUse);
			const price = await provider.getMarketPrice(pair);
			return price;
		} catch (error) {
			const providerName = provider ? provider.getName() : 'unknown provider';
			log.error(`Error fetching price from ${providerName}:`, false, error);
			// Retry with a different provider
			return this.getMarketPrice(
				pair,
				providersToUse.filter((p) => p !== provider)
			); // Avoid circular error by excluding failed provider
		}
	}

	private getWeightedRandomProvider(providers: PriceProvider[]): PriceProvider {
		if (!providers || providers.length === 0) {
			log.error('No providers available to fetch market price');
			throw new Error('No providers available to fetch market price');
		}

		if (providers.length === 1) {
			return providers[0];
		}

		try {
			const weightedProviders = this.weightedProviders.filter((wp) =>
				providers.includes(wp.provider)
			);
			const totalWeight = weightedProviders.reduce((sum, wp) => sum + wp.weight, 0);

			if (weightedProviders.every((wp) => wp.weight === weightedProviders[0].weight)) {
				// If all weights are equal, choose randomly
				return weightedProviders[Math.floor(Math.random() * weightedProviders.length)].provider;
			}

			let random = Math.random() * totalWeight;

			for (const wp of weightedProviders) {
				if (random < wp.weight) {
					return wp.provider;
				}
				random -= wp.weight;
			}

			// This should never happen if weights are set correctly
			return weightedProviders[0].provider;
		} catch (error) {
			log.error('Error selecting weighted random provider:', false, error);
			throw error;
		}
	}
}

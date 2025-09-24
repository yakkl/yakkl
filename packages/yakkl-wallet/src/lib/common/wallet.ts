import type { Blockchain } from '$lib/managers/Blockchain';
import type { Provider } from '$lib/managers/Provider';
import type { Wallet } from '$lib/managers/Wallet';
import { blockchainServiceManager } from '$lib/sdk/BlockchainServiceManager';
import { TokenService } from '$lib/managers/blockchains/evm/TokenService';
import { log } from '$lib/common/logger-wrapper';

export async function getInstances(chainId: number = 1): Promise<
	[Wallet | null, Provider | null, Blockchain | null, TokenService<any> | null]
> {
	try {
		try {
			// Initialize blockchain service manager
			await blockchainServiceManager.initialize({
				defaultChainId: chainId,
				autoSetupProviders: true
			});
		} catch (initError) {
			log.error('[getInstances] Failed to initialize BlockchainServiceManager:', false, initError);
			throw initError;
		}

		// Get provider from SDK
		const sdkProvider = blockchainServiceManager.getProvider();
		if (!sdkProvider) {
			log.warn('[getInstances] No provider available from blockchainServiceManager');
			return [null, null, null, null];
		}

		// Create a compatibility wrapper for the SDK provider
		// CacheSync expects instances[1].getProvider() to return the actual provider
		// The provider returned by getProvider() also needs these methods
		const providerWithMethods = {
			...sdkProvider,  // Include all SDK provider methods
			// Add ethers-compatible getNetwork method
			getNetwork: async () => {
				// Return ethers-compatible network object
				return {
					chainId: BigInt(sdkProvider.chainInfo.chainId as number),
					name: sdkProvider.chainInfo.name || 'unknown'
				};
			},
			// Ensure getBalance exists and works
			getBalance: async (address: string) => {
				if (typeof sdkProvider.getBalance === 'function') {
					return await sdkProvider.getBalance(address);
				}
				// If getBalance doesn't exist, throw error (provider should have this)
				throw new Error('Provider does not support getBalance');
			},
			getBlockNumber: async () => {
				if (typeof sdkProvider.getBlockNumber === 'function') {
					return await sdkProvider.getBlockNumber();
				}
				// If getBlockNumber doesn't exist, return a default
				return BigInt(0);
			},
			// Add call method for contract interactions (ethers.js compatibility)
			call: async (transaction: any) => {
				// Format transaction for SDK provider if needed
				const formattedTx = {
					to: transaction.to,
					data: transaction.data,
					from: transaction.from || undefined,
					value: transaction.value || undefined,
					gasLimit: transaction.gasLimit || undefined,
					gasPrice: transaction.gasPrice || undefined
				};

				// Use the SDK provider's call method
				if (typeof sdkProvider.call === 'function') {
					return await sdkProvider.call(formattedTx);
				}
				// Fallback error if SDK provider doesn't support call
				throw new Error('SDK provider does not support contract calls');
			},
			// Add estimateGas for contract transactions
			estimateGas: async (transaction: any) => {
				if (typeof sdkProvider.estimateGas === 'function') {
					return sdkProvider.estimateGas(transaction);
				}
				// Default gas estimate
				return BigInt(100000);
			}
		};

		const providerWrapper = {
			getProvider: () => providerWithMethods,
			// Also expose methods directly on the wrapper for compatibility
			getBalance: async (address: string) => {
				if (typeof sdkProvider.getBalance === 'function') {
					return await sdkProvider.getBalance(address);
				}
				throw new Error('Provider does not support getBalance');
			},
			getNetwork: async () => ({
				chainId: BigInt((sdkProvider.chainInfo.chainId as number) || 1),
				name: sdkProvider.chainInfo.name || 'ethereum'
			}),
			getBlockNumber: async () => {
				if (typeof sdkProvider.getBlockNumber === 'function') {
					return await sdkProvider.getBlockNumber();
				}
				return BigInt(0);
			},
		};

		// TODO: Migrate wallet and blockchain instances to SDK
		// For now, return the provider wrapper so CacheSync can work
		// The wallet and blockchain will need to be refactored to use SDK patterns
		let wallet: Wallet | null = null;
		let blockchain: Blockchain | null = null;
		let tokenService: TokenService<any> | null = null;

		return [wallet, providerWrapper as any, blockchain, tokenService];
	} catch (error) {
		log.error('getInstances() - Failed:', false, error);
		return [null, null, null, null];
	}
}

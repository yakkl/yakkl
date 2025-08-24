import type { Blockchain } from '$lib/managers/Blockchain';
import type { Provider } from '$lib/managers/Provider';
import type { Wallet } from '$lib/managers/Wallet';
import { blockchainServiceManager } from '$lib/sdk/BlockchainServiceManager';
import { getYakklCurrentlySelectedAccountKey } from './security';
import { getMiscStore, getYakklCurrentlySelected } from './stores';
import type { Ethereum } from '$lib/managers/blockchains/evm/ethereum/Ethereum';
import { TokenService } from '$lib/managers/blockchains/evm/TokenService';
import { log } from '$lib/managers/Logger';

export async function getInstances(): Promise<
	[Wallet | null, Provider | null, Blockchain | null, TokenService<any> | null]
> {
	try {
		const yakklMiscStore = getMiscStore();
		if (!yakklMiscStore) {
			// log.debug("getInstances() - Not logged in.");
			return [null, null, null, null];
		}

		const currentlySelected = await getYakklCurrentlySelected();
		const chainId = currentlySelected.shortcuts?.chainId ?? 1;

		// Initialize blockchain service manager
		await blockchainServiceManager.initialize({
			defaultChainId: chainId,
			autoSetupProviders: true
		});

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
					chainId: BigInt(sdkProvider.chainId),
					name: sdkProvider.blockchain || 'unknown'
				};
			},
			// Ensure getBalance exists and works
			getBalance: (address: string) => sdkProvider.getBalance(address),
			getBlockNumber: () => sdkProvider.getBlockNumber(),
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
			getBalance: (address: string) => sdkProvider.getBalance(address),
			getNetwork: async () => ({
				chainId: BigInt(sdkProvider.chainId),
				name: sdkProvider.blockchain || 'unknown'
			}),
			getBlockNumber: () => sdkProvider.getBlockNumber(),
		};

		// TODO: Migrate wallet and blockchain instances to SDK
		// For now, return the provider wrapper so CacheSync can work
		// The wallet and blockchain will need to be refactored to use SDK patterns
		let wallet: Wallet | null = null;
		let blockchain: Blockchain | null = null;
		let tokenService: TokenService<any> | null = null;

		// Try to create TokenService if we have a provider
		// This is a temporary solution until full SDK migration
		try {
			// For now, we can't create the blockchain instance without the wallet
			// but we can return the provider wrapper for basic operations
			log.debug('[getInstances] Returning provider wrapper (wallet migration pending)');
		} catch (error) {
			log.warn('[getInstances] Failed to create TokenService:', error);
		}

		return [wallet, providerWrapper as any, blockchain, tokenService];
	} catch (error) {
		log.error('getInstances() - Failed:', false, error);
		return [null, null, null, null];
	}
}

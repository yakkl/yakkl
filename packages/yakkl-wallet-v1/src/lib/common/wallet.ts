import type { Blockchain } from '$lib/managers/Blockchain';
import type { Provider } from '$lib/managers/Provider';
import type { Wallet } from '$lib/managers/Wallet';
import WalletManager from '$lib/managers/WalletManager';
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

		let wallet: Wallet | null = null;
		const apiKey =
			process.env.ALCHEMY_API_KEY_PROD ||
			process.env.VITE_ALCHEMY_API_KEY_PROD ||
			import.meta.env.VITE_ALCHEMY_API_KEY_PROD;

		wallet = WalletManager.getInstance(['Alchemy'], ['Ethereum'], chainId, apiKey);

		if (wallet) {
			if (!wallet.getSigner()) {
				// log.debug("No signer found. Retrieving account key...");
				const accountKey = await getYakklCurrentlySelectedAccountKey();
				if (accountKey?.privateKey) {
					await wallet.setSigner(accountKey.privateKey);
				} else {
					log.warn('No account key found, wallet may not be functional.');
				}
			}

			const provider = wallet.getProvider();
			if (provider) {
				const signer = wallet.getSigner();
				if (signer) {
					provider.setSigner(signer);
					// log.debug("Provider signer set.");
				}
				const blockchain = wallet.getBlockchain() as Ethereum;
				const tokenService = new TokenService(blockchain);
				return [wallet, provider, blockchain, tokenService];
			}
			return [wallet, null, null, null];
		}
		return [null, null, null, null];
	} catch (error) {
		log.error('getInstances() - Failed:', false, error);
		return [null, null, null, null];
	}
}

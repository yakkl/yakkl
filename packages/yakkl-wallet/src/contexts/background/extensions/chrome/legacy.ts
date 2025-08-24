import { log } from '$lib/managers/Logger';
import { Alchemy, Network, type TransactionRequest, type BlockTag, BigNumber } from 'alchemy-sdk';
import { getKeyManager } from '$lib/managers/KeyManager';
import { RPCAlchemy } from '$lib/managers/providers/network/alchemy/RPCAlchemy';
import { EthereumBigNumber } from '$lib/common/bignumber-ethereum';

/**********************************************************************************************************************/
// This section is for the Ethereum provider - Legacy version

export async function getRPCAlchemy(chainId: any, apiKeyOverride: string = '') {
	let apiKey = apiKeyOverride;

	log.info('getRPCAlchemy', false, { chainId, apiKeyOverride });

	// If no key was provided, try to get it from KeyManager
	if (!apiKey) {
		try {
			const keyManagerInstance = await getKeyManager();
			apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		} catch (error) {
			log.warn('Could not get API key from KeyManager, using fallback', false, error);
		}
	}

	// TODO: Remove this legacy code - API keys should come from SDK
	// This is commented out as part of the SDK migration
	// if (!apiKey) {
	//   apiKey = await EnhancedKeyManager.getInstance().getApiKey('alchemy');
	// }

	// If still no key, use a reasonable fallback mechanism
	if (!apiKey) {
		log.warn('No API key available for Alchemy, using public endpoints');
		// We could implement a public API fallback here
	}

	log.info('getRPCAlchemy', false, { chainId, apiKey });

	// Create Alchemy instance directly without using document
	const config = {
		apiKey: apiKey,
		network:
			chainId === 1
				? Network.ETH_MAINNET
				: chainId === 11155111
					? Network.ETH_SEPOLIA
					: Network.ETH_MAINNET, // default to mainnet
		maxRetries: 3
	};
	return new RPCAlchemy(apiKey);
}

// NOTE: These items should now come from the Wallet.provider.getConfig() function or similar
// chainId must be hex
function getProviderConfig(chainId: any, apiKey: string) {
	try {
		let network = Network.ETH_SEPOLIA;
		switch (chainId) {
			case '0xaa36a7': // Ethereum Sepolia
			case 11155111:
				network = Network.ETH_SEPOLIA;
				break;
			case '0x1': // Ethereum mainnet
			case '0x01':
			case 1:
			default:
				network = Network.ETH_MAINNET;
				break;
		}
		return {
			apiKey: apiKey,
			network: network
		};
	} catch (e) {
		log.warn('Warning in getProviderConfig', false, e);
		throw e;
	}
}

export async function estimateGas(
	chainId: any,
	params: TransactionRequest,
	apiKeyOverride: string = ''
) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.estimateGas(params);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// if (!apiKey) {
		//   throw new Error('API key not configured');
		// }
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey));
		// return await provider.transact.estimateGas(params);
	} catch (e) {
		log.warn('Warning in estimateGas', false, e);
		throw e;
	}
}

export async function getBlock(
	chainId: any,
	block: BlockTag | Promise<BlockTag>,
	fullTx: boolean = false,
	apiKeyOverride: string = ''
) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		const result = await rpcAlchemy.getBlock(block as BlockTag);
		return result;
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getBlock(block as BlockTag, fullTx);
	} catch (e) {
		log.warn('Warning in getBlock', false, e);
		throw e;
	}
}

export async function getLatestBlock(chainId: any, apiKeyOverride: string = '') {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.getBlock('latest');
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getBlock('latest');
	} catch (e) {
		log.warn('Warning in getLatestBlock', false, e);
		throw e;
	}
}

export async function ethCall(
	chainId: any,
	transaction: TransactionRequest,
	blockTag: BlockTag = 'latest',
	apiKeyOverride: string = ''
) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.ethCall(transaction, blockTag);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.call(transaction, blockTag || 'latest');
	} catch (e) {
		log.warn('Warning in ethCall', false, e);
		throw e;
	}
}

// Keep your core function simple and standards-compliant
export async function getGasPrice(chainId: any) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId);
		return await rpcAlchemy.getGasPrice();
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getGasPrice();
	} catch (e) {
		log.warn('Warning in getGasPrice', false, e);
		throw e;
	}
}

// Create utility functions for conversions
export function weiToGwei(wei: EthereumBigNumber): string {
	return wei.toGwei().toString();
}

// For display purposes, you might want a formatted version
export function formatGasPrice(wei: EthereumBigNumber): string {
	const gweiString = weiToGwei(wei);
	const gweiNumber = parseFloat(gweiString);

	// Format based on the value
	if (gweiNumber < 1) {
		return `${gweiNumber.toFixed(3)} Gwei`;
	} else if (gweiNumber < 10) {
		return `${gweiNumber.toFixed(2)} Gwei`;
	} else if (gweiNumber < 100) {
		return `${gweiNumber.toFixed(1)} Gwei`;
	} else {
		return `${Math.round(gweiNumber)} Gwei`;
	}
}

// Create a higher-level function that combines both
export async function getGasPriceForDisplay(chainId: any): Promise<string> {
	const gasPriceWei = await getGasPrice(chainId);
	return formatGasPrice(EthereumBigNumber.from(gasPriceWei));
}

export async function getBalance(
	chainId: any,
	address: string,
	blockTag: BlockTag = 'latest',
	apiKeyOverride: string = ''
) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.getBalance(address, blockTag);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getBalance(address, blockTag || 'latest');
	} catch (e) {
		log.warn('Warning in getBalance', false, e);
		throw e;
	}
}

export async function getCode(
	chainId: any,
	address: string,
	blockTag: BlockTag = 'latest',
	apiKeyOverride: string = ''
) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.getCode(address, blockTag);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getCode(address, blockTag || 'latest');
	} catch (e) {
		log.warn('Warning in getCode', false, e);
		throw e;
	}
}

export async function getNonce(
	chainId: any,
	address: string,
	blockTag: BlockTag = 'latest',
	apiKeyOverride: string = ''
) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.getNonce(address, blockTag);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getTransactionCount(address, blockTag || 'latest');
	} catch (e) {
		log.warn('Warning in getNonce', false, e);
		throw e;
	}
}

export async function getTransactionReceipt(
	chainId: any,
	txHash: string,
	apiKeyOverride: string = ''
) {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.getTransactionReceipt(txHash);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getTransactionReceipt(txHash);
	} catch (e) {
		log.warn('Warning in getTransactionReceipt', false, e);
		throw e;
	}
}

export async function getTransaction(chainId: any, txHash: string, apiKeyOverride: string = '') {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.getTransaction(txHash);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getTransaction(txHash);
	} catch (e) {
		log.warn('Warning in getTransaction', false, e);
		throw e;
	}
}

export async function getLogs(chainId: any, filter: any, apiKeyOverride: string = '') {
	try {
		const rpcAlchemy = await getRPCAlchemy(chainId, apiKeyOverride);
		return await rpcAlchemy.getLogs(filter);
		// const keyManagerInstance = await keyManager;
		// const apiKey = keyManagerInstance.getKey('ALCHEMY_API_KEY_PROD_1');
		// const provider = new Alchemy(getProviderConfig(chainId, apiKey || ''));
		// return await provider.core.getLogs(filter);
	} catch (e) {
		log.warn('Warning in getLogs', false, e);
		throw e;
	}
}

import { EventEmitter } from 'events';
import { log } from '$lib/managers/Logger';
import { EIP1193_ERRORS } from './eip-types';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import { EnhancedKeyManager } from '$lib/sdk/security/EnhancedKeyManager';

// Get Alchemy API key from EnhancedKeyManager
async function getAlchemyApiKey(chainId: string = '0x1'): Promise<string> {
	try {
		const keyManager = EnhancedKeyManager.getInstance();
		await keyManager.initialize();
		const apiKey = await keyManager.getKey('alchemy', 'read');
		
		if (!apiKey) {
			log.warn('No Alchemy API key found', false);
			return '';
		}
		
		return apiKey;
	} catch (error) {
		log.error('Error getting Alchemy API key', false, error);
		return '';
	}
}

// Get Alchemy RPC URL for a chain
async function getAlchemyRpcUrl(chainId: string = '0x1'): Promise<string> {
	const apiKey = await getAlchemyApiKey(chainId);
	const chainIdNum = parseInt(chainId, 16);

	// Map chain IDs to network names
	let network = 'mainnet';
	switch (chainIdNum) {
		case 1: // Mainnet
			network = 'mainnet';
			break;
		case 5: // Goerli
			network = 'goerli';
			break;
		case 11155111: // Sepolia
			network = 'sepolia';
			break;
		case 137: // Polygon
			network = 'polygon-mainnet';
			break;
		case 80001: // Mumbai
			network = 'polygon-mumbai';
			break;
		case 42161: // Arbitrum
			network = 'arbitrum-mainnet';
			break;
		case 421613: // Arbitrum Goerli
			network = 'arbitrum-goerli';
			break;
		case 10: // Optimism
			network = 'optimism-mainnet';
			break;
		case 420: // Optimism Goerli
			network = 'optimism-goerli';
			break;
		default:
			network = 'mainnet';
	}

	return `https://eth-${network}.alchemyapi.io/v2/${apiKey}`;
}

// Helper function to make JSON-RPC requests to Alchemy
async function makeAlchemyRequest(
	method: string,
	params: any[],
	chainId: string = '0x1'
): Promise<any> {
	const url = await getAlchemyRpcUrl(chainId);
	const apiKey = await getAlchemyApiKey(chainId);

	if (!apiKey) {
		throw new Error('No Alchemy API key available');
	}

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: Date.now(),
				method,
				params
			})
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		if (data.error) {
			throw {
				code: data.error.code || -32603,
				message: data.error.message || 'Unknown error',
				data: data.error.data
			};
		}

		return data.result;
	} catch (error) {
		log.error('Error making Alchemy request', false, {
			method,
			params,
			error,
			url
		});
		throw error;
	}
}

// Mock accounts for testing
const MOCK_ACCOUNTS = [''];

// List of methods that require user permission
const PERMISSION_REQUIRED_METHODS = [
	'eth_requestAccounts',
	'eth_sendTransaction',
	'eth_signTransaction',
	'eth_sign',
	'personal_sign',
	'eth_signTypedData_v4',
	'wallet_addEthereumChain',
	'wallet_switchEthereumChain',
	'wallet_watchAsset'
];

// Alchemy provider class
class AlchemyProvider extends EventEmitter {
	private chainId: string = '0x1';
	private networkVersion: string = '1';
	private accounts: string[] = [];
	private isConnected: boolean = false;

	constructor() {
		super();
		this.setMaxListeners(100);
		this.initialize();
	}

	private async initialize(): Promise<void> {
		try {
			// Get values from yakklCurrentlySelected
			const currentlySelected = await getYakklCurrentlySelected();

			if (currentlySelected && currentlySelected.shortcuts) {
				// Convert decimal chainId to hex format with 0x prefix
				this.chainId = '0x' + currentlySelected.shortcuts.chainId.toString(16);
				this.networkVersion = currentlySelected.shortcuts.chainId.toString();

				// Use the address from shortcuts
				if (currentlySelected.shortcuts.address) {
					this.accounts = [currentlySelected.shortcuts.address];
				} else {
					this.accounts = MOCK_ACCOUNTS;
				}
			} else {
				// Fallback to defaults
				this.chainId = '0x1';
				this.networkVersion = '1';
				this.accounts = MOCK_ACCOUNTS;
			}

			this.isConnected = true;

			// Emit connect event
			this.emit('connect', { chainId: this.chainId });
		} catch (error) {
			log.error('Error initializing Alchemy provider', false, error);
			this.isConnected = false;
		}
	}

	// Check if a method requires permission
	public requiresPermission(method: string): boolean {
		return PERMISSION_REQUIRED_METHODS.includes(method);
	}

	// Basic provider methods
	public async getChainId(): Promise<string> {
		try {
			// Get fresh values from yakklCurrentlySelected
			const currentlySelected = await getYakklCurrentlySelected();
			if (currentlySelected && currentlySelected.shortcuts && currentlySelected.shortcuts.chainId) {
				this.chainId = '0x' + currentlySelected.shortcuts.chainId.toString(16);
			}
			return this.chainId;
		} catch (error) {
			log.error('Error getting chainId', false, error);
			return this.chainId;
		}
	}

	public async getNetworkVersion(): Promise<string> {
		try {
			// Get fresh values from yakklCurrentlySelected
			const currentlySelected = await getYakklCurrentlySelected();
			if (currentlySelected && currentlySelected.shortcuts && currentlySelected.shortcuts.chainId) {
				this.networkVersion = currentlySelected.shortcuts.chainId.toString();
			}
			return this.networkVersion;
		} catch (error) {
			log.error('Error getting networkVersion', false, error);
			return this.networkVersion;
		}
	}

	public async getAccounts(): Promise<string[]> {
		try {
			// Get fresh values from yakklCurrentlySelected
			const currentlySelected = await getYakklCurrentlySelected();
			if (currentlySelected && currentlySelected.shortcuts && currentlySelected.shortcuts.address) {
				this.accounts = [currentlySelected.shortcuts.address];
			}
			return this.accounts;
		} catch (error) {
			log.error('Error getting accounts', false, error);
			return this.accounts;
		}
	}

	public async requestAccounts(): Promise<string[]> {
		// This method requires user permission
		// In a real implementation, this would request accounts from the wallet
		return this.accounts;
	}

	// Chain management methods
	public async switchChain(chainId: string): Promise<null> {
		// This method requires user permission
		// In a real implementation, this would switch the chain
		this.chainId = chainId;
		this.networkVersion = parseInt(chainId, 16).toString();

		// Emit chain changed event
		this.emit('chainChanged', chainId);

		return null;
	}

	public async addChain(chainParams: any): Promise<null> {
		// This method requires user permission
		// In a real implementation, this would add a new chain
		log.debug('Add chain request', false, chainParams);
		return null;
	}

	public async watchAsset(asset: any): Promise<boolean> {
		// This method requires user permission
		// In a real implementation, this would add a token to the wallet
		log.debug('Watch asset request', false, asset);
		return true;
	}

	// RPC methods
	public async getBalance(address: string, blockTag: string = 'latest'): Promise<string> {
		try {
			return await makeAlchemyRequest('eth_getBalance', [address, blockTag], this.chainId);
		} catch (error) {
			log.error('Error getting balance', false, { address, blockTag, error });
			throw error;
		}
	}

	public async call(transaction: any, blockTag: string = 'latest'): Promise<string> {
		try {
			return await makeAlchemyRequest('eth_call', [transaction, blockTag], this.chainId);
		} catch (error) {
			log.error('Error making call', false, { transaction, blockTag, error });
			throw error;
		}
	}

	public async estimateGas(transaction: any): Promise<string> {
		try {
			return await makeAlchemyRequest('eth_estimateGas', [transaction], this.chainId);
		} catch (error) {
			log.error('Error estimating gas', false, { transaction, error });
			throw error;
		}
	}

	public async getBlockByNumber(blockNumber: string, includeTransactions: boolean): Promise<any> {
		try {
			return await makeAlchemyRequest(
				'eth_getBlockByNumber',
				[blockNumber, includeTransactions],
				this.chainId
			);
		} catch (error) {
			log.error('Error getting block by number', false, {
				blockNumber,
				includeTransactions,
				error
			});
			throw error;
		}
	}

	public async getBlockByHash(blockHash: string, includeTransactions: boolean): Promise<any> {
		try {
			return await makeAlchemyRequest(
				'eth_getBlockByHash',
				[blockHash, includeTransactions],
				this.chainId
			);
		} catch (error) {
			log.error('Error getting block by hash', false, { blockHash, includeTransactions, error });
			throw error;
		}
	}

	public async getTransactionByHash(txHash: string): Promise<any> {
		try {
			return await makeAlchemyRequest('eth_getTransactionByHash', [txHash], this.chainId);
		} catch (error) {
			log.error('Error getting transaction by hash', false, { txHash, error });
			throw error;
		}
	}

	public async getTransactionReceipt(txHash: string): Promise<any> {
		try {
			return await makeAlchemyRequest('eth_getTransactionReceipt', [txHash], this.chainId);
		} catch (error) {
			log.error('Error getting transaction receipt', false, { txHash, error });
			throw error;
		}
	}

	public async getCode(address: string, blockTag: string = 'latest'): Promise<string> {
		try {
			return await makeAlchemyRequest('eth_getCode', [address, blockTag], this.chainId);
		} catch (error) {
			log.error('Error getting code', false, { address, blockTag, error });
			throw error;
		}
	}

	public async getStorageAt(
		address: string,
		position: string,
		blockTag: string = 'latest'
	): Promise<string> {
		try {
			return await makeAlchemyRequest(
				'eth_getStorageAt',
				[address, position, blockTag],
				this.chainId
			);
		} catch (error) {
			log.error('Error getting storage at', false, { address, position, blockTag, error });
			throw error;
		}
	}

	public async getBlockNumber(): Promise<string> {
		try {
			return await makeAlchemyRequest('eth_blockNumber', [], this.chainId);
		} catch (error) {
			log.error('Error getting block number', false, { error });
			throw error;
		}
	}

	public async getGasPrice(): Promise<string> {
		try {
			return await makeAlchemyRequest('eth_gasPrice', [], this.chainId);
		} catch (error) {
			log.error('Error getting gas price', false, { error });
			throw error;
		}
	}

	public async getTransactionCount(address: string, blockTag: string = 'latest'): Promise<string> {
		try {
			return await makeAlchemyRequest('eth_getTransactionCount', [address, blockTag], this.chainId);
		} catch (error) {
			log.error('Error getting transaction count', false, { address, blockTag, error });
			throw error;
		}
	}

	// Signing methods - these require user permission
	public async sign(address: string, message: string): Promise<string> {
		// This method requires user permission
		// In a real implementation, this would sign a message
		// For now, just return a mock signature
		return '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
	}

	public async personalSign(message: string, address: string): Promise<string> {
		// This method requires user permission
		// In a real implementation, this would sign a message
		// For now, just return a mock signature
		return '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
	}

	public async signTypedData(address: string, typedData: any): Promise<string> {
		// This method requires user permission
		// In a real implementation, this would sign typed data
		// For now, just return a mock signature
		return '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
	}

	public async sendTransaction(transaction: any): Promise<string> {
		// This method requires user permission
		// In a real implementation, this would send a transaction
		// For now, just return a mock transaction hash
		return '0x0000000000000000000000000000000000000000000000000000000000000000';
	}

	// Generic request method
	public async request(args: { method: string; params?: any[] }): Promise<any> {
		const { method, params = [] } = args;
		try {
			switch (method) {
				case 'eth_chainId':
					return this.getChainId();

				case 'net_version':
					return this.getNetworkVersion();

				case 'eth_accounts':
					log.info('eth_accounts - alchemy.ts', false, { params });
					return this.getAccounts();

				case 'eth_requestAccounts':
					log.info('eth_requestAccounts - alchemy.ts', false, { params });
					return this.requestAccounts();

				case 'eth_getBalance':
					return this.getBalance(params[0], params[1]);

				case 'eth_sendTransaction':
					return this.sendTransaction(params[0]);

				case 'eth_call':
					return this.call(params[0], params[1]);

				case 'eth_estimateGas':
					return this.estimateGas(params[0]);

				case 'eth_getBlockByNumber':
					return this.getBlockByNumber(params[0], params[1]);

				case 'eth_getBlockByHash':
					return this.getBlockByHash(params[0], params[1]);

				case 'eth_getTransactionByHash':
					return this.getTransactionByHash(params[0]);

				case 'eth_getTransactionReceipt':
					return this.getTransactionReceipt(params[0]);

				case 'eth_getCode':
					return this.getCode(params[0], params[1]);

				case 'eth_getStorageAt':
					return this.getStorageAt(params[0], params[1], params[2]);

				case 'eth_blockNumber':
					return this.getBlockNumber();

				case 'eth_gasPrice':
					return this.getGasPrice();

				case 'eth_getTransactionCount':
					return this.getTransactionCount(params[0], params[1]);

				// case 'eth_sign':
				//   return this.sign(params[0], params[1]);

				case 'personal_sign':
					return this.personalSign(params[0], params[1]);

				case 'eth_signTypedData_v4':
					return this.signTypedData(params[0], params[1]);

				case 'wallet_switchEthereumChain':
					return this.switchChain(params[0].chainId);

				case 'wallet_addEthereumChain':
					return this.addChain(params[0]);

				case 'wallet_watchAsset':
					return this.watchAsset(params[0]);

				default:
					// For other methods, try to make a direct request to Alchemy
					try {
						const result = await makeAlchemyRequest(method, params, this.chainId);
						return result;
					} catch (error) {
						throw {
							code: EIP1193_ERRORS.UNSUPPORTED_METHOD.code,
							message: `Method ${method} not supported`,
							data: error
						};
					}
			}
		} catch (error) {
			log.error('Error in Alchemy provider request', false, {
				method,
				params,
				error
			});
			throw error;
		}
	}
}

// Singleton instance
let alchemyProvider: AlchemyProvider | null = null;

// Get or create the Alchemy provider
export function getAlchemyProvider(): AlchemyProvider {
	if (!alchemyProvider) {
		alchemyProvider = new AlchemyProvider();
	}
	return alchemyProvider;
}

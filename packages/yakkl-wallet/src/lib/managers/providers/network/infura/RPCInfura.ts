import { RPCBase, type RPCOptions, type ProviderConfig } from '$managers/RPCBase';
import { log } from '$lib/common/logger-wrapper';
import { ensureHexFormat, type BlockTag } from '$lib/common';
import { BigNumber } from '$lib/common/bignumber';
import { TypeAdapterUtils } from '$lib/sdk/types/adapters';

export class RPCInfura extends RPCBase {
	protected requestQueue: Array<() => Promise<any>> = [];
	protected processingQueue = false;
	protected lastRequestTime = 0;
	protected readonly minRequestInterval = 100; // Minimum time between requests in ms
	protected readonly maxRetries = 3;
	protected readonly retryDelay = 1000; // Delay between retries in ms
	private chainId: number;

	constructor(chainId: number = 1, options?: Partial<RPCOptions>) {
		// Get cached configuration or use fallback
		const config = RPCBase.getProviderConfigSync('infura', chainId);
		if (!config) {
			// Use fallback configuration
			const fallbackBaseURL = chainId === 1 
				? 'https://mainnet.infura.io/v3/YOUR_API_KEY'
				: `https://sepolia.infura.io/v3/YOUR_API_KEY`;
			
			const baseOptions: RPCOptions = {
				baseURL: fallbackBaseURL,
				timeout: 8000,
				...options
			};
			
			super(baseOptions);
			this.chainId = chainId;
			
			// Initialize config asynchronously
			this.initializeConfig();
			return;
		}

		const baseOptions: RPCOptions = {
			baseURL: config.baseURL,
			timeout: 8000, // 8 second timeout for balance requests
			...options
		};
		
		super(baseOptions);
		this.chainId = chainId;
		
		log.info(`[RPCInfura] Initialized for chain ${chainId} on ${config.network}`);
	}

	private async initializeConfig() {
		try {
			const config = await RPCBase.getProviderConfig('infura', this.chainId);
			if (config && config.baseURL !== this.baseURL) {
				this.baseURL = config.baseURL;
				log.info(`[RPCInfura] Updated configuration for chain ${this.chainId} on ${config.network}`);
			}
		} catch (error) {
			log.warn(`[RPCInfura] Failed to initialize config for chain ${this.chainId}:`, error);
		}
	}

	private async processQueue() {
		if (this.processingQueue || this.requestQueue.length === 0) return;

		this.processingQueue = true;
		while (this.requestQueue.length > 0) {
			const now = Date.now();
			const timeSinceLastRequest = now - this.lastRequestTime;

			if (timeSinceLastRequest < this.minRequestInterval) {
				await new Promise((resolve) =>
					setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
				);
			}

			const request = this.requestQueue.shift();
			if (request) {
				try {
					await request();
				} catch (error) {
					log.error('[RPCInfura] Error processing request', false, error);
				}
			}
			this.lastRequestTime = Date.now();
		}
		this.processingQueue = false;
	}

	private async makeRequestWithRetry(method: string, params: any[]): Promise<any> {
		let lastError;
		for (let attempt = 0; attempt < this.maxRetries; attempt++) {
			try {
				const result = await this.request(method, params);
				return result;
			} catch (error: any) {
				lastError = error;
				if (error.code === 429) {
					const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
					log.warn(`[RPCInfura] Rate limited, retrying in ${delay}ms`, false, { attempt, method });
					await new Promise((resolve) => setTimeout(resolve, delay));
					continue;
				}
				throw error;
			}
		}
		throw lastError;
	}

	async getBlock(blockTag: BlockTag = 'latest'): Promise<any> {
		try {
			log.info('[RPCInfura] Fetching block', false, { blockTag });
			return await this.request('eth_getBlockByNumber', [blockTag, false]);
		} catch (error) {
			log.error('[RPCInfura] Error fetching block', false, error);
			throw error;
		}
	}

	async getTransaction(txHash: string): Promise<any> {
		try {
			log.info('[RPCInfura] Fetching transaction', false, { txHash });
			return await this.request('eth_getTransactionByHash', [txHash]);
		} catch (error) {
			log.error('[RPCInfura] Error fetching transaction', false, error);
			throw error;
		}
	}

	async getBalance(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
		try {
			log.info('[RPCInfura] Fetching balance', false, { address, blockTag });

			// Add timeout to prevent hanging requests
			return new Promise((resolve, reject) => {
				const timeoutId = setTimeout(() => {
					reject(new Error('Balance request timeout after 10 seconds'));
				}, 10000);

				this.requestQueue.push(async () => {
					try {
						const result = await this.makeRequestWithRetry('eth_getBalance', [address, blockTag]);
						clearTimeout(timeoutId);
						// Ensure result is in hex format
						const hexResult = ensureHexFormat(result);
						resolve(hexResult);
					} catch (error) {
						clearTimeout(timeoutId);
						log.warn('[RPCInfura] Balance request failed, returning 0', false, {
							address,
							error: error instanceof Error ? error.message : error
						});
						// Return 0 balance instead of throwing to prevent UI breaks
						resolve('0x0');
					}
				});
				this.processQueue();
			});
		} catch (error) {
			log.error('[RPCInfura] Error fetching balance', false, error);
			// Return 0 balance as fallback
			return '0x0';
		}
	}

	async getCode(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
		try {
			log.info('[RPCInfura] Fetching code', false, { address, blockTag });
			return await this.request('eth_getCode', [address, blockTag]);
		} catch (error) {
			log.error('[RPCInfura] Error fetching code', false, error);
			throw error;
		}
	}

	async estimateGas(params: any): Promise<string> {
		try {
			log.info('[RPCInfura] Estimating gas', false, { params });

			// First, let's handle the case where params might be an array
			const txParams = Array.isArray(params) ? params[0] : params;

			// Build the transaction object according to JSON-RPC specification
			const tx: any = {
				from: txParams.from,
				to: txParams.to,
				data: txParams.data || txParams.input // Some dApps use 'input' instead of 'data'
			};

			// Only include optional fields if they exist
			if (txParams.value !== undefined) {
				tx.value = txParams.value; // Already in hex format
			}

			if (txParams.gas !== undefined) {
				tx.gas = txParams.gas; // Already in hex format
			}

			if (txParams.gasPrice !== undefined) {
				tx.gasPrice = txParams.gasPrice;
			}

			if (txParams.maxFeePerGas !== undefined) {
				tx.maxFeePerGas = txParams.maxFeePerGas;
			}

			if (txParams.maxPriorityFeePerGas !== undefined) {
				tx.maxPriorityFeePerGas = txParams.maxPriorityFeePerGas;
			}

			if (txParams.nonce !== undefined) {
				tx.nonce = txParams.nonce;
			}

			log.debug('[RPCInfura] Sending gas estimation request', false, { tx });

			const result = await this.request('eth_estimateGas', [tx]);

			log.debug('[RPCInfura] Gas estimation result', false, { result });

			return result;
		} catch (error) {
			log.error('[RPCInfura] Error estimating gas', false, error);
			throw error;
		}
	}

	async ethCall(transaction: any, blockTag: BlockTag = 'latest'): Promise<string> {
		try {
			log.info('[RPCInfura] Making eth_call', false, { transaction, blockTag });
			const tx = {
				from: transaction.from,
				to: transaction.to,
				data: transaction.data,
				value: transaction.value?.toString(),
				gas: transaction.gas?.toString(),
				gasPrice: transaction.gasPrice?.toString(),
				nonce: transaction.nonce?.toString()
			};
			
			// Remove undefined fields
			Object.keys(tx).forEach(key => {
				if (tx[key as keyof typeof tx] === undefined) {
					delete tx[key as keyof typeof tx];
				}
			});
			
			return await this.request('eth_call', [tx, blockTag]);
		} catch (error) {
			log.error('[RPCInfura] Error in eth_call', false, error);
			throw error;
		}
	}

	async getGasPrice(): Promise<bigint> {
		try {
			log.info('[RPCInfura] Getting gas price', false);
			const result = await this.request('eth_gasPrice', []);
			return BigInt(result);
		} catch (error) {
			log.error('[RPCInfura] Error getting gas price', false, error);
			throw error;
		}
	}

	async getNonce(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
		try {
			log.info('[RPCInfura] Getting nonce', false, { address, blockTag });
			return await this.request('eth_getTransactionCount', [address, blockTag]);
		} catch (error) {
			log.error('[RPCInfura] Error getting nonce', false, error);
			throw error;
		}
	}

	async getTransactionReceipt(txHash: string): Promise<any> {
		try {
			log.info('[RPCInfura] Getting transaction receipt', false, { txHash });
			return await this.request('eth_getTransactionReceipt', [txHash]);
		} catch (error) {
			log.error('[RPCInfura] Error getting transaction receipt', false, error);
			throw error;
		}
	}

	async getLogs(filter: {
		fromBlock?: BlockTag;
		toBlock?: BlockTag;
		address?: string | string[];
		topics?: (string | string[] | null)[];
	}): Promise<any[]> {
		try {
			log.info('[RPCInfura] Getting logs', false, { filter });
			return await this.request('eth_getLogs', [filter]);
		} catch (error) {
			log.error('[RPCInfura] Error getting logs', false, error);
			throw error;
		}
	}

	async getBlockNumber(): Promise<number> {
		try {
			log.info('[RPCInfura] Getting block number', false);
			const result = await this.request('eth_blockNumber', []);
			return parseInt(result, 16);
		} catch (error) {
			log.error('[RPCInfura] Error getting block number', false, error);
			throw error;
		}
	}

	async sendRawTransaction(signedTx: string): Promise<string> {
		try {
			log.info('[RPCInfura] Sending raw transaction', false);
			return await this.request('eth_sendRawTransaction', [signedTx]);
		} catch (error) {
			log.error('[RPCInfura] Error sending raw transaction', false, error);
			throw error;
		}
	}

	// Helper to switch chains
	async switchChain(newChainId: number): Promise<void> {
		const config = await RPCBase.getProviderConfig('infura', newChainId);
		if (!config) {
			throw new Error(`Unsupported chain ID: ${newChainId}`);
		}
		
		this.chainId = newChainId;
		this.baseURL = config.baseURL;
		
		log.info(`[RPCInfura] Switched to chain ${newChainId} on ${config.network}`);
	}
}
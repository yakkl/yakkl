import { RPCBase, type RPCOptions } from '$managers/RPCBase';
import { log } from '$lib/common/logger-wrapper';
import type { BlockTag } from '$lib/common';
import { EthereumBigNumber } from '$lib/common/bignumber-ethereum';

export class RPCAlchemy extends RPCBase {
  protected requestQueue: Array<() => Promise<any>> = [];
  protected processingQueue = false;
  protected lastRequestTime = 0;
  protected readonly minRequestInterval = 100; // Minimum time between requests in ms
  protected readonly maxRetries = 3;
  protected readonly retryDelay = 1000; // Delay between retries in ms

  constructor(apiKey: string, options?: Partial<RPCOptions>) {
    const baseOptions: RPCOptions = {
      baseURL: 'https://eth-mainnet.alchemyapi.io/v2',
      apiKey,
      ...options,
    };
    super(baseOptions);
  }

  private async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) return;

    this.processingQueue = true;
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
      }

      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          log.error('[RPCAlchemy] Error processing request', false, error);
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
          log.warn(`[RPCAlchemy] Rate limited, retrying in ${delay}ms`, false, { attempt, method });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async getBlock(blockTag: BlockTag = 'latest'): Promise<any> {
    try {
      log.info('[RPCAlchemy] Fetching block', false, { blockTag });
      return await this.request('eth_getBlockByNumber', [blockTag, false]);
    } catch (error) {
      log.error('[RPCAlchemy] Error fetching block', false, error);
      throw error;
    }
  }

  async getTransaction(txHash: string): Promise<any> {
    try {
      log.info('[RPCAlchemy] Fetching transaction', false, { txHash });
      return await this.request('eth_getTransactionByHash', [txHash]);
    } catch (error) {
      log.error('[RPCAlchemy] Error fetching transaction', false, error);
      throw error;
    }
  }

  async getBalance(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
    try {
      log.info('[RPCAlchemy] Fetching balance', false, { address, blockTag });
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            const result = await this.makeRequestWithRetry('eth_getBalance', [address, blockTag]);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
        this.processQueue();
      });
    } catch (error) {
      log.error('[RPCAlchemy] Error fetching balance', false, error);
      throw error;
    }
  }

  async getCode(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
    try {
      log.info('[RPCAlchemy] Fetching code', false, { address, blockTag });
      return await this.request('eth_getCode', [address, blockTag]);
    } catch (error) {
      log.error('[RPCAlchemy] Error fetching code', false, error);
      throw error;
    }
  }

  async estimateGas(params: any): Promise<string> {
    try {
      log.info('[RPCAlchemy] Estimating gas', false, { params });

      // First, let's handle the case where params might be an array
      const txParams = Array.isArray(params) ? params[0] : params;

      // Build the transaction object according to JSON-RPC specification
      const tx: any = {
        from: txParams.from,
        to: txParams.to,
        data: txParams.data || txParams.input, // Some dApps use 'input' instead of 'data'
      };

      // Only include optional fields if they exist
      if (txParams.value !== undefined) {
        tx.value = txParams.value;  // Already in hex format
      }

      if (txParams.gas !== undefined) {
        tx.gas = txParams.gas;  // Already in hex format
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

      log.debug('[RPCAlchemy] Sending gas estimation request', false, { tx });

      const result = await this.request('eth_estimateGas', [tx]);

      log.debug('[RPCAlchemy] Gas estimation result', false, { result });

      return result;
    } catch (error) {
      log.error('[RPCAlchemy] Error estimating gas', false, error);
      throw error;
    }
  }

  async ethCall(transaction: any, blockTag: BlockTag = 'latest'): Promise<string> {
    try {
      log.info('[RPCAlchemy] Making eth_call', false, { transaction, blockTag });
      const tx = {
        from: transaction.from,
        to: transaction.to,
        data: transaction.data,
        quantity: transaction.value?.toString(),
        gasLimit: transaction.gas?.toString(),
        gasPrice: transaction.gasPrice?.toString(),
        nonce: transaction.nonce?.toString()
      };
      return await this.request('eth_call', [tx, blockTag]);
    } catch (error) {
      log.error('[RPCAlchemy] Error in eth_call', false, error);
      throw error;
    }
  }

  async getGasPrice(): Promise<EthereumBigNumber> {
    try {
      log.info('[RPCAlchemy] Getting gas price', false);
      const result = await this.request('eth_gasPrice');
      return EthereumBigNumber.from(result);
    } catch (error) {
      log.error('[RPCAlchemy] Error getting gas price', false, error);
      throw error;
    }
  }

  async getNonce(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
    try {
      log.info('[RPCAlchemy] Getting nonce', false, { address, blockTag });
      return await this.request('eth_getTransactionCount', [address, blockTag]);
    } catch (error) {
      log.error('[RPCAlchemy] Error getting nonce', false, error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      log.info('[RPCAlchemy] Getting transaction receipt', false, { txHash });
      return await this.request('eth_getTransactionReceipt', [txHash]);
    } catch (error) {
      log.error('[RPCAlchemy] Error getting transaction receipt', false, error);
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
      log.info('[RPCAlchemy] Getting logs', false, { filter });
      return await this.request('eth_getLogs', [filter]);
    } catch (error) {
      log.error('[RPCAlchemy] Error getting logs', false, error);
      throw error;
    }
  }

  // Add more Alchemy-specific methods as needed
}

import { BaseProvider } from './BaseProvider';
import { BigNumber, type BigNumberish } from '../../core/bignumber';
import type { BlockTag, TransactionRequest, TransactionResponse, FeeData, Log, Filter, Block, BlockWithTransactions, TransactionReceipt } from './BaseProvider';
import type { Log as EVMLog } from '$lib/common/evm';

/**
 * Base class for URL-based RPC providers
 * Works with any JSON-RPC endpoint without requiring API key management
 */
export abstract class RPCProvider extends BaseProvider {
  protected requestId: number = 1;
  protected timeout: number;
  protected retries: number;

  constructor(
    name: string,
    chainId: number,
    blockchain: string,
    supportedChainIds: number[],
    endpoint: string,
    options: {
      timeout?: number;
      retries?: number;
    } = {}
  ) {
    super(name, chainId, blockchain, supportedChainIds, endpoint);
    this.timeout = options.timeout || 30000; // 30 seconds
    this.retries = options.retries || 2;
  }

  /**
   * Make a JSON-RPC request
   */
  async request<T = unknown>(method: string, params?: unknown[]): Promise<T> {
    this.validateConnection();
    
    const id = this.requestId++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params: params || []
    };

    const response = await this.makeHttpRequest(payload);
    
    if (response.error) {
      throw new Error(`RPC Error ${response.error.code}: ${response.error.message}`);
    }
    
    return response.result as T;
  }

  /**
   * Connect to the RPC endpoint
   */
  protected async doConnect(chainId: number): Promise<void> {
    // Test the connection
    try {
      await this.request('eth_chainId');
    } catch (error) {
      throw new Error(`Failed to connect to ${this._endpoint}: ${error}`);
    }
  }

  /**
   * Disconnect (no-op for HTTP providers)
   */
  protected async doDisconnect(): Promise<void> {
    // Nothing to clean up for HTTP providers
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  protected async makeHttpRequest(payload: object): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this._endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }

  // Core blockchain operations with RPC calls
  async getBlockNumber(): Promise<number> {
    const result = await this.request<string>('eth_blockNumber');
    return parseInt(result, 16);
  }

  async getBalance(address: string, blockTag: BlockTag = 'latest'): Promise<bigint> {
    const result = await this.request<string>('eth_getBalance', [address, blockTag]);
    return BigInt(result);
  }

  async getCode(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
    return await this.request<string>('eth_getCode', [address, blockTag]);
  }

  async getStorageAt(address: string, position: BigNumberish, blockTag: BlockTag = 'latest'): Promise<string> {
    const positionHex = typeof position === 'string' ? position : `0x${position.toString(16)}`;
    return await this.request<string>('eth_getStorageAt', [address, positionHex, blockTag]);
  }

  async getGasPrice(): Promise<bigint> {
    const result = await this.request<string>('eth_gasPrice');
    return BigInt(result);
  }

  async getFeeData(): Promise<FeeData> {
    try {
      // Try EIP-1559 fee data first
      const [gasPrice, block] = await Promise.all([
        this.getGasPrice(),
        this.getBlock('latest')
      ]);

      const feeData: FeeData = {
        gasPrice,
        lastBaseFeePerGas: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };

      // If block has base fee, calculate EIP-1559 fees
      if (block.baseFeePerGas) {
        const baseFeeAsBigInt = BigNumber.toBigInt(block.baseFeePerGas);
        feeData.lastBaseFeePerGas = baseFeeAsBigInt || BigInt(0);
        feeData.maxPriorityFeePerGas = BigInt('2000000000'); // 2 gwei
        feeData.maxFeePerGas = feeData.lastBaseFeePerGas * BigInt(2) + feeData.maxPriorityFeePerGas;
      }

      return feeData;
    } catch (error) {
      // Fallback to just gas price
      const gasPrice = await this.getGasPrice();
      return {
        gasPrice,
        lastBaseFeePerGas: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };
    }
  }

  async sendRawTransaction(signedTransaction: string): Promise<TransactionResponse> {
    const hash = await this.request<string>('eth_sendRawTransaction', [signedTransaction]);
    return { hash } as TransactionResponse;
  }

  async call(transaction: TransactionRequest, blockTag: BlockTag = 'latest'): Promise<string> {
    return await this.request<string>('eth_call', [transaction, blockTag]);
  }

  async estimateGas(transaction: TransactionRequest): Promise<bigint> {
    const result = await this.request<string>('eth_estimateGas', [transaction]);
    return BigInt(result);
  }

  async getTransactionCount(address: string, blockTag: BlockTag = 'latest'): Promise<number> {
    const result = await this.request<string>('eth_getTransactionCount', [address, blockTag]);
    return parseInt(result, 16);
  }

  async getBlock(blockHashOrTag: BlockTag | string): Promise<Block> {
    return await this.request<Block>('eth_getBlockByNumber', [blockHashOrTag, false]);
  }

  async getBlockWithTransactions(blockHashOrTag: BlockTag | string): Promise<BlockWithTransactions> {
    return await this.request<BlockWithTransactions>('eth_getBlockByNumber', [blockHashOrTag, true]);
  }

  async getTransaction(transactionHash: string): Promise<TransactionResponse> {
    return await this.request<TransactionResponse>('eth_getTransactionByHash', [transactionHash]);
  }

  async getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
    return await this.request<TransactionReceipt>('eth_getTransactionReceipt', [transactionHash]);
  }

  async getLogs(filter: Filter): Promise<EVMLog[]> {
    const logs = await this.request<Log[]>('eth_getLogs', [filter]);
    return logs.map(log => ({
      ...log,
      blockNumber: log.blockNumber || 0,
      blockHash: log.blockHash || '',
      transactionHash: log.transactionHash || '',
      transactionIndex: log.transactionIndex || 0,
      logIndex: log.logIndex || 0,
      removed: false // Default to false for normal logs
    }));
  }

  // ENS support (Ethereum only)
  async resolveName?(name: string): Promise<string | null> {
    if (this._blockchain.toLowerCase() !== 'ethereum') {
      return null;
    }
    
    try {
      // This is a simplified ENS resolution - full implementation would be more complex
      const result = await this.request<string>('eth_resolveName', [name]);
      return result;
    } catch (error) {
      return null;
    }
  }

  async lookupAddress?(address: string): Promise<string | null> {
    if (this._blockchain.toLowerCase() !== 'ethereum') {
      return null;
    }
    
    try {
      const result = await this.request<string>('eth_lookupAddress', [address]);
      return result;
    } catch (error) {
      return null;
    }
  }
}
import { BaseProvider } from '../base/BaseProvider';
import type { BigNumberish, BlockTag, TransactionRequest, TransactionResponse, FeeData, Filter, Block, BlockWithTransactions, TransactionReceipt } from '../base/BaseProvider';
import type { Log as EVMLog } from '$lib/common/evm';

/**
 * Direct Alchemy provider that works with a simple API key
 * This bypasses the KeyManager for simpler initialization
 */
export class DirectAlchemyProvider extends BaseProvider {
  private alchemyNetwork: string;
  private apiKey: string;

  constructor(
    chainId: number,
    apiKey: string,
    options: {
      blockchain?: string;
      supportedChainIds?: number[];
    } = {}
  ) {
    const {
      blockchain = 'ethereum',
      supportedChainIds = [chainId]
    } = options;

    const alchemyNetwork = DirectAlchemyProvider.mapChainIdToAlchemyNetwork(chainId);
    const endpoint = `https://${alchemyNetwork}.g.alchemy.com/v2/${apiKey}`;

    super(
      `direct-alchemy-${chainId}`,
      chainId,
      blockchain,
      supportedChainIds,
      endpoint
    );

    this.alchemyNetwork = alchemyNetwork;
    this.apiKey = apiKey;
    
    console.log(`[DirectAlchemyProvider] Created provider for ${alchemyNetwork} with endpoint: ${endpoint.substring(0, 50)}...`);
  }

  /**
   * Map chain ID to Alchemy network identifier
   */
  private static mapChainIdToAlchemyNetwork(chainId: number): string {
    const networkMap: Record<number, string> = {
      1: 'eth-mainnet',
      5: 'eth-goerli',
      11155111: 'eth-sepolia',
      137: 'polygon-mainnet',
      80001: 'polygon-mumbai',
      42161: 'arb-mainnet',
      421613: 'arb-goerli',
      10: 'opt-mainnet',
      420: 'opt-goerli',
      8453: 'base-mainnet',
      84531: 'base-goerli'
    };
    
    const network = networkMap[chainId];
    if (!network) {
      throw new Error(`Alchemy does not support chain ID ${chainId}`);
    }
    
    return network;
  }

  /**
   * Connect to the Alchemy provider
   */
  protected async doConnect(chainId: number): Promise<void> {
    console.log(`[DirectAlchemyProvider] Connecting to ${this.alchemyNetwork}...`);
    
    // Test the connection with a simple request
    try {
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: []
      };

      const response = await fetch(this._endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Provider error');
      }

      console.log(`[DirectAlchemyProvider] Successfully connected to ${this.alchemyNetwork}`);
      this._isConnected = true;
    } catch (error) {
      console.error(`[DirectAlchemyProvider] Failed to connect:`, error);
      throw error;
    }
  }

  /**
   * Make a JSON-RPC request
   */
  async request<T = unknown>(method: string, params?: unknown[]): Promise<T> {
    this.validateConnection();

    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params || []
    };

    try {
      const response = await fetch(this._endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Provider error');
      }

      return data.result as T;
    } catch (error) {
      console.error(`[DirectAlchemyProvider] Request failed for ${method}:`, error);
      throw error;
    }
  }

  // Implement required abstract methods from BaseProvider
  async getBalance(address: string, blockTag?: BlockTag): Promise<bigint> {
    const result = await this.request<string>('eth_getBalance', [
      address.toLowerCase(),
      blockTag || 'latest'
    ]);
    return BigInt(result);
  }

  async getTransactionCount(address: string, blockTag?: BlockTag): Promise<number> {
    const result = await this.request<string>('eth_getTransactionCount', [
      address.toLowerCase(),
      blockTag || 'latest'
    ]);
    return parseInt(result, 16);
  }

  async getGasPrice(): Promise<bigint> {
    const result = await this.request<string>('eth_gasPrice');
    return BigInt(result);
  }

  async estimateGas(transaction: TransactionRequest): Promise<bigint> {
    const result = await this.request<string>('eth_estimateGas', [transaction]);
    return BigInt(result);
  }

  async sendRawTransaction(signedTransaction: string): Promise<TransactionResponse> {
    const hash = await this.request<string>('eth_sendRawTransaction', [signedTransaction]);
    // For now, return a minimal TransactionResponse
    // In a real implementation, you'd fetch the full transaction details
    return {
      hash,
      from: '',
      to: null,
      nonce: 0,
      gasLimit: BigInt(0),
      gasPrice: BigInt(0),
      data: '',
      value: BigInt(0),
      chainId: this.chainId,
      wait: async () => null
    } as TransactionResponse;
  }

  async sendTransaction(signedTransaction: string): Promise<string> {
    const response = await this.sendRawTransaction(signedTransaction);
    return response.hash;
  }

  async getTransaction(hash: string): Promise<TransactionResponse | null> {
    return await this.request<TransactionResponse | null>('eth_getTransactionByHash', [hash]);
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
    return await this.request<TransactionReceipt | null>('eth_getTransactionReceipt', [hash]);
  }

  async getBlock(blockHashOrNumber: BlockTag): Promise<Block | null> {
    const method = typeof blockHashOrNumber === 'string' && blockHashOrNumber.startsWith('0x')
      ? 'eth_getBlockByHash'
      : 'eth_getBlockByNumber';
    
    return await this.request<Block | null>(method, [blockHashOrNumber, false]);
  }

  async getBlockWithTransactions(blockHashOrNumber: BlockTag): Promise<BlockWithTransactions | null> {
    const method = typeof blockHashOrNumber === 'string' && blockHashOrNumber.startsWith('0x')
      ? 'eth_getBlockByHash'
      : 'eth_getBlockByNumber';
    
    return await this.request<BlockWithTransactions | null>(method, [blockHashOrNumber, true]);
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.request<string>('eth_blockNumber');
    return parseInt(result, 16);
  }

  async getCode(address: string, blockTag?: BlockTag): Promise<string> {
    return await this.request<string>('eth_getCode', [
      address.toLowerCase(),
      blockTag || 'latest'
    ]);
  }

  async getLogs(filter: Filter): Promise<EVMLog[]> {
    const logs = await this.request<any[]>('eth_getLogs', [filter]);
    // Convert to EVMLog format with required 'removed' field
    return logs.map(log => ({
      ...log,
      removed: log.removed || false
    }));
  }

  async call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string> {
    return await this.request<string>('eth_call', [
      transaction,
      blockTag || 'latest'
    ]);
  }

  async getFeeData(): Promise<FeeData> {
    const [gasPrice, block] = await Promise.all([
      this.getGasPrice(),
      this.getBlock('latest')
    ]);

    let maxFeePerGas: bigint | null = null;
    if (block?.baseFeePerGas) {
      // Convert BigNumberish to bigint
      if (typeof block.baseFeePerGas === 'string') {
        maxFeePerGas = BigInt(block.baseFeePerGas) * 2n;
      } else if (typeof block.baseFeePerGas === 'number' || typeof block.baseFeePerGas === 'bigint') {
        maxFeePerGas = BigInt(block.baseFeePerGas) * 2n;
      } else {
        // Handle BigNumber or other types
        maxFeePerGas = BigInt(block.baseFeePerGas.toString()) * 2n;
      }
    }

    return {
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas: BigInt('1500000000') // 1.5 gwei default
    };
  }

  async getStorageAt(address: string, position: BigNumberish, blockTag?: BlockTag): Promise<string> {
    // Convert BigNumberish to hex string
    let positionHex: string;
    if (typeof position === 'string') {
      positionHex = position.startsWith('0x') ? position : `0x${BigInt(position).toString(16)}`;
    } else if (typeof position === 'number' || typeof position === 'bigint') {
      positionHex = `0x${BigInt(position).toString(16)}`;
    } else {
      // Handle BigNumber or other types
      positionHex = `0x${BigInt(position.toString()).toString(16)}`;
    }
    
    return await this.request<string>('eth_getStorageAt', [
      address.toLowerCase(),
      positionHex,
      blockTag || 'latest'
    ]);
  }

  /**
   * Disconnect from the provider
   */
  protected async doDisconnect(): Promise<void> {
    console.log(`[DirectAlchemyProvider] Disconnecting from ${this.alchemyNetwork}`);
    this._isConnected = false;
  }

  /**
   * Get the provider info
   */
  getProviderInfo(): { name: string; endpoint: string; network: string } {
    return {
      name: `DirectAlchemyProvider-${this.chainId}`,
      endpoint: this._endpoint,
      network: this.alchemyNetwork
    };
  }
}
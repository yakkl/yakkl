import { BaseProvider } from '../base/BaseProvider';
import type { BigNumberish } from '../base/BaseProvider';
import type {
  BlockTag as CoreBlockTag,
  TransactionRequest as CoreTransactionRequest,
  TransactionResponse as CoreTransactionResponse,
  FeeData as CoreFeeData,
  Filter as CoreFilter,
  Block as CoreBlock,
  BlockWithTransactions as CoreBlockWithTransactions,
  TransactionReceipt as CoreTransactionReceipt,
  Log as CoreLog
} from '@yakkl/core';
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
    console.log(`[DirectAlchemyProvider] Connecting to ${this.alchemyNetwork} for chain ${chainId}...`);

    // Validate that the chain ID matches what we expect
    if (chainId !== this.chainId) {
      throw new Error(`Chain ID mismatch: expected ${this.chainId}, got ${chainId}`);
    }

    // Test the connection with a simple request
    try {
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_chainId',
        params: []
      };

      console.log(`[DirectAlchemyProvider] Testing connection to endpoint: ${this._endpoint.substring(0, 50)}...`);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this._endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`Provider RPC error: ${data.error.message || data.error.code || 'Unknown provider error'}`);
      }

      // Verify the chain ID matches
      const returnedChainId = parseInt(data.result, 16);
      if (returnedChainId !== chainId) {
        throw new Error(`Chain ID verification failed: expected ${chainId}, provider returned ${returnedChainId}`);
      }

      console.log(`[DirectAlchemyProvider] Successfully connected to ${this.alchemyNetwork} (chain ${chainId})`);
      // The BaseProvider.connect() will set _isConnected to true after this method returns successfully
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown connection error';
      console.error(`[DirectAlchemyProvider] Connection failed for ${this.alchemyNetwork} (chain ${chainId}):`, {
        error: errorMsg,
        endpoint: this._endpoint.substring(0, 50) + '...',
        chainId,
        network: this.alchemyNetwork
      });
      throw new Error(`Failed to connect to Alchemy provider for chain ${chainId}: ${errorMsg}`);
    }
  }


  // Implement required abstract methods from BaseProvider
  async getBalance(address: string, blockTag?: CoreBlockTag): Promise<bigint> {
    const result = await this.makeRequest<string>('eth_getBalance', [
      address.toLowerCase(),
      blockTag || 'latest'
    ]);
    return BigInt(result);
  }

  async getTransactionCount(address: string, blockTag?: CoreBlockTag): Promise<number> {
    const result = await this.makeRequest<string>('eth_getTransactionCount', [
      address.toLowerCase(),
      blockTag || 'latest'
    ]);
    return parseInt(result, 16);
  }

  async getGasPrice(): Promise<bigint> {
    const result = await this.makeRequest<string>('eth_gasPrice');
    return BigInt(result);
  }


  async getTransaction(hash: string): Promise<CoreTransactionResponse | null> {
    return await this.makeRequest<CoreTransactionResponse | null>('eth_getTransactionByHash', [hash]);
  }

  async getTransactionReceipt(hash: string): Promise<CoreTransactionReceipt | null> {
    return await this.makeRequest<CoreTransactionReceipt | null>('eth_getTransactionReceipt', [hash]);
  }

  async getBlock(blockHashOrNumber: CoreBlockTag | string): Promise<CoreBlock | null> {
    const method = typeof blockHashOrNumber === 'string' && blockHashOrNumber.startsWith('0x')
      ? 'eth_getBlockByHash'
      : 'eth_getBlockByNumber';
    
    return await this.makeRequest<CoreBlock | null>(method, [blockHashOrNumber, false]);
  }

  async getBlockWithTransactions(blockHashOrNumber: CoreBlockTag | string): Promise<CoreBlockWithTransactions | null> {
    const method = typeof blockHashOrNumber === 'string' && blockHashOrNumber.startsWith('0x')
      ? 'eth_getBlockByHash'
      : 'eth_getBlockByNumber';
    
    return await this.makeRequest<CoreBlockWithTransactions | null>(method, [blockHashOrNumber, true]);
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.makeRequest<string>('eth_blockNumber');
    return parseInt(result, 16);
  }

  async getCode(address: string, blockTag?: CoreBlockTag): Promise<string> {
    return await this.makeRequest<string>('eth_getCode', [
      address.toLowerCase(),
      blockTag || 'latest'
    ]);
  }

  async getLogs(filter: CoreFilter): Promise<CoreLog[]> {
    const logs = await this.makeRequest<any[]>('eth_getLogs', [filter]);
    // Convert to EVMLog format with required 'removed' field
    return logs.map(log => ({
      ...log,
      removed: log.removed || false
    }));
  }

  async call(transaction: CoreTransactionRequest, blockTag?: CoreBlockTag): Promise<string> {
    return await this.makeRequest<string>('eth_call', [
      transaction,
      blockTag || 'latest'
    ]);
  }

  async estimateGas(transaction: CoreTransactionRequest): Promise<bigint> {
    const result = await this.makeRequest<string>('eth_estimateGas', [transaction]);
    return BigInt(result);
  }

  async getFeeData(): Promise<CoreFeeData> {
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
        maxFeePerGas = BigInt((block.baseFeePerGas as any).toString()) * 2n;
      }
    }

    return {
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas: BigInt('1500000000') // 1.5 gwei default
    };
  }

  async getStorageAt(address: string, position: BigNumberish, blockTag?: CoreBlockTag): Promise<string> {
    // Convert BigNumberish to hex string
    let positionHex: string;
    if (typeof position === 'string') {
      positionHex = position.startsWith('0x') ? position : `0x${BigInt(position).toString(16)}`;
    } else if (typeof position === 'number' || typeof position === 'bigint') {
      positionHex = `0x${BigInt(position).toString(16)}`;
    } else {
      // Handle BigNumber or other types
      positionHex = `0x${BigInt((position as any).toString()).toString(16)}`;
    }
    
    return await this.makeRequest<string>('eth_getStorageAt', [
      address.toLowerCase(),
      positionHex,
      blockTag || 'latest'
    ]);
  }

  /**
   * Implement abstract doRequest method
   */
  protected async doRequest<T = unknown>(method: string, params?: unknown[]): Promise<T> {
    this.validateConnection();

    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params || []
    };

    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this._endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`RPC error for ${method}: ${data.error.message || data.error.code || 'Unknown provider error'}`);
      }

      return data.result as T;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[DirectAlchemyProvider] Request failed for ${method}:`, {
        error: errorMsg,
        method,
        params,
        endpoint: this._endpoint.substring(0, 50) + '...',
        isConnected: this.isConnected
      });
      throw error;
    }
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
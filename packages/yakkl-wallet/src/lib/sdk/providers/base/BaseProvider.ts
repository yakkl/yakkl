import type {
  ProviderInterface,
  ProviderMetadata,
  ChainInfo,
  ProviderHealthMetrics,
  ProviderCostMetrics
} from '@yakkl/core';
import { ChainType } from '@yakkl/core';
import type {
  BigNumberish,
  BlockTag as CoreBlockTag,
  TransactionRequest as CoreTransactionRequest,
  TransactionResponse as CoreTransactionResponse,
  TransactionReceipt as CoreTransactionReceipt,
  FeeData as CoreFeeData,
  Filter as CoreFilter,
  Log as CoreLog,
  Block as CoreBlock,
  BlockWithTransactions as CoreBlockWithTransactions
} from '@yakkl/core';
import { TypeAdapterUtils, type CompatibleBlockTag, type EnhancedTransactionReceipt, type EnhancedTransactionResponse, type UnifiedBigNumberish, type UnifiedFeeData } from '../../types/adapters';

// Re-export commonly used types
export type { BigNumberish };

// Common blockchain types (these would typically come from a shared types package)
export type BlockTag = 
  | 'latest' 
  | 'earliest' 
  | 'pending' 
  | 'finalized' 
  | 'safe'
  | number 
  | string 
  | {
      blockHash?: string;
      blockNumber?: number | string;
    };

export interface TransactionRequest {
  to?: string;
  from?: string;
  value?: BigNumberish;
  data?: string;
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  nonce?: number;
}

export interface TransactionResponse {
  hash: string;
  blockHash?: string;
  blockNumber?: number;
  transactionIndex?: number;
  from: string;
  to?: string;
  value: BigNumberish;
  gasPrice?: BigNumberish;
  gasLimit: BigNumberish;
  data: string;
  nonce: number;
  confirmations?: number;
  // Additional properties for compatibility
  type?: number;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  accessList?: Array<{
    address: string;
    storageKeys: string[];
  }>;
  chainId?: number;
}

export interface FeeData {
  gasPrice: bigint;
  lastBaseFeePerGas?: bigint | null;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
}

export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber?: number;
  blockHash?: string;
  transactionHash?: string;
  transactionIndex?: number;
  logIndex?: number;
}

export interface Filter {
  address?: string | string[];
  topics?: Array<string | string[] | null>;
  fromBlock?: BlockTag | number | string;
  toBlock?: BlockTag | number | string;
}

export interface Block {
  hash: string;
  parentHash: string;
  number: number;
  timestamp: number;
  gasLimit: BigNumberish;
  gasUsed: BigNumberish;
  miner: string;
  baseFeePerGas?: BigNumberish;
  transactions: string[];
}

export interface BlockWithTransactions extends Omit<Block, 'transactions'> {
  transactions: TransactionResponse[];
}

export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to?: string;
  gasUsed: BigNumberish;
  cumulativeGasUsed: BigNumberish;
  contractAddress?: string;
  logs: Log[];
  status?: number;
  effectiveGasPrice?: BigNumberish;
  // Additional properties for compatibility
  logsBloom?: string;
  confirmations?: number;
  type?: number;
  byzantium?: boolean;
  root?: string;
}

/**
 * Abstract base provider implementing the IProvider interface
 * This class provides common functionality for all blockchain providers
 */
export abstract class BaseProvider implements ProviderInterface {
  protected _metadata: ProviderMetadata;
  protected _chainInfo: ChainInfo;
  protected _isConnected: boolean = false;
  protected _endpoint: string;
  protected _rawProvider: unknown;

  constructor(
    name: string,
    chainId: number,
    blockchain: string,
    supportedChainIds: number[],
    endpoint: string
  ) {
    this._metadata = {
      name,
      priority: 1,
      supportedMethods: ['eth_call', 'eth_getBalance', 'eth_sendRawTransaction'], // Basic methods
      supportedChainIds,
      costStructure: 'request' as const
    };
    this._chainInfo = {
      chainId,
      name: blockchain,
      type: ChainType.EVM,
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: [endpoint]
    };
    this._endpoint = endpoint;
  }

  // ProviderInterface implementation
  get metadata(): ProviderMetadata {
    return this._metadata;
  }

  get chainInfo(): ChainInfo {
    return this._chainInfo;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  // Legacy getters for backward compatibility
  get name(): string {
    return this._metadata.name;
  }

  get chainId(): number {
    return this._chainInfo.chainId as number;
  }

  get blockchain(): string {
    return this._chainInfo.name;
  }

  get supportedChainIds(): number[] {
    return [...this._metadata.supportedChainIds];
  }

  /**
   * Connect to the specified chain
   */
  async connect(chainId?: number): Promise<void> {
    const targetChainId = chainId || (this._chainInfo.chainId as number);

    if (!this._metadata.supportedChainIds.includes(targetChainId)) {
      throw new Error(`Chain ID ${targetChainId} is not supported by ${this._metadata.name}. Supported chains: ${this._metadata.supportedChainIds.join(', ')}`);
    }

    console.log(`[BaseProvider] ${this._metadata.name}: Attempting to connect to chain ${targetChainId}...`);

    // Reset connection state before attempting connection
    this._isConnected = false;
    this._chainInfo = { ...this._chainInfo, chainId: targetChainId };

    try {
      await this.doConnect(targetChainId);
      this._isConnected = true;
      console.log(`[BaseProvider] ${this._metadata.name}: Successfully connected to chain ${targetChainId}`);
    } catch (error) {
      this._isConnected = false;
      const errorMsg = error instanceof Error ? error.message : 'Unknown connection error';
      console.error(`[BaseProvider] ${this._metadata.name}: Failed to connect to chain ${targetChainId}:`, errorMsg);
      throw new Error(`${this._metadata.name} connection failed: ${errorMsg}`);
    }
  }

  /**
   * Disconnect from the provider
   */
  async disconnect(): Promise<void> {
    await this.doDisconnect();
    this._isConnected = false;
  }

  /**
   * Get the raw provider instance
   */
  getRawProvider(): unknown {
    return this._rawProvider;
  }

  /**
   * Get provider endpoint URL
   */
  getEndpoint(): string {
    return this._endpoint;
  }

  /**
   * Health check implementation
   */
  async healthCheck(): Promise<ProviderHealthMetrics> {
    const startTime = Date.now();

    try {
      // Try to get the latest block number as a health check
      await this.getBlockNumber();
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        successRate: 1.0,
        uptime: 100
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        successRate: 0.0,
        uptime: 0,
        lastError: {
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Make a JSON-RPC request with error handling and retries
   * This is a wrapper around the abstract doRequest method
   */
  protected async makeRequest<T = unknown>(
    method: string,
    params: unknown[] = [],
    retries: number = 1
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.doRequest<T>(method, params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // If it's not the last attempt, wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Validate that the provider is connected
   */
  protected validateConnection(): void {
    if (!this._isConnected) {
      throw new Error(`Provider ${this._metadata.name} is not connected to chain ${this._chainInfo.chainId}. Please call connect() first.`);
    }
  }

  // ======== ProviderInterface Required Methods ========

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: number): Promise<void> {
    await this.connect(chainId);
  }

  /**
   * EIP-1193 request format
   */
  async request<T = any>(args: { method: string; params?: any[] }): Promise<T> {
    return this.makeRequest<T>(args.method, args.params);
  }

  /**
   * Get network information
   */
  async getNetwork(): Promise<{ name: string; chainId: number }> {
    return {
      name: this.chainInfo.name,
      chainId: this.chainInfo.chainId as number
    };
  }

  /**
   * Get chain ID
   */
  async getChainId(): Promise<number> {
    return this.chainInfo.chainId as number;
  }

  /**
   * Send transaction (not just raw)
   */
  async sendTransaction(transaction: CoreTransactionRequest): Promise<CoreTransactionResponse> {
    throw new Error('sendTransaction not implemented - use sendRawTransaction for signed transactions');
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<CoreTransactionReceipt> {
    const maxAttempts = timeout ? Math.floor(timeout / 1000) : 60; // Default 60 seconds
    const targetConfirmations = confirmations || 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const receipt = await this.getTransactionReceipt(transactionHash);
      if (receipt && receipt.blockNumber) {
        const currentBlock = await this.getBlockNumber();
        const confirmationCount = currentBlock - receipt.blockNumber + 1;
        if (confirmationCount >= targetConfirmations) {
          return receipt as CoreTransactionReceipt;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Transaction ${transactionHash} not confirmed within timeout`);
  }

  /**
   * Event handling (basic implementation)
   */
  private eventHandlers = new Map<string, Set<(...args: any[]) => void>>();

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: (...args: any[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  once(event: string, handler: (...args: any[]) => void): void {
    const onceHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
  }

  /**
   * Get cost metrics (default implementation)
   */
  async getCostMetrics(): Promise<ProviderCostMetrics> {
    return {
      requestsUsed: 0,
      requestsLimit: 1000,
      methodCosts: {}
    };
  }

  /**
   * Get health metrics (default implementation)
   */
  async getHealthMetrics(): Promise<ProviderHealthMetrics> {
    const healthCheck = await this.healthCheck();
    return {
      healthy: healthCheck.healthy,
      latency: healthCheck.latency || 0,
      successRate: 1.0,
      uptime: 100
    };
  }

  // Abstract methods that must be implemented by concrete providers
  protected abstract doConnect(chainId: number): Promise<void>;
  protected abstract doDisconnect(): Promise<void>;

  // Core blockchain operations - abstract methods matching ProviderInterface
  protected abstract doRequest<T = unknown>(method: string, params?: unknown[]): Promise<T>;

  // Block information
  abstract getBlockNumber(): Promise<number>;
  abstract getBlock(blockHashOrTag: CoreBlockTag | string): Promise<CoreBlock | null>;
  abstract getBlockWithTransactions(blockHashOrTag: CoreBlockTag | string): Promise<CoreBlockWithTransactions | null>;

  // Account information
  abstract getBalance(address: string, blockTag?: CoreBlockTag): Promise<bigint>;
  abstract getTransactionCount(address: string, blockTag?: CoreBlockTag): Promise<number>;
  abstract getCode(address: string, blockTag?: CoreBlockTag): Promise<string>;

  // Transaction operations
  abstract call(transaction: CoreTransactionRequest, blockTag?: CoreBlockTag): Promise<string>;
  abstract estimateGas(transaction: CoreTransactionRequest): Promise<bigint>;
  abstract getTransaction(transactionHash: string): Promise<CoreTransactionResponse | null>;
  abstract getTransactionReceipt(transactionHash: string): Promise<CoreTransactionReceipt | null>;

  // Gas and fees
  abstract getGasPrice(): Promise<bigint>;
  abstract getFeeData(): Promise<CoreFeeData>;

  // Logs and events
  abstract getLogs(filter: CoreFilter): Promise<CoreLog[]>;

  // Optional methods (with fallback implementations)
  async getStorageAt?(address: string, position: BigNumberish, blockTag?: CoreBlockTag): Promise<string> {
    throw new Error('getStorageAt not implemented by this provider');
  }
  
  // Optional methods with default implementations
  async resolveName?(name: string): Promise<string | null> {
    // Default implementation returns null for non-Ethereum chains
    return null;
  }
  
  async lookupAddress?(address: string): Promise<string | null> {
    // Default implementation returns null for non-Ethereum chains
    return null;
  }
}
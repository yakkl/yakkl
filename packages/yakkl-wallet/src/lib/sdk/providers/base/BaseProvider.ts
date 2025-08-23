import type { IProvider } from '../../interfaces/IProvider';
import type { BigNumberish } from '../../core/bignumber';
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
export abstract class BaseProvider implements IProvider {
  protected _name: string;
  protected _chainId: number;
  protected _blockchain: string;
  protected _supportedChainIds: number[];
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
    this._name = name;
    this._chainId = chainId;
    this._blockchain = blockchain;
    this._supportedChainIds = supportedChainIds;
    this._endpoint = endpoint;
  }

  // Getters
  get name(): string {
    return this._name;
  }

  get chainId(): number {
    return this._chainId;
  }

  get blockchain(): string {
    return this._blockchain;
  }

  get supportedChainIds(): number[] {
    return [...this._supportedChainIds];
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Connect to the specified chain
   */
  async connect(chainId: number): Promise<void> {
    if (!this._supportedChainIds.includes(chainId)) {
      throw new Error(`Chain ID ${chainId} is not supported by ${this._name}`);
    }
    
    this._chainId = chainId;
    await this.doConnect(chainId);
    this._isConnected = true;
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
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Try to get the latest block number as a health check
      await this.getBlockNumber();
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Make a JSON-RPC request with error handling and retries
   */
  protected async makeRequest<T = unknown>(
    method: string, 
    params: unknown[] = [],
    retries: number = 1
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.request<T>(method, params);
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
      throw new Error(`Provider ${this._name} is not connected`);
    }
  }

  // Abstract methods that must be implemented by concrete providers
  protected abstract doConnect(chainId: number): Promise<void>;
  protected abstract doDisconnect(): Promise<void>;

  // Core blockchain operations - abstract methods with compatible signatures
  abstract request<T = unknown>(method: string, params?: unknown[]): Promise<T>;
  abstract getBlockNumber(): Promise<number>;
  abstract getBalance(address: string, blockTag?: CompatibleBlockTag): Promise<bigint>;
  abstract getCode(address: string, blockTag?: CompatibleBlockTag): Promise<string>;
  abstract getStorageAt(address: string, position: UnifiedBigNumberish, blockTag?: CompatibleBlockTag): Promise<string>;
  abstract getGasPrice(): Promise<bigint>;
  abstract getFeeData(): Promise<UnifiedFeeData>;
  abstract sendRawTransaction(signedTransaction: string): Promise<TransactionResponse>;
  abstract call(transaction: TransactionRequest, blockTag?: CompatibleBlockTag): Promise<string>;
  abstract estimateGas(transaction: TransactionRequest): Promise<bigint>;
  abstract getTransactionCount(address: string, blockTag?: CompatibleBlockTag): Promise<number>;
  abstract getBlock(blockHashOrTag: CompatibleBlockTag | string): Promise<Block>;
  abstract getBlockWithTransactions(blockHashOrTag: CompatibleBlockTag | string): Promise<BlockWithTransactions>;
  abstract getTransaction(transactionHash: string): Promise<TransactionResponse>;
  abstract getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;
  abstract getLogs(filter: Filter): Promise<import('$lib/common/evm').Log[]>;
  
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
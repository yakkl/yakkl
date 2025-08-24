import type { BigNumberish, Log as EVMLog } from '$lib/common';
import type { CompatibleBlockTag, UnifiedBigNumberish, UnifiedFeeData } from '../types/adapters';
import type { Filter } from '../providers/base/BaseProvider';
import type { TransactionRequest, TransactionResponse, TransactionReceipt, Block, BlockWithTransactions } from '../providers/base/BaseProvider';

/**
 * Base provider interface with EIP-1193 and common blockchain operations
 * This interface follows EIP-1193 standards for Ethereum-compatible chains
 * while also supporting other blockchain types through abstraction
 */
export interface IProvider {
  /** Provider name (e.g., 'alchemy', 'infura', 'quicknode') */
  readonly name: string;
  
  /** Chain ID this provider is configured for */
  readonly chainId: number;
  
  /** Blockchain type (e.g., 'ethereum', 'polygon', 'optimism') */
  readonly blockchain: string;
  
  /** Supported chain IDs for this provider */
  readonly supportedChainIds: number[];
  
  /** Provider status */
  readonly isConnected: boolean;
  
  /**
   * Connect to the specified chain
   * @param chainId - Chain ID to connect to
   */
  connect(chainId: number): Promise<void>;
  
  /**
   * Disconnect from the provider
   */
  disconnect(): Promise<void>;
  
  /**
   * Make a JSON-RPC request
   * @param method - RPC method name
   * @param params - Method parameters
   */
  request<T = unknown>(method: string, params?: unknown[]): Promise<T>;
  
  // Core blockchain operations
  getBlockNumber(): Promise<number>;
  getBalance(address: string, blockTag?: CompatibleBlockTag): Promise<bigint>;
  getCode(address: string, blockTag?: CompatibleBlockTag): Promise<string>;
  getStorageAt(address: string, position: UnifiedBigNumberish, blockTag?: CompatibleBlockTag): Promise<string>;
  getGasPrice(): Promise<bigint>;
  getFeeData(): Promise<UnifiedFeeData>;
  
  // Transaction operations
  sendRawTransaction(signedTransaction: string): Promise<TransactionResponse>;
  call(transaction: TransactionRequest, blockTag?: CompatibleBlockTag): Promise<string>;
  estimateGas(transaction: TransactionRequest): Promise<bigint>;
  getTransactionCount(address: string, blockTag?: CompatibleBlockTag): Promise<number>;
  
  // Block operations
  getBlock(blockHashOrTag: CompatibleBlockTag | string): Promise<Block>;
  getBlockWithTransactions(blockHashOrTag: CompatibleBlockTag | string): Promise<BlockWithTransactions>;
  
  // Transaction history
  getTransaction(transactionHash: string): Promise<TransactionResponse>;
  getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt>;
  
  // Logs and events
  getLogs(filter: Filter): Promise<EVMLog[]>;
  
  // ENS operations (Ethereum-specific, may return null for other chains)
  resolveName?(name: string): Promise<string | null>;
  lookupAddress?(address: string): Promise<string | null>;
  
  /**
   * Get the raw provider instance (e.g., ethers provider)
   */
  getRawProvider(): unknown;
  
  /**
   * Get provider endpoint URL
   */
  getEndpoint(): string;
  
  /**
   * Health check for the provider
   */
  healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
  
  /**
   * Get a signer for the provider (Ethereum-specific)
   * Optional method for providers that support signing
   */
  getSigner?(privateKey: string): Promise<any>;
}
/**
 * Provider types and interfaces for blockchain interactions
 */

// Common blockchain types
export type BlockTag = 
  | 'latest' 
  | 'earliest' 
  | 'pending' 
  | 'finalized' 
  | 'safe'
  | number 
  | string;

export type BigNumberish = string | number | bigint;

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
  chainId?: number;
  type?: number;
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
  type?: number;
  maxFeePerGas?: BigNumberish;
  maxPriorityFeePerGas?: BigNumberish;
  accessList?: Array<{
    address: string;
    storageKeys: string[];
  }>;
  chainId?: number;
  wait: (confirmations?: number) => Promise<TransactionReceipt>;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockHash: string;
  blockNumber: number;
  transactionIndex: number;
  from: string;
  to?: string;
  contractAddress?: string;
  cumulativeGasUsed: BigNumberish;
  gasUsed: BigNumberish;
  effectiveGasPrice?: BigNumberish;
  logs: Log[];
  logsBloom: string;
  status?: number;
  type?: number;
  byzantium?: boolean;
}

export interface FeeData {
  gasPrice: bigint | null;
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
  removed?: boolean;
}

export interface Filter {
  address?: string | string[];
  topics?: Array<string | string[] | null>;
  fromBlock?: BlockTag;
  toBlock?: BlockTag;
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
  difficulty?: BigNumberish;
  totalDifficulty?: BigNumberish;
  extraData?: string;
  size?: number;
  nonce?: string;
  sha3Uncles?: string;
  uncles?: string[];
}

export interface BlockWithTransactions extends Omit<Block, 'transactions'> {
  transactions: TransactionResponse[];
}

// Provider configuration types
export interface ProviderConfig {
  url?: string;
  apiKey?: string;
  network?: string;
  chainId?: number;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Network provider types
export interface NetworkProviderConfig extends ProviderConfig {
  name: string;
  blockchains: string[];
  chainIds: number[];
}

// Price provider types
export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
  change24h?: number;
  volume24h?: number;
  marketCap?: number;
}

export interface PriceProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  symbols?: string[];
  currency?: string;
  interval?: number;
}

// Gas provider types
export interface GasEstimate {
  slow: bigint;
  standard: bigint;
  fast: bigint;
  baseFee?: bigint;
  priority?: {
    slow: bigint;
    standard: bigint;
    fast: bigint;
  };
}

// Event types
export type EventType = string | Array<string | string[]> | Filter;
export type Listener = (...args: any[]) => void;

// Base provider interface
export interface IProvider {
  // Network information
  getNetwork(): Promise<{ name: string; chainId: number }>;
  getChainId(): Promise<number>;
  
  // Block information
  getBlockNumber(): Promise<number>;
  getBlock(blockHashOrBlockTag: BlockTag | string): Promise<Block | null>;
  getBlockWithTransactions(blockHashOrBlockTag: BlockTag | string): Promise<BlockWithTransactions | null>;
  
  // Account information
  getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
  getTransactionCount(address: string, blockTag?: BlockTag): Promise<number>;
  getCode(address: string, blockTag?: BlockTag): Promise<string>;
  
  // Transaction operations
  call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
  estimateGas(transaction: TransactionRequest): Promise<bigint>;
  sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
  getTransaction(transactionHash: string): Promise<TransactionResponse | null>;
  getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt | null>;
  waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<TransactionReceipt>;
  
  // Gas and fees
  getGasPrice(): Promise<bigint>;
  getFeeData(): Promise<FeeData>;
  
  // Logs and events
  getLogs(filter: Filter): Promise<Log[]>;
  on(eventName: EventType, listener: Listener): void;
  once(eventName: EventType, listener: Listener): void;
  off(eventName: EventType, listener?: Listener): void;
  removeAllListeners(eventName?: EventType): void;
  
  // Provider lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
/**
 * Provider Interface - The foundation of YAKKL SDK's provider system
 *
 * Unlike Ethers/Viem which are tightly coupled to specific providers,
 * YAKKL SDK uses a plugin architecture that allows any provider to be used.
 */

export interface TransactionRequest {
  from?: string;
  to?: string;
  value?: string | bigint;
  data?: string;
  gas?: string | bigint;
  gasPrice?: string | bigint;
  maxFeePerGas?: string | bigint;
  maxPriorityFeePerGas?: string | bigint;
  nonce?: number;
  chainId?: number;
}

export interface TransactionResponse {
  hash: string;
  from: string;
  to?: string;
  value: string;
  data: string;
  blockNumber?: number;
  blockHash?: string;
  timestamp?: number;
  confirmations: number;
  status?: 'pending' | 'confirmed' | 'failed';
}

export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  miner: string;
  gasLimit: string;
  gasUsed: string;
  baseFeePerGas?: string;
  transactions: string[];
}

export interface ProviderConfig {
  url?: string;
  apiKey?: string;
  network?: string;
  chainId?: number;
  timeout?: number;
  retries?: number;
  priority?: number; // For load balancing
  weight?: number;   // For weighted round-robin
  rateLimit?: {
    requests: number;
    window: number; // milliseconds
  };
}

export enum ProviderType {
  ALCHEMY = 'alchemy',
  INFURA = 'infura',
  QUICKNODE = 'quicknode',
  ETHERSCAN = 'etherscan',
  CUSTOM = 'custom',
  BROWSER_EXTENSION = 'browser_extension',
  WEBSOCKET = 'websocket',
  IPC = 'ipc'
}

export interface ProviderStats {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  lastError?: Error;
  lastRequestTime?: Date;
  isHealthy: boolean;
}

/**
 * Core Provider Interface
 * All providers must implement this interface
 */
export interface IProvider {
  // Identification
  readonly type: ProviderType;
  readonly name: string;
  readonly config: ProviderConfig;

  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Core RPC methods
  call(method: string, params: any[]): Promise<any>;
  send(method: string, params: any[]): Promise<any>;
  request(args: { method: string; params?: any[] }): Promise<any>;

  // Ethereum methods
  getBalance(address: string): Promise<string>;
  getTransactionCount(address: string): Promise<number>;
  getGasPrice(): Promise<string>;
  estimateGas(transaction: TransactionRequest): Promise<string>;
  sendTransaction(transaction: TransactionRequest): Promise<string>;
  getTransaction(hash: string): Promise<TransactionResponse | null>;
  getTransactionReceipt(hash: string): Promise<any>;
  getBlock(blockHashOrNumber: string | number): Promise<BlockInfo>;
  getBlockNumber(): Promise<number>;
  getChainId(): Promise<number>;

  // Advanced features
  subscribe?(event: string, callback: (data: any) => void): void;
  unsubscribe?(event: string, callback: (data: any) => void): void;

  // Health monitoring
  getStats(): ProviderStats;
  healthCheck(): Promise<boolean>;

  // Batch requests (optional but recommended)
  batch?(requests: Array<{ method: string; params: any[] }>): Promise<any[]>;
}

/**
 * Provider capabilities
 * Allows providers to advertise their features
 */
export interface ProviderCapabilities {
  websocket: boolean;
  batch: boolean;
  subscription: boolean;
  archive: boolean;  // Historical data
  trace: boolean;    // Debug/trace methods
  logs: boolean;     // Event logs
  pending: boolean;  // Pending transaction pool
}

/**
 * Abstract base class for providers
 * Provides common functionality and patterns
 */
export abstract class BaseProvider implements IProvider {
  abstract readonly type: ProviderType;
  abstract readonly name: string;
  public readonly config: ProviderConfig;

  protected stats: ProviderStats = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    isHealthy: true
  };

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  // Abstract methods that must be implemented
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): boolean;
  abstract call(method: string, params: any[]): Promise<any>;

  // Default implementations using call()
  async send(method: string, params: any[]): Promise<any> {
    return this.call(method, params);
  }

  async request(args: { method: string; params?: any[] }): Promise<any> {
    return this.call(args.method, args.params || []);
  }

  async getBalance(address: string): Promise<string> {
    return this.call('eth_getBalance', [address, 'latest']);
  }

  async getTransactionCount(address: string): Promise<number> {
    const result = await this.call('eth_getTransactionCount', [address, 'latest']);
    return parseInt(result, 16);
  }

  async getGasPrice(): Promise<string> {
    return this.call('eth_gasPrice', []);
  }

  async estimateGas(transaction: TransactionRequest): Promise<string> {
    return this.call('eth_estimateGas', [transaction]);
  }

  async sendTransaction(transaction: TransactionRequest): Promise<string> {
    return this.call('eth_sendTransaction', [transaction]);
  }

  async getTransaction(hash: string): Promise<TransactionResponse | null> {
    return this.call('eth_getTransactionByHash', [hash]);
  }

  async getTransactionReceipt(hash: string): Promise<any> {
    return this.call('eth_getTransactionReceipt', [hash]);
  }

  async getBlock(blockHashOrNumber: string | number): Promise<BlockInfo> {
    const method = typeof blockHashOrNumber === 'string'
      ? 'eth_getBlockByHash'
      : 'eth_getBlockByNumber';
    const param = typeof blockHashOrNumber === 'number'
      ? `0x${blockHashOrNumber.toString(16)}`
      : blockHashOrNumber;
    return this.call(method, [param, false]);
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.call('eth_blockNumber', []);
    return parseInt(result, 16);
  }

  async getChainId(): Promise<number> {
    const result = await this.call('eth_chainId', []);
    return parseInt(result, 16);
  }

  getStats(): ProviderStats {
    return { ...this.stats };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getBlockNumber();
      this.stats.isHealthy = true;
      return true;
    } catch (error) {
      this.stats.isHealthy = false;
      this.stats.lastError = error as Error;
      return false;
    }
  }

  // Helper method to track stats
  protected async trackRequest<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.stats.requestCount++;
    this.stats.lastRequestTime = new Date();

    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;

      // Update average response time
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.requestCount - 1) + responseTime)
        / this.stats.requestCount;

      return result;
    } catch (error) {
      this.stats.errorCount++;
      this.stats.lastError = error as Error;
      throw error;
    }
  }
}
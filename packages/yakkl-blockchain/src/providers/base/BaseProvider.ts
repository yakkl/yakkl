/**
 * Base provider implementation with common functionality
 */

import {
  ChainType
} from '@yakkl/core';

import type {
  ProviderInterface,
  Block,
  BlockTag,
  BlockWithTransactions,
  EventType,
  FeeData,
  Filter,
  Listener,
  Log,
  NetworkProviderConfig,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
  ChainInfo,
  ProviderMetadata,
  ProviderCostMetrics,
  ProviderHealthMetrics
} from '../types';

export abstract class BaseProvider implements ProviderInterface {
  protected config: NetworkProviderConfig;
  protected listeners: Map<string, Set<Listener>> = new Map();
  protected _connected: boolean = false;
  protected name: string;
  protected blockchains: string[];
  protected chainIds: number[];
  protected currentChainId: number;

  // Required properties from ProviderInterface
  readonly metadata: ProviderMetadata;
  readonly chainInfo: ChainInfo;

  // Getter for isConnected property
  get isConnected(): boolean {
    return this._connected;
  }

  constructor(config: NetworkProviderConfig) {
    this.config = config;
    this.name = config.name;
    this.blockchains = config.blockchains || [];
    this.chainIds = config.chainIds || [];
    this.currentChainId = this.chainIds[0] || 1;

    // Initialize metadata for routing
    this.metadata = {
      name: this.name,
      priority: config.priority || 10,
      supportedMethods: ['*'], // Will be overridden by subclasses
      supportedChainIds: this.chainIds,
      costStructure: 'free', // Will be overridden by subclasses
      features: {
        websocket: false,
        batchRequests: false
      }
    };

    // Initialize chain info
    this.chainInfo = {
      chainId: this.currentChainId,
      name: this.getChainName(this.currentChainId),
      type: ChainType.EVM, // Default to EVM, override in subclasses
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
      },
      rpcUrls: config.url ? [config.url] : [],
      isTestnet: this.isTestnetChain(this.currentChainId)
    };
  }

  // Abstract methods that must be implemented by concrete providers
  abstract getNetwork(): Promise<{ name: string; chainId: number }>;
  abstract getChainId(): Promise<number>;
  abstract getBlockNumber(): Promise<number>;
  abstract getBlock(blockHashOrBlockTag: BlockTag | string): Promise<Block | null>;
  abstract getBlockWithTransactions(blockHashOrBlockTag: BlockTag | string): Promise<BlockWithTransactions | null>;
  abstract getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
  abstract getTransactionCount(address: string, blockTag?: BlockTag): Promise<number>;
  abstract getCode(address: string, blockTag?: BlockTag): Promise<string>;
  abstract call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
  abstract estimateGas(transaction: TransactionRequest): Promise<bigint>;
  abstract sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
  abstract getTransaction(transactionHash: string): Promise<TransactionResponse | null>;
  abstract getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt | null>;
  abstract getGasPrice(): Promise<bigint>;
  abstract getFeeData(): Promise<FeeData>;
  abstract getLogs(filter: Filter): Promise<Log[]>;

  // Common implementation for transaction waiting
  async waitForTransaction(
    transactionHash: string, 
    confirmations: number = 1, 
    timeout: number = 60000
  ): Promise<TransactionReceipt> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const receipt = await this.getTransactionReceipt(transactionHash);
      
      if (receipt) {
        if (confirmations <= 1) {
          return receipt;
        }
        
        const currentBlock = await this.getBlockNumber();
        const confirmationCount = currentBlock - receipt.blockNumber + 1;
        
        if (confirmationCount >= confirmations) {
          return receipt;
        }
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Transaction ${transactionHash} timed out after ${timeout}ms`);
  }

  // Event management implementation
  on(eventName: EventType, listener: Listener): void {
    const eventKey = this.getEventKey(eventName);
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, new Set());
    }
    this.listeners.get(eventKey)!.add(listener);
  }

  once(eventName: EventType, listener: Listener): void {
    const wrappedListener = (...args: any[]) => {
      listener(...args);
      this.off(eventName, wrappedListener);
    };
    this.on(eventName, wrappedListener);
  }

  off(eventName: EventType, listener?: Listener): void {
    const eventKey = this.getEventKey(eventName);
    if (!listener) {
      this.listeners.delete(eventKey);
    } else {
      const listeners = this.listeners.get(eventKey);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(eventKey);
        }
      }
    }
  }

  removeAllListeners(eventName?: EventType): void {
    if (eventName) {
      const eventKey = this.getEventKey(eventName);
      this.listeners.delete(eventKey);
    } else {
      this.listeners.clear();
    }
  }

  protected emit(eventName: EventType, ...args: any[]): void {
    const eventKey = this.getEventKey(eventName);
    const listeners = this.listeners.get(eventKey);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${eventKey}:`, error);
        }
      });
    }
  }

  private getEventKey(eventName: EventType): string {
    if (typeof eventName === 'string') {
      return eventName;
    }
    // For complex event types, create a unique key
    return JSON.stringify(eventName);
  }

  // Connection management with optional chainId
  async connect(chainId?: number): Promise<void> {
    if (this._connected && (!chainId || chainId === this.currentChainId)) {
      return;
    }

    // Switch chain if different chainId provided
    if (chainId && chainId !== this.currentChainId) {
      await this.switchChain(chainId);
    }

    // Subclasses should implement specific connection logic
    this._connected = true;
    this.emit('connect', this.currentChainId);
  }

  async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }
    // Subclasses should implement specific disconnection logic
    this._connected = false;
    this.emit('disconnect');
    this.removeAllListeners();
  }

  // Helper methods
  getName(): string {
    return this.name;
  }

  getBlockchains(): string[] {
    return this.blockchains;
  }

  getChainIds(): number[] {
    return this.chainIds;
  }

  getCurrentChainId(): number {
    return this.currentChainId;
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this.chainIds.includes(chainId)) {
      throw new Error(`Chain ID ${chainId} not supported by ${this.name} provider`);
    }
    this.currentChainId = chainId;

    // Update chain info
    (this.chainInfo as any).chainId = chainId;
    (this.chainInfo as any).name = this.getChainName(chainId);
    (this.chainInfo as any).isTestnet = this.isTestnetChain(chainId);

    this.emit('chainChanged', chainId);
  }

  // New required methods from ProviderInterface

  /**
   * EIP-1193 request method - must be implemented by subclasses
   */
  abstract request<T = any>(args: { method: string; params?: any[] }): Promise<T>;

  /**
   * Get the raw underlying provider instance
   */
  getRawProvider(): any {
    // Override in subclasses that wrap other providers
    return this;
  }

  /**
   * Get the provider's RPC endpoint URL
   */
  getEndpoint(): string {
    return this.config.url || '';
  }

  /**
   * Get current cost metrics for routing decisions
   */
  async getCostMetrics(): Promise<ProviderCostMetrics> {
    // Basic implementation - override in subclasses for actual metrics
    return {
      requestsUsed: 0,
      requestsLimit: undefined,
      methodCosts: {},
      billingPeriod: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        costSoFar: 0
      }
    };
  }

  /**
   * Get current health metrics
   */
  async getHealthMetrics(): Promise<ProviderHealthMetrics> {
    // Basic implementation - override in subclasses for actual metrics
    return {
      healthy: this._connected,
      latency: 0,
      successRate: 1,
      uptime: 100
    };
  }

  /**
   * Perform a health check
   */
  async healthCheck(): Promise<ProviderHealthMetrics> {
    try {
      const start = Date.now();
      await this.getBlockNumber();
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency,
        successRate: 1,
        uptime: 100
      };
    } catch (error) {
      return {
        healthy: false,
        latency: 0,
        successRate: 0,
        uptime: 0,
        lastError: {
          message: error instanceof Error ? error.message : 'Health check failed',
          timestamp: new Date()
        }
      };
    }
  }

  // Utility method to validate addresses
  protected isValidAddress(address: string): boolean {
    // Basic Ethereum address validation
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Utility method to normalize addresses
  protected normalizeAddress(address: string): string {
    if (!address.startsWith('0x')) {
      address = '0x' + address;
    }
    return address.toLowerCase();
  }

  // Utility method to handle RPC errors
  protected handleRpcError(error: any): Error {
    if (error.code && error.message) {
      // Standard JSON-RPC error
      return new Error(`RPC Error ${error.code}: ${error.message}`);
    }
    return error instanceof Error ? error : new Error(String(error));
  }

  // Helper method to get chain name
  protected getChainName(chainId: number): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum Mainnet',
      5: 'Goerli',
      11155111: 'Sepolia',
      137: 'Polygon',
      80001: 'Mumbai',
      56: 'BSC',
      97: 'BSC Testnet',
      42161: 'Arbitrum',
      421613: 'Arbitrum Goerli',
      10: 'Optimism',
      420: 'Optimism Goerli'
    };
    return chainNames[chainId] || `Chain ${chainId}`;
  }

  // Helper method to check if chain is testnet
  protected isTestnetChain(chainId: number): boolean {
    const testnets = [5, 11155111, 80001, 97, 421613, 420];
    return testnets.includes(chainId);
  }
}
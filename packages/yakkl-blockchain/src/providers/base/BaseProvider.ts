/**
 * Base provider implementation with common functionality
 */

import type {
  IProvider,
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
  TransactionResponse
} from '../types';

export abstract class BaseProvider implements IProvider {
  protected config: NetworkProviderConfig;
  protected listeners: Map<string, Set<Listener>> = new Map();
  protected connected: boolean = false;
  protected name: string;
  protected blockchains: string[];
  protected chainIds: number[];
  protected currentChainId: number;

  constructor(config: NetworkProviderConfig) {
    this.config = config;
    this.name = config.name;
    this.blockchains = config.blockchains || [];
    this.chainIds = config.chainIds || [];
    this.currentChainId = config.chainId || 1;
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

  // Connection management
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    // Subclasses should implement specific connection logic
    this.connected = true;
    this.emit('connect');
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    // Subclasses should implement specific disconnection logic
    this.connected = false;
    this.emit('disconnect');
    this.removeAllListeners();
  }

  isConnected(): boolean {
    return this.connected;
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
    this.emit('chainChanged', chainId);
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
}
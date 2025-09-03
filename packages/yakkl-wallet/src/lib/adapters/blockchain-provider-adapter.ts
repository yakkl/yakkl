/**
 * Adapter to bridge @yakkl/blockchain providers with existing wallet code
 * This allows gradual migration from old provider implementations
 */

import type { IProvider } from '@yakkl/blockchain';
import type { Provider } from '$lib/managers/Provider';

/**
 * Adapts @yakkl/blockchain providers to work with existing wallet Provider interface
 */
export class BlockchainProviderAdapter implements Provider {
  name: string;
  blockchains: string[];
  blockchain: string;
  chainIds: number[];
  chainId: number;
  signer: any;
  provider: any;
  
  private blockchainProvider: IProvider;

  constructor(blockchainProvider: IProvider, config?: {
    name?: string;
    blockchains?: string[];
    chainIds?: number[];
    blockchain?: string;
    chainId?: number;
  }) {
    this.blockchainProvider = blockchainProvider;
    this.name = config?.name || 'BlockchainProvider';
    this.blockchains = config?.blockchains || ['Ethereum'];
    this.chainIds = config?.chainIds || [1];
    this.blockchain = config?.blockchain || 'Ethereum';
    this.chainId = config?.chainId || 1;
    this.signer = undefined;
    this.provider = blockchainProvider;
  }

  async connect(blockchain: string, chainId: number): Promise<void> {
    this.blockchain = blockchain;
    this.chainId = chainId;
    
    // If the underlying provider supports chain switching
    if ('switchChain' in this.blockchainProvider && typeof this.blockchainProvider.switchChain === 'function') {
      await (this.blockchainProvider as any).switchChain(chainId);
    }
    
    await this.blockchainProvider.connect();
  }

  async getProviderURL(): Promise<string> {
    // This would depend on the specific provider implementation
    return '';
  }

  async getBlockNumber(): Promise<number> {
    return await this.blockchainProvider.getBlockNumber();
  }

  getBlockchains(): string[] {
    return this.blockchains;
  }

  setBlockchains(blockchains: string[]): void {
    this.blockchains = blockchains;
  }

  getBlockchain(): string {
    return this.blockchain;
  }

  getChainIds(): number[] {
    return this.chainIds;
  }

  setChainIds(chainIds: number[]): void {
    this.chainIds = chainIds;
  }

  getChainId(): number {
    return this.chainId;
  }

  setChainId(chainId: number): void {
    this.chainId = chainId;
  }

  async initializeProvider(): Promise<any> {
    await this.blockchainProvider.connect();
    return this.blockchainProvider;
  }

  async getGasPrice(): Promise<bigint> {
    return await this.blockchainProvider.getGasPrice();
  }

  async getFeeData(): Promise<any> {
    return await this.blockchainProvider.getFeeData();
  }

  async getBalance(address: string, blockTag?: any): Promise<bigint> {
    return await this.blockchainProvider.getBalance(address, blockTag);
  }

  async getTransactionCount(address: string, blockTag?: any): Promise<number> {
    return await this.blockchainProvider.getTransactionCount(address, blockTag);
  }

  async getCode(address: string, blockTag?: any): Promise<string> {
    return await this.blockchainProvider.getCode(address, blockTag);
  }

  async getNetwork(): Promise<any> {
    return await this.blockchainProvider.getNetwork();
  }

  async getBlock(blockHashOrBlockTag: any): Promise<any> {
    return await this.blockchainProvider.getBlock(blockHashOrBlockTag);
  }

  async getBlockWithTransactions(blockHashOrBlockTag: any): Promise<any> {
    return await this.blockchainProvider.getBlockWithTransactions(blockHashOrBlockTag);
  }

  async getTransaction(transactionHash: string): Promise<any> {
    return await this.blockchainProvider.getTransaction(transactionHash);
  }

  async getTransactionReceipt(transactionHash: string): Promise<any> {
    return await this.blockchainProvider.getTransactionReceipt(transactionHash);
  }

  async waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<any> {
    return await this.blockchainProvider.waitForTransaction(transactionHash, confirmations, timeout);
  }

  async getLogs(filter: any): Promise<any[]> {
    return await this.blockchainProvider.getLogs(filter);
  }

  async call(transaction: any, blockTag?: any): Promise<string> {
    return await this.blockchainProvider.call(transaction, blockTag);
  }

  async estimateGas(transaction: any): Promise<bigint> {
    return await this.blockchainProvider.estimateGas(transaction);
  }

  async sendTransaction(transaction: any): Promise<any> {
    return await this.blockchainProvider.sendTransaction(transaction);
  }

  on(eventName: any, listener: any): Provider {
    this.blockchainProvider.on(eventName, listener);
    return this;
  }

  once(eventName: any, listener: any): Provider {
    this.blockchainProvider.once(eventName, listener);
    return this;
  }

  off(eventName: any, listener: any): Provider {
    this.blockchainProvider.off(eventName, listener);
    return this;
  }

  emit(eventName: any, ...args: any[]): boolean {
    // Most IProvider implementations don't expose emit
    // This would need to be handled by the specific implementation
    return false;
  }

  removeListener(eventName: any, listener: any): Provider {
    this.blockchainProvider.off(eventName, listener);
    return this;
  }

  removeAllListeners(eventName?: any): Provider {
    this.blockchainProvider.removeAllListeners(eventName);
    return this;
  }

  // Add missing methods from Provider interface
  addListener(eventName: any, listener: any): Provider {
    return this.on(eventName, listener);
  }

  listenerCount(eventName?: any): number {
    // This would need to be implemented based on the specific provider
    return 0;
  }

  listeners(eventName: any): any[] {
    // This would need to be implemented based on the specific provider
    return [];
  }

  async signTransaction(transaction: any): Promise<string> {
    throw new Error('signTransaction requires a signer');
  }

  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    throw new Error('signTypedData requires a signer');
  }

  async signMessage(message: string): Promise<string> {
    throw new Error('signMessage requires a signer');
  }

  async sendRawTransaction(signedTransaction: string): Promise<any> {
    // This would need to be implemented based on the specific provider
    throw new Error('sendRawTransaction not implemented');
  }

  async resolveName(name: string): Promise<string | null> {
    // ENS resolution would go here
    return null;
  }

  async lookupAddress(address: string): Promise<string | null> {
    // Reverse ENS lookup would go here
    return null;
  }

  // Additional methods required by Provider interface
  getName(): string {
    return this.name;
  }

  async getStorageAt(address: string, position: string | number, blockTag?: any): Promise<string> {
    // This would need to be implemented based on the specific provider
    throw new Error('getStorageAt not implemented');
  }

  getProvider(): any {
    return this.provider;
  }

  getSigner(): any {
    return this.signer;
  }

  setSigner(signer: any): void {
    this.signer = signer;
  }

  async waitForBlock(blockNumber: number): Promise<any> {
    // Wait for a specific block number
    const currentBlock = await this.getBlockNumber();
    if (currentBlock >= blockNumber) {
      return await this.getBlock(blockNumber);
    }
    
    // Poll until block is available
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        const current = await this.getBlockNumber();
        if (current >= blockNumber) {
          clearInterval(interval);
          resolve(await this.getBlock(blockNumber));
        }
      }, 1000);
    });
  }

  async getResolver(name: string): Promise<any | null> {
    // ENS resolver implementation would go here
    return null;
  }

  async _getInternalBlockNumber(maxAge: number): Promise<number> {
    return await this.getBlockNumber();
  }

  async poll(): Promise<void> {
    // Polling implementation would go here
  }

  async perform(method: string, params: any): Promise<any> {
    // Generic method performer
    switch (method) {
      case 'getBlockNumber':
        return await this.getBlockNumber();
      case 'getGasPrice':
        return await this.getGasPrice();
      case 'getBalance':
        return await this.getBalance(params.address, params.blockTag);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  getSignerNative(): any {
    return this.signer;
  }

  setProvider(provider: any): void {
    this.provider = provider;
  }

  async getTransactionHistory(address: string, options?: any): Promise<any[]> {
    // Transaction history would need to be implemented
    // This typically requires an indexer or archive node
    return [];
  }

  async request<T = any>(method: string, params: any[]): Promise<T> {
    // Generic request method
    return await this.perform(method, params);
  }
}

/**
 * Example usage factory function
 */
export async function createAlchemyProviderAdapter(apiKey: string, chainId: number = 1): Promise<BlockchainProviderAdapter> {
  // Dynamic import to avoid build-time issues
  const blockchainModule = await import('@yakkl/blockchain');
  const AlchemyProvider = (blockchainModule as any).AlchemyProvider;
  
  if (!AlchemyProvider) {
    throw new Error('AlchemyProvider not found in @yakkl/blockchain');
  }
  
  const alchemyProvider = new AlchemyProvider({
    apiKey,
    chainId,
    name: 'Alchemy',
    blockchains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
    chainIds: [1, 5, 11155111, 137, 80001, 42161, 10]
  });

  return new BlockchainProviderAdapter(alchemyProvider, {
    name: 'Alchemy',
    blockchains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
    chainIds: [1, 5, 11155111, 137, 80001, 42161, 10],
    chainId
  });
}
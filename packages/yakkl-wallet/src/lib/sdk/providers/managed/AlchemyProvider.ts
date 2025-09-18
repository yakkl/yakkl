import { ManagedProvider } from '../base/ManagedProvider';
import type { IKeyManager } from '../../interfaces/IKeyManager';
import type { BigNumberish, BlockTag, TransactionRequest, TransactionResponse, FeeData, Log, Filter, Block, BlockWithTransactions } from '../base/BaseProvider';
import type { Log as EVMLog } from '$lib/common/evm';
import { BigNumber } from '@yakkl/core';
import type { TransactionReceipt as CoreTransactionReceipt } from '@yakkl/core';

/**
 * Alchemy provider implementation using the ManagedProvider base
 * Supports all Alchemy features including enhanced APIs, traces, and NFTs
 */
export class AlchemyProvider extends ManagedProvider {
  private alchemyNetwork: string;
  private supportedFeatures: Set<string>;
  private directApiKey?: string; // For direct API key usage

  constructor(
    chainId: number,
    keyManager: IKeyManager,
    options: {
      blockchain?: string;
      supportedChainIds?: number[];
      features?: string[];
    } = {}
  ) {
    const {
      blockchain = 'ethereum',
      supportedChainIds = [chainId],
      features = ['enhanced', 'trace', 'nft', 'webhook']
    } = options;

    super(
      `alchemy-${chainId}`,
      chainId,
      blockchain,
      supportedChainIds,
      keyManager,
      'alchemy'
    );

    this.alchemyNetwork = this.mapChainIdToAlchemyNetwork(chainId);
    this.supportedFeatures = new Set(features);
  }

  /**
   * Map chain ID to Alchemy network identifier
   */
  private mapChainIdToAlchemyNetwork(chainId: number): string {
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
   * Build Alchemy endpoint URL with API key
   */
  protected buildEndpoint(apiKey: string): string {
    return `https://${this.alchemyNetwork}.g.alchemy.com/v2/${apiKey}`;
  }

  /**
   * Initialize the Alchemy provider
   */
  protected async initializeProvider(apiKey: string): Promise<void> {
    console.log(`[AlchemyProvider] Initializing with network: ${this.alchemyNetwork}`);
    // Store the raw provider (could be ethers.js provider, web3, etc.)
    this._rawProvider = {
      type: 'alchemy',
      endpoint: this._endpoint,
      network: this.alchemyNetwork,
      features: Array.from(this.supportedFeatures)
    };
    console.log(`[AlchemyProvider] Provider initialized with endpoint: ${this._endpoint.substring(0, 50)}...`);
  }

  /**
   * Make provider-specific request with Alchemy optimizations
   */
  protected async makeProviderRequest<T>(method: string, params?: unknown[]): Promise<T> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params: params || []
    };

    const response = await fetch(this._endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Alchemy HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Alchemy RPC Error ${data.error.code}: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Cleanup provider resources
   */
  protected async cleanupProvider(): Promise<void> {
    this._rawProvider = null;
  }

  // Enhanced Alchemy-specific methods

  /**
   * Get enhanced transaction receipts with additional data
   */
  async getTransactionReceipt(transactionHash: string): Promise<CoreTransactionReceipt> {
    if (this.supportedFeatures.has('enhanced')) {
      try {
        return await this.makeProviderRequest<CoreTransactionReceipt>(
          'alchemy_getTransactionReceipt',
          [transactionHash]
        );
      } catch (error) {
        // Fallback to standard method
      }
    }
    
    return await super.request<CoreTransactionReceipt>({ method: 'eth_getTransactionReceipt', params: [transactionHash] });
  }

  /**
   * Get asset transfers (Alchemy enhanced API)
   */
  async getAssetTransfers(params: {
    fromBlock?: string;
    toBlock?: string;
    fromAddress?: string;
    toAddress?: string;
    contractAddresses?: string[];
    category?: string[];
    maxCount?: number;
    pageKey?: string;
  }): Promise<any> {
    if (!this.supportedFeatures.has('enhanced')) {
      throw new Error('Asset transfers require enhanced Alchemy features');
    }

    return await this.makeProviderRequest('alchemy_getAssetTransfers', [params]);
  }

  /**
   * Get token balances (Alchemy enhanced API)
   */
  async getTokenBalances(address: string, tokenAddresses?: string[]): Promise<any> {
    if (!this.supportedFeatures.has('enhanced')) {
      throw new Error('Token balances require enhanced Alchemy features');
    }

    const params: any = { address };
    if (tokenAddresses) {
      params.contractAddresses = tokenAddresses;
    }

    return await this.makeProviderRequest('alchemy_getTokenBalances', [params]);
  }

  /**
   * Get token metadata (Alchemy enhanced API)
   */
  async getTokenMetadata(contractAddress: string): Promise<any> {
    if (!this.supportedFeatures.has('enhanced')) {
      throw new Error('Token metadata requires enhanced Alchemy features');
    }

    return await this.makeProviderRequest('alchemy_getTokenMetadata', [contractAddress]);
  }

  /**
   * Get NFTs for owner (Alchemy NFT API)
   */
  async getNFTsForOwner(owner: string, options?: {
    contractAddresses?: string[];
    pageKey?: string;
    pageSize?: number;
    withMetadata?: boolean;
  }): Promise<any> {
    if (!this.supportedFeatures.has('nft')) {
      throw new Error('NFT operations require Alchemy NFT features');
    }

    const params = { owner, ...options };
    return await this.makeProviderRequest('alchemy_getNFTs', [params]);
  }

  /**
   * Get NFT metadata (Alchemy NFT API)
   */
  async getNFTMetadata(contractAddress: string, tokenId: string): Promise<any> {
    if (!this.supportedFeatures.has('nft')) {
      throw new Error('NFT operations require Alchemy NFT features');
    }

    return await this.makeProviderRequest('alchemy_getNFTMetadata', [{
      contractAddress,
      tokenId
    }]);
  }

  /**
   * Trace transaction (Alchemy trace API)
   */
  async traceTransaction(transactionHash: string): Promise<any> {
    if (!this.supportedFeatures.has('trace')) {
      throw new Error('Transaction tracing requires Alchemy trace features');
    }

    return await this.makeProviderRequest('trace_transaction', [transactionHash]);
  }

  /**
   * Debug transaction (Alchemy debug API)
   */
  async debugTraceTransaction(transactionHash: string, options?: any): Promise<any> {
    if (!this.supportedFeatures.has('trace')) {
      throw new Error('Transaction debugging requires Alchemy trace features');
    }

    return await this.makeProviderRequest('debug_traceTransaction', [transactionHash, options]);
  }

  /**
   * Create webhook (Alchemy webhook API)
   */
  async createWebhook(params: {
    webhookType: string;
    webhookUrl: string;
    isActive?: boolean;
    networkId?: number;
    addresses?: string[];
  }): Promise<any> {
    if (!this.supportedFeatures.has('webhook')) {
      throw new Error('Webhook operations require Alchemy webhook features');
    }

    // This would typically use Alchemy's REST API, not JSON-RPC
    throw new Error('Webhook creation requires REST API implementation');
  }

  /**
   * Get compute units used (Alchemy specific)
   */
  async getComputeUnitsUsed(): Promise<{ computeUnitsUsed: number; computeUnitsTotal: number }> {
    try {
      return await this.makeProviderRequest('alchemy_getComputeUnitsUsed');
    } catch (error) {
      // Return default if not available
      return { computeUnitsUsed: 0, computeUnitsTotal: 0 };
    }
  }

  // Standard provider methods (inherited from ManagedProvider)

  async getBlockNumber(): Promise<number> {
    const result = await this.request<string>({ method: 'eth_blockNumber' });
    return parseInt(result, 16);
  }

  async getBalance(address: string, blockTag: BlockTag = 'latest'): Promise<bigint> {
    const result = await this.request<string>({ method: 'eth_getBalance', params: [address, blockTag] });
    return BigInt(result);
  }

  async getCode(address: string, blockTag: BlockTag = 'latest'): Promise<string> {
    return await this.request<string>({ method: 'eth_getCode', params: [address, blockTag] });
  }

  async getStorageAt(address: string, position: BigNumberish, blockTag: BlockTag = 'latest'): Promise<string> {
    let positionHex: string;
    if (typeof position === 'string') {
      positionHex = position;
    } else if (typeof position === 'bigint') {
      positionHex = `0x${position.toString(16)}`;
    } else if (typeof position === 'number') {
      positionHex = `0x${position.toString(16)}`;
    } else {
      // For BigNumber or other objects that have toString method
      positionHex = `0x${(position as any).toString(16)}`;
    }
    return await this.request<string>({ method: 'eth_getStorageAt', params: [address, positionHex, blockTag] });
  }

  async getGasPrice(): Promise<bigint> {
    const result = await this.request<string>({ method: 'eth_gasPrice' });
    return BigInt(result);
  }

  async getFeeData(): Promise<FeeData> {
    try {
      // Alchemy supports EIP-1559
      const [gasPrice, block] = await Promise.all([
        this.getGasPrice(),
        this.getBlock('latest')
      ]);

      const feeData: FeeData = {
        gasPrice,
        lastBaseFeePerGas: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };

      if (block.baseFeePerGas) {
        const baseFeeAsBigInt = BigNumber.toBigInt(block.baseFeePerGas);
        feeData.lastBaseFeePerGas = baseFeeAsBigInt || BigInt(0);
        feeData.maxPriorityFeePerGas = BigInt('2000000000'); // 2 gwei
        feeData.maxFeePerGas = feeData.lastBaseFeePerGas * BigInt(2) + feeData.maxPriorityFeePerGas;
      }

      return feeData;
    } catch (error) {
      const gasPrice = await this.getGasPrice();
      return {
        gasPrice,
        lastBaseFeePerGas: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null
      };
    }
  }

  async sendRawTransaction(signedTransaction: string): Promise<TransactionResponse> {
    const hash = await this.request<string>({ method: 'eth_sendRawTransaction', params: [signedTransaction] });
    return { hash } as TransactionResponse;
  }

  async call(transaction: TransactionRequest, blockTag: BlockTag = 'latest'): Promise<string> {
    return await this.request<string>({ method: 'eth_call', params: [transaction, blockTag] });
  }

  async estimateGas(transaction: TransactionRequest): Promise<bigint> {
    const result = await this.request<string>({ method: 'eth_estimateGas', params: [transaction] });
    return BigInt(result);
  }

  async getTransactionCount(address: string, blockTag: BlockTag = 'latest'): Promise<number> {
    const result = await this.request<string>({ method: 'eth_getTransactionCount', params: [address, blockTag] });
    return parseInt(result, 16);
  }

  async getBlock(blockHashOrTag: BlockTag | string): Promise<Block> {
    return await this.request<Block>({ method: 'eth_getBlockByNumber', params: [blockHashOrTag, false] });
  }

  async getBlockWithTransactions(blockHashOrTag: BlockTag | string): Promise<BlockWithTransactions> {
    return await this.request<BlockWithTransactions>({ method: 'eth_getBlockByNumber', params: [blockHashOrTag, true] });
  }

  async getTransaction(transactionHash: string): Promise<TransactionResponse> {
    return await this.request<TransactionResponse>({ method: 'eth_getTransactionByHash', params: [transactionHash] });
  }

  async getLogs(filter: Filter): Promise<EVMLog[]> {
    const logs = await this.request<Log[]>({ method: 'eth_getLogs', params: [filter] });
    return logs.map(log => ({
      ...log,
      blockNumber: log.blockNumber || 0,
      blockHash: log.blockHash || '',
      transactionHash: log.transactionHash || '',
      transactionIndex: log.transactionIndex || 0,
      logIndex: log.logIndex || 0,
      removed: false // Default to false for normal logs
    }));
  }

  // ENS support (Ethereum mainnet only)
  async resolveName(name: string): Promise<string | null> {
    if (this.chainId !== 1) {
      return null;
    }

    try {
      const result = await this.request<string>({ method: 'ens_resolve', params: [name] });
      return result;
    } catch (error) {
      return null;
    }
  }

  async lookupAddress(address: string): Promise<string | null> {
    if (this.chainId !== 1) {
      return null;
    }

    try {
      const result = await this.request<string>({ method: 'ens_reverse', params: [address] });
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get supported features
   */
  getSupportedFeatures(): string[] {
    return Array.from(this.supportedFeatures);
  }

  /**
   * Check if feature is supported
   */
  hasFeature(feature: string): boolean {
    return this.supportedFeatures.has(feature);
  }
}
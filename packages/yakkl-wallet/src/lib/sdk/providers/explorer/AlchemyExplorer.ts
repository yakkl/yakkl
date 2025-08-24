import type {
  ITransactionFetcher,
  TransactionFetchOptions,
  TokenTransferOptions,
  InternalTransactionOptions,
  TransactionHistoryResponse,
  TokenTransferResponse,
  InternalTransactionResponse,
  TransactionDetail,
  TokenTransferDetail,
  InternalTransactionDetail
} from '../../interfaces/ITransactionFetcher';
import type { IKeyManager } from '../../interfaces/IKeyManager';

/**
 * Alchemy Explorer implementation for fetching transaction history
 * Uses Alchemy's enhanced APIs for comprehensive transaction data
 */
export class AlchemyExplorer implements ITransactionFetcher {
  readonly name: string;
  readonly chainId: number;
  readonly blockchain: string;
  
  private keyManager: IKeyManager;
  private baseUrl: string;
  private networkName: string;

  constructor(
    chainId: number,
    keyManager: IKeyManager,
    options: {
      blockchain?: string;
    } = {}
  ) {
    this.chainId = chainId;
    this.blockchain = options.blockchain || 'ethereum';
    this.keyManager = keyManager;
    this.name = `alchemy-explorer-${chainId}`;
    
    this.networkName = this.mapChainIdToAlchemyNetwork(chainId);
    this.baseUrl = `https://${this.networkName}.g.alchemy.com/v2`;
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
   * Get API key for requests
   */
  private async getApiKey(): Promise<string> {
    const key = await this.keyManager.getKey('alchemy', 'read', this.chainId);
    if (!key) {
      throw new Error('No Alchemy API key available');
    }
    return key;
  }

  /**
   * Make HTTP request to Alchemy API
   */
  private async makeRequest(endpoint: string, params: any = {}): Promise<any> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: endpoint,
        params: [params]
      })
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`Alchemy RPC error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Get transaction history using Alchemy's asset transfers API
   */
  async getTransactionHistory(
    address: string,
    options: TransactionFetchOptions = {}
  ): Promise<TransactionHistoryResponse> {
    try {
      const params: any = {
        fromAddress: address,
        category: ['external', 'internal', 'erc20', 'erc721', 'erc1155']
      };

      // Apply filters
      if (options.startBlock) params.fromBlock = `0x${options.startBlock.toString(16)}`;
      if (options.endBlock) params.toBlock = `0x${options.endBlock.toString(16)}`;
      if (options.limit) params.maxCount = Math.min(options.limit, 1000); // Alchemy limit
      if (options.offset) params.pageKey = options.offset.toString();

      // Filter by transaction type
      if (options.txType && options.txType !== 'all') {
        switch (options.txType) {
          case 'normal':
            params.category = ['external'];
            break;
          case 'internal':
            params.category = ['internal'];
            break;
          case 'erc20':
            params.category = ['erc20'];
            break;
          case 'erc721':
            params.category = ['erc721'];
            break;
          case 'erc1155':
            params.category = ['erc1155'];
            break;
        }
      }

      const result = await this.makeRequest('alchemy_getAssetTransfers', params);
      
      const transactions: TransactionDetail[] = result.transfers.map((transfer: any) => ({
        hash: transfer.hash,
        blockNumber: parseInt(transfer.blockNum, 16),
        timestamp: new Date(transfer.metadata?.blockTimestamp).getTime() / 1000,
        from: transfer.from,
        to: transfer.to,
        value: transfer.value ? (BigInt(transfer.value * 1e18)).toString() : '0',
        gasUsed: '0', // Not available in asset transfers
        gasPrice: '0', // Not available in asset transfers
        fee: '0', // Not available in asset transfers
        status: 1, // Assume success for asset transfers
        nonce: 0, // Not available in asset transfers
        transactionIndex: 0, // Not available in asset transfers
        methodName: transfer.category,
        functionName: transfer.category
      }));

      return {
        transactions,
        total: transactions.length,
        hasMore: !!result.pageKey,
        nextPageToken: result.pageKey
      };
    } catch (error) {
      throw new Error(`Failed to fetch transaction history: ${error}`);
    }
  }

  /**
   * Get token transfers
   */
  async getTokenTransfers(
    address: string,
    options: TokenTransferOptions = {}
  ): Promise<TokenTransferResponse> {
    try {
      const params: any = {
        fromAddress: address,
        category: ['erc20', 'erc721', 'erc1155']
      };

      // Apply filters
      if (options.contractAddress) {
        params.contractAddresses = [options.contractAddress];
      }
      
      if (options.tokenType) {
        params.category = [options.tokenType];
      }

      if (options.startBlock) params.fromBlock = `0x${options.startBlock.toString(16)}`;
      if (options.endBlock) params.toBlock = `0x${options.endBlock.toString(16)}`;
      if (options.limit) params.maxCount = Math.min(options.limit, 1000);
      if (options.offset) params.pageKey = options.offset.toString();

      const result = await this.makeRequest('alchemy_getAssetTransfers', params);
      
      const transfers: TokenTransferDetail[] = result.transfers.map((transfer: any) => ({
        hash: transfer.hash,
        blockNumber: parseInt(transfer.blockNum, 16),
        timestamp: new Date(transfer.metadata?.blockTimestamp).getTime() / 1000,
        from: transfer.from,
        to: transfer.to,
        contractAddress: transfer.rawContract.address,
        value: transfer.value ? transfer.value.toString() : '0',
        tokenName: transfer.asset,
        tokenSymbol: transfer.asset,
        tokenDecimal: transfer.rawContract.decimal || 18,
        tokenID: transfer.tokenId,
        tokenType: transfer.category.toUpperCase() as 'ERC-20' | 'ERC-721' | 'ERC-1155'
      }));

      return {
        transfers,
        total: transfers.length,
        hasMore: !!result.pageKey,
        nextPageToken: result.pageKey
      };
    } catch (error) {
      throw new Error(`Failed to fetch token transfers: ${error}`);
    }
  }

  /**
   * Get internal transactions
   */
  async getInternalTransactions(
    address: string,
    options: InternalTransactionOptions = {}
  ): Promise<InternalTransactionResponse> {
    try {
      const params: any = {
        fromAddress: address,
        category: ['internal']
      };

      if (options.startBlock) params.fromBlock = `0x${options.startBlock.toString(16)}`;
      if (options.endBlock) params.toBlock = `0x${options.endBlock.toString(16)}`;
      if (options.limit) params.maxCount = Math.min(options.limit, 1000);
      if (options.offset) params.pageKey = options.offset.toString();

      const result = await this.makeRequest('alchemy_getAssetTransfers', params);
      
      const transactions: InternalTransactionDetail[] = result.transfers.map((transfer: any) => ({
        hash: transfer.hash,
        blockNumber: parseInt(transfer.blockNum, 16),
        timestamp: new Date(transfer.metadata?.blockTimestamp).getTime() / 1000,
        from: transfer.from,
        to: transfer.to,
        value: transfer.value ? (BigInt(transfer.value * 1e18)).toString() : '0',
        gas: '0', // Not available
        gasUsed: '0', // Not available
        input: '0x',
        output: '0x',
        type: 'call',
        traceId: `${transfer.hash}-${transfer.uniqueId}`
      }));

      return {
        transactions,
        total: transactions.length,
        hasMore: !!result.pageKey,
        nextPageToken: result.pageKey
      };
    } catch (error) {
      throw new Error(`Failed to fetch internal transactions: ${error}`);
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionByHash(txHash: string): Promise<TransactionDetail> {
    try {
      // First get the basic transaction
      const txResult = await this.makeRequest('eth_getTransactionByHash', txHash);
      const receiptResult = await this.makeRequest('eth_getTransactionReceipt', txHash);
      
      if (!txResult || !receiptResult) {
        throw new Error('Transaction not found');
      }

      return {
        hash: txResult.hash,
        blockNumber: parseInt(txResult.blockNumber, 16),
        timestamp: 0, // Would need to get block timestamp
        from: txResult.from,
        to: txResult.to,
        value: BigInt(txResult.value).toString(),
        gasUsed: BigInt(receiptResult.gasUsed).toString(),
        gasPrice: BigInt(txResult.gasPrice).toString(),
        fee: (BigInt(receiptResult.gasUsed) * BigInt(txResult.gasPrice)).toString(),
        status: receiptResult.status ? 1 : 0,
        input: txResult.input,
        nonce: parseInt(txResult.nonce, 16),
        transactionIndex: parseInt(txResult.transactionIndex, 16)
      };
    } catch (error) {
      throw new Error(`Failed to fetch transaction details: ${error}`);
    }
  }

  /**
   * Health check for the fetcher
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Simple test to check if API is responsive
      await this.makeRequest('eth_blockNumber');
      
      return {
        healthy: true,
        latency: Date.now() - startTime
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
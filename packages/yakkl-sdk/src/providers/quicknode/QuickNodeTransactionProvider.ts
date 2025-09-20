import {
  AbstractTransactionProvider,
  TransactionData,
  TransactionProviderConfig,
  TransactionFetchOptions
} from '../abstract/AbstractTransactionProvider';

/**
 * QuickNode transaction provider implementation
 * Uses QuickNode's enhanced RPC methods for transaction data
 */
export class QuickNodeTransactionProvider extends AbstractTransactionProvider {
  private readonly SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 56, 43114];

  constructor(config: TransactionProviderConfig) {
    super(config, 'QuickNode');
    this.validateConfig();
  }

  /**
   * Build the RPC URL for QuickNode
   * QuickNode URLs are typically in format: https://xxx.quiknode.pro/yyy/
   */
  protected buildRpcUrl(chainId: number): string {
    // QuickNode uses custom endpoints per user
    // The API key in this case is the full endpoint URL
    if (!this.config.apiKey.includes('quiknode.pro')) {
      throw new Error('QuickNode requires a valid QuickNode endpoint URL as the API key');
    }
    return this.config.apiKey;
  }

  /**
   * Check if the provider supports a specific chain
   */
  supportsChain(chainId: number): boolean {
    return this.SUPPORTED_CHAINS.includes(chainId);
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): number[] {
    return [...this.SUPPORTED_CHAINS];
  }

  /**
   * Get the current block number
   */
  async getCurrentBlockNumber(chainId: number): Promise<number> {
    const url = this.buildRpcUrl(chainId);
    const result = await this.rpcCall(url, 'eth_blockNumber');
    return parseInt(result, 16);
  }

  /**
   * Fetch transactions using QuickNode's qn_getWalletTokenTransactions
   */
  async fetchTransactions(
    address: string,
    chainId: number,
    options: TransactionFetchOptions = {}
  ): Promise<TransactionData[]> {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by QuickNode`);
    }

    const url = this.buildRpcUrl(chainId);
    const limit = options.limit || 100;

    // Try QuickNode's enhanced method first
    try {
      const transactions = await this.fetchWithQuickNodeAPI(url, address, limit);
      if (transactions.length > 0) {
        return transactions.map(tx => ({ ...tx, chainId }));
      }
    } catch (error) {
      console.warn('QuickNode enhanced API not available, falling back to standard methods', error);
    }

    // Fallback to standard RPC methods
    return this.fetchWithStandardRPC(url, address, chainId, options);
  }

  /**
   * Fetch transactions using QuickNode's enhanced API
   */
  private async fetchWithQuickNodeAPI(
    url: string,
    address: string,
    limit: number
  ): Promise<TransactionData[]> {
    try {
      // Try QuickNode's token transaction method
      const tokenTxResult = await this.rpcCall(url, 'qn_getWalletTokenTransactions', [{
        address,
        page: 1,
        perPage: limit
      }]);

      const transactions: TransactionData[] = [];

      if (tokenTxResult && tokenTxResult.transfers) {
        for (const transfer of tokenTxResult.transfers) {
          transactions.push(this.convertQuickNodeTransfer(transfer, address));
        }
      }

      // Also try to get native transactions
      const txListResult = await this.rpcCall(url, 'qn_getTransactionsByAddress', [{
        address,
        page: 1,
        perPage: limit
      }]);

      if (txListResult && txListResult.transactions) {
        for (const tx of txListResult.transactions) {
          transactions.push(await this.convertQuickNodeTransaction(tx, url));
        }
      }

      return transactions;
    } catch (error) {
      // QuickNode enhanced methods not available
      throw error;
    }
  }

  /**
   * Fallback to standard RPC methods
   */
  private async fetchWithStandardRPC(
    url: string,
    address: string,
    chainId: number,
    options: TransactionFetchOptions
  ): Promise<TransactionData[]> {
    const currentBlock = await this.getCurrentBlockNumber(chainId);
    const startBlock = options.startBlock || Math.max(0, currentBlock - 10000);
    const endBlock = options.endBlock || currentBlock;
    const limit = options.limit || 100;

    // Use eth_getLogs to find transactions
    const logs = await this.fetchLogsForAddress(url, address, startBlock, endBlock);

    // Get unique transaction hashes
    const txHashes = [...new Set(logs.map((log: any) => log.transactionHash))];

    // Fetch transaction details
    const transactions = await Promise.all(
      txHashes.slice(0, limit).map(hash => this.fetchTransactionByHash(url, hash))
    );

    // Calculate confirmations and add chainId
    return transactions
      .filter(Boolean)
      .map(tx => ({
        ...tx!,
        confirmations: currentBlock - tx!.blockNumber,
        chainId
      }));
  }

  /**
   * Fetch logs for an address
   */
  private async fetchLogsForAddress(
    url: string,
    address: string,
    fromBlock: number,
    toBlock: number
  ): Promise<any[]> {
    const paddedAddress = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;

    // Get logs where address is involved
    const [sentLogs, receivedLogs] = await Promise.all([
      this.rpcCall(url, 'eth_getLogs', [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [
          null,
          paddedAddress, // From address
          null
        ]
      }]),
      this.rpcCall(url, 'eth_getLogs', [{
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [
          null,
          null,
          paddedAddress // To address
        ]
      }])
    ]);

    return [...sentLogs, ...receivedLogs];
  }

  /**
   * Fetch a transaction by hash
   */
  private async fetchTransactionByHash(url: string, hash: string): Promise<TransactionData | null> {
    try {
      const [tx, receipt] = await Promise.all([
        this.rpcCall(url, 'eth_getTransactionByHash', [hash]),
        this.rpcCall(url, 'eth_getTransactionReceipt', [hash])
      ]);

      if (!tx) return null;

      // Get block for timestamp
      const block = await this.rpcCall(url, 'eth_getBlockByNumber', [tx.blockNumber, false]);
      const timestamp = parseInt(block.timestamp, 16) * 1000;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: parseInt(tx.value, 16).toString(),
        blockNumber: parseInt(tx.blockNumber, 16),
        timestamp,
        nonce: parseInt(tx.nonce, 16),
        gasPrice: parseInt(tx.gasPrice || tx.maxFeePerGas || '0', 16).toString(),
        gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : undefined,
        gasLimit: parseInt(tx.gas, 16).toString(),
        status: receipt ? (receipt.status === '0x1' ? 'confirmed' : 'failed') : 'pending',
        type: this.determineTransactionType(tx),
        chainId: parseInt(tx.chainId || '0x1', 16),
        symbol: 'ETH'
      };
    } catch (error) {
      console.error('Error fetching transaction:', hash, error);
      return null;
    }
  }

  /**
   * Fetch a single transaction by hash
   */
  async fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null> {
    const url = this.buildRpcUrl(chainId);
    const tx = await this.fetchTransactionByHash(url, txHash);

    if (tx) {
      const currentBlock = await this.getCurrentBlockNumber(chainId);
      tx.confirmations = currentBlock - tx.blockNumber;
      tx.chainId = chainId;
    }

    return tx;
  }

  /**
   * Convert QuickNode transfer format to standard
   */
  private convertQuickNodeTransfer(transfer: any, userAddress: string): TransactionData {
    const isOutgoing = transfer.from?.toLowerCase() === userAddress.toLowerCase();

    return {
      hash: transfer.transactionHash,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value || '0',
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timestamp || Date.now(),
      type: isOutgoing ? 'send' : 'receive',
      chainId: 1,
      symbol: transfer.symbol || 'ETH',
      tokenAddress: transfer.contractAddress,
      tokenName: transfer.name,
      tokenDecimals: transfer.decimals,
      status: 'confirmed'
    };
  }

  /**
   * Convert QuickNode transaction format to standard
   */
  private async convertQuickNodeTransaction(tx: any, url: string): Promise<TransactionData> {
    // Get receipt for gas used
    const receipt = await this.rpcCall(url, 'eth_getTransactionReceipt', [tx.hash]);

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: tx.value || '0',
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp || Date.now(),
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasUsed: receipt ? receipt.gasUsed : undefined,
      gasLimit: tx.gas,
      status: receipt ? (receipt.status === '0x1' ? 'confirmed' : 'failed') : 'pending',
      type: this.determineTransactionType(tx),
      chainId: 1,
      symbol: 'ETH'
    };
  }
}
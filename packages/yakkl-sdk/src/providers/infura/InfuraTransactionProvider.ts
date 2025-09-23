import {
  AbstractTransactionProvider,
  TransactionData,
  TransactionProviderConfig,
  TransactionFetchOptions
} from '../abstract/AbstractTransactionProvider';

/**
 * Infura transaction provider implementation
 * Uses standard Ethereum JSON-RPC methods with eth_getLogs for transaction history
 */
export class InfuraTransactionProvider extends AbstractTransactionProvider {
  private readonly SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 43114];

  private readonly NETWORK_URLS: Record<number, string> = {
    1: 'https://mainnet.infura.io/v3/',
    11155111: 'https://sepolia.infura.io/v3/',
    137: 'https://polygon-mainnet.infura.io/v3/',
    42161: 'https://arbitrum-mainnet.infura.io/v3/',
    10: 'https://optimism-mainnet.infura.io/v3/',
    43114: 'https://avalanche-mainnet.infura.io/v3/'
  };

  // ERC20 Transfer event signature
  private readonly TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  constructor(config: TransactionProviderConfig) {
    super(config, 'Infura');
    this.validateConfig();
  }

  /**
   * Build the RPC URL for a specific chain
   */
  protected buildRpcUrl(chainId: number): string {
    const baseUrl = this.NETWORK_URLS[chainId];
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} is not supported by Infura`);
    }
    return baseUrl + this.config.apiKey;
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
   * Fetch transactions using eth_getLogs
   * This is a simplified approach that fetches transfer events
   */
  async fetchTransactions(
    address: string,
    chainId: number,
    options: TransactionFetchOptions = {}
  ): Promise<TransactionData[]> {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by Infura`);
    }

    const url = this.buildRpcUrl(chainId);
    const currentBlock = await this.getCurrentBlockNumber(chainId);

    // Calculate block range (default to last 10000 blocks if not specified)
    const endBlock = options.endBlock || currentBlock;
    const startBlock = options.startBlock || Math.max(0, endBlock - 10000);
    const limit = options.limit || 100;

    // Fetch both native ETH transactions and ERC20 transfers
    const [ethTransactions, tokenTransfers] = await Promise.all([
      this.fetchNativeTransactions(url, address, startBlock, endBlock, limit),
      options.includeTokenTransfers !== false ?
        this.fetchTokenTransfers(url, address, startBlock, endBlock, limit) :
        Promise.resolve([])
    ]);

    // Combine and sort by block number (most recent first)
    const allTransactions = [...ethTransactions, ...tokenTransfers];
    allTransactions.sort((a, b) => b.blockNumber - a.blockNumber);

    // Calculate confirmations
    const transactionsWithConfirmations = allTransactions.map(tx => ({
      ...tx,
      confirmations: currentBlock - tx.blockNumber,
      chainId
    }));

    // Return limited results
    return transactionsWithConfirmations.slice(0, limit);
  }

  /**
   * Fetch native ETH transactions
   * Note: This is limited as Infura doesn't have a direct transaction history API
   * We use eth_getLogs to find transactions involving the address
   */
  private async fetchNativeTransactions(
    url: string,
    address: string,
    fromBlock: number,
    toBlock: number,
    limit: number
  ): Promise<TransactionData[]> {
    // Get logs where the address is involved
    // This will catch contract interactions but not simple ETH transfers
    const logs = await this.rpcCall(url, 'eth_getLogs', [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      address: null, // Get logs from all addresses
      topics: [
        null, // Any event
        `0x000000000000000000000000${address.slice(2).toLowerCase()}`, // From address
        `0x000000000000000000000000${address.slice(2).toLowerCase()}`  // To address
      ]
    }]);

    // Process unique transactions
    const uniqueTxHashes: string[] = Array.from(new Set(logs.map((log: any) => log.transactionHash as string)));
    const transactions = await Promise.all(
      uniqueTxHashes.slice(0, limit).map(hash => this.fetchTransactionByHash(url, hash))
    );

    return transactions.filter(Boolean) as TransactionData[];
  }

  /**
   * Fetch ERC20 token transfers
   */
  private async fetchTokenTransfers(
    url: string,
    address: string,
    fromBlock: number,
    toBlock: number,
    limit: number
  ): Promise<TransactionData[]> {
    const paddedAddress = `0x000000000000000000000000${address.slice(2).toLowerCase()}`;

    // Get Transfer events where address is sender
    const sentLogs = await this.rpcCall(url, 'eth_getLogs', [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      topics: [
        this.TRANSFER_EVENT_SIGNATURE,
        paddedAddress, // From address
        null // Any recipient
      ]
    }]);

    // Get Transfer events where address is recipient
    const receivedLogs = await this.rpcCall(url, 'eth_getLogs', [{
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      topics: [
        this.TRANSFER_EVENT_SIGNATURE,
        null, // Any sender
        paddedAddress // To address
      ]
    }]);

    // Combine and process logs
    const allLogs = [...sentLogs, ...receivedLogs];
    const uniqueLogs = Array.from(
      new Map(allLogs.map((log: any) => [log.transactionHash + log.logIndex, log])).values()
    );

    // Convert logs to transactions
    const transfers = await Promise.all(
      uniqueLogs.slice(0, limit).map(log => this.convertLogToTransaction(url, log, address))
    );

    return transfers.filter(Boolean) as TransactionData[];
  }

  /**
   * Convert a log entry to a transaction
   */
  private async convertLogToTransaction(
    url: string,
    log: any,
    userAddress: string
  ): Promise<TransactionData | null> {
    try {
      // Get the full transaction
      const tx = await this.fetchTransactionByHash(url, log.transactionHash);
      if (!tx) return null;

      // Parse the transfer value from the log data
      const value = log.data ? parseInt(log.data, 16).toString() : '0';

      // Determine if it's incoming or outgoing
      const fromAddress = `0x${log.topics[1].slice(26)}`;
      const toAddress = `0x${log.topics[2].slice(26)}`;
      const isOutgoing = fromAddress.toLowerCase() === userAddress.toLowerCase();

      return {
        ...tx,
        value,
        from: fromAddress,
        to: toAddress,
        type: isOutgoing ? 'send' : 'receive',
        tokenAddress: log.address,
        symbol: 'TOKEN' // Would need additional call to get token symbol
      };
    } catch (error) {
      console.error('Error converting log to transaction:', error);
      return null;
    }
  }

  /**
   * Fetch a transaction by hash and get its details
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
      // Calculate confirmations
      const currentBlock = await this.getCurrentBlockNumber(chainId);
      tx.confirmations = currentBlock - tx.blockNumber;
      tx.chainId = chainId;
    }

    return tx;
  }
}
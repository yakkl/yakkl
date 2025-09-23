import {
  AbstractTransactionProvider,
  TransactionData,
  TransactionProviderConfig,
  TransactionFetchOptions
} from '../abstract/AbstractTransactionProvider';

/**
 * Alchemy transaction provider implementation
 * Uses Alchemy's enhanced APIs for fetching transaction data
 */
export class AlchemyTransactionProvider extends AbstractTransactionProvider {
  private readonly SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 8453, 43114];

  private readonly NETWORK_URLS: Record<number, string> = {
    1: 'https://eth-mainnet.g.alchemy.com/v2/',
    11155111: 'https://eth-sepolia.g.alchemy.com/v2/',
    137: 'https://polygon-mainnet.g.alchemy.com/v2/',
    42161: 'https://arb-mainnet.g.alchemy.com/v2/',
    10: 'https://opt-mainnet.g.alchemy.com/v2/',
    8453: 'https://base-mainnet.g.alchemy.com/v2/',
    43114: 'https://avax-mainnet.g.alchemy.com/v2/'
  };

  constructor(config: TransactionProviderConfig) {
    super(config, 'Alchemy');
    this.validateConfig();
  }

  /**
   * Build the RPC URL for a specific chain
   */
  protected buildRpcUrl(chainId: number): string {
    const baseUrl = this.NETWORK_URLS[chainId];
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} is not supported by Alchemy`);
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
   * Fetch transactions using Alchemy's getAssetTransfers API
   */
  async fetchTransactions(
    address: string,
    chainId: number,
    options: TransactionFetchOptions = {}
  ): Promise<TransactionData[]> {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by Alchemy`);
    }

    const url = this.buildRpcUrl(chainId);
    const limit = options.limit || 100;
    const sort = options.sort || 'desc';

    // Fetch both incoming and outgoing transfers
    const [outgoing, incoming] = await Promise.all([
      this.fetchTransfers(url, address, 'from', limit, sort),
      this.fetchTransfers(url, address, 'to', limit, sort)
    ]);

    // Combine and deduplicate by hash
    const allTransfers = [...outgoing, ...incoming];
    const uniqueTransfers = Array.from(
      new Map(allTransfers.map(tx => [tx.hash, tx])).values()
    );

    // Sort by timestamp (most recent first by default)
    uniqueTransfers.sort((a, b) => {
      if (sort === 'desc') {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });

    // Return limited results
    return uniqueTransfers.slice(0, limit);
  }

  /**
   * Fetch transfers using Alchemy's getAssetTransfers
   */
  private async fetchTransfers(
    url: string,
    address: string,
    direction: 'from' | 'to',
    limit: number,
    order: 'asc' | 'desc'
  ): Promise<TransactionData[]> {
    const params: any = {
      category: ['external', 'erc20', 'erc721', 'erc1155', 'internal'],
      withMetadata: true,
      maxCount: `0x${limit.toString(16)}`,
      order
    };

    if (direction === 'from') {
      params.fromAddress = address;
    } else {
      params.toAddress = address;
    }

    const result = await this.retryRequest(() =>
      this.rpcCall(url, 'alchemy_getAssetTransfers', [params])
    );

    const transfers = result.transfers || [];
    return transfers.map((tx: any) => this.convertAlchemyToStandard(tx, address));
  }

  /**
   * Fetch a single transaction by hash
   */
  async fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null> {
    const url = this.buildRpcUrl(chainId);

    // Get transaction and receipt in parallel
    const [tx, receipt] = await Promise.all([
      this.rpcCall(url, 'eth_getTransactionByHash', [txHash]),
      this.rpcCall(url, 'eth_getTransactionReceipt', [txHash])
    ]);

    if (!tx) {
      return null;
    }

    // Get current block for confirmations
    const currentBlock = await this.getCurrentBlockNumber(chainId);
    const blockNumber = parseInt(tx.blockNumber, 16);
    const confirmations = currentBlock - blockNumber;

    // Get block timestamp
    const block = await this.rpcCall(url, 'eth_getBlockByNumber', [tx.blockNumber, false]);
    const timestamp = parseInt(block.timestamp, 16) * 1000;

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: parseInt(tx.value, 16).toString(),
      blockNumber,
      timestamp,
      nonce: parseInt(tx.nonce, 16),
      gasPrice: parseInt(tx.gasPrice || tx.maxFeePerGas || '0', 16).toString(),
      gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : undefined,
      gasLimit: parseInt(tx.gas, 16).toString(),
      status: receipt ? (receipt.status === '0x1' ? 'confirmed' : 'failed') : 'pending',
      confirmations,
      type: this.determineTransactionType(tx),
      chainId,
      symbol: 'ETH'
    };
  }

  /**
   * Convert Alchemy transfer format to standard format
   */
  private convertAlchemyToStandard(transfer: any, userAddress: string): TransactionData {
    const isOutgoing = transfer.from?.toLowerCase() === userAddress.toLowerCase();

    // Parse timestamp
    let timestamp = Date.now();
    if (transfer.metadata?.blockTimestamp) {
      timestamp = new Date(transfer.metadata.blockTimestamp).getTime();
    }

    // Parse value
    let value = '0';
    if (transfer.value) {
      value = transfer.value.toString();
    } else if (transfer.rawContract?.value) {
      // For token transfers, value is in hex
      value = parseInt(transfer.rawContract.value, 16).toString();
    }

    // Parse block number
    const blockNumber = transfer.blockNum ? parseInt(transfer.blockNum, 16) : 0;

    // Determine transaction type
    let type: 'send' | 'receive' | 'swap' | 'contract' = isOutgoing ? 'send' : 'receive';
    if (transfer.category === 'internal') {
      type = 'contract';
    }

    return {
      hash: transfer.hash || transfer.uniqueId,
      from: transfer.from || '',
      to: transfer.to || '',
      value,
      blockNumber,
      timestamp,
      status: 'confirmed', // Alchemy only returns confirmed transfers
      type,
      chainId: 1, // Will be set by the caller
      symbol: transfer.asset || 'ETH',
      tokenAddress: transfer.rawContract?.address,
      tokenDecimals: transfer.rawContract?.decimal
    };
  }
}
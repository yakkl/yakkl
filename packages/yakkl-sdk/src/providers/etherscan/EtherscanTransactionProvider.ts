import {
  AbstractTransactionProvider,
  TransactionData,
  TransactionProviderConfig,
  TransactionFetchOptions
} from '../abstract/AbstractTransactionProvider';

/**
 * Etherscan transaction provider implementation
 * Uses Etherscan's API for comprehensive transaction history
 */
export class EtherscanTransactionProvider extends AbstractTransactionProvider {
  private readonly SUPPORTED_CHAINS = [1, 11155111, 137, 42161, 10, 8453, 56, 43114];

  private readonly API_URLS: Record<number, string> = {
    1: 'https://api.etherscan.io/api',
    11155111: 'https://api-sepolia.etherscan.io/api',
    137: 'https://api.polygonscan.com/api',
    42161: 'https://api.arbiscan.io/api',
    10: 'https://api-optimistic.etherscan.io/api',
    8453: 'https://api.basescan.org/api',
    56: 'https://api.bscscan.com/api',
    43114: 'https://api.snowscan.xyz/api'
  };

  constructor(config: TransactionProviderConfig) {
    super(config, 'Etherscan');
    this.validateConfig();
  }

  /**
   * Get the API URL for a specific chain
   */
  protected getApiUrl(chainId: number): string {
    const url = this.API_URLS[chainId];
    if (!url) {
      throw new Error(`Chain ${chainId} is not supported by Etherscan`);
    }
    return url;
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
    const url = this.getApiUrl(chainId);
    const params = new URLSearchParams({
      module: 'proxy',
      action: 'eth_blockNumber',
      apikey: this.config.apiKey
    });

    const response = await this.fetchWithRetry(`${url}?${params}`);
    const data = await response.json();

    if (data.status === '1' && data.result) {
      return parseInt(data.result, 16);
    }

    throw new Error(`Failed to get block number: ${data.message || 'Unknown error'}`);
  }

  /**
   * Fetch transactions using Etherscan's API
   */
  async fetchTransactions(
    address: string,
    chainId: number,
    options: TransactionFetchOptions = {}
  ): Promise<TransactionData[]> {
    if (!this.supportsChain(chainId)) {
      throw new Error(`Chain ${chainId} is not supported by Etherscan`);
    }

    const url = this.getApiUrl(chainId);
    const limit = options.limit || 100;
    const sort = options.sort || 'desc';
    const startBlock = options.startBlock || 0;
    const endBlock = options.endBlock || 999999999;

    // Fetch normal transactions
    const normalTxs = await this.fetchNormalTransactions(
      url,
      address,
      startBlock,
      endBlock,
      sort
    );

    // Optionally fetch token transactions
    let tokenTxs: TransactionData[] = [];
    if (options.includeTokenTransfers !== false) {
      tokenTxs = await this.fetchTokenTransactions(
        url,
        address,
        startBlock,
        endBlock,
        sort
      );
    }

    // Optionally fetch internal transactions
    let internalTxs: TransactionData[] = [];
    if (options.includeInternalTransactions) {
      internalTxs = await this.fetchInternalTransactions(
        url,
        address,
        startBlock,
        endBlock,
        sort
      );
    }

    // Combine and deduplicate
    const allTxs = [...normalTxs, ...tokenTxs, ...internalTxs];
    const uniqueTxs = Array.from(
      new Map(allTxs.map(tx => [tx.hash, tx])).values()
    );

    // Sort by timestamp
    uniqueTxs.sort((a, b) => {
      if (sort === 'desc') {
        return b.timestamp - a.timestamp;
      }
      return a.timestamp - b.timestamp;
    });

    // Return limited results
    return uniqueTxs.slice(0, limit).map(tx => ({ ...tx, chainId }));
  }

  /**
   * Fetch normal transactions
   */
  private async fetchNormalTransactions(
    baseUrl: string,
    address: string,
    startBlock: number,
    endBlock: number,
    sort: string
  ): Promise<TransactionData[]> {
    const params = new URLSearchParams({
      module: 'account',
      action: 'txlist',
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      sort,
      apikey: this.config.apiKey
    });

    const response = await this.fetchWithRetry(`${baseUrl}?${params}`);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result.map((tx: any) => this.convertEtherscanToStandard(tx, address));
    }

    if (data.status === '0' && data.message === 'No transactions found') {
      return [];
    }

    throw new Error(`Etherscan API error: ${data.message || 'Unknown error'}`);
  }

  /**
   * Fetch token transactions (ERC20, ERC721, etc.)
   */
  private async fetchTokenTransactions(
    baseUrl: string,
    address: string,
    startBlock: number,
    endBlock: number,
    sort: string
  ): Promise<TransactionData[]> {
    const params = new URLSearchParams({
      module: 'account',
      action: 'tokentx',
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      sort,
      apikey: this.config.apiKey
    });

    const response = await this.fetchWithRetry(`${baseUrl}?${params}`);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result.map((tx: any) => this.convertTokenTxToStandard(tx, address));
    }

    return [];
  }

  /**
   * Fetch internal transactions
   */
  private async fetchInternalTransactions(
    baseUrl: string,
    address: string,
    startBlock: number,
    endBlock: number,
    sort: string
  ): Promise<TransactionData[]> {
    const params = new URLSearchParams({
      module: 'account',
      action: 'txlistinternal',
      address,
      startblock: startBlock.toString(),
      endblock: endBlock.toString(),
      sort,
      apikey: this.config.apiKey
    });

    const response = await this.fetchWithRetry(`${baseUrl}?${params}`);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result.map((tx: any) => this.convertInternalTxToStandard(tx, address));
    }

    return [];
  }

  /**
   * Fetch a single transaction by hash
   */
  async fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null> {
    const url = this.getApiUrl(chainId);
    const params = new URLSearchParams({
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: txHash,
      apikey: this.config.apiKey
    });

    const response = await this.fetchWithRetry(`${url}?${params}`);
    const data = await response.json();

    if (data.result) {
      const tx = data.result;

      // Get receipt for additional details
      const receiptParams = new URLSearchParams({
        module: 'proxy',
        action: 'eth_getTransactionReceipt',
        txhash: txHash,
        apikey: this.config.apiKey
      });

      const receiptResponse = await this.fetchWithRetry(`${url}?${receiptParams}`);
      const receiptData = await receiptResponse.json();
      const receipt = receiptData.result;

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: parseInt(tx.value, 16).toString(),
        blockNumber: parseInt(tx.blockNumber, 16),
        timestamp: Date.now(), // Would need to fetch block for actual timestamp
        nonce: parseInt(tx.nonce, 16),
        gasPrice: parseInt(tx.gasPrice || tx.maxFeePerGas || '0', 16).toString(),
        gasUsed: receipt ? parseInt(receipt.gasUsed, 16).toString() : undefined,
        gasLimit: parseInt(tx.gas, 16).toString(),
        status: receipt ? (receipt.status === '0x1' ? 'confirmed' : 'failed') : 'pending',
        type: this.determineTransactionType(tx),
        chainId,
        symbol: 'ETH'
      };
    }

    return null;
  }

  /**
   * Convert Etherscan format to standard format
   */
  private convertEtherscanToStandard(tx: any, userAddress: string): TransactionData {
    const isOutgoing = tx.from.toLowerCase() === userAddress.toLowerCase();

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp) * 1000, // Etherscan returns Unix seconds
      nonce: parseInt(tx.nonce),
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      gasLimit: tx.gas,
      status: tx.isError === '0' ? 'confirmed' : 'failed',
      confirmations: parseInt(tx.confirmations),
      type: isOutgoing ? 'send' : 'receive',
      chainId: 1, // Will be set by caller
      symbol: 'ETH',
      methodId: tx.methodId,
      functionName: tx.functionName
    };
  }

  /**
   * Convert token transaction to standard format
   */
  private convertTokenTxToStandard(tx: any, userAddress: string): TransactionData {
    const isOutgoing = tx.from.toLowerCase() === userAddress.toLowerCase();

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp) * 1000,
      nonce: parseInt(tx.nonce),
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      gasLimit: tx.gas,
      status: 'confirmed',
      confirmations: parseInt(tx.confirmations),
      type: isOutgoing ? 'send' : 'receive',
      chainId: 1,
      symbol: tx.tokenSymbol,
      tokenAddress: tx.contractAddress,
      tokenName: tx.tokenName,
      tokenDecimals: parseInt(tx.tokenDecimal)
    };
  }

  /**
   * Convert internal transaction to standard format
   */
  private convertInternalTxToStandard(tx: any, userAddress: string): TransactionData {
    const isOutgoing = tx.from.toLowerCase() === userAddress.toLowerCase();

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp) * 1000,
      status: tx.isError === '0' ? 'confirmed' : 'failed',
      type: 'contract',
      chainId: 1,
      symbol: 'ETH',
      gasLimit: tx.gas,
      gasUsed: tx.gasUsed
    };
  }

  /**
   * Helper method for fetch with retry
   */
  private async fetchWithRetry(url: string, retries: number = 3): Promise<Response> {
    return this.retryRequest(async () => {
      await this.rateLimitDelay();

      const controller = new AbortController();
      const timeout = this.config.timeout || 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok && response.status !== 400) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        throw error;
      }
    }, retries);
  }
}
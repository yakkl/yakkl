/**
 * Abstract base class for transaction providers
 * All transaction providers (Alchemy, Infura, Etherscan, etc.) must extend this class
 */

export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestamp: number;
  nonce?: number;
  gasPrice?: string;
  gasUsed?: string;
  gasLimit?: string;
  status?: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  type?: 'send' | 'receive' | 'swap' | 'contract';
  chainId: number;
  symbol?: string;
  tokenAddress?: string;
  tokenDecimals?: number;
  tokenName?: string;
  methodId?: string;
  functionName?: string;
}

export interface TransactionProviderConfig {
  apiKey: string;
  network?: string;
  timeout?: number;
  retryCount?: number;
  rateLimit?: number;
}

export interface TransactionFetchOptions {
  limit?: number;
  offset?: number;
  startBlock?: number;
  endBlock?: number;
  includeTokenTransfers?: boolean;
  includeInternalTransactions?: boolean;
  sort?: 'asc' | 'desc';
}

export abstract class AbstractTransactionProvider {
  protected config: TransactionProviderConfig;
  protected name: string;

  constructor(config: TransactionProviderConfig, name: string) {
    this.config = config;
    this.name = name;
  }

  /**
   * Get the provider name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Fetch transactions for an address
   * Each provider must implement this method with their specific API logic
   */
  abstract fetchTransactions(
    address: string,
    chainId: number,
    options?: TransactionFetchOptions
  ): Promise<TransactionData[]>;

  /**
   * Fetch a single transaction by hash
   */
  abstract fetchTransaction(
    txHash: string,
    chainId: number
  ): Promise<TransactionData | null>;

  /**
   * Get the current block number for a chain
   */
  abstract getCurrentBlockNumber(chainId: number): Promise<number>;

  /**
   * Check if the provider supports a specific chain
   */
  abstract supportsChain(chainId: number): boolean;

  /**
   * Get supported chains for this provider
   */
  abstract getSupportedChains(): number[];

  /**
   * Validate the provider configuration
   */
  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`${this.name} provider requires an API key`);
    }
  }

  /**
   * Build the RPC URL for a specific chain
   * Override this in providers that use RPC endpoints
   */
  protected buildRpcUrl(chainId: number): string {
    throw new Error(`Provider ${this.name} must implement buildRpcUrl`);
  }

  /**
   * Helper method to handle rate limiting
   */
  protected async rateLimitDelay(): Promise<void> {
    if (this.config.rateLimit) {
      await new Promise(resolve => setTimeout(resolve, this.config.rateLimit));
    }
  }

  /**
   * Helper method to retry failed requests
   */
  protected async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = this.config.retryCount || 3
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Convert provider-specific transaction format to standard format
   * Each provider should override this if needed
   */
  protected normalizeTransaction(tx: any, chainId: number): TransactionData {
    // Default implementation - providers can override
    return {
      hash: tx.hash || tx.transactionHash,
      from: tx.from,
      to: tx.to,
      value: tx.value || '0',
      blockNumber: parseInt(tx.blockNumber),
      timestamp: tx.timestamp || Date.now(),
      nonce: tx.nonce,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      gasLimit: tx.gasLimit || tx.gas,
      status: tx.status ? 'confirmed' : 'pending',
      confirmations: tx.confirmations,
      type: this.determineTransactionType(tx),
      chainId,
      symbol: tx.symbol || 'ETH'
    };
  }

  /**
   * Determine transaction type based on transaction data
   */
  protected determineTransactionType(tx: any): 'send' | 'receive' | 'swap' | 'contract' {
    // Basic implementation - providers can override with more sophisticated logic
    if (tx.input && tx.input !== '0x' && tx.input !== '0x0') {
      return 'contract';
    }
    return 'send';
  }

  /**
   * Make an RPC call
   * Helper method for providers that use JSON-RPC
   */
  protected async rpcCall(
    url: string,
    method: string,
    params: any[] = []
  ): Promise<any> {
    const controller = new AbortController();
    const timeout = this.config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      return data.result;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }
}
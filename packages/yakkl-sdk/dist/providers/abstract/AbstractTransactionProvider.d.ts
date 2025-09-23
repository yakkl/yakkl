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
export declare abstract class AbstractTransactionProvider {
    protected config: TransactionProviderConfig;
    protected name: string;
    constructor(config: TransactionProviderConfig, name: string);
    /**
     * Get the provider name
     */
    getName(): string;
    /**
     * Fetch transactions for an address
     * Each provider must implement this method with their specific API logic
     */
    abstract fetchTransactions(address: string, chainId: number, options?: TransactionFetchOptions): Promise<TransactionData[]>;
    /**
     * Fetch a single transaction by hash
     */
    abstract fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null>;
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
    protected validateConfig(): void;
    /**
     * Build the RPC URL for a specific chain
     * Override this in providers that use RPC endpoints
     */
    protected buildRpcUrl(chainId: number): string;
    /**
     * Helper method to handle rate limiting
     */
    protected rateLimitDelay(): Promise<void>;
    /**
     * Helper method to retry failed requests
     */
    protected retryRequest<T>(fn: () => Promise<T>, retries?: number): Promise<T>;
    /**
     * Convert provider-specific transaction format to standard format
     * Each provider should override this if needed
     */
    protected normalizeTransaction(tx: any, chainId: number): TransactionData;
    /**
     * Determine transaction type based on transaction data
     */
    protected determineTransactionType(tx: any): 'send' | 'receive' | 'swap' | 'contract';
    /**
     * Make an RPC call
     * Helper method for providers that use JSON-RPC
     */
    protected rpcCall(url: string, method: string, params?: any[]): Promise<any>;
}

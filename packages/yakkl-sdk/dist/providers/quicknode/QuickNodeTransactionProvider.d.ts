import { AbstractTransactionProvider, TransactionData, TransactionProviderConfig, TransactionFetchOptions } from '../abstract/AbstractTransactionProvider';
/**
 * QuickNode transaction provider implementation
 * Uses QuickNode's enhanced RPC methods for transaction data
 */
export declare class QuickNodeTransactionProvider extends AbstractTransactionProvider {
    private readonly SUPPORTED_CHAINS;
    constructor(config: TransactionProviderConfig);
    /**
     * Build the RPC URL for QuickNode
     * QuickNode URLs are typically in format: https://xxx.quiknode.pro/yyy/
     */
    protected buildRpcUrl(chainId: number): string;
    /**
     * Check if the provider supports a specific chain
     */
    supportsChain(chainId: number): boolean;
    /**
     * Get supported chains
     */
    getSupportedChains(): number[];
    /**
     * Get the current block number
     */
    getCurrentBlockNumber(chainId: number): Promise<number>;
    /**
     * Fetch transactions using QuickNode's qn_getWalletTokenTransactions
     */
    fetchTransactions(address: string, chainId: number, options?: TransactionFetchOptions): Promise<TransactionData[]>;
    /**
     * Fetch transactions using QuickNode's enhanced API
     */
    private fetchWithQuickNodeAPI;
    /**
     * Fallback to standard RPC methods
     */
    private fetchWithStandardRPC;
    /**
     * Fetch logs for an address
     */
    private fetchLogsForAddress;
    /**
     * Fetch a transaction by hash
     */
    private fetchTransactionByHash;
    /**
     * Fetch a single transaction by hash
     */
    fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null>;
    /**
     * Convert QuickNode transfer format to standard
     */
    private convertQuickNodeTransfer;
    /**
     * Convert QuickNode transaction format to standard
     */
    private convertQuickNodeTransaction;
}

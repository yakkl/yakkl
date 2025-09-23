import { AbstractTransactionProvider, TransactionData, TransactionProviderConfig, TransactionFetchOptions } from '../abstract/AbstractTransactionProvider';
/**
 * Infura transaction provider implementation
 * Uses standard Ethereum JSON-RPC methods with eth_getLogs for transaction history
 */
export declare class InfuraTransactionProvider extends AbstractTransactionProvider {
    private readonly SUPPORTED_CHAINS;
    private readonly NETWORK_URLS;
    private readonly TRANSFER_EVENT_SIGNATURE;
    constructor(config: TransactionProviderConfig);
    /**
     * Build the RPC URL for a specific chain
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
     * Fetch transactions using eth_getLogs
     * This is a simplified approach that fetches transfer events
     */
    fetchTransactions(address: string, chainId: number, options?: TransactionFetchOptions): Promise<TransactionData[]>;
    /**
     * Fetch native ETH transactions
     * Note: This is limited as Infura doesn't have a direct transaction history API
     * We use eth_getLogs to find transactions involving the address
     */
    private fetchNativeTransactions;
    /**
     * Fetch ERC20 token transfers
     */
    private fetchTokenTransfers;
    /**
     * Convert a log entry to a transaction
     */
    private convertLogToTransaction;
    /**
     * Fetch a transaction by hash and get its details
     */
    private fetchTransactionByHash;
    /**
     * Fetch a single transaction by hash
     */
    fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null>;
}

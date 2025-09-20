import { AbstractTransactionProvider, TransactionData, TransactionProviderConfig, TransactionFetchOptions } from '../abstract/AbstractTransactionProvider';
/**
 * Alchemy transaction provider implementation
 * Uses Alchemy's enhanced APIs for fetching transaction data
 */
export declare class AlchemyTransactionProvider extends AbstractTransactionProvider {
    private readonly SUPPORTED_CHAINS;
    private readonly NETWORK_URLS;
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
     * Fetch transactions using Alchemy's getAssetTransfers API
     */
    fetchTransactions(address: string, chainId: number, options?: TransactionFetchOptions): Promise<TransactionData[]>;
    /**
     * Fetch transfers using Alchemy's getAssetTransfers
     */
    private fetchTransfers;
    /**
     * Fetch a single transaction by hash
     */
    fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null>;
    /**
     * Convert Alchemy transfer format to standard format
     */
    private convertAlchemyToStandard;
}

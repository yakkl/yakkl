import { AbstractTransactionProvider, TransactionData, TransactionProviderConfig, TransactionFetchOptions } from '../abstract/AbstractTransactionProvider';
/**
 * Etherscan transaction provider implementation
 * Uses Etherscan's API for comprehensive transaction history
 */
export declare class EtherscanTransactionProvider extends AbstractTransactionProvider {
    private readonly SUPPORTED_CHAINS;
    private readonly API_URLS;
    constructor(config: TransactionProviderConfig);
    /**
     * Get the API URL for a specific chain
     */
    protected getApiUrl(chainId: number): string;
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
     * Fetch transactions using Etherscan's API
     */
    fetchTransactions(address: string, chainId: number, options?: TransactionFetchOptions): Promise<TransactionData[]>;
    /**
     * Fetch normal transactions
     */
    private fetchNormalTransactions;
    /**
     * Fetch token transactions (ERC20, ERC721, etc.)
     */
    private fetchTokenTransactions;
    /**
     * Fetch internal transactions
     */
    private fetchInternalTransactions;
    /**
     * Fetch a single transaction by hash
     */
    fetchTransaction(txHash: string, chainId: number): Promise<TransactionData | null>;
    /**
     * Convert Etherscan format to standard format
     */
    private convertEtherscanToStandard;
    /**
     * Convert token transaction to standard format
     */
    private convertTokenTxToStandard;
    /**
     * Convert internal transaction to standard format
     */
    private convertInternalTxToStandard;
    /**
     * Helper method for fetch with retry
     */
    private fetchWithRetry;
}

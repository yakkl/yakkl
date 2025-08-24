/**
 * Transaction fetcher interface for retrieving transaction history from explorers
 * This interface abstracts different blockchain explorer APIs (Etherscan, Polygonscan, etc.)
 */
export interface ITransactionFetcher {
  /** Fetcher name (e.g., 'alchemy-explorer', 'etherscan') */
  readonly name: string;
  
  /** Chain ID this fetcher supports */
  readonly chainId: number;
  
  /** Blockchain type */
  readonly blockchain: string;
  
  /**
   * Get transaction history for an address
   * @param address - Wallet address
   * @param options - Query options
   */
  getTransactionHistory(
    address: string,
    options?: TransactionFetchOptions
  ): Promise<TransactionHistoryResponse>;
  
  /**
   * Get token transfers for an address
   * @param address - Wallet address
   * @param options - Query options
   */
  getTokenTransfers(
    address: string,
    options?: TokenTransferOptions
  ): Promise<TokenTransferResponse>;
  
  /**
   * Get internal transactions for an address (contract interactions)
   * @param address - Wallet address
   * @param options - Query options
   */
  getInternalTransactions(
    address: string,
    options?: InternalTransactionOptions
  ): Promise<InternalTransactionResponse>;
  
  /**
   * Get transaction details by hash
   * @param txHash - Transaction hash
   */
  getTransactionByHash(txHash: string): Promise<TransactionDetail>;
  
  /**
   * Health check for the fetcher
   */
  healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
}

/**
 * Base options for transaction fetching
 */
export interface BaseTransactionOptions {
  /** Start block number */
  startBlock?: number;
  
  /** End block number */
  endBlock?: number;
  
  /** Maximum number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
  
  /** Sort order ('asc' or 'desc') */
  sort?: 'asc' | 'desc';
}

/**
 * Options for fetching transaction history
 */
export interface TransactionFetchOptions extends BaseTransactionOptions {
  /** Filter by transaction type */
  txType?: 'all' | 'normal' | 'internal' | 'erc20' | 'erc721' | 'erc1155';
}

/**
 * Options for fetching token transfers
 */
export interface TokenTransferOptions extends BaseTransactionOptions {
  /** Filter by contract address */
  contractAddress?: string;
  
  /** Token standard filter */
  tokenType?: 'erc20' | 'erc721' | 'erc1155';
}

/**
 * Options for fetching internal transactions
 */
export interface InternalTransactionOptions extends BaseTransactionOptions {
  /** Only successful transactions */
  onlySuccessful?: boolean;
}

/**
 * Standardized transaction object
 */
export interface TransactionDetail {
  /** Transaction hash */
  hash: string;
  
  /** Block number */
  blockNumber: number;
  
  /** Block timestamp */
  timestamp: number;
  
  /** From address */
  from: string;
  
  /** To address */
  to: string;
  
  /** Value in wei */
  value: string;
  
  /** Gas used */
  gasUsed: string;
  
  /** Gas price */
  gasPrice: string;
  
  /** Transaction fee */
  fee: string;
  
  /** Transaction status (1 = success, 0 = failed) */
  status: number;
  
  /** Input data */
  input?: string;
  
  /** Nonce */
  nonce: number;
  
  /** Transaction index in block */
  transactionIndex: number;
  
  /** Method name (if available) */
  methodName?: string;
  
  /** Function signature (if available) */
  functionName?: string;
}

/**
 * Token transfer details
 */
export interface TokenTransferDetail {
  /** Transaction hash */
  hash: string;
  
  /** Block number */
  blockNumber: number;
  
  /** Block timestamp */
  timestamp: number;
  
  /** From address */
  from: string;
  
  /** To address */
  to: string;
  
  /** Contract address */
  contractAddress: string;
  
  /** Token value */
  value: string;
  
  /** Token name */
  tokenName?: string;
  
  /** Token symbol */
  tokenSymbol?: string;
  
  /** Token decimals */
  tokenDecimal?: number;
  
  /** Token ID (for NFTs) */
  tokenID?: string;
  
  /** Token type */
  tokenType: 'ERC-20' | 'ERC-721' | 'ERC-1155';
}

/**
 * Internal transaction details
 */
export interface InternalTransactionDetail {
  /** Transaction hash */
  hash: string;
  
  /** Block number */
  blockNumber: number;
  
  /** Block timestamp */
  timestamp: number;
  
  /** From address */
  from: string;
  
  /** To address */
  to: string;
  
  /** Value in wei */
  value: string;
  
  /** Gas used */
  gas: string;
  
  /** Gas used */
  gasUsed: string;
  
  /** Input data */
  input: string;
  
  /** Output data */
  output: string;
  
  /** Type of call */
  type: string;
  
  /** Trace ID */
  traceId: string;
  
  /** Error message (if failed) */
  errCode?: string;
}

/**
 * Response structure for transaction history
 */
export interface TransactionHistoryResponse {
  /** Array of transactions */
  transactions: TransactionDetail[];
  
  /** Total count (for pagination) */
  total: number;
  
  /** Has more results */
  hasMore: boolean;
  
  /** Next page token */
  nextPageToken?: string;
}

/**
 * Response structure for token transfers
 */
export interface TokenTransferResponse {
  /** Array of token transfers */
  transfers: TokenTransferDetail[];
  
  /** Total count (for pagination) */
  total: number;
  
  /** Has more results */
  hasMore: boolean;
  
  /** Next page token */
  nextPageToken?: string;
}

/**
 * Response structure for internal transactions
 */
export interface InternalTransactionResponse {
  /** Array of internal transactions */
  transactions: InternalTransactionDetail[];
  
  /** Total count (for pagination) */
  total: number;
  
  /** Has more results */
  hasMore: boolean;
  
  /** Next page token */
  nextPageToken?: string;
}
/**
 * Unified Provider Interfaces for YAKKL Ecosystem
 *
 * This file contains the comprehensive provider interfaces that serve as the
 * single source of truth for all provider implementations across YAKKL packages.
 *
 * Key Features:
 * - EIP-1193 compliance for Ethereum compatibility
 * - Multi-chain support (EVM, Bitcoin, Solana, etc.)
 * - Cost tracking for intelligent routing
 * - Health monitoring and performance metrics
 * - Provider metadata for routing decisions
 */
/**
 * Supported blockchain types
 */
export declare enum ChainType {
    EVM = "evm",
    BITCOIN = "bitcoin",
    SOLANA = "solana",
    COSMOS = "cosmos",
    POLKADOT = "polkadot",
    NEAR = "near",
    TRON = "tron"
}
/**
 * Chain information
 */
export interface ChainInfo {
    chainId: string | number;
    name: string;
    type: ChainType;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
    isTestnet?: boolean;
    chainReference?: string;
}
/**
 * Provider cost metrics for routing decisions
 */
export interface ProviderCostMetrics {
    /** Compute Units consumed (for CU-based providers like Alchemy) */
    computeUnitsUsed?: number;
    computeUnitsLimit?: number;
    /** Request count (for request-based providers like Infura) */
    requestsUsed?: number;
    requestsLimit?: number;
    /** Cost per method (for intelligent routing) */
    methodCosts?: Record<string, {
        cu?: number;
        requests?: number;
        avgLatency?: number;
    }>;
    /** Current billing period */
    billingPeriod?: {
        start: Date;
        end: Date;
        costSoFar?: number;
    };
}
/**
 * Provider health and performance metrics
 */
export interface ProviderHealthMetrics {
    /** Is the provider currently healthy */
    healthy: boolean;
    /** Average latency in milliseconds */
    latency: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Last error if any */
    lastError?: {
        message: string;
        timestamp: Date;
        method?: string;
    };
    /** Uptime percentage */
    uptime: number;
    /** Rate limit status */
    rateLimitStatus?: {
        remaining: number;
        reset: Date;
    };
}
/**
 * Provider metadata for routing decisions
 */
export interface ProviderMetadata {
    /** Provider name (e.g., 'alchemy', 'infura', 'yakkl') */
    name: string;
    /** Provider tier (e.g., 'free', 'growth', 'enterprise') */
    tier?: string;
    /** Priority for routing (lower is higher priority) */
    priority: number;
    /** Supported methods (for filtering) */
    supportedMethods: string[];
    /** Chains this provider supports */
    supportedChainIds: number[];
    /** Provider-specific features */
    features?: {
        archive?: boolean;
        trace?: boolean;
        debug?: boolean;
        websocket?: boolean;
        batchRequests?: boolean;
    };
    /** Cost structure */
    costStructure: 'cu' | 'request' | 'hybrid' | 'free';
}
/**
 * Common types for provider operations
 */
export type BlockTag = 'latest' | 'earliest' | 'pending' | 'finalized' | 'safe' | number | string;
export type BigNumberish = string | number | bigint;
/**
 * Transaction request structure
 */
export interface TransactionRequest {
    to?: string;
    from?: string;
    value?: BigNumberish;
    data?: string;
    gasLimit?: BigNumberish;
    gasPrice?: BigNumberish;
    maxFeePerGas?: BigNumberish;
    maxPriorityFeePerGas?: BigNumberish;
    nonce?: number;
    chainId?: number;
    type?: number;
}
/**
 * Transaction response structure
 */
export interface TransactionResponse {
    hash: string;
    blockHash?: string;
    blockNumber?: number;
    transactionIndex?: number;
    from: string;
    to?: string;
    value: BigNumberish;
    gasPrice?: BigNumberish;
    gasLimit: BigNumberish;
    data: string;
    nonce: number;
    confirmations?: number;
    type?: number;
    maxFeePerGas?: BigNumberish;
    maxPriorityFeePerGas?: BigNumberish;
    chainId?: number;
    wait?: (confirmations?: number) => Promise<TransactionReceipt>;
}
/**
 * Transaction receipt structure
 */
export interface TransactionReceipt {
    transactionHash: string;
    blockHash: string;
    blockNumber: number;
    transactionIndex: number;
    from: string;
    to?: string;
    contractAddress?: string;
    cumulativeGasUsed: BigNumberish;
    gasUsed: BigNumberish;
    effectiveGasPrice?: BigNumberish;
    logs: Log[];
    logsBloom: string;
    status?: number;
    type?: number;
}
/**
 * Fee data structure
 */
export interface FeeData {
    gasPrice?: bigint;
    lastBaseFeePerGas?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
}
/**
 * Log structure
 */
export interface Log {
    address: string;
    topics: string[];
    data: string;
    blockNumber?: number;
    blockHash?: string;
    transactionHash?: string;
    transactionIndex?: number;
    logIndex?: number;
    removed?: boolean;
}
/**
 * Filter for logs
 */
export interface Filter {
    address?: string | string[];
    topics?: Array<string | string[] | null>;
    fromBlock?: BlockTag;
    toBlock?: BlockTag;
}
/**
 * Block structure
 */
export interface Block {
    hash: string;
    parentHash: string;
    number: number;
    timestamp: number;
    gasLimit: BigNumberish;
    gasUsed: BigNumberish;
    miner: string;
    baseFeePerGas?: BigNumberish;
    transactions: string[] | TransactionResponse[];
    difficulty?: BigNumberish;
    totalDifficulty?: BigNumberish;
    extraData?: string;
    size?: number;
    nonce?: string;
}
/**
 * Block with full transaction details
 */
export interface BlockWithTransactions extends Omit<Block, 'transactions'> {
    transactions: TransactionResponse[];
}
/**
 * Main Provider Interface
 *
 * This is the unified interface that all providers must implement.
 * It combines EIP-1193 compliance with comprehensive blockchain operations
 * and adds cost/health metrics for intelligent routing.
 */
export interface ProviderInterface {
    /** Provider metadata for routing decisions */
    readonly metadata: ProviderMetadata;
    /** Current chain information */
    readonly chainInfo: ChainInfo;
    /** Connection status */
    readonly isConnected: boolean;
    /**
     * Connect to the provider
     * @param chainId Optional chain to connect to
     */
    connect(chainId?: number): Promise<void>;
    /**
     * Disconnect from the provider
     */
    disconnect(): Promise<void>;
    /**
     * Switch to a different chain
     * @param chainId Chain ID to switch to
     */
    switchChain(chainId: number): Promise<void>;
    /**
     * Make a JSON-RPC request (EIP-1193)
     * @param args Request arguments with method and params
     */
    request<T = any>(args: {
        method: string;
        params?: any[];
    }): Promise<T>;
    getNetwork(): Promise<{
        name: string;
        chainId: number;
    }>;
    getChainId(): Promise<number>;
    getBlockNumber(): Promise<number>;
    getBlock(blockHashOrTag: BlockTag | string): Promise<Block | null>;
    getBlockWithTransactions(blockHashOrTag: BlockTag | string): Promise<BlockWithTransactions | null>;
    getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
    getTransactionCount(address: string, blockTag?: BlockTag): Promise<number>;
    getCode(address: string, blockTag?: BlockTag): Promise<string>;
    call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
    estimateGas(transaction: TransactionRequest): Promise<bigint>;
    sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
    getTransaction(transactionHash: string): Promise<TransactionResponse | null>;
    getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt | null>;
    waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<TransactionReceipt>;
    getGasPrice(): Promise<bigint>;
    getFeeData(): Promise<FeeData>;
    getLogs(filter: Filter): Promise<Log[]>;
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
    once(event: string, handler: (...args: any[]) => void): void;
    removeAllListeners(event?: string): void;
    /**
     * Get the raw underlying provider instance
     * (e.g., ethers provider, web3 provider)
     */
    getRawProvider(): any;
    /**
     * Get the provider's RPC endpoint URL
     */
    getEndpoint(): string;
    /**
     * Get current cost metrics for routing decisions
     */
    getCostMetrics(): Promise<ProviderCostMetrics>;
    /**
     * Get current health metrics
     */
    getHealthMetrics(): Promise<ProviderHealthMetrics>;
    /**
     * Perform a health check
     */
    healthCheck(): Promise<ProviderHealthMetrics>;
    resolveName?(name: string): Promise<string | null>;
    lookupAddress?(address: string): Promise<string | null>;
    getStorageAt?(address: string, position: BigNumberish, blockTag?: BlockTag): Promise<string>;
    getSigner?(privateKey?: string): Promise<any>;
}
/**
 * EVM-specific provider interface
 * Extends base provider with EVM-specific features
 */
export interface EVMProviderInterface extends ProviderInterface {
    getMaxPriorityFeePerGas(): Promise<bigint>;
    getFeeHistory(blockCount: number, newestBlock: BlockTag, rewardPercentiles: number[]): Promise<any>;
    resolveName(name: string): Promise<string | null>;
    lookupAddress(address: string): Promise<string | null>;
    getCode(address: string, blockTag?: BlockTag): Promise<string>;
    getStorageAt(address: string, position: BigNumberish, blockTag?: BlockTag): Promise<string>;
}
/**
 * Bitcoin-specific provider interface
 */
export interface BitcoinProviderInterface extends ProviderInterface {
    getUTXOs(address: string): Promise<UTXO[]>;
    createTransaction(inputs: UTXO[], outputs: Output[], changeAddress: string): Promise<any>;
    broadcastTransaction(signedTx: string): Promise<string>;
    getAddressType(address: string): 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
    estimateFeeRate(priority: 'low' | 'medium' | 'high'): Promise<number>;
}
/**
 * Solana-specific provider interface
 */
export interface SolanaProviderInterface extends ProviderInterface {
    getAccountInfo(publicKey: string): Promise<any>;
    getProgramAccounts(programId: string, filters?: any[]): Promise<any[]>;
    getRecentBlockhash(): Promise<{
        blockhash: string;
        feeCalculator: any;
    }>;
    sendRawTransaction(signedTx: string): Promise<string>;
    getTokenAccountsByOwner(owner: string, mint?: string): Promise<any[]>;
    getTokenSupply(mint: string): Promise<string>;
    getStakeActivation(publicKey: string): Promise<any>;
    getValidators(): Promise<any[]>;
}
/**
 * UTXO structure for Bitcoin-like chains
 */
export interface UTXO {
    txid: string;
    vout: number;
    value: string;
    scriptPubKey: string;
    confirmations: number;
}
/**
 * Output structure for Bitcoin transactions
 */
export interface Output {
    address: string;
    value: string;
}
/**
 * Provider factory interface
 */
export interface ProviderFactoryInterface {
    createProvider(chainInfo: ChainInfo, config?: ProviderConfig): ProviderInterface;
    getSupportedChains(): ChainInfo[];
    isChainSupported(chainId: string | number): boolean;
}
/**
 * Provider configuration
 */
export interface ProviderConfig {
    rpcUrl?: string;
    apiKey?: string;
    timeout?: number;
    retryCount?: number;
    headers?: Record<string, string>;
    customProvider?: any;
    priority?: number;
    metadata?: Partial<ProviderMetadata>;
}
/**
 * Provider events
 */
export interface ProviderEvents {
    connect: (chainId: string | number) => void;
    disconnect: (error?: Error) => void;
    chainChanged: (chainId: string | number) => void;
    accountsChanged: (accounts: string[]) => void;
    message: (message: any) => void;
    error: (error: Error) => void;
}
/**
 * Multi-provider manager interface
 * Used for managing multiple providers in routing scenarios
 */
export interface MultiProviderManagerInterface {
    addProvider(chainId: string | number, provider: ProviderInterface): void;
    removeProvider(chainId: string | number): void;
    getProvider(chainId: string | number): ProviderInterface | undefined;
    getAllProviders(): Map<string | number, ProviderInterface>;
    setActiveProvider(chainId: string | number): void;
    getActiveProvider(): ProviderInterface | undefined;
    getProvidersByChain(chainId: number): ProviderInterface[];
    getProviderByCost(method: string, chainId: number): ProviderInterface | undefined;
    getProviderByLatency(chainId: number): ProviderInterface | undefined;
    getHealthyProviders(chainId: number): ProviderInterface[];
}
export type { ProviderInterface as IBlockchainProvider };
export type { EVMProviderInterface as IEVMProvider };
export type { BitcoinProviderInterface as IBitcoinProvider };
export type { SolanaProviderInterface as ISolanaProvider };
export type { ProviderFactoryInterface as IProviderFactory };
export type { MultiProviderManagerInterface as IMultiProviderManager };
//# sourceMappingURL=provider.interface.d.ts.map
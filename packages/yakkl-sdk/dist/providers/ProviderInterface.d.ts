/**
 * Provider Interface - The foundation of YAKKL SDK's provider system
 *
 * Unlike Ethers/Viem which are tightly coupled to specific providers,
 * YAKKL SDK uses a plugin architecture that allows any provider to be used.
 */
export interface TransactionRequest {
    from?: string;
    to?: string;
    value?: string | bigint;
    data?: string;
    gas?: string | bigint;
    gasPrice?: string | bigint;
    maxFeePerGas?: string | bigint;
    maxPriorityFeePerGas?: string | bigint;
    nonce?: number;
    chainId?: number;
}
export interface TransactionResponse {
    hash: string;
    from: string;
    to?: string;
    value: string;
    data: string;
    blockNumber?: number;
    blockHash?: string;
    timestamp?: number;
    confirmations: number;
    status?: 'pending' | 'confirmed' | 'failed';
}
export interface BlockInfo {
    number: number;
    hash: string;
    timestamp: number;
    miner: string;
    gasLimit: string;
    gasUsed: string;
    baseFeePerGas?: string;
    transactions: string[];
}
export interface ProviderConfig {
    url?: string;
    apiKey?: string;
    network?: string;
    chainId?: number;
    timeout?: number;
    retries?: number;
    priority?: number;
    weight?: number;
    rateLimit?: {
        requests: number;
        window: number;
    };
}
export declare enum ProviderType {
    ALCHEMY = "alchemy",
    INFURA = "infura",
    QUICKNODE = "quicknode",
    ETHERSCAN = "etherscan",
    CUSTOM = "custom",
    BROWSER_EXTENSION = "browser_extension",
    WEBSOCKET = "websocket",
    IPC = "ipc"
}
export interface ProviderStats {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    lastError?: Error;
    lastRequestTime?: Date;
    isHealthy: boolean;
}
/**
 * Core Provider Interface
 * All providers must implement this interface
 */
export interface IProvider {
    readonly type: ProviderType;
    readonly name: string;
    readonly config: ProviderConfig;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    call(method: string, params: any[]): Promise<any>;
    send(method: string, params: any[]): Promise<any>;
    request(args: {
        method: string;
        params?: any[];
    }): Promise<any>;
    getBalance(address: string): Promise<string>;
    getTransactionCount(address: string): Promise<number>;
    getGasPrice(): Promise<string>;
    estimateGas(transaction: TransactionRequest): Promise<string>;
    sendTransaction(transaction: TransactionRequest): Promise<string>;
    getTransaction(hash: string): Promise<TransactionResponse | null>;
    getTransactionReceipt(hash: string): Promise<any>;
    getBlock(blockHashOrNumber: string | number): Promise<BlockInfo>;
    getBlockNumber(): Promise<number>;
    getChainId(): Promise<number>;
    subscribe?(event: string, callback: (data: any) => void): void;
    unsubscribe?(event: string, callback: (data: any) => void): void;
    getStats(): ProviderStats;
    healthCheck(): Promise<boolean>;
    batch?(requests: Array<{
        method: string;
        params: any[];
    }>): Promise<any[]>;
}
/**
 * Provider capabilities
 * Allows providers to advertise their features
 */
export interface ProviderCapabilities {
    websocket: boolean;
    batch: boolean;
    subscription: boolean;
    archive: boolean;
    trace: boolean;
    logs: boolean;
    pending: boolean;
}
/**
 * Abstract base class for providers
 * Provides common functionality and patterns
 */
export declare abstract class BaseProvider implements IProvider {
    abstract readonly type: ProviderType;
    abstract readonly name: string;
    readonly config: ProviderConfig;
    protected stats: ProviderStats;
    constructor(config: ProviderConfig);
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract isConnected(): boolean;
    abstract call(method: string, params: any[]): Promise<any>;
    send(method: string, params: any[]): Promise<any>;
    request(args: {
        method: string;
        params?: any[];
    }): Promise<any>;
    getBalance(address: string): Promise<string>;
    getTransactionCount(address: string): Promise<number>;
    getGasPrice(): Promise<string>;
    estimateGas(transaction: TransactionRequest): Promise<string>;
    sendTransaction(transaction: TransactionRequest): Promise<string>;
    getTransaction(hash: string): Promise<TransactionResponse | null>;
    getTransactionReceipt(hash: string): Promise<any>;
    getBlock(blockHashOrNumber: string | number): Promise<BlockInfo>;
    getBlockNumber(): Promise<number>;
    getChainId(): Promise<number>;
    getStats(): ProviderStats;
    healthCheck(): Promise<boolean>;
    protected trackRequest<T>(operation: () => Promise<T>): Promise<T>;
}

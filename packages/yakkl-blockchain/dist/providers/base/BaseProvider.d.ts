/**
 * Base provider implementation with common functionality
 */
import type { ProviderInterface, Block, BlockTag, BlockWithTransactions, EventType, FeeData, Filter, Listener, Log, NetworkProviderConfig, TransactionReceipt, TransactionRequest, TransactionResponse, ChainInfo, ProviderMetadata, ProviderCostMetrics, ProviderHealthMetrics } from '../types';
export declare abstract class BaseProvider implements ProviderInterface {
    protected config: NetworkProviderConfig;
    protected listeners: Map<string, Set<Listener>>;
    protected _connected: boolean;
    protected name: string;
    protected blockchains: string[];
    protected chainIds: number[];
    protected currentChainId: number;
    readonly metadata: ProviderMetadata;
    readonly chainInfo: ChainInfo;
    get isConnected(): boolean;
    constructor(config: NetworkProviderConfig);
    abstract getNetwork(): Promise<{
        name: string;
        chainId: number;
    }>;
    abstract getChainId(): Promise<number>;
    abstract getBlockNumber(): Promise<number>;
    abstract getBlock(blockHashOrBlockTag: BlockTag | string): Promise<Block | null>;
    abstract getBlockWithTransactions(blockHashOrBlockTag: BlockTag | string): Promise<BlockWithTransactions | null>;
    abstract getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
    abstract getTransactionCount(address: string, blockTag?: BlockTag): Promise<number>;
    abstract getCode(address: string, blockTag?: BlockTag): Promise<string>;
    abstract call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
    abstract estimateGas(transaction: TransactionRequest): Promise<bigint>;
    abstract sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
    abstract getTransaction(transactionHash: string): Promise<TransactionResponse | null>;
    abstract getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt | null>;
    abstract getGasPrice(): Promise<bigint>;
    abstract getFeeData(): Promise<FeeData>;
    abstract getLogs(filter: Filter): Promise<Log[]>;
    waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<TransactionReceipt>;
    on(eventName: EventType, listener: Listener): void;
    once(eventName: EventType, listener: Listener): void;
    off(eventName: EventType, listener?: Listener): void;
    removeAllListeners(eventName?: EventType): void;
    protected emit(eventName: EventType, ...args: any[]): void;
    private getEventKey;
    connect(chainId?: number): Promise<void>;
    disconnect(): Promise<void>;
    getName(): string;
    getBlockchains(): string[];
    getChainIds(): number[];
    getCurrentChainId(): number;
    switchChain(chainId: number): Promise<void>;
    /**
     * EIP-1193 request method - must be implemented by subclasses
     */
    abstract request<T = any>(args: {
        method: string;
        params?: any[];
    }): Promise<T>;
    /**
     * Get the raw underlying provider instance
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
    protected isValidAddress(address: string): boolean;
    protected normalizeAddress(address: string): string;
    protected handleRpcError(error: any): Error;
    protected getChainName(chainId: number): string;
    protected isTestnetChain(chainId: number): boolean;
}

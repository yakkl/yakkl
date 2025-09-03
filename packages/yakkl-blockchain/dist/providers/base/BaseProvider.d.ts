/**
 * Base provider implementation with common functionality
 */
import type { IProvider, Block, BlockTag, BlockWithTransactions, EventType, FeeData, Filter, Listener, Log, NetworkProviderConfig, TransactionReceipt, TransactionRequest, TransactionResponse } from '../types';
export declare abstract class BaseProvider implements IProvider {
    protected config: NetworkProviderConfig;
    protected listeners: Map<string, Set<Listener>>;
    protected connected: boolean;
    protected name: string;
    protected blockchains: string[];
    protected chainIds: number[];
    protected currentChainId: number;
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
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getName(): string;
    getBlockchains(): string[];
    getChainIds(): number[];
    getCurrentChainId(): number;
    switchChain(chainId: number): Promise<void>;
    protected isValidAddress(address: string): boolean;
    protected normalizeAddress(address: string): string;
    protected handleRpcError(error: any): Error;
}

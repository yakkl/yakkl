/**
 * Base blockchain provider implementation
 */
import { EventEmitter } from 'eventemitter3';
import type { ProviderInterface, ChainInfo, ProviderConfig, ProviderMetadata, ProviderCostMetrics, ProviderHealthMetrics, Block, BlockTag, BlockWithTransactions, TransactionRequest, TransactionResponse, TransactionReceipt, FeeData, Log, Filter, ProviderEvents } from '../interfaces/provider.interface';
import type { Address } from '../types';
import type { TransactionSignRequest } from '../interfaces/wallet.interface';
import type { SignatureRequest, SignatureResult } from '../interfaces/crypto.interface';
/**
 * Abstract base provider class
 */
export declare abstract class BaseProvider extends EventEmitter<ProviderEvents> implements ProviderInterface {
    protected _chainInfo: ChainInfo;
    protected _isConnected: boolean;
    protected config: ProviderConfig;
    protected rpcUrl: string;
    readonly metadata: ProviderMetadata;
    constructor(chainInfo: ChainInfo, config?: ProviderConfig);
    get chainInfo(): ChainInfo;
    get isConnected(): boolean;
    /**
     * Connect to the blockchain
     */
    connect(chainId?: number): Promise<void>;
    /**
     * Disconnect from the blockchain
     */
    disconnect(): Promise<void>;
    /**
     * Make an RPC request
     */
    protected rpcRequest(method: string, params?: any[]): Promise<any>;
    /**
     * Retry an RPC request with exponential backoff
     */
    protected retryRpcRequest(method: string, params?: any[]): Promise<any>;
    /**
     * Abstract methods that must be implemented by subclasses
     */
    abstract switchChain(chainId: string | number): Promise<void>;
    abstract getAccounts(): Promise<Address[]>;
    abstract requestAccounts(): Promise<Address[]>;
    abstract signMessage(request: SignatureRequest): Promise<SignatureResult>;
    abstract signTypedData(request: SignatureRequest): Promise<SignatureResult>;
    abstract signTransaction(tx: TransactionSignRequest): Promise<string>;
    abstract getNetwork(): Promise<{
        name: string;
        chainId: number;
    }>;
    abstract getChainId(): Promise<number>;
    abstract getBlockNumber(): Promise<number>;
    abstract getBlock(blockHashOrTag: BlockTag | string): Promise<Block | null>;
    abstract getBlockWithTransactions(blockHashOrTag: BlockTag | string): Promise<BlockWithTransactions | null>;
    abstract getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
    abstract getTransactionCount(address: string, blockTag?: BlockTag): Promise<number>;
    abstract getCode(address: string, blockTag?: BlockTag): Promise<string>;
    abstract call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
    abstract estimateGas(transaction: TransactionRequest): Promise<bigint>;
    abstract sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
    abstract getTransaction(transactionHash: string): Promise<TransactionResponse | null>;
    abstract getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt | null>;
    abstract waitForTransaction(transactionHash: string, confirmations?: number, timeout?: number): Promise<TransactionReceipt>;
    abstract getGasPrice(): Promise<bigint>;
    abstract getFeeData(): Promise<FeeData>;
    abstract getLogs(filter: Filter): Promise<Log[]>;
    abstract request<T = any>(args: {
        method: string;
        params?: any[];
    }): Promise<T>;
    abstract getRawProvider(): any;
    abstract getEndpoint(): string;
    abstract getCostMetrics(): Promise<ProviderCostMetrics>;
    abstract getHealthMetrics(): Promise<ProviderHealthMetrics>;
    abstract healthCheck(): Promise<ProviderHealthMetrics>;
}
/**
 * Provider error class
 */
export declare class ProviderError extends Error {
    code: number;
    data?: any;
    constructor(message: string, code: number, data?: any);
}
/**
 * Standard RPC error codes
 */
export declare enum RpcErrorCode {
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    PARSE_ERROR = -32700,
    USER_REJECTED = 4001,
    UNAUTHORIZED = 4100,
    UNSUPPORTED_METHOD = 4200,
    DISCONNECTED = 4900,
    CHAIN_DISCONNECTED = 4901
}
//# sourceMappingURL=BaseProvider.d.ts.map
/**
 * Base blockchain provider implementation
 */
import { EventEmitter } from 'eventemitter3';
import type { IBlockchainProvider, ChainInfo, ProviderConfig, TransactionStatusInfo, Block, ProviderEvents } from '../interfaces/provider.interface';
import type { Address } from '../types';
import type { TransactionSignRequest } from '../interfaces/wallet.interface';
import type { SignatureRequest, SignatureResult } from '../interfaces/crypto.interface';
/**
 * Abstract base provider class
 */
export declare abstract class BaseProvider extends EventEmitter<ProviderEvents> implements IBlockchainProvider {
    protected _chainInfo: ChainInfo;
    protected _isConnected: boolean;
    protected config: ProviderConfig;
    protected rpcUrl: string;
    constructor(chainInfo: ChainInfo, config?: ProviderConfig);
    get chainInfo(): ChainInfo;
    get isConnected(): boolean;
    /**
     * Connect to the blockchain
     */
    connect(): Promise<void>;
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
    abstract getBalance(address: Address, tokenAddress?: Address): Promise<string>;
    abstract sendTransaction(tx: TransactionSignRequest): Promise<string>;
    abstract signTransaction(tx: TransactionSignRequest): Promise<string>;
    abstract getTransaction(hash: string): Promise<TransactionStatusInfo>;
    abstract estimateGas(tx: TransactionSignRequest): Promise<string>;
    abstract getGasPrice(): Promise<string>;
    abstract signMessage(request: SignatureRequest): Promise<SignatureResult>;
    abstract signTypedData(request: SignatureRequest): Promise<SignatureResult>;
    abstract getBlockNumber(): Promise<number>;
    abstract getBlock(blockHashOrNumber: string | number): Promise<Block>;
    abstract getTransactionCount(address: Address): Promise<number>;
    abstract call(tx: TransactionSignRequest): Promise<string>;
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
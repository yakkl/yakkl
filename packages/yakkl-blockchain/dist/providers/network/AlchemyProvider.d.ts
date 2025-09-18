/**
 * Alchemy provider implementation
 */
import { BaseProvider } from '../base/BaseProvider';
import type { Block, BlockTag, BlockWithTransactions, FeeData, Filter, Log, NetworkProviderConfig, TransactionReceipt, TransactionRequest, TransactionResponse } from '../types';
interface AlchemyConfig extends NetworkProviderConfig {
    apiKey: string;
    network?: string;
}
export declare class AlchemyProvider extends BaseProvider {
    private apiKey;
    private baseUrl;
    constructor(config: AlchemyConfig);
    private updateBaseUrl;
    private makeRpcCall;
    /**
     * EIP-1193 request method implementation
     */
    request<T = any>(args: {
        method: string;
        params?: any[];
    }): Promise<T>;
    getNetwork(): Promise<{
        name: string;
        chainId: number;
    }>;
    private getNetworkName;
    getChainId(): Promise<number>;
    getBlockNumber(): Promise<number>;
    getBlock(blockHashOrBlockTag: BlockTag | string): Promise<Block | null>;
    getBlockWithTransactions(blockHashOrBlockTag: BlockTag | string): Promise<BlockWithTransactions | null>;
    getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
    getTransactionCount(address: string, blockTag?: BlockTag): Promise<number>;
    getCode(address: string, blockTag?: BlockTag): Promise<string>;
    call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
    estimateGas(transaction: TransactionRequest): Promise<bigint>;
    sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
    getTransaction(transactionHash: string): Promise<TransactionResponse | null>;
    getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt | null>;
    getGasPrice(): Promise<bigint>;
    getFeeData(): Promise<FeeData>;
    getLogs(filter: Filter): Promise<Log[]>;
    switchChain(chainId: number): Promise<void>;
    private formatBlockTag;
    private formatTransaction;
    private formatBlock;
    private formatBlockWithTransactions;
    private formatReceipt;
    private formatLog;
    private formatFilter;
}
export {};

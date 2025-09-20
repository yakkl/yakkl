/**
 * Universal Blockchain Provider
 * Compete with ethers/viem while supporting multiple chains
 */
import { BaseProvider } from './base/BaseProvider';
import type { TransactionRequest, TransactionResponse, BlockTag, Log, Block, BlockWithTransactions, FeeData } from './types';
export declare class UniversalProvider extends BaseProvider {
    private providers;
    private chainToId;
    private activeChainId;
    constructor(config?: any);
    /**
     * EIP-1193 request method implementation
     */
    request<T = any>(args: {
        method: string;
        params?: any[];
    }): Promise<T>;
    /**
     * EVM-compatible methods (ethers/viem parity)
     */
    getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
    getTransactionCount(address: string, blockTag?: BlockTag): Promise<number>;
    getCode(address: string, blockTag?: BlockTag): Promise<string>;
    call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
    estimateGas(transaction: TransactionRequest): Promise<bigint>;
    sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
    getBlock(blockHashOrNumber: string | number): Promise<Block | null>;
    getTransaction(hash: string): Promise<TransactionResponse | null>;
    getTransactionReceipt(hash: string): Promise<any>;
    getLogs(filter: any): Promise<Log[]>;
    /**
     * Multi-chain support (YAKKL advantage)
     */
    switchChain(chainId: number): Promise<void>;
    switchChainByName(chainName: string): Promise<void>;
    addChain(chainId: number, provider: BaseProvider, chainName?: string): Promise<void>;
    /**
     * Solana-specific methods
     */
    getSolanaBalance(pubkey: string): Promise<number>;
    sendSolanaTransaction(transaction: any): Promise<string>;
    /**
     * Bitcoin-specific methods
     */
    getBitcoinUTXOs(address: string): Promise<any[]>;
    sendBitcoinTransaction(transaction: any): Promise<string>;
    /**
     * Advanced features (better than ethers/viem)
     */
    batchRequest(requests: any[]): Promise<any[]>;
    subscribeToEvents(eventName: string, callback: (data: any) => void): Promise<void>;
    getGasPrice(): Promise<bigint>;
    getFeeData(): Promise<FeeData>;
    /**
     * ENS Support - Not in BaseProvider, would need custom implementation
     */
    /**
     * Private methods
     */
    private setupProviders;
    private getActiveProvider;
    private executeRequest;
    getNetwork(): Promise<{
        name: string;
        chainId: number;
    }>;
    getChainId(): Promise<number>;
    getBlockNumber(): Promise<number>;
    getBlockWithTransactions(blockHashOrBlockTag: BlockTag | string): Promise<BlockWithTransactions | null>;
}

/**
 * EVM Provider implementation for Ethereum and EVM-compatible chains
 */
import { BaseProvider } from './BaseProvider';
import type { EVMProviderInterface, ChainInfo, ProviderConfig, Block, BlockTag, BlockWithTransactions, TransactionRequest, TransactionResponse, TransactionReceipt, FeeData, Log, Filter, ProviderCostMetrics, ProviderHealthMetrics } from '../interfaces/provider.interface';
import type { Address } from '../types';
import type { TransactionSignRequest } from '../interfaces/wallet.interface';
import type { SignatureRequest, SignatureResult } from '../interfaces/crypto.interface';
/**
 * EVM Provider implementation
 */
export declare class EVMProvider extends BaseProvider implements EVMProviderInterface {
    private accounts;
    constructor(chainInfo: ChainInfo, config?: ProviderConfig);
    /**
     * Switch to a different chain
     */
    switchChain(chainId: string | number): Promise<void>;
    /**
     * Get accounts
     */
    getAccounts(): Promise<Address[]>;
    /**
     * Request accounts (triggers wallet connection)
     */
    requestAccounts(): Promise<Address[]>;
    /**
     * Get balance
     */
    getBalance(address: string, blockTag?: BlockTag): Promise<bigint>;
    /**
     * Get token balance (EVM-specific)
     */
    getTokenBalance(address: Address, tokenAddress: Address): Promise<string>;
    /**
     * Send transaction
     */
    sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse>;
    /**
     * Sign transaction
     */
    signTransaction(tx: TransactionSignRequest): Promise<string>;
    /**
     * Get transaction
     */
    getTransaction(hash: string): Promise<TransactionResponse | null>;
    /**
     * Estimate gas
     */
    estimateGas(transaction: TransactionRequest): Promise<bigint>;
    /**
     * Get gas price
     */
    getGasPrice(): Promise<bigint>;
    /**
     * Sign message
     */
    signMessage(request: SignatureRequest): Promise<SignatureResult>;
    /**
     * Sign typed data
     */
    signTypedData(request: SignatureRequest): Promise<SignatureResult>;
    /**
     * Get block number
     */
    getBlockNumber(): Promise<number>;
    /**
     * Get block
     */
    getBlock(blockHashOrNumber: string | number): Promise<Block>;
    /**
     * Get transaction count (nonce)
     */
    getTransactionCount(address: Address): Promise<number>;
    /**
     * Call contract method
     */
    call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string>;
    /**
     * Get max priority fee per gas
     */
    getMaxPriorityFeePerGas(): Promise<bigint>;
    /**
     * Get fee history
     */
    getFeeHistory(blockCount: number, newestBlock: string | number, rewardPercentiles: number[]): Promise<any>;
    /**
     * Resolve ENS name
     */
    resolveName(ensName: string): Promise<Address | null>;
    /**
     * Lookup address (reverse ENS)
     */
    lookupAddress(address: Address): Promise<string | null>;
    /**
     * Get code at address
     */
    getCode(address: Address): Promise<string>;
    /**
     * Get storage at position
     */
    getStorageAt(address: Address, position: string): Promise<string>;
    /**
     * EIP-1193 request method
     */
    request(args: {
        method: string;
        params?: any[];
    }): Promise<any>;
    private formatTransaction;
    private encodeERC20Call;
    private decodeUint256;
    private encodeENSResolve;
    private formatBlockTag;
    /**
     * Additional required methods
     */
    getNetwork(): Promise<{
        name: string;
        chainId: number;
    }>;
    getChainId(): Promise<number>;
    getBlockWithTransactions(blockHashOrTag: BlockTag | string): Promise<BlockWithTransactions | null>;
    getTransactionReceipt(hash: string): Promise<TransactionReceipt | null>;
    waitForTransaction(hash: string, confirmations?: number, timeout?: number): Promise<TransactionReceipt>;
    getFeeData(): Promise<FeeData>;
    getLogs(filter: Filter): Promise<Log[]>;
    getRawProvider(): any;
    getEndpoint(): string;
    getCostMetrics(): Promise<ProviderCostMetrics>;
    getHealthMetrics(): Promise<ProviderHealthMetrics>;
    healthCheck(): Promise<ProviderHealthMetrics>;
    private formatTransactionResponse;
    private formatTransactionRequest;
}
//# sourceMappingURL=EVMProvider.d.ts.map
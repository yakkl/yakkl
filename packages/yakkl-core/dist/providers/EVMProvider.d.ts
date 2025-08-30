/**
 * EVM Provider implementation for Ethereum and EVM-compatible chains
 */
import { BaseProvider } from './BaseProvider';
import type { IEVMProvider, ChainInfo, ProviderConfig, TransactionStatusInfo, Block } from '../interfaces/provider.interface';
import type { Address } from '../types';
import type { TransactionSignRequest } from '../interfaces/wallet.interface';
import type { SignatureRequest, SignatureResult } from '../interfaces/crypto.interface';
/**
 * EVM Provider implementation
 */
export declare class EVMProvider extends BaseProvider implements IEVMProvider {
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
    getBalance(address: Address, tokenAddress?: Address): Promise<string>;
    /**
     * Send transaction
     */
    sendTransaction(tx: TransactionSignRequest): Promise<string>;
    /**
     * Sign transaction
     */
    signTransaction(tx: TransactionSignRequest): Promise<string>;
    /**
     * Get transaction
     */
    getTransaction(hash: string): Promise<TransactionStatusInfo>;
    /**
     * Estimate gas
     */
    estimateGas(tx: TransactionSignRequest): Promise<string>;
    /**
     * Get gas price
     */
    getGasPrice(): Promise<string>;
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
    call(tx: TransactionSignRequest): Promise<string>;
    /**
     * Get max priority fee per gas
     */
    getMaxPriorityFeePerGas(): Promise<string>;
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
     * Get logs
     */
    getLogs(filter: {
        fromBlock?: string | number;
        toBlock?: string | number;
        address?: Address | Address[];
        topics?: string[];
    }): Promise<any[]>;
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
}
//# sourceMappingURL=EVMProvider.d.ts.map
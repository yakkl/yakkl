/**
 * Blockchain provider interfaces for multi-chain support
 */
import type { Address } from '../types';
import type { TransactionSignRequest } from './wallet.interface';
import type { SignatureRequest, SignatureResult } from './crypto.interface';
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
 * Transaction status info
 */
export interface TransactionStatusInfo {
    hash: string;
    status: 'pending' | 'confirmed' | 'failed';
    confirmations?: number;
    blockNumber?: number;
    timestamp?: number;
    gasUsed?: string;
    effectiveGasPrice?: string;
    error?: string;
}
/**
 * Block information
 */
export interface Block {
    number: number;
    hash: string;
    parentHash: string;
    timestamp: number;
    transactions: string[];
    gasLimit?: string;
    gasUsed?: string;
    baseFeePerGas?: string;
}
/**
 * Base blockchain provider interface
 */
export interface IBlockchainProvider {
    readonly chainInfo: ChainInfo;
    readonly isConnected: boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    switchChain(chainId: string | number): Promise<void>;
    getAccounts(): Promise<Address[]>;
    requestAccounts(): Promise<Address[]>;
    getBalance(address: Address, tokenAddress?: Address): Promise<string>;
    sendTransaction(tx: TransactionSignRequest): Promise<string>;
    signTransaction(tx: TransactionSignRequest): Promise<string>;
    getTransaction(hash: string): Promise<TransactionStatusInfo>;
    estimateGas(tx: TransactionSignRequest): Promise<string>;
    getGasPrice(): Promise<string>;
    signMessage(request: SignatureRequest): Promise<SignatureResult>;
    signTypedData(request: SignatureRequest): Promise<SignatureResult>;
    getBlockNumber(): Promise<number>;
    getBlock(blockHashOrNumber: string | number): Promise<Block>;
    getTransactionCount(address: Address): Promise<number>;
    call(tx: TransactionSignRequest): Promise<string>;
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
    once(event: string, handler: (...args: any[]) => void): void;
}
/**
 * EVM-specific provider interface
 */
export interface IEVMProvider extends IBlockchainProvider {
    getMaxPriorityFeePerGas(): Promise<string>;
    getFeeHistory(blockCount: number, newestBlock: string | number, rewardPercentiles: number[]): Promise<any>;
    resolveName(ensName: string): Promise<Address | null>;
    lookupAddress(address: Address): Promise<string | null>;
    getCode(address: Address): Promise<string>;
    getStorageAt(address: Address, position: string): Promise<string>;
    getLogs(filter: {
        fromBlock?: string | number;
        toBlock?: string | number;
        address?: Address | Address[];
        topics?: string[];
    }): Promise<any[]>;
    request(args: {
        method: string;
        params?: any[];
    }): Promise<any>;
}
/**
 * Bitcoin-specific provider interface
 */
export interface IBitcoinProvider extends IBlockchainProvider {
    getUTXOs(address: Address): Promise<UTXO[]>;
    createTransaction(inputs: UTXO[], outputs: Output[], changeAddress: Address): Promise<any>;
    broadcastTransaction(signedTx: string): Promise<string>;
    getAddressType(address: Address): 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
    estimateFeeRate(priority: 'low' | 'medium' | 'high'): Promise<number>;
}
/**
 * Solana-specific provider interface
 */
export interface ISolanaProvider extends IBlockchainProvider {
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
    address: Address;
    value: string;
}
/**
 * Provider factory interface
 */
export interface IProviderFactory {
    createProvider(chainInfo: ChainInfo, config?: ProviderConfig): IBlockchainProvider;
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
}
/**
 * Provider events
 */
export interface ProviderEvents {
    connect: (chainId: string | number) => void;
    disconnect: (error?: Error) => void;
    chainChanged: (chainId: string | number) => void;
    accountsChanged: (accounts: Address[]) => void;
    message: (message: any) => void;
    error: (error: Error) => void;
}
/**
 * Multi-provider manager interface
 */
export interface IMultiProviderManager {
    addProvider(chainId: string | number, provider: IBlockchainProvider): void;
    removeProvider(chainId: string | number): void;
    getProvider(chainId: string | number): IBlockchainProvider | undefined;
    getAllProviders(): Map<string | number, IBlockchainProvider>;
    setActiveProvider(chainId: string | number): void;
    getActiveProvider(): IBlockchainProvider | undefined;
}
//# sourceMappingURL=provider.interface.d.ts.map
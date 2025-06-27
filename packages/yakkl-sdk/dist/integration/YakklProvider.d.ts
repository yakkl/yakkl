/**
 * YakklProvider - Main provider for YAKKL wallet integration
 */
import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '@yakkl/core';
export interface YakklProviderConfig {
    apiKey?: string;
    network?: string;
    autoConnect?: boolean;
    enableMods?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
export interface ProviderEvents {
    'connect': (accounts: string[]) => void;
    'disconnect': () => void;
    'accountsChanged': (accounts: string[]) => void;
    'chainChanged': (chainId: string) => void;
    'message': (message: any) => void;
}
export interface EthereumRequest {
    method: string;
    params?: any[];
}
export declare class YakklProvider extends EventEmitter<ProviderEvents> {
    readonly isYakkl = true;
    readonly isMetaMask = false;
    private engine;
    private config;
    private _accounts;
    private _chainId;
    private _connected;
    private _initialized;
    constructor(config?: YakklProviderConfig);
    /**
     * Initialize the provider
     */
    initialize(): Promise<void>;
    /**
     * Connect to the wallet
     */
    connect(): Promise<string[]>;
    /**
     * Disconnect from the wallet
     */
    disconnect(): Promise<void>;
    /**
     * Send an RPC request
     */
    request(args: EthereumRequest): Promise<any>;
    /**
     * Check if the provider is connected
     */
    isConnected(): boolean;
    /**
     * Get current accounts
     */
    get accounts(): string[];
    /**
     * Get current chain ID
     */
    get chainId(): string;
    /**
     * Get the wallet engine instance
     */
    getEngine(): WalletEngine | null;
    /**
     * Private methods
     */
    private switchChain;
    private addChain;
    private setupEventListeners;
}
/**
 * Create a YAKKL provider instance
 */
export declare function createYakklProvider(config?: YakklProviderConfig): YakklProvider;

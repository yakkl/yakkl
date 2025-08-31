/**
 * YAKKL Wallet Client
 * High-level API client for interacting with YAKKL wallet
 */
import type { IBlockchainProvider, IStorage, MessageBus } from '@yakkl/core';
export interface WalletClientConfig {
    apiUrl?: string;
    apiKey?: string;
    provider?: IBlockchainProvider;
    storage?: IStorage;
    messageBus?: MessageBus;
    timeout?: number;
}
export interface WalletClientOptions {
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
}
export interface WalletAccount {
    address: string;
    name?: string;
    type: 'imported' | 'generated' | 'hardware' | 'watch';
    chainId: number;
    balance?: string;
}
export interface WalletTransaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    data?: string;
    chainId: number;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: number;
}
export declare class WalletClient {
    private config;
    private isConnected;
    constructor(config?: WalletClientConfig);
    /**
     * Connect to wallet
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect wallet
     */
    disconnect(): Promise<void>;
    /**
     * Get connected accounts
     */
    getAccounts(): Promise<WalletAccount[]>;
    /**
     * Get account balance
     */
    getBalance(address: string, chainId?: number): Promise<string>;
    /**
     * Send transaction
     */
    sendTransaction(params: {
        from: string;
        to: string;
        value?: string;
        data?: string;
        chainId?: number;
    }): Promise<string>;
    /**
     * Sign message
     */
    signMessage(address: string, message: string): Promise<string>;
    /**
     * Switch network
     */
    switchNetwork(chainId: number): Promise<void>;
    /**
     * Get transaction history
     */
    getTransactionHistory(address: string, options?: {
        chainId?: number;
        limit?: number;
        offset?: number;
    }): Promise<WalletTransaction[]>;
    /**
     * Make API request
     */
    private request;
    /**
     * Check if wallet is connected
     */
    isWalletConnected(): boolean;
    /**
     * Get wallet info
     */
    getWalletInfo(): Promise<{
        version: string;
        name: string;
        features: string[];
    }>;
}

/**
 * EmbeddedProvider - Web3 provider interface for embedded wallets
 */
import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '@yakkl/core';
export interface EthereumRequest {
    method: string;
    params?: any[];
}
export interface EthereumResponse {
    id: number;
    jsonrpc: string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
export interface ProviderRpcError extends Error {
    code: number;
    data?: any;
}
export interface ProviderEvents {
    'connect': (connectInfo: {
        chainId: string;
    }) => void;
    'disconnect': (error: ProviderRpcError) => void;
    'accountsChanged': (accounts: string[]) => void;
    'chainChanged': (chainId: string) => void;
    'message': (message: {
        type: string;
        data: any;
    }) => void;
}
export declare class EmbeddedProvider extends EventEmitter<ProviderEvents> {
    private engine;
    private _chainId;
    private _accounts;
    private _isConnected;
    constructor(engine: WalletEngine);
    private initialize;
    /**
     * Standard EIP-1193 request method
     */
    request(args: EthereumRequest): Promise<any>;
    /**
     * Legacy send method for backward compatibility
     */
    send(methodOrPayload: string | any, paramsOrCallback?: any[] | ((error: any, response: any) => void)): any;
    /**
     * Legacy sendAsync method for backward compatibility
     */
    sendAsync(payload: any, callback: (error: any, response: any) => void): void;
    /**
     * Check if provider is connected
     */
    isConnected(): boolean;
    /**
     * Get current chain ID
     */
    get chainId(): string;
    /**
     * Get selected accounts
     */
    get selectedAddress(): string | null;
    /**
     * Enable the provider (for legacy compatibility)
     */
    enable(): Promise<string[]>;
}

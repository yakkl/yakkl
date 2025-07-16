/**
 * WalletConnector - Universal wallet connection interface
 */
import { EventEmitter } from 'eventemitter3';
import type { EthereumRequest } from './YakklProvider';
export interface WalletInfo {
    name: string;
    icon: string;
    description: string;
    installed: boolean;
    provider?: any;
}
export interface ConnectorEvents {
    'walletConnected': (wallet: WalletInfo, accounts: string[]) => void;
    'walletDisconnected': (wallet: WalletInfo) => void;
    'accountsChanged': (accounts: string[]) => void;
    'chainChanged': (chainId: string) => void;
    'error': (error: Error) => void;
}
export declare class WalletConnector extends EventEmitter<ConnectorEvents> {
    private connectedWallet;
    private provider;
    private yakklProvider;
    constructor();
    /**
     * Get available wallets
     */
    getAvailableWallets(): WalletInfo[];
    /**
     * Connect to a specific wallet
     */
    connect(walletName: string): Promise<string[]>;
    /**
     * Disconnect from current wallet
     */
    disconnect(): Promise<void>;
    /**
     * Send a request to the connected wallet
     */
    request(args: EthereumRequest): Promise<any>;
    /**
     * Check if a wallet is connected
     */
    isConnected(): boolean;
    /**
     * Get currently connected wallet
     */
    getConnectedWallet(): WalletInfo | null;
    /**
     * Get the current provider
     */
    getProvider(): any;
    /**
     * Get current accounts
     */
    getAccounts(): Promise<string[]>;
    /**
     * Get current chain ID
     */
    getChainId(): Promise<string>;
    /**
     * Switch to a different network
     */
    switchNetwork(chainId: string): Promise<void>;
    /**
     * Add a new network to the wallet
     */
    addNetwork(networkParams: {
        chainId: string;
        chainName: string;
        rpcUrls: string[];
        nativeCurrency: {
            name: string;
            symbol: string;
            decimals: number;
        };
        blockExplorerUrls?: string[];
    }): Promise<void>;
    /**
     * Sign a message
     */
    signMessage(address: string, message: string): Promise<string>;
    /**
     * Private methods
     */
    private setupYakklProvider;
    private setupProviderListeners;
}
/**
 * Create a wallet connector instance
 */
export declare function createWalletConnector(): WalletConnector;

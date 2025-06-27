/**
 * RemoteAPI - API for remote wallet connections
 */
import { EventEmitter } from 'eventemitter3';
export interface RemoteWalletEvents {
    'connected': () => void;
    'disconnected': () => void;
    'accountsChanged': (accounts: string[]) => void;
    'chainChanged': (chainId: string) => void;
}
export declare class RemoteAPI extends EventEmitter<RemoteWalletEvents> {
    private connected;
    private accounts;
    private chainId;
    /**
     * Connect to remote wallet
     */
    connect(): Promise<string[]>;
    /**
     * Disconnect from remote wallet
     */
    disconnect(): Promise<void>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get connected accounts
     */
    getAccounts(): string[];
    /**
     * Get current chain ID
     */
    getChainId(): string | null;
    /**
     * Request account access
     */
    requestAccounts(): Promise<string[]>;
    /**
     * Switch network
     */
    switchNetwork(chainId: string): Promise<void>;
}
//# sourceMappingURL=RemoteAPI.d.ts.map
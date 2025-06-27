/**
 * EmbeddedAPI - API for embedded wallet implementations
 */
import { WalletEngine } from '../engine/WalletEngine';
import type { Account, Network, Transaction } from '../engine/types';
export declare class EmbeddedAPI {
    private engine;
    constructor(engine: WalletEngine);
    /**
     * Get wallet information
     */
    getWalletInfo(): Promise<{
        version: string;
        accounts: number;
        currentNetwork: string | undefined;
        isLocked: boolean;
    }>;
    /**
     * Get current account
     */
    getCurrentAccount(): Promise<Account | null>;
    /**
     * Get all accounts
     */
    getAccounts(): Promise<Account[]>;
    /**
     * Get current network
     */
    getCurrentNetwork(): Promise<Network | null>;
    /**
     * Get supported networks
     */
    getSupportedNetworks(): Promise<Network[]>;
    /**
     * Request account connection
     */
    connect(): Promise<Account[]>;
    /**
     * Sign a transaction
     */
    signTransaction(transaction: Transaction): Promise<string>;
    /**
     * Send a transaction
     */
    sendTransaction(transaction: Transaction): Promise<string>;
    /**
     * Sign a message
     */
    signMessage(message: string): Promise<string>;
}
//# sourceMappingURL=EmbeddedAPI.d.ts.map
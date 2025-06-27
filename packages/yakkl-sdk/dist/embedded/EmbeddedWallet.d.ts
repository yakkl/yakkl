/**
 * EmbeddedWallet - For integrating YAKKL into other applications
 *
 * This allows companies to embed a full YAKKL wallet into their apps
 * with complete control over branding, features, and restrictions
 */
import { WalletEngine } from '@yakkl/core';
import type { Account, Transaction } from '@yakkl/core';
import { EventEmitter } from 'eventemitter3';
import type { EmbeddedWalletConfig } from '../types';
export interface EmbeddedWalletEvents {
    'wallet:ready': () => void;
    'wallet:error': (error: Error) => void;
    'account:created': (account: Account) => void;
    'account:selected': (account: Account) => void;
    'transaction:signed': (tx: Transaction) => void;
    'transaction:sent': (hash: string) => void;
}
export declare class EmbeddedWallet extends EventEmitter<EmbeddedWalletEvents> {
    private engine;
    private config;
    private container;
    private initialized;
    constructor(config: EmbeddedWalletConfig);
    /**
     * Mount the embedded wallet to a DOM element
     */
    mount(container: string | HTMLElement): Promise<void>;
    /**
     * Unmount the embedded wallet
     */
    unmount(): Promise<void>;
    /**
     * Get the wallet engine for advanced operations
     */
    getEngine(): WalletEngine;
    /**
     * Create a new account
     */
    createAccount(name?: string): Promise<Account>;
    /**
     * Get all accounts
     */
    getAccounts(): Promise<Account[]>;
    /**
     * Select an account
     */
    selectAccount(accountId: string): Promise<void>;
    /**
     * Sign a transaction
     */
    signTransaction(transaction: Transaction): Promise<string>;
    /**
     * Send a transaction
     */
    sendTransaction(transaction: Transaction): Promise<string>;
    /**
     * Get current balance
     */
    getBalance(address?: string): Promise<any>;
    /**
     * Load a mod
     */
    loadMod(modId: string): Promise<any>;
    /**
     * Get configuration
     */
    getConfig(): EmbeddedWalletConfig;
    /**
     * Update branding
     */
    updateBranding(branding: Partial<typeof this.config.branding>): void;
    /**
     * Check if wallet is initialized
     */
    isInitialized(): boolean;
    /**
     * Setup event listeners for the wallet engine
     */
    private setupEventListeners;
    /**
     * Render the wallet UI
     */
    private renderUI;
    /**
     * Ensure wallet is initialized
     */
    private ensureInitialized;
}

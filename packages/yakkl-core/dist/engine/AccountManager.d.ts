/**
 * AccountManager - Manages wallet accounts and their lifecycle
 */
import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from './WalletEngine';
import type { Account } from './types';
export interface AccountManagerEvents {
    'account:created': (account: Account) => void;
    'account:updated': (account: Account) => void;
    'account:removed': (accountId: string) => void;
    'account:selected': (account: Account) => void;
}
export declare class AccountManager extends EventEmitter<AccountManagerEvents> {
    private engine;
    private accounts;
    private currentAccountId;
    private initialized;
    constructor(engine: WalletEngine);
    /**
     * Initialize the account manager
     */
    initialize(): Promise<void>;
    /**
     * Create a new account
     */
    create(name?: string): Promise<Account>;
    /**
     * Import account from private key
     */
    importFromPrivateKey(privateKey: string, name?: string): Promise<Account>;
    /**
     * Add watch-only account
     */
    addWatchOnly(address: string, name?: string): Promise<Account>;
    /**
     * Update account information
     */
    update(accountId: string, updates: Partial<Account>): Promise<Account>;
    /**
     * Remove an account
     */
    remove(accountId: string): Promise<void>;
    /**
     * Select an account as current
     */
    select(accountId: string): Promise<Account>;
    /**
     * Get all accounts
     */
    getAll(): Account[];
    /**
     * Get account by ID
     */
    get(accountId: string): Account | null;
    /**
     * Get account by address
     */
    getByAddress(address: string): Promise<Account | null>;
    /**
     * Get current account
     */
    getCurrent(): Account | null;
    /**
     * Get private key for account (if available)
     */
    getPrivateKey(accountId: string): Promise<string>;
    /**
     * Sign a message with account
     */
    signMessage(accountId: string, message: string): Promise<string>;
    /**
     * Destroy the account manager
     */
    destroy(): Promise<void>;
    /**
     * Private methods
     */
    private generateId;
    private loadAccounts;
    private saveAccounts;
    private loadCurrentAccount;
    private saveCurrentAccount;
    private storePrivateKey;
    private loadPrivateKey;
    private removePrivateKey;
    private ensureInitialized;
}
//# sourceMappingURL=AccountManager.d.ts.map
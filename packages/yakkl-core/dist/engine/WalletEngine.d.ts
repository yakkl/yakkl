/**
 * YAKKL Wallet Engine - Core wallet functionality
 *
 * This is the heart of all YAKKL products. Everything builds on this foundation.
 */
import { EventEmitter } from 'eventemitter3';
import { AccountManager } from './AccountManager';
import { NetworkManager } from './NetworkManager';
import { TransactionManager } from './TransactionManager';
import type { WalletConfig, Account, Network, Transaction, SignedTransaction, Balance } from './types';
import type { Mod } from '../mods/types';
export interface WalletEngineEvents {
    'account:created': (account: Account) => void;
    'account:selected': (account: Account) => void;
    'transaction:signed': (tx: SignedTransaction) => void;
    'mod:loaded': (mod: Mod) => void;
    'mod:discovered': (mods: Mod[]) => void;
    'network:changed': (network: Network) => void;
}
export declare class WalletEngine extends EventEmitter<WalletEngineEvents> {
    private config;
    private mods;
    private discovery;
    accounts: AccountManager;
    networks: NetworkManager;
    transactions: TransactionManager;
    private initialized;
    constructor(config?: Partial<WalletConfig>);
    /**
     * Initialize the wallet engine
     */
    initialize(): Promise<void>;
    /**
     * Get wallet configuration
     */
    getConfig(): WalletConfig;
    /**
     * Core Account Management
     */
    createAccount(name?: string): Promise<Account>;
    getAccounts(): Promise<Account[]>;
    selectAccount(accountId: string): Promise<void>;
    getCurrentAccount(): Account | null;
    /**
     * Core Network Management
     */
    getSupportedNetworks(): Promise<Network[]>;
    switchNetwork(networkId: string): Promise<void>;
    getCurrentNetwork(): Network | null;
    /**
     * Core Transaction Management
     */
    signTransaction(transaction: Transaction): Promise<SignedTransaction>;
    sendTransaction(transaction: Transaction): Promise<string>;
    getBalance(address?: string): Promise<Balance>;
    /**
     * Mod Management
     */
    loadMod(id: string): Promise<Mod>;
    getLoadedMods(): Promise<Mod[]>;
    discoverMods(): Promise<Mod[]>;
    /**
     * Integration APIs
     */
    getEmbeddedAPI(): null;
    getRemoteAPI(): null;
    /**
     * Utility Methods
     */
    isInitialized(): boolean;
    destroy(): Promise<void>;
    private ensureInitialized;
}
//# sourceMappingURL=WalletEngine.d.ts.map
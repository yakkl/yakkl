/**
 * YAKKL Wallet Engine - Core wallet functionality
 * 
 * This is the heart of all YAKKL products. Everything builds on this foundation.
 */

import { EventEmitter } from 'eventemitter3';
import { ModRegistry } from '../mods/ModRegistry';
import { DiscoveryProtocol } from '../mods/DiscoveryProtocol';
import { AccountManager } from './AccountManager';
import { NetworkManager } from './NetworkManager';
import { TransactionManager } from './TransactionManager';
import type { 
  WalletConfig, 
  Account, 
  Network, 
  Transaction, 
  SignedTransaction, 
  Balance 
} from './types';
import type { Mod } from '../mods/types';

export interface WalletEngineEvents {
  'account:created': (account: Account) => void;
  'account:selected': (account: Account) => void;
  'transaction:signed': (tx: SignedTransaction) => void;
  'mod:loaded': (mod: Mod) => void;
  'mod:discovered': (mods: Mod[]) => void;
  'network:changed': (network: Network) => void;
}

export class WalletEngine extends EventEmitter<WalletEngineEvents> {
  private config: WalletConfig;
  private mods: ModRegistry;
  private discovery: DiscoveryProtocol;
  public accounts: AccountManager;
  public networks: NetworkManager;
  public transactions: TransactionManager;
  private initialized = false;

  constructor(config: Partial<WalletConfig> = {}) {
    super();
    
    this.config = {
      name: 'YAKKL Wallet',
      version: '1.0.0',
      embedded: false,
      restrictions: [],
      modDiscovery: true,
      ...config
    };

    // Initialize core managers
    this.accounts = new AccountManager(this);
    this.networks = new NetworkManager(this);
    this.transactions = new TransactionManager(this);
    
    // Initialize mod system
    this.mods = new ModRegistry(this);
    this.discovery = new DiscoveryProtocol(this);
  }

  /**
   * Initialize the wallet engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize core systems
      await this.accounts.initialize();
      await this.networks.initialize();
      await this.transactions.initialize();

      // Initialize mod system
      await this.mods.initialize();
      
      // Start discovery if enabled
      if (this.config.modDiscovery) {
        await this.discovery.start();
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize wallet engine: ${error}`);
    }
  }

  /**
   * Get wallet configuration
   */
  getConfig(): WalletConfig {
    return { ...this.config };
  }

  /**
   * Core Account Management
   */
  async createAccount(name?: string): Promise<Account> {
    this.ensureInitialized();
    const account = await this.accounts.create(name);
    this.emit('account:created', account);
    return account;
  }

  async getAccounts(): Promise<Account[]> {
    this.ensureInitialized();
    return this.accounts.getAll();
  }

  async selectAccount(accountId: string): Promise<void> {
    this.ensureInitialized();
    const account = await this.accounts.select(accountId);
    this.emit('account:selected', account);
  }

  getCurrentAccount(): Account | null {
    return this.accounts.getCurrent();
  }

  /**
   * Core Network Management
   */
  async getSupportedNetworks(): Promise<Network[]> {
    this.ensureInitialized();
    return this.networks.getSupported();
  }

  async switchNetwork(networkId: string): Promise<void> {
    this.ensureInitialized();
    const network = await this.networks.switch(networkId);
    this.emit('network:changed', network);
  }

  getCurrentNetwork(): Network | null {
    return this.networks.getCurrent();
  }

  /**
   * Core Transaction Management
   */
  async signTransaction(transaction: Transaction): Promise<SignedTransaction> {
    this.ensureInitialized();
    const signedTx = await this.transactions.sign(transaction);
    this.emit('transaction:signed', signedTx);
    return signedTx;
  }

  async sendTransaction(transaction: Transaction): Promise<string> {
    this.ensureInitialized();
    return this.transactions.send(transaction);
  }

  async getBalance(address?: string): Promise<Balance> {
    this.ensureInitialized();
    const account = address ? 
      await this.accounts.getByAddress(address) : 
      this.getCurrentAccount();
    
    if (!account) {
      throw new Error('No account specified or selected');
    }

    return this.transactions.getBalance(account.address);
  }

  /**
   * Mod Management
   */
  async loadMod(id: string): Promise<Mod> {
    this.ensureInitialized();
    const mod = await this.mods.load(id);
    this.emit('mod:loaded', mod);
    return mod;
  }

  async getLoadedMods(): Promise<Mod[]> {
    return this.mods.getLoaded();
  }

  async discoverMods(): Promise<Mod[]> {
    this.ensureInitialized();
    const discovered = await this.discovery.scan();
    this.emit('mod:discovered', discovered as any);
    return discovered as any;
  }

  /**
   * Integration APIs
   */
  getEmbeddedAPI() {
    // Will be implemented when we create the embedded API
    return null;
  }

  getRemoteAPI() {
    // Will be implemented when we create the remote API
    return null;
  }

  /**
   * Utility Methods
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  async destroy(): Promise<void> {
    await this.discovery.stop();
    await this.mods.destroy();
    await this.transactions.destroy();
    await this.networks.destroy();
    await this.accounts.destroy();
    
    this.removeAllListeners();
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Wallet engine not initialized. Call initialize() first.');
    }
  }
}
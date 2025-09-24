/**
 * AccountManager - Manages wallet accounts and their lifecycle
 */

import { EventEmitter } from 'eventemitter3';
import { isAddress as evmIsAddress, getAddress as evmGetAddress } from 'ethers/lib/utils';
import { ethers } from 'ethers';
import { signers } from '../services/SignerRegistry';
import { keyManagers } from '../services/KeyManagerRegistry';
import { ChainType } from '../interfaces/provider.interface';
import type { WalletEngine } from './WalletEngine';
import type { Account, AccountType } from './types';

export interface AccountManagerEvents {
  'account:created': (account: Account) => void;
  'account:updated': (account: Account) => void;
  'account:removed': (accountId: string) => void;
  'account:selected': (account: Account) => void;
}

export class AccountManager extends EventEmitter<AccountManagerEvents> {
  private engine: WalletEngine;
  private accounts = new Map<string, Account>();
  private currentAccountId: string | null = null;
  private initialized = false;

  constructor(engine: WalletEngine) {
    super();
    this.engine = engine;
  }

  /**
   * Initialize the account manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load existing accounts from storage
      await this.loadAccounts();
      
      // Load current account selection
      await this.loadCurrentAccount();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize AccountManager: ${error}`);
    }
  }

  /**
   * Create a new account
   */
  async create(name?: string): Promise<Account> {
    this.ensureInitialized();

    try {
      // Create via chain-agnostic key manager
      const km = keyManagers.get(ChainType.EVM);
      const acct = await km.createRandomAccount({ chainType: ChainType.EVM });
      
      // Create account object
      const account: Account = {
        id: this.generateId(),
        address: acct.address,
        name: name || `Account ${this.accounts.size + 1}`,
        type: 'eoa',
        publicKey: acct.publicKey,
        derivationPath: undefined, // For random wallets
        ens: undefined,
        username: undefined,
        avatar: undefined,
        createdAt: new Date(),
        lastUsed: new Date(),
        metadata: {
          isHardware: false,
          isImported: false,
          isWatchOnly: false
        }
      };

      // Store the account
      this.accounts.set(account.id, account);
      
      // Store encrypted private key
      if (acct.privateKey) {
        await this.storePrivateKey(account.id, acct.privateKey);
      }
      
      // Save to storage
      await this.saveAccounts();
      
      // Emit event
      this.emit('account:created', account);
      
      // Select if first account
      if (this.accounts.size === 1) {
        await this.select(account.id);
      }
      
      return account;
    } catch (error) {
      throw new Error(`Failed to create account: ${error}`);
    }
  }

  /**
   * Import account from private key
   */
  async importFromPrivateKey(privateKey: string, name?: string): Promise<Account> {
    this.ensureInitialized();

    try {
      const km = keyManagers.get(ChainType.EVM);
      const acct = await km.importFromPrivateKey(privateKey, { chainType: ChainType.EVM });
      
      // Check if account already exists
      const existing = Array.from(this.accounts.values())
        .find(acc => acc.address.toLowerCase() === acct.address.toLowerCase());
      
      if (existing) {
        throw new Error('Account already exists');
      }
      
      // Create account object
      const account: Account = {
        id: this.generateId(),
        address: acct.address,
        name: name || `Imported Account`,
        type: 'eoa',
        publicKey: acct.publicKey,
        derivationPath: undefined,
        ens: undefined,
        username: undefined,
        avatar: undefined,
        createdAt: new Date(),
        lastUsed: new Date(),
        metadata: {
          isHardware: false,
          isImported: true,
          isWatchOnly: false
        }
      };

      // Store the account
      this.accounts.set(account.id, account);
      
      // Store encrypted private key
      if (acct.privateKey) {
        await this.storePrivateKey(account.id, acct.privateKey);
      }
      
      // Save to storage
      await this.saveAccounts();
      
      // Emit event
      this.emit('account:created', account);
      
      return account;
    } catch (error) {
      throw new Error(`Failed to import account: ${error}`);
    }
  }

  /**
   * Add watch-only account
   */
  async addWatchOnly(address: string, name?: string): Promise<Account> {
    this.ensureInitialized();

    try {
      // Validate address
      if (!evmIsAddress(address)) {
        throw new Error('Invalid address');
      }

      // Check if account already exists
      const existing = Array.from(this.accounts.values())
        .find(acc => acc.address.toLowerCase() === address.toLowerCase());
      
      if (existing) {
        throw new Error('Account already exists');
      }
      
      // Create account object
      const account: Account = {
        id: this.generateId(),
        address: evmGetAddress(address), // Checksum address
        name: name || `Watch-Only Account`,
        type: 'watched',
        publicKey: '', // Not available for watch-only
        derivationPath: undefined,
        ens: undefined,
        username: undefined,
        avatar: undefined,
        createdAt: new Date(),
        lastUsed: new Date(),
        metadata: {
          isHardware: false,
          isImported: false,
          isWatchOnly: true
        }
      };

      // Store the account
      this.accounts.set(account.id, account);
      
      // Save to storage
      await this.saveAccounts();
      
      // Emit event
      this.emit('account:created', account);
      
      return account;
    } catch (error) {
      throw new Error(`Failed to add watch-only account: ${error}`);
    }
  }

  /**
   * Update account information
   */
  async update(accountId: string, updates: Partial<Account>): Promise<Account> {
    this.ensureInitialized();

    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Update account
    const updatedAccount = {
      ...account,
      ...updates,
      id: account.id, // Prevent ID changes
      address: account.address, // Prevent address changes
      lastUsed: new Date()
    };

    this.accounts.set(accountId, updatedAccount);
    await this.saveAccounts();
    
    this.emit('account:updated', updatedAccount);
    return updatedAccount;
  }

  /**
   * Remove an account
   */
  async remove(accountId: string): Promise<void> {
    this.ensureInitialized();

    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Can't remove the last account
    if (this.accounts.size === 1) {
      throw new Error('Cannot remove the last account');
    }

    // Remove from storage
    this.accounts.delete(accountId);
    await this.removePrivateKey(accountId);
    await this.saveAccounts();

    // Select another account if this was current
    if (this.currentAccountId === accountId) {
      const firstAccount = Array.from(this.accounts.values())[0];
      await this.select(firstAccount.id);
    }

    this.emit('account:removed', accountId);
  }

  /**
   * Select an account as current
   */
  async select(accountId: string): Promise<Account> {
    this.ensureInitialized();

    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    // Update last used
    const updatedAccount = {
      ...account,
      lastUsed: new Date()
    };
    
    this.accounts.set(accountId, updatedAccount);
    this.currentAccountId = accountId;
    
    // Save current account selection
    await this.saveCurrentAccount();
    await this.saveAccounts();

    this.emit('account:selected', updatedAccount);
    return updatedAccount;
  }

  /**
   * Get all accounts
   */
  getAll(): Account[] {
    return Array.from(this.accounts.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Get account by ID
   */
  get(accountId: string): Account | null {
    return this.accounts.get(accountId) || null;
  }

  /**
   * Get account by address
   */
  async getByAddress(address: string): Promise<Account | null> {
    const normalizedAddress = address.toLowerCase();
    return Array.from(this.accounts.values())
      .find(acc => acc.address.toLowerCase() === normalizedAddress) || null;
  }

  /**
   * Get current account
   */
  getCurrent(): Account | null {
    if (!this.currentAccountId) return null;
    return this.accounts.get(this.currentAccountId) || null;
  }

  /**
   * Get private key for account (if available)
   */
  async getPrivateKey(accountId: string): Promise<string> {
    this.ensureInitialized();

    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    if (account.type === 'watched') {
      throw new Error('Watch-only accounts have no private key');
    }

    return this.loadPrivateKey(accountId);
  }

  /**
   * Sign a message with account
   */
  async signMessage(accountId: string, message: string): Promise<string> {
    const privateKey = await this.getPrivateKey(accountId);
    const signer = signers.get(ChainType.EVM);
    return signer.signMessage(privateKey, message);
  }

  /**
   * Destroy the account manager
   */
  async destroy(): Promise<void> {
    this.accounts.clear();
    this.currentAccountId = null;
    this.initialized = false;
    this.removeAllListeners();
  }

  /**
   * Private methods
   */
  private generateId(): string {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadAccounts(): Promise<void> {
    try {
      // In a real implementation, this would load from encrypted storage
      // For now, use localStorage as a simple example
      const stored = localStorage.getItem('yakkl:accounts');
      if (stored) {
        const accountsData = JSON.parse(stored);
        for (const acc of accountsData) {
          // Convert date strings back to Date objects
          acc.createdAt = new Date(acc.createdAt);
          acc.lastUsed = new Date(acc.lastUsed);
          this.accounts.set(acc.id, acc);
        }
      }
    } catch (error) {
      console.warn('Failed to load accounts:', error);
    }
  }

  private async saveAccounts(): Promise<void> {
    try {
      const accountsData = Array.from(this.accounts.values());
      localStorage.setItem('yakkl:accounts', JSON.stringify(accountsData));
    } catch (error) {
      console.error('Failed to save accounts:', error);
      throw error;
    }
  }

  private async loadCurrentAccount(): Promise<void> {
    try {
      const stored = localStorage.getItem('yakkl:currentAccount');
      if (stored && this.accounts.has(stored)) {
        this.currentAccountId = stored;
      } else if (this.accounts.size > 0) {
        // Select first account if no current account set
        this.currentAccountId = Array.from(this.accounts.keys())[0];
      }
    } catch (error) {
      console.warn('Failed to load current account:', error);
    }
  }

  private async saveCurrentAccount(): Promise<void> {
    try {
      if (this.currentAccountId) {
        localStorage.setItem('yakkl:currentAccount', this.currentAccountId);
      }
    } catch (error) {
      console.error('Failed to save current account:', error);
    }
  }

  private async storePrivateKey(accountId: string, privateKey: string): Promise<void> {
    // In production, this should be encrypted with user's password
    // For now, store in localStorage (NOT SECURE - just for development)
    try {
      localStorage.setItem(`yakkl:pk:${accountId}`, privateKey);
    } catch (error) {
      console.error('Failed to store private key:', error);
      throw error;
    }
  }

  private async loadPrivateKey(accountId: string): Promise<string> {
    try {
      const privateKey = localStorage.getItem(`yakkl:pk:${accountId}`);
      if (!privateKey) {
        throw new Error('Private key not found');
      }
      return privateKey;
    } catch (error) {
      console.error('Failed to load private key:', error);
      throw error;
    }
  }

  private async removePrivateKey(accountId: string): Promise<void> {
    try {
      localStorage.removeItem(`yakkl:pk:${accountId}`);
    } catch (error) {
      console.error('Failed to remove private key:', error);
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AccountManager not initialized');
    }
  }
}

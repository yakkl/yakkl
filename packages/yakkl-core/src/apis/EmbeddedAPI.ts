/**
 * EmbeddedAPI - API for embedded wallet implementations
 */

import { WalletEngine } from '../engine/WalletEngine';
import type { Account, Network, Transaction } from '../engine/types';

export class EmbeddedAPI {
  private engine: WalletEngine;

  constructor(engine: WalletEngine) {
    this.engine = engine;
  }

  /**
   * Get wallet information
   */
  async getWalletInfo() {
    return {
      version: '0.1.0',
      accounts: this.engine.accounts.getAll().length,
      currentNetwork: this.engine.networks.getCurrent()?.name,
      isLocked: false // Would check actual lock state
    };
  }

  /**
   * Get current account
   */
  async getCurrentAccount(): Promise<Account | null> {
    return this.engine.getCurrentAccount();
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<Account[]> {
    return this.engine.accounts.getAll();
  }

  /**
   * Get current network
   */
  async getCurrentNetwork(): Promise<Network | null> {
    return this.engine.networks.getCurrent();
  }

  /**
   * Get supported networks
   */
  async getSupportedNetworks(): Promise<Network[]> {
    return this.engine.networks.getSupported();
  }

  /**
   * Request account connection
   */
  async connect(): Promise<Account[]> {
    // In embedded mode, return current accounts
    return this.engine.accounts.getAll();
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: Transaction): Promise<string> {
    const signed = await this.engine.transactions.sign(transaction);
    return signed.serialized;
  }

  /**
   * Send a transaction
   */
  async sendTransaction(transaction: Transaction): Promise<string> {
    return this.engine.transactions.send(transaction);
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string> {
    const currentAccount = this.engine.getCurrentAccount();
    if (!currentAccount) {
      throw new Error('No account selected');
    }

    return this.engine.accounts.signMessage(currentAccount.id, message);
  }
}
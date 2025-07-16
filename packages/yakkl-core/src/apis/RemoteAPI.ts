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

export class RemoteAPI extends EventEmitter<RemoteWalletEvents> {
  private connected = false;
  private accounts: string[] = [];
  private chainId: string | null = null;

  /**
   * Connect to remote wallet
   */
  async connect(): Promise<string[]> {
    // Simulate connection to external wallet
    this.connected = true;
    this.accounts = []; // Would get from remote wallet
    this.emit('connected');
    return this.accounts;
  }

  /**
   * Disconnect from remote wallet
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    this.accounts = [];
    this.chainId = null;
    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get connected accounts
   */
  getAccounts(): string[] {
    return this.accounts;
  }

  /**
   * Get current chain ID
   */
  getChainId(): string | null {
    return this.chainId;
  }

  /**
   * Request account access
   */
  async requestAccounts(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('Not connected to remote wallet');
    }
    
    // Would request from remote wallet
    return this.accounts;
  }

  /**
   * Switch network
   */
  async switchNetwork(chainId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to remote wallet');
    }

    // Would request network switch from remote wallet
    this.chainId = chainId;
    this.emit('chainChanged', chainId);
  }
}
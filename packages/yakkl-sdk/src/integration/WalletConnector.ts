/**
 * WalletConnector - Universal wallet connection interface
 */

import { EventEmitter } from 'eventemitter3';
import { YakklProvider } from './YakklProvider';
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

export class WalletConnector extends EventEmitter<ConnectorEvents> {
  private connectedWallet: WalletInfo | null = null;
  private provider: any = null;
  private yakklProvider: YakklProvider | null = null;

  constructor() {
    super();
    this.setupYakklProvider();
  }

  /**
   * Get available wallets
   */
  getAvailableWallets(): WalletInfo[] {
    const wallets: WalletInfo[] = [
      {
        name: 'YAKKL Wallet',
        icon: '/yakkl-icon.svg',
        description: 'Connect with YAKKL Wallet',
        installed: true,
        provider: this.yakklProvider
      }
    ];

    // Check for MetaMask
    if (typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask) {
      wallets.push({
        name: 'MetaMask',
        icon: '/metamask-icon.svg',
        description: 'Connect with MetaMask',
        installed: true,
        provider: (window as any).ethereum
      });
    }

    // Check for Coinbase Wallet
    if (typeof window !== 'undefined' && (window as any).ethereum?.isCoinbaseWallet) {
      wallets.push({
        name: 'Coinbase Wallet',
        icon: '/coinbase-icon.svg',
        description: 'Connect with Coinbase Wallet',
        installed: true,
        provider: (window as any).ethereum
      });
    }

    // Check for WalletConnect
    if (typeof window !== 'undefined' && (window as any).WalletConnect) {
      wallets.push({
        name: 'WalletConnect',
        icon: '/walletconnect-icon.svg',
        description: 'Connect with WalletConnect',
        installed: true,
        provider: null // WalletConnect requires special handling
      });
    }

    return wallets;
  }

  /**
   * Connect to a specific wallet
   */
  async connect(walletName: string): Promise<string[]> {
    const wallet = this.getAvailableWallets().find(w => w.name === walletName);
    
    if (!wallet) {
      throw new Error(`Wallet ${walletName} not found`);
    }

    if (!wallet.installed) {
      throw new Error(`Wallet ${walletName} is not installed`);
    }

    try {
      let accounts: string[] = [];

      if (wallet.name === 'YAKKL Wallet') {
        if (!this.yakklProvider) {
          throw new Error('YAKKL provider not initialized');
        }
        await this.yakklProvider.initialize();
        accounts = await this.yakklProvider.connect();
        this.provider = this.yakklProvider;
      } else {
        // Handle other wallets
        if (!wallet.provider) {
          throw new Error(`Provider not available for ${walletName}`);
        }
        
        this.provider = wallet.provider;
        accounts = await this.provider.request({ method: 'eth_requestAccounts' });
      }

      this.connectedWallet = wallet;
      this.setupProviderListeners();
      
      this.emit('walletConnected', wallet, accounts);
      return accounts;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from current wallet
   */
  async disconnect(): Promise<void> {
    if (!this.connectedWallet) return;

    try {
      if (this.connectedWallet.name === 'YAKKL Wallet' && this.yakklProvider) {
        await this.yakklProvider.disconnect();
      }

      const wallet = this.connectedWallet;
      this.connectedWallet = null;
      this.provider = null;
      
      this.emit('walletDisconnected', wallet);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Send a request to the connected wallet
   */
  async request(args: EthereumRequest): Promise<any> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    try {
      return await this.provider.request(args);
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Check if a wallet is connected
   */
  isConnected(): boolean {
    return this.connectedWallet !== null;
  }

  /**
   * Get currently connected wallet
   */
  getConnectedWallet(): WalletInfo | null {
    return this.connectedWallet;
  }

  /**
   * Get the current provider
   */
  getProvider(): any {
    return this.provider;
  }

  /**
   * Get current accounts
   */
  async getAccounts(): Promise<string[]> {
    if (!this.provider) return [];
    
    try {
      return await this.provider.request({ method: 'eth_accounts' });
    } catch (error) {
      return [];
    }
  }

  /**
   * Get current chain ID
   */
  async getChainId(): Promise<string> {
    if (!this.provider) return '0x1';
    
    try {
      return await this.provider.request({ method: 'eth_chainId' });
    } catch (error) {
      return '0x1';
    }
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(chainId: string): Promise<void> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    try {
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Add a new network to the wallet
   */
  async addNetwork(networkParams: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    blockExplorerUrls?: string[];
  }): Promise<void> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    try {
      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [networkParams]
      });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Sign a message
   */
  async signMessage(address: string, message: string): Promise<string> {
    if (!this.provider) {
      throw new Error('No wallet connected');
    }

    try {
      return await this.provider.request({
        method: 'personal_sign',
        params: [message, address]
      });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Private methods
   */
  private setupYakklProvider(): void {
    this.yakklProvider = new YakklProvider({
      autoConnect: false,
      enableMods: true
    });
  }

  private setupProviderListeners(): void {
    if (!this.provider) return;

    // Remove existing listeners
    this.removeAllListeners();

    // Setup new listeners
    if (this.provider.on) {
      this.provider.on('accountsChanged', (accounts: string[]) => {
        this.emit('accountsChanged', accounts);
      });

      this.provider.on('chainChanged', (chainId: string) => {
        this.emit('chainChanged', chainId);
      });

      this.provider.on('disconnect', () => {
        if (this.connectedWallet) {
          const wallet = this.connectedWallet;
          this.connectedWallet = null;
          this.provider = null;
          this.emit('walletDisconnected', wallet);
        }
      });
    }
  }
}

/**
 * Create a wallet connector instance
 */
export function createWalletConnector(): WalletConnector {
  return new WalletConnector();
}
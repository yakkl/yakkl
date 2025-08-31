/**
 * YakklProvider - Main provider for YAKKL wallet integration
 */

import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '@yakkl/core';

export interface YakklProviderConfig {
  apiKey?: string;
  network?: string;
  autoConnect?: boolean;
  enableMods?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface ProviderEvents {
  'connect': (accounts: string[]) => void;
  'disconnect': () => void;
  'accountsChanged': (accounts: string[]) => void;
  'chainChanged': (chainId: string) => void;
  'message': (message: any) => void;
}

export interface EthereumRequest {
  method: string;
  params?: any[];
}

export class YakklProvider extends EventEmitter<ProviderEvents> {
  public readonly isYakkl = true;
  public readonly isMetaMask = false; // For compatibility
  
  private engine: WalletEngine | null = null;
  private config: YakklProviderConfig;
  private _accounts: string[] = [];
  private _chainId: string = '0x1';
  private _connected = false;
  private _initialized = false;

  constructor(config: YakklProviderConfig = {}) {
    super();
    this.config = {
      network: 'ethereum',
      autoConnect: false,
      enableMods: true,
      logLevel: 'warn',
      ...config
    };
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      // Import and create wallet engine
      const { createWallet } = await import('@yakkl/core');
      
      this.engine = await createWallet({
        name: 'YAKKL Provider',
        version: '1.0.0',
        embedded: true,
        enableMods: this.config.enableMods,
        logLevel: this.config.logLevel || 'warn'
      });

      // Setup event listeners
      this.setupEventListeners();

      this._initialized = true;

      // Auto-connect if enabled
      if (this.config.autoConnect) {
        await this.connect();
      }
    } catch (error) {
      console.error('Failed to initialize YAKKL provider:', error);
      throw error;
    }
  }

  /**
   * Connect to the wallet
   */
  async connect(): Promise<string[]> {
    if (!this.engine) {
      throw new Error('Provider not initialized');
    }

    try {
      // Get accounts from engine
      const accounts = await this.engine.accounts.getAll();
      this._accounts = accounts.map(account => account.address);
      
      if (this._accounts.length === 0) {
        // Create a new account if none exist
        const newAccount = await this.engine.accounts.create();
        this._accounts = [newAccount.address];
      }

      // Get current network
      const currentNetwork = await this.engine.networks.getCurrent();
      if (currentNetwork) {
        this._chainId = `0x${currentNetwork.chainId.toString(16)}`;
      } else {
        this._chainId = '0x1'; // Default to mainnet
      }

      this._connected = true;
      this.emit('connect', this._accounts);
      this.emit('accountsChanged', this._accounts);

      return this._accounts;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    this._connected = false;
    this._accounts = [];
    this.emit('disconnect');
    this.emit('accountsChanged', []);
  }

  /**
   * Send an RPC request
   */
  async request(args: EthereumRequest): Promise<any> {
    if (!this.engine) {
      throw new Error('Provider not initialized');
    }

    const { method, params = [] } = args;

    switch (method) {
      case 'eth_requestAccounts':
        return await this.connect();

      case 'eth_accounts':
        return this._accounts;

      case 'eth_chainId':
        return this._chainId;

      case 'net_version':
        return parseInt(this._chainId, 16).toString();

      case 'eth_getBalance':
        if (!params[0]) throw new Error('Address required');
        const balance = await this.engine.getBalance(params[0]);
        return balance.native;

      case 'eth_sendTransaction':
        if (!params[0]) throw new Error('Transaction object required');
        const txHash = await this.engine.transactions.send(params[0]);
        return txHash;

      case 'eth_signTransaction':
        if (!params[0]) throw new Error('Transaction object required');
        const signedTx = await this.engine.transactions.sign(params[0]);
        return signedTx;

      case 'personal_sign':
      case 'eth_sign':
        if (!params[0] || !params[1]) throw new Error('Message and address required');
        // TODO: Implement message signing
        throw new Error('Message signing not yet implemented');

      case 'eth_signTypedData':
      case 'eth_signTypedData_v4':
        if (!params[0] || !params[1]) throw new Error('Address and typed data required');
        // TODO: Implement typed data signing
        throw new Error('Typed data signing not yet implemented');

      case 'wallet_switchEthereumChain':
        if (!params[0]?.chainId) throw new Error('Chain ID required');
        return await this.switchChain(params[0].chainId);

      case 'wallet_addEthereumChain':
        if (!params[0]) throw new Error('Chain parameters required');
        return await this.addChain(params[0]);

      case 'wallet_getPermissions':
        return [{ parentCapability: 'eth_accounts' }];

      case 'wallet_requestPermissions':
        return [{ parentCapability: 'eth_accounts' }];

      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  /**
   * Check if the provider is connected
   */
  isConnected(): boolean {
    return this._connected;
  }

  /**
   * Get current accounts
   */
  get accounts(): string[] {
    return [...this._accounts];
  }

  /**
   * Get current chain ID
   */
  get chainId(): string {
    return this._chainId;
  }

  /**
   * Get the wallet engine instance
   */
  getEngine(): WalletEngine | null {
    return this.engine;
  }

  /**
   * Private methods
   */
  private async switchChain(chainId: string): Promise<void> {
    if (!this.engine) throw new Error('Provider not initialized');

    const numericChainId = parseInt(chainId, 16);
    
    try {
      await this.engine.networks.switch(numericChainId.toString());
      this._chainId = chainId;
      this.emit('chainChanged', chainId);
    } catch (error) {
      throw new Error(`Failed to switch to chain ${chainId}: ${error}`);
    }
  }

  private async addChain(chainParams: any): Promise<void> {
    if (!this.engine) throw new Error('Provider not initialized');

    const { chainId, chainName, rpcUrls, nativeCurrency, blockExplorerUrls } = chainParams;
    
    try {
      const networkChainId = parseInt(chainId, 16);
      await this.engine.networks.add({
        chainId: networkChainId,
        name: chainName,
        rpcUrl: rpcUrls[0],
        symbol: nativeCurrency?.symbol || 'ETH',
        blockExplorerUrl: blockExplorerUrls?.[0] || '',
        isTestnet: false,
        isMainnet: networkChainId === 1,
        gasToken: {
          address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
          symbol: nativeCurrency?.symbol || 'ETH',
          decimals: nativeCurrency?.decimals || 18,
          name: nativeCurrency?.name || chainName,
          chainId: networkChainId
        },
        supportedFeatures: ['eip1559', 'contracts', 'tokens', 'nft'] as any[]
      });
    } catch (error) {
      throw new Error(`Failed to add chain: ${error}`);
    }
  }

  private setupEventListeners(): void {
    if (!this.engine) return;

    this.engine.on('account:selected', (account) => {
      this._accounts = [account.address];
      this.emit('accountsChanged', this._accounts);
    });

    this.engine.on('network:changed', (network) => {
      this._chainId = `0x${network.chainId.toString(16)}`;
      this.emit('chainChanged', this._chainId);
    });

    this.engine.on('transaction:signed', (transaction) => {
      this.emit('message', {
        type: 'transaction:signed',
        data: transaction
      });
    });
  }
}

/**
 * Create a YAKKL provider instance
 */
export function createYakklProvider(config?: YakklProviderConfig): YakklProvider {
  return new YakklProvider(config);
}
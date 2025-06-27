/**
 * EmbeddedProvider - Web3 provider interface for embedded wallets
 */

import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '@yakkl/core';

export interface EthereumRequest {
  method: string;
  params?: any[];
}

export interface EthereumResponse {
  id: number;
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ProviderRpcError extends Error {
  code: number;
  data?: any;
}

export interface ProviderEvents {
  'connect': (connectInfo: { chainId: string }) => void;
  'disconnect': (error: ProviderRpcError) => void;
  'accountsChanged': (accounts: string[]) => void;
  'chainChanged': (chainId: string) => void;
  'message': (message: { type: string; data: any }) => void;
}

export class EmbeddedProvider extends EventEmitter<ProviderEvents> {
  private engine: WalletEngine;
  private _chainId: string = '0x1';
  private _accounts: string[] = [];
  private _isConnected = false;

  constructor(engine: WalletEngine) {
    super();
    this.engine = engine;
    this.initialize();
  }

  private async initialize() {
    try {
      // Get current network and accounts
      const currentNetwork = this.engine.networks.getCurrent();
      if (currentNetwork) {
        this._chainId = `0x${currentNetwork.chainId.toString(16)}`;
      }

      const currentAccount = this.engine.getCurrentAccount();
      if (currentAccount) {
        this._accounts = [currentAccount.address];
      }

      this._isConnected = true;
      this.emit('connect', { chainId: this._chainId });

      // Listen to engine events
      this.engine.on('account:selected', (account) => {
        this._accounts = [account.address];
        this.emit('accountsChanged', this._accounts);
      });

      this.engine.on('network:changed', (network) => {
        this._chainId = `0x${network.chainId.toString(16)}`;
        this.emit('chainChanged', this._chainId);
      });
    } catch (error) {
      console.error('Failed to initialize embedded provider:', error);
    }
  }

  /**
   * Standard EIP-1193 request method
   */
  async request(args: EthereumRequest): Promise<any> {
    const { method, params = [] } = args;

    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return this._accounts;

      case 'eth_chainId':
        return this._chainId;

      case 'net_version':
        return parseInt(this._chainId, 16).toString();

      case 'eth_getBalance':
        if (params[0] && this._accounts.includes(params[0])) {
          const balance = await this.engine.transactions.getBalance(params[0]);
          return `0x${BigInt(balance.native.balance).toString(16)}`;
        }
        throw new Error('Address not found');

      case 'eth_sendTransaction':
        if (params[0]) {
          const txHash = await this.engine.transactions.send(params[0]);
          return txHash;
        }
        throw new Error('Transaction parameters required');

      case 'eth_signTransaction':
        if (params[0]) {
          const signedTx = await this.engine.transactions.sign(params[0]);
          return signedTx.serialized;
        }
        throw new Error('Transaction parameters required');

      case 'personal_sign':
      case 'eth_sign':
        if (params[0] && params[1]) {
          const currentAccount = this.engine.getCurrentAccount();
          if (currentAccount && this._accounts.includes(params[1])) {
            return await this.engine.accounts.signMessage(currentAccount.id, params[0]);
          }
        }
        throw new Error('Sign parameters required');

      case 'wallet_switchEthereumChain':
        if (params[0]?.chainId) {
          const chainId = parseInt(params[0].chainId, 16);
          const networks = this.engine.networks.getSupported();
          const network = networks.find(n => n.chainId === chainId);
          if (network) {
            await this.engine.networks.switch(network.id);
            return null;
          }
          throw new Error('Chain not supported');
        }
        throw new Error('Chain ID required');

      case 'wallet_addEthereumChain':
        if (params[0]) {
          const chainConfig = params[0];
          await this.engine.networks.add({
            name: chainConfig.chainName,
            chainId: parseInt(chainConfig.chainId, 16),
            symbol: chainConfig.nativeCurrency?.symbol || 'ETH',
            rpcUrl: chainConfig.rpcUrls[0],
            blockExplorerUrl: chainConfig.blockExplorerUrls?.[0],
            isTestnet: false,
            isMainnet: false,
            iconUrl: chainConfig.iconUrls?.[0],
            gasToken: {
              address: '0x0000000000000000000000000000000000000000',
              symbol: chainConfig.nativeCurrency?.symbol || 'ETH',
              name: chainConfig.nativeCurrency?.name || 'Ethereum',
              decimals: chainConfig.nativeCurrency?.decimals || 18,
              chainId: parseInt(chainConfig.chainId, 16),
              isNative: true,
              isStable: false
            },
            supportedFeatures: ['contracts', 'tokens']
          });
          return null;
        }
        throw new Error('Chain configuration required');

      case 'wallet_getPermissions':
        return [
          {
            id: 'accounts',
            parentCapability: 'eth_accounts',
            invoker: window.location.origin,
            caveats: [
              {
                type: 'restrictReturnedAccounts',
                value: this._accounts
              }
            ]
          }
        ];

      case 'wallet_requestPermissions':
        // For embedded wallets, permissions are automatically granted
        return [
          {
            id: 'accounts',
            parentCapability: 'eth_accounts',
            invoker: window.location.origin,
            caveats: [
              {
                type: 'restrictReturnedAccounts',
                value: this._accounts
              }
            ]
          }
        ];

      default:
        throw new Error(`Method ${method} not supported`);
    }
  }

  /**
   * Legacy send method for backward compatibility
   */
  send(methodOrPayload: string | any, paramsOrCallback?: any[] | ((error: any, response: any) => void)): any {
    if (typeof methodOrPayload === 'string') {
      // Legacy method(string, params) format
      return this.request({ method: methodOrPayload, params: paramsOrCallback as any[] });
    } else {
      // Legacy payload format
      const callback = paramsOrCallback as (error: any, response: any) => void;
      this.request(methodOrPayload)
        .then(result => {
          callback(null, { id: methodOrPayload.id, jsonrpc: '2.0', result });
        })
        .catch(error => {
          callback(error, null);
        });
    }
  }

  /**
   * Legacy sendAsync method for backward compatibility
   */
  sendAsync(payload: any, callback: (error: any, response: any) => void): void {
    this.request(payload)
      .then(result => {
        callback(null, { id: payload.id, jsonrpc: '2.0', result });
      })
      .catch(error => {
        callback(error, null);
      });
  }

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Get current chain ID
   */
  get chainId(): string {
    return this._chainId;
  }

  /**
   * Get selected accounts
   */
  get selectedAddress(): string | null {
    return this._accounts[0] || null;
  }

  /**
   * Enable the provider (for legacy compatibility)
   */
  async enable(): Promise<string[]> {
    return this.request({ method: 'eth_requestAccounts' });
  }
}
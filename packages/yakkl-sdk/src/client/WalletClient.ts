/**
 * YAKKL Wallet Client
 * High-level API client for interacting with YAKKL wallet
 */

import type { 
  IBlockchainProvider,
  IState,
  IStorage,
  MessageBus
} from '@yakkl/core';

export interface WalletClientConfig {
  apiUrl?: string;
  apiKey?: string;
  provider?: IBlockchainProvider;
  storage?: IStorage;
  messageBus?: MessageBus;
  timeout?: number;
}

export interface WalletClientOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface WalletAccount {
  address: string;
  name?: string;
  type: 'imported' | 'generated' | 'hardware' | 'watch';
  chainId: number;
  balance?: string;
}

export interface WalletTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  data?: string;
  chainId: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

export class WalletClient {
  private config: WalletClientConfig;
  private isConnected = false;

  constructor(config: WalletClientConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'https://api.yakkl.com',
      timeout: config.timeout || 30000,
      ...config
    };
  }

  /**
   * Connect to wallet
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) return true;

    try {
      // Check if extension is available
      if (typeof window !== 'undefined' && 'yakkl' in window) {
        await (window as any).yakkl.request({ method: 'eth_requestAccounts' });
        this.isConnected = true;
        return true;
      }

      // Try provider connection
      if (this.config.provider) {
        await this.config.provider.connect();
        this.isConnected = true;
        return true;
      }

      throw new Error('No wallet provider available');
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (this.config.provider) {
      await this.config.provider.disconnect();
    }
    this.isConnected = false;
  }

  /**
   * Get connected accounts
   */
  async getAccounts(): Promise<WalletAccount[]> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (typeof window !== 'undefined' && 'yakkl' in window) {
      const addresses = await (window as any).yakkl.request({ 
        method: 'eth_accounts' 
      });
      
      return addresses.map((address: string) => ({
        address,
        type: 'imported' as const,
        chainId: 1
      }));
    }

    return [];
  }

  /**
   * Get account balance
   */
  async getBalance(address: string, chainId?: number): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (this.config.provider) {
      return await this.config.provider.getBalance(address as `0x${string}`);
    }

    if (typeof window !== 'undefined' && 'yakkl' in window) {
      const balance = await (window as any).yakkl.request({
        method: 'eth_getBalance',
        params: [address, 'latest']
      });
      return balance;
    }

    throw new Error('No provider available');
  }

  /**
   * Send transaction
   */
  async sendTransaction(params: {
    from: string;
    to: string;
    value?: string;
    data?: string;
    chainId?: number;
  }): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (typeof window !== 'undefined' && 'yakkl' in window) {
      return await (window as any).yakkl.request({
        method: 'eth_sendTransaction',
        params: [params]
      });
    }

    if (this.config.provider) {
      const response = await this.config.provider.sendTransaction({
        from: params.from as `0x${string}`,
        to: params.to as `0x${string}`,
        value: params.value || '0',
        data: (params.data || '0x') as `0x${string}`
      });
      return response;
    }

    throw new Error('No provider available');
  }

  /**
   * Sign message
   */
  async signMessage(address: string, message: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (typeof window !== 'undefined' && 'yakkl' in window) {
      return await (window as any).yakkl.request({
        method: 'personal_sign',
        params: [message, address]
      });
    }

    throw new Error('Signing not available');
  }

  /**
   * Switch network
   */
  async switchNetwork(chainId: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;

    if (typeof window !== 'undefined' && 'yakkl' in window) {
      try {
        await (window as any).yakkl.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }]
        });
      } catch (error: any) {
        // Chain not added, try to add it
        if (error.code === 4902) {
          throw new Error('Please add this network to your wallet');
        }
        throw error;
      }
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    address: string,
    options?: {
      chainId?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<WalletTransaction[]> {
    // This would typically call an API endpoint
    const response = await this.request('/transactions', {
      params: {
        address,
        ...options
      }
    });

    return response.transactions || [];
  }

  /**
   * Make API request
   */
  private async request(
    endpoint: string,
    options?: {
      method?: string;
      params?: any;
      data?: any;
    }
  ): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const method = options?.method || 'GET';

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout!)
    };

    if (method === 'GET' && options?.params) {
      const params = new URLSearchParams(options.params);
      url.concat('?' + params.toString());
    } else if (options?.data) {
      requestOptions.body = JSON.stringify(options.data);
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get wallet info
   */
  async getWalletInfo(): Promise<{
    version: string;
    name: string;
    features: string[];
  }> {
    if (typeof window !== 'undefined' && 'yakkl' in window) {
      const yakkl = (window as any).yakkl;
      return {
        version: yakkl.version || 'unknown',
        name: 'YAKKL Wallet',
        features: ['signing', 'transactions', 'multi-chain']
      };
    }

    return {
      version: 'unknown',
      name: 'YAKKL SDK',
      features: []
    };
  }
}
/**
 * Base blockchain provider implementation
 */

import { EventEmitter } from 'eventemitter3';
import type {
  IBlockchainProvider,
  ChainInfo,
  ProviderConfig,
  TransactionStatusInfo,
  Block,
  ProviderEvents
} from '../interfaces/provider.interface';
import type { Address, HexString } from '../types';
import type { TransactionSignRequest } from '../interfaces/wallet.interface';
import type { SignatureRequest, SignatureResult } from '../interfaces/crypto.interface';

/**
 * Abstract base provider class
 */
export abstract class BaseProvider extends EventEmitter<ProviderEvents> implements IBlockchainProvider {
  protected _chainInfo: ChainInfo;
  protected _isConnected: boolean = false;
  protected config: ProviderConfig;
  protected rpcUrl: string;

  constructor(chainInfo: ChainInfo, config?: ProviderConfig) {
    super();
    this._chainInfo = chainInfo;
    this.config = config || {};
    this.rpcUrl = config?.rpcUrl || chainInfo.rpcUrls[0];
  }

  get chainInfo(): ChainInfo {
    return this._chainInfo;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Connect to the blockchain
   */
  async connect(): Promise<void> {
    try {
      // Verify connection with a simple RPC call
      await this.getBlockNumber();
      this._isConnected = true;
      this.emit('connect', this._chainInfo.chainId);
    } catch (error) {
      this._isConnected = false;
      throw new Error(`Failed to connect to ${this._chainInfo.name}: ${error}`);
    }
  }

  /**
   * Disconnect from the blockchain
   */
  async disconnect(): Promise<void> {
    this._isConnected = false;
    this.emit('disconnect');
  }

  /**
   * Make an RPC request
   */
  protected async rpcRequest(method: string, params: any[] = []): Promise<any> {
    const requestBody = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'RPC request failed');
      }

      return data.result;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Retry an RPC request with exponential backoff
   */
  protected async retryRpcRequest(method: string, params: any[] = []): Promise<any> {
    const maxRetries = this.config.retryCount || 3;
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.rpcRequest(method, params);
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Abstract methods that must be implemented by subclasses
   */
  abstract switchChain(chainId: string | number): Promise<void>;
  abstract getAccounts(): Promise<Address[]>;
  abstract requestAccounts(): Promise<Address[]>;
  abstract getBalance(address: Address, tokenAddress?: Address): Promise<string>;
  abstract sendTransaction(tx: TransactionSignRequest): Promise<string>;
  abstract signTransaction(tx: TransactionSignRequest): Promise<string>;
  abstract getTransaction(hash: string): Promise<TransactionStatusInfo>;
  abstract estimateGas(tx: TransactionSignRequest): Promise<string>;
  abstract getGasPrice(): Promise<string>;
  abstract signMessage(request: SignatureRequest): Promise<SignatureResult>;
  abstract signTypedData(request: SignatureRequest): Promise<SignatureResult>;
  abstract getBlockNumber(): Promise<number>;
  abstract getBlock(blockHashOrNumber: string | number): Promise<Block>;
  abstract getTransactionCount(address: Address): Promise<number>;
  abstract call(tx: TransactionSignRequest): Promise<string>;
}

/**
 * Provider error class
 */
export class ProviderError extends Error {
  code: number;
  data?: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.data = data;
  }
}

/**
 * Standard RPC error codes
 */
export enum RpcErrorCode {
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  PARSE_ERROR = -32700,
  USER_REJECTED = 4001,
  UNAUTHORIZED = 4100,
  UNSUPPORTED_METHOD = 4200,
  DISCONNECTED = 4900,
  CHAIN_DISCONNECTED = 4901
}
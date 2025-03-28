import EventEmitter from 'events';
import { log } from '$lib/plugins/Logger';
import { EIP1193_ERRORS } from './eip-types';
import { ProviderRpcError } from '$lib/common';
import type { RequestArguments } from '$lib/common';
import type { Duplex } from 'readable-stream';

// EIP-1193 Provider Implementation
export class EIP1193Provider extends EventEmitter {
  private _initialized = false;
  private _chainId = '0x1';
  private _networkVersion = '1';
  private _accounts: string[] = [];
  private _connected = false;
  private _requestId = 0;
  private _disposed = false;
  private _isWalletReady = false;
  private stream: Duplex;
  private _pendingRequests = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    timeoutId: NodeJS.Timeout;
    method: string;
  }>();
  private _queuedRequests: Array<{
    args: RequestArguments;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(stream: Duplex) {
    super();
    this.stream = stream;
    this.setMaxListeners(100);
    this._initializeProvider();
  }

  private async _initializeProvider() {
    try {
      await this.initializeFromShortcuts();
    } catch (error) {
      log.warn('Initial provider initialization failed, will retry when wallet is ready', false, error);
      // Don't throw here - we'll retry when needed
    }
  }

  public async request(args: RequestArguments): Promise<unknown> {
    try {
      const { method, params = [] } = args;
      log.debug('EIP-1193 provider request', true, { method, params });

      // Handle read-only methods that don't require initialization
      if (method === 'eth_chainId') {
        log.debug('Returning chainId', true, { chainId: this._chainId });
        return this._chainId;
      }

      if (method === 'net_version') {
        log.debug('Returning network version', true, { networkVersion: this._networkVersion });
        return this._networkVersion;
      }

      if (method === 'eth_accounts') {
        const activeAccount = this._accounts[0];
        log.debug('Returning account', true, { account:activeAccount });
        return activeAccount ? [activeAccount] : [];
      }

      // For methods requiring initialization, queue if not ready
      if (!this._initialized || !this._isWalletReady) {
        if (method === 'eth_requestAccounts') {
          // For eth_requestAccounts, try to initialize immediately
          try {
            await this.initializeFromShortcuts();
          } catch (error) {
            log.warn('Wallet not ready, showing initialization message', false);
            throw new ProviderRpcError(4001, 'Please open the wallet extension to initialize');
          }
        } else {
          // For other methods, queue the request
          return new Promise((resolve, reject) => {
            this._queuedRequests.push({ args, resolve, reject });
            log.debug('Request queued until wallet is ready', false, { method });
          });
        }
      }

      // Handle eth_requestAccounts
      if (method === 'eth_requestAccounts') {
        log.debug('Requesting accounts - requires user permission', true);
        const response = await this._sendRequest(method, params as unknown[]);
        if (Array.isArray(response)) {
          this.handleAddressChange(response);
          log.debug('eth_requestAccounts response handled', true, { accounts: response });
        }
        return response;
      }

      // All other methods
      return this._sendRequest(method, params as unknown[]);
    } catch (e) {
      log.error('Error in provider request', true, e);
      throw e;
    }
  }

  private async initializeFromShortcuts(): Promise<void> {
    try {
      // Send request through content script using window.postMessage
      if (window && typeof window.postMessage === 'function') {
        window.postMessage({
          id: (this._requestId++).toString(),
          type: 'YAKKL_REQUEST:EIP6963',
          method: 'eth_chainId'
        }, window.location.origin);
      } else {
        log.error('Window context invalid for postMessage');
      }

      // Wait for the chain ID response from content script
      const chainIdResponse = await new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'YAKKL_RESPONSE:EIP6963') return;

          window.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error.message));
            return;
          }
          resolve(event.data.result);
        };
        window.addEventListener('message', handler);
      });

      // Get accounts through content script
      if (window && typeof window.postMessage === 'function') {
        window.postMessage({
          id: (this._requestId++).toString(),
          type: 'YAKKL_REQUEST:EIP6963',
          method: 'eth_accounts'
        }, window.location.origin);
      } else {
        log.error('Window context invalid for postMessage');
      }

      // Wait for the accounts response from content script
      const accountsResponse = await new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          if (event.data?.type !== 'YAKKL_RESPONSE:EIP6963') return;

          window.removeEventListener('message', handler);
          if (event.data.error) {
            reject(new Error(event.data.error.message));
            return;
          }
          resolve(event.data.result);
        };
        window.addEventListener('message', handler);
      });

      // Extract the data
      const chainId = parseInt(chainIdResponse as string || '0x1', 16);
      const accounts = Array.isArray(accountsResponse) ? accountsResponse : [];
      const address = accounts.length > 0 ? accounts[0] : null;

      // Set provider state
      this._chainId = `0x${chainId.toString(16)}`;
      this._networkVersion = chainId.toString();
      this._accounts = accounts;
      this._connected = Boolean(address);
      this._initialized = true;
      this._isWalletReady = true;

      log.debug('Provider state initialized', true, {
        chainId: this._chainId,
        networkVersion: this._networkVersion,
        accounts: this._accounts,
        connected: this._connected
      });

      // Process any queued requests
      this._processQueuedRequests();

    } catch (e) {
      log.error('Error initializing from content script', true, e);
      // Set default values on error
      this._chainId = '0x1';
      this._networkVersion = '1';
      this._accounts = [];
      this._connected = false;
      this._initialized = true;
      this._isWalletReady = false;
      throw e;
    }
  }

  private async _processQueuedRequests(): Promise<void> {
    while (this._queuedRequests.length > 0) {
      const request = this._queuedRequests.shift();
      if (request) {
        try {
          const result = await this.request(request.args);
          request.resolve(result);
        } catch (error) {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }

  private _sendRequest(method: string, params: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = (this._requestId++).toString();
      const startTime = Date.now();

      const timeoutId = setTimeout(() => {
        this._pendingRequests.delete(id);
        const duration = Date.now() - startTime;
        const error = new ProviderRpcError(
          EIP1193_ERRORS.TIMEOUT.code,
          `Request timeout for method: ${method} after ${duration}ms`
        );
        log.error('Request timeout:', true, {
          id,
          method,
          params,
          duration,
          pendingRequests: Array.from(this._pendingRequests.keys()),
          timestamp: new Date().toISOString()
        });
        reject(error);
      }, 30000);

      this._pendingRequests.set(id, { resolve, reject, timeoutId, method });

      // Send request through content script
      if (window && typeof window.postMessage === 'function') {
        try {
          window.postMessage({
            type: 'YAKKL_REQUEST:EIP6963',
            id,
            method,
            params
          }, window.location.origin);
          log.debug('Sent request through content script', true, {
            id,
            method,
            params,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          clearTimeout(timeoutId);
          this._pendingRequests.delete(id);
          const providerError = new ProviderRpcError(
            EIP1193_ERRORS.DISCONNECTED.code,
            'Failed to send request - postMessage error'
          );
          log.error('Failed to send request:', true, {
            id,
            method,
            params,
            error,
            timestamp: new Date().toISOString()
          });
          reject(providerError);
        }
      } else {
        clearTimeout(timeoutId);
        this._pendingRequests.delete(id);
        const error = new ProviderRpcError(
          EIP1193_ERRORS.DISCONNECTED.code,
          'Window context invalid for postMessage'
        );
        log.error('Failed to send request - invalid window context:', true, {
          id,
          method,
          params,
          timestamp: new Date().toISOString()
        });
        reject(error);
      }
    });
  }

  public isConnected(): boolean {
    return this._connected;
  }

  public dispose(): void {
    this._disposed = true;
    this.removeAllListeners();

    // Clear all pending requests with a provider disconnected error
    for (const [id, { reject, timeoutId }] of this._pendingRequests.entries()) {
      clearTimeout(timeoutId);
      reject(new Error('Provider is disconnected'));
      this._pendingRequests.delete(id);
    }

    if (this.stream) {
      try {
        // @ts-ignore: This method may exist on the stream
        if (typeof this.stream.destroy === 'function') {
          this.stream.destroy();
        }
      } catch (error) {
        log.error('Error destroying stream during provider disposal', false, error);
      }
    }
  }

  private handleAddressChange(addresses: Array<string>): void {
    try {
      if (!this._accounts || this._accounts[0] !== addresses[0]) {
        this._accounts = [addresses[0]]; // Only store the active account
        this.emit("accountsChanged", this._accounts);
        log.debug('Updated active account', true, { account: addresses[0] });
      }
    } catch (e) {
      log.error('Error handling address change', true, e);
    }
  }

  private handleChainIdChange(chainId: string): void {
    try {
      const chainIdNum = parseInt(chainId, 16);
      if (this._chainId !== chainId) {
        this._chainId = chainId;
        this._networkVersion = chainIdNum.toString();
        this.emit("chainChanged", chainId);
        this.emit("networkChanged", chainIdNum);
        log.debug('Updated chainId', true, { chainId, networkVersion: this._networkVersion });
      }
    } catch (e) {
      log.error('Error handling chain change', true, e);
    }
  }
}

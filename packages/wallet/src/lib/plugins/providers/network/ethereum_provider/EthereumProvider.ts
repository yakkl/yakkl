// EthereumProvider.ts
import EventEmitter from "events";
import { Duplex } from 'readable-stream';
import {v4 as uuidv4} from 'uuid';
import type { EIP1193Provider, EIP6963ProviderInfo, EIP6963ProviderDetail } from '$lib/plugins/providers/network/ethereum_provider/EthereumProviderTypes';
import { log } from '$lib/plugins/Logger';
import { EIP1193_ERRORS } from '$lib/plugins/providers/network/ethereum_provider/EthereumProviderTypes';

// Provider Info for EIP-6963
const eip6963ProviderInfo: EIP6963ProviderInfo = {
  walletId: 'yakkl-wallet',
  uuid: uuidv4(),
  name: 'YAKKL® Smart Wallet',
  icon: 'data:image/png;base64,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',
  rdns: 'com.yakkl',
};

// Duplex Stream for Communication
class PostMessageDuplexStream extends Duplex {
  private _origin: string;
  private _onMessageBound: (event: MessageEvent) => void;

  constructor(origin: string) {
    super({ objectMode: true });
    this._origin = origin;
    this._onMessageBound = this._onMessage.bind(this);
    window.addEventListener('message', this._onMessageBound, false);
  }

  _read() {
    // No-op required by Duplex interface
  }

  _write(message: any, _encoding: string, callback: (error?: Error) => void) {
    try {
      window.postMessage(message, this._origin);
      callback();
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  _onMessage(event: MessageEvent) {
    try {
      if (event.origin === this._origin && event.data) {
        if (event.data.type && (
          event.data.type === 'YAKKL_RESPONSE:EIP6963' ||
          event.data.type === 'YAKKL_EVENT:EIP6963')) {
          this.push(event.data);
        }
      }
    } catch (error) {
      log.error('Error processing message in PostMessageDuplexStream', false, error);
    }
  }

  _destroy(err: Error | null, callback: (error: Error | null) => void) {
    try {
      window.removeEventListener('message', this._onMessageBound, false);
      callback(err);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// EIP-6963 YAKKL Provider implementation
export class EIP6963YakklProvider extends EventEmitter implements EIP1193Provider {
  public detail: EIP6963ProviderDetail;
  private stream: Duplex;
  private _requestId: number;
  private _pendingRequests: Map<string, {
    resolve: (value: unknown) => void;
    reject: (value: unknown) => void;
    timeoutId: NodeJS.Timeout;
  }>;
  private _connected: boolean = false;
  private _accounts: string[] = [];
  private _chainId: string = '0x1'; // Default to mainnet
  private _disposed: boolean = false;

  constructor(detail: EIP6963ProviderDetail, stream: Duplex) {
    super();
    this.detail = detail;
    this.stream = stream;
    this._requestId = 0;
    this._pendingRequests = new Map();
    this.setMaxListeners(100); // Prevent EventEmitter warnings for many listeners

    log.debug('EIP6963YakklProvider initialized');

    this.setupListeners();

    // Check connection state on init
    this.request({ method: 'eth_accounts' })
      .then((accounts: unknown) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          this._connected = true;
          this._accounts = accounts;
          this.emit('connect', { chainId: this._chainId });
        }
      })
      .catch(error => {
        log.error('Failed to initialize provider connection state', true, error);
      });

    // Get current chain
    this.request({ method: 'eth_chainId' })
      .then((chainId: unknown) => {
        if (typeof chainId === 'string') {
          this._chainId = chainId;
        }
      })
      .catch(error => {
        log.error('Failed to get chain ID', true, error);
      });
  }

  private setupListeners() {
    // Listen for announce provider requests
    window.addEventListener('eip6963:requestProvider', this.handleRequestProvider.bind(this));

    // Setup stream data handling
    if (this.stream) {
      this.stream.on('data', (data) => {
        try {
          if (!data) return;

          log.debug('EIP6963 provider received data', false, data);

          const { id, error, result, method, type } = data;

          if (type !== 'YAKKL_RESPONSE:EIP6963' && type !== 'YAKKL_EVENT:EIP6963') {
            log.debug('Ignoring non-EIP6963 message', false, { type });
            return;
          }

          // Handle events
          if (type === 'YAKKL_EVENT:EIP6963') {
            const { event, data: eventData } = data;
            log.debug('EIP6963 provider received event', false, { event, data: eventData });

            if (event === 'accountsChanged') {
              this._accounts = eventData;
              this.emit('accountsChanged', eventData);
            } else if (event === 'chainChanged') {
              this._chainId = eventData;
              this.emit('chainChanged', eventData);
            } else if (event === 'connect') {
              this._connected = true;
              this.emit('connect', eventData);
            } else if (event === 'disconnect') {
              this._connected = false;
              this.emit('disconnect', eventData);
            }
            return;
          }

          // Handle responses
          const handlers = this._pendingRequests.get(id);
          if (!handlers) {
            log.debug('No handler found for request', false, { id });
            return;
          }

          // Clean up the request
          clearTimeout(handlers.timeoutId);
          this._pendingRequests.delete(id);

          if (error) {
            log.error('EIP6963 request error response', false, { id, error });
            const errorObj = typeof error === 'object' ? error : { message: error };
            const errorMessage = errorObj.message || 'Unknown error';
            const errorCode = errorObj.code || EIP1193_ERRORS.INTERNAL.code;
            handlers.reject(new Error(`${errorCode}: ${errorMessage}`));
            return;
          }

          log.debug('EIP6963 request succeeded', false, { id, method, result });

          // Handle specific responses that should trigger events
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
            if (Array.isArray(result)) {
              const wasConnected = this._connected && this._accounts.length > 0;
              const isConnected = result.length > 0;

              // Update accounts
              this._accounts = result;

              // Connection state changed
              if (!wasConnected && isConnected) {
                this._connected = true;
                this.emit('connect', { chainId: this._chainId });
              }

              // Always emit accountsChanged
              this.emit('accountsChanged', result);
            }
          } else if (method === 'eth_chainId') {
            if (typeof result === 'string' && result !== this._chainId) {
              this._chainId = result;
              this.emit('chainChanged', result);
            }
          }

          handlers.resolve(result);
        } catch (e) {
          log.error('Error processing provider response', true, e);
        }
      });

      this.stream.on('error', (error) => {
        log.error('Stream error in EIP6963YakklProvider', false, error);
        this.emit('disconnect', { code: EIP1193_ERRORS.DISCONNECTED.code, message: EIP1193_ERRORS.DISCONNECTED.message });
      });
    }
  }

  private handleRequestProvider() {
    this.announce();
  }

  public announce(): void {
    try {
      if (this._disposed) return;

      const announceEvent: CustomEvent<EIP6963ProviderDetail> = new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze(this.detail),
      });
      window.dispatchEvent(announceEvent);
      log.debug('Provider announced', false, this.detail.info.name);
    } catch (e) {
      log.error('Failed to announce provider', true, e);
    }
  }

  public async request(request: { method: string, params?: Array<unknown> }): Promise<unknown> {
    try {
      if (this._disposed) {
        throw new Error('Provider is disposed');
      }

      log.debug('EIP6963 provider request', false, request);

      const { method, params = [] } = request;

      if (!method) {
        throw new Error('Request method is required');
      }

      // For certain methods, perform local validation first
      if (method === 'eth_requestAccounts' && !this._connected) {
        // Special handling for the first connection attempt
        this.emit('connect', { chainId: this._chainId });
      }

      // Generate a unique request ID
      this._requestId++;
      const requestId = this._requestId.toString();

      return new Promise((resolve, reject) => {
        // Set a timeout for the request
        const timeoutId = setTimeout(() => {
          const pendingRequest = this._pendingRequests.get(requestId);
          if (pendingRequest) {
            this._pendingRequests.delete(requestId);
            reject(new Error(`Request timeout for method ${method}`));
          }
        }, 30000); // 30 second timeout

        // Store the request promise handlers
        this._pendingRequests.set(requestId, {
          resolve,
          reject,
          timeoutId
        });

        log.debug('Sending EIP6963 request', false, {
          id: requestId,
          method,
          params
        });

        // Send the request through the stream
        try {
          this.stream.write({
            id: requestId,
            method,
            params,
            type: 'YAKKL_REQUEST:EIP6963'
          });
        } catch (error) {
          // Clean up if writing fails
          clearTimeout(timeoutId);
          this._pendingRequests.delete(requestId);
          reject(error);
        }
      });
    } catch (e) {
      log.error('Failed to send request', true, e);
      return Promise.reject(e instanceof Error ? e : new Error(`Request failed: ${String(e)}`));
    }
  }

  // Helper methods
  public isConnected(): boolean {
    return this._connected;
  }

  public getChainId(): string {
    return this._chainId;
  }

  public getAccounts(): string[] {
    return [...this._accounts];
  }

  // Cleanup method
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
}

// EIP-6963 Provider Detail factory
export function getEIP6963ProviderDetail(): EIP6963ProviderDetail {
  const stream = new PostMessageDuplexStream(window.location.origin);

  const providerDetail: EIP6963ProviderDetail = {
    info: eip6963ProviderInfo,
    provider: {} as EIP1193Provider,
  };

  const eip6963Provider = new EIP6963YakklProvider(providerDetail, stream);
  providerDetail.provider = eip6963Provider;

  return providerDetail;
}

// Declare global interfaces for TypeScript
declare global {
  interface Window {
    yakkl?: EIP6963ProviderDetail;
  }
  interface WindowEventMap {
    'eip6963:announceProvider': CustomEvent<EIP6963ProviderDetail>;
    'eip6963:requestProvider': Event;
  }
}

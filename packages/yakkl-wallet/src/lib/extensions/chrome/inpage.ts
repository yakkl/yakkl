// inpage.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-debugger */
// Inject this into any given webpage or iFrame so that it may communicate with the extension.
// You can not use browser extention only classes and methods here. You must pass events
//   back and forth to the background.js service.

import { log } from "$lib/plugins/Logger";
import type { EIP6963ProviderDetail, EIP6963Provider, EIP6963ProviderInfo } from '$lib/plugins/providers/network/ethereum_provider/eip-types';
import type { RequestArguments } from '$lib/common';
import { EventEmitter } from 'events';
import { getWindowOrigin, isValidOrigin, getTargetOrigin, safePostMessage } from '$lib/common/origin';

// Error types
const EIP1193_ERRORS = {
  USER_REJECTED: {
    code: 4001,
    message: 'The user rejected the request.'
  },
  UNAUTHORIZED: {
    code: 4100,
    message: 'The requested method and/or account has not been authorized by the user.'
  },
  UNSUPPORTED_METHOD: {
    code: 4200,
    message: 'The Provider does not support the requested method.'
  },
  DISCONNECTED: {
    code: 4900,
    message: 'The Provider is disconnected from all chains.'
  },
  CHAIN_DISCONNECTED: {
    code: 4901,
    message: 'The Provider is not connected to the requested chain.'
  },
  TIMEOUT: {
    code: 4902,
    message: 'Request timeout'
  },
  INTERNAL_ERROR: {
    code: -32603,
    message: 'Internal error'
  }
} as const;

class ProviderRpcError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'ProviderRpcError';
  }
}

// Base64 encoded icon
const YAKKL_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjMtMDMtMjJUMTU6NDc6NDctMDQ6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjMtMDMtMjJUMTU6NDc6NDctMDQ6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDIzLTAzLTIyVDE1OjQ3OjQ3LTA0OjAwIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjk0YzFkNDY5LTU2ZDAtNDI0Ni1hMjM0LTM2ZDY5ZjI1MjQ5YiIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjM0ZjEyZmJiLTY0ZjAtYjM0NC1hZDY3LTY2NDg0ZmQ5ZjFhYiIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjk0YzFkNDY5LTU2ZDAtNDI0Ni1hMjM0LTM2ZDY5ZjI1MjQ5YiIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjk0YzFkNDY5LTU2ZDAtNDI0Ni1hMjM0LTM2ZDY5ZjI1MjQ5YiIgc3RFdnQ6d2hlbj0iMjAyMy0wMy0yMlQxNTo0Nzo0Ny0wNDowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDI0LjAgKE1hY2ludG9zaCkiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+YWpJdAAAAnVJREFUaN7tmE1IVFEUx3/zZsw0NUtnxmw0paBFs4UQRbRpEdUiKGgVLfoiWrSJFkG0KoKgRR8EQdCiWkQtWkRB0GdE9LFoYUGrqEWWZjEjpdN4b064MjLvY957c9+938CDN/PevXPO/5x7/+ece8E555xzrgnkgKvAa2AReAcsAfeAXUDBOVcELgF5oD7m7xpwBsg4F0oFYBSoAk+Ao8A2YAfQCxwGHgJ14DGwxTlXAqaAz8Bl59xm51y3c67bOdcDXAG+AlPOuXJKQWwHXgJzwP4m9+0DZoF3QE/aQewEpoEPwMEE9x8CPhJ5Y0daQewB3gIvgH0t2ukH5oHnwO40gTgEfCLa3YMW7Q0C74m8eSgNIPqAWSKv7LPZ7gDwBngG7IoTRBG4CPwGrsc8/5uRXf8Al4FCkkDKwDXgD3A7wbm4Q7Q5rgOVuECUiEL5L3AnhYtgArgJLAM3gFKnQJSJvLIMTALFFK+kY8AtohR7k2hh2wJRIdrKK8DtNgVxXIwQxcQdoLc/wc6vADdkB0/FsHvbBaRfvFADJoDNMdodINrOK8CkHCC2QGwjyiyfgYsxLN5OgzgPLMkW7bMBYqsUUp+Bi20e/E4vkEEppmaBM02qiXYA6ZF0+QU41YGQbQeQ48Br4CFwoEMFQydAjACPgPvAvg4XLZ0AMQQ8lVJzKIbKtd0ghoEngp2RmOrndoE4IaE6BeyMuQVhF8RRYEaK+L6Y2zB2QJyVwn0S2J5AB8kOiItSLl4FtiXUg7MD4gYwDGxNoAvmBEQ1hX+Lq0nPQEVAVFPohVqSM1ARECvAz5R5YUXOQEXgH/AbWEwZiJqcgYoJxGIKQfyUM1AxgVhOIYjaPwEGADmPjMkWWdYrAAAAAElFTkSuQmCC';

// Chrome types
declare namespace chrome {
  export namespace runtime {
    interface Port {
      name: string;
      onMessage: {
        addListener: (callback: (message: any) => void) => void;
      };
      onDisconnect: {
        addListener: (callback: () => void) => void;
      };
      postMessage: (message: any) => void;
    }
    function connect(connectInfo?: { name: string }): Port;
  }
}

// Declare window interface
declare global {
  var yakkl: EIP6963ProviderDetail;
  interface Window {
    ethereum: EIP6963Provider;
  }
}

log.debug('Initializing inpage script', true);

// Initialize provider state
const windowOrigin = getWindowOrigin();
log.debug('Window origin:', true, windowOrigin);

// Initialize provider info
const providerInfo: EIP6963ProviderInfo = {
  uuid: crypto.randomUUID(),
  name: 'Yakkl',
  icon: YAKKL_ICON,
  rdns: 'com.yakkl',
  walletId: 'yakkl'
};

class EIP1193Provider extends EventEmitter implements EIP6963Provider {
  private _isConnected: boolean = false;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    method: string;
  }>();
  private connectionAttempts = 0;
  private readonly MAX_CONNECTION_ATTEMPTS = 3;
  private isConnecting = false;
  private initializationPromise: Promise<void>;
  private chainId: string = '0x1';  // Default mainnet
  private networkVersion: string = '1';

  constructor() {
    super();
    this.setupMessageListener();
    this.initializationPromise = this.initialize();
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  private setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Only accept messages from valid origins
      if (!isValidOrigin(event.origin)) return;

      const message = event.data;
      if (!message || typeof message !== 'object') return;

      // Handle responses from content script
      if (message.type === 'YAKKL_RESPONSE:EIP6963') {
        this.handleResponse(message);
      }

      // Handle events from content script
      if (message.type === 'YAKKL_EVENT:EIP6963') {
        this.emitEvent(message.event, message.data);
      }
    });
  }

  private async initialize() {
    try {
      await this.connect();
      // Only announce provider after successful connection
      announceProvider();
    } catch (error) {
      log.error('Failed to initialize provider:', false, error);
      throw error;
    }
  }

  private async connect(): Promise<void> {
    if (this._isConnected) {
      return;
    }

    if (this.isConnecting) {
      // If already connecting, wait for the current attempt to finish
      await new Promise(resolve => setTimeout(resolve, 100));
      if (this._isConnected) return;
    }

    try {
      this.isConnecting = true;
      log.debug('Connecting to EIP-6963...', false);

      if (this.connectionAttempts >= this.MAX_CONNECTION_ATTEMPTS) {
        log.error('Max connection attempts reached', false);
        throw new ProviderRpcError(4100, 'Failed to connect after maximum attempts');
      }

      this.connectionAttempts++;

      // Test connection by requesting accounts
      const accounts = await this.request({ method: 'eth_accounts' });
      if (!Array.isArray(accounts)) {
        log.error('Invalid response from eth_accounts', false, accounts);
        // throw new Error('Invalid response from eth_accounts');
      }

      // Update provider state
      this._isConnected = true;
      this.connectionAttempts = 0; // Reset on successful connection
      log.debug('Successfully connected to EIP-6963', false);
    } catch (error) {
      log.error('Failed to connect to EIP-6963:', false, error);
      this._isConnected = false;

      // Only retry if we haven't reached max attempts
      if (this.connectionAttempts < this.MAX_CONNECTION_ATTEMPTS) {
        const delay = 1000 * Math.pow(2, this.connectionAttempts);
        await new Promise(resolve => setTimeout(resolve, delay));
        this.isConnecting = false;
        return this.connect(); // Retry connection
      }
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private handleResponse(response: any) {
    log.debug('Handling response in inpage:', true, {
      response,
      pendingRequests: Array.from(this.pendingRequests.keys()),
      timestamp: new Date().toISOString()
    });

    // Extract id from response using various possible formats
    const id = response.id ||
      (response.type === 'YAKKL_REQUEST:EIP6963' ? response.requestId : undefined) ||
      (response.data && response.data.id);

    // Handle error responses first
    if (response.error) {
      const pendingRequest = id ?
        this.pendingRequests.get(id) :
        Array.from(this.pendingRequests.values())[0];

      if (pendingRequest) {
        const error = new ProviderRpcError(
          response.error.code || 4001,
          response.error.message || 'Unknown error'
        );
        log.error('Handling error response:', false, {
          id,
          error,
          timestamp: new Date().toISOString()
        });
        pendingRequest.reject(error);
        this.pendingRequests.delete(id || Array.from(this.pendingRequests.keys())[0]);
      }
      return;
    }

    // If response is an array or has array data (special case for eth_accounts)
    if (Array.isArray(response) || (response[0] && typeof response[0] === 'string')) {
      const accounts = Array.isArray(response) ? response : [response[0]];
      // Find eth_accounts request
      for (const [reqId, request] of this.pendingRequests.entries()) {
        if (request.method === 'eth_accounts' || request.method === 'eth_requestAccounts') {
          this._isConnected = true;
          this.emit('accountsChanged', accounts);
          log.debug('Handling accounts response:', false, {
            reqId,
            accounts,
            timestamp: new Date().toISOString()
          });
          request.resolve(accounts);
          this.pendingRequests.delete(reqId);
          return;
        }
      }
      return;
    }

    // Handle response with method and result format
    if (response.method && response.result !== undefined) {
      // Find request by method if no ID match
      for (const [reqId, request] of this.pendingRequests.entries()) {
        if (request.method === response.method) {
          if (response.method === 'eth_accounts') {
            this._isConnected = true;
            this.emit('accountsChanged', response.result);
          }
          log.debug('Handling method response:', false, {
            reqId,
            method: response.method,
            result: response.result,
            timestamp: new Date().toISOString()
          });
          request.resolve(response.result);
          this.pendingRequests.delete(reqId);
          return;
        }
      }
      return;
    }

    // Handle standard response format
    const pendingRequest = id ?
      this.pendingRequests.get(id) :
      Array.from(this.pendingRequests.values())[0];

    if (!pendingRequest) {
      log.debug('No pending request found for response', false, {
        response,
        pendingRequests: Array.from(this.pendingRequests.entries()),
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const result = response.result || response;

      // Special handling for eth_accounts responses
      if (pendingRequest.method === 'eth_accounts' || pendingRequest.method === 'eth_requestAccounts') {
        if (Array.isArray(result)) {
          this._isConnected = true;
          this.emit('accountsChanged', result);
        }
      }

      log.debug('Resolving request:', false, {
        id,
        method: pendingRequest.method,
        result,
        timestamp: new Date().toISOString()
      });
      pendingRequest.resolve(result);
      this.pendingRequests.delete(id || Array.from(this.pendingRequests.keys())[0]);
    } catch (error) {
      log.error('Error processing response:', false, {
        error,
        id,
        timestamp: new Date().toISOString()
      });
      pendingRequest.reject(new ProviderRpcError(
        EIP1193_ERRORS.INTERNAL_ERROR.code,
        EIP1193_ERRORS.INTERNAL_ERROR.message
      ));
      this.pendingRequests.delete(id || Array.from(this.pendingRequests.keys())[0]);
    }
  }

  private emitEvent(eventName: string, data: any) {
    this.emit(eventName, data);
  }

  async request(args: RequestArguments): Promise<unknown> {

    log.debug('Requesting method (start):', false, {
      method: args.method,
      params: args.params,
      sender: typeof window !== 'undefined' && typeof document !== 'undefined' ? {
        origin: window.location?.origin || 'unknown',
        href: window.location?.href || 'unknown',
        referrer: document.referrer || 'unknown',
        hostname: window.location?.hostname || 'unknown'
      } : 'window/document not available',
      timestamp: new Date().toISOString()
    });

    // Handle eth_chainId directly
    if (args.method === 'eth_chainId') {
      return this.chainId;
    }

    // Handle net_version directly
    if (args.method === 'net_version') {
      return this.networkVersion;
    }

    // Handle wallet_requestPermissions
    if (args.method === 'wallet_requestPermissions') {
      // This will trigger the eth_requestAccounts flow which handles permissions
      const accounts = await this.request({ method: 'eth_requestAccounts' });
      return [{
        parentCapability: 'eth_accounts',
        caveats: [],
        date: new Date().getTime()
      }];
    }

    // List of methods that don't require approval
    const noApprovalMethods = [
      'eth_getBlockByNumber',
      'eth_getBlockByHash',
      'eth_blockNumber',
      'eth_call',
      'eth_estimateGas',
      'eth_gasPrice',
      'eth_getBalance',
      'eth_getCode',
      'eth_getTransactionCount',
      'eth_getTransactionReceipt',
      'eth_getStorageAt',
      'eth_getTransactionByHash',
      'eth_getLogs'
    ];

    const id = ++this.requestId;
    const startTime = Date.now();

    log.debug('Making request from inpage:', false, {
      id,
      method: args.method,
      params: args.params,
      requiresApproval: !noApprovalMethods.includes(args.method),
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const duration = Date.now() - startTime;
        log.error('Request timeout:', false, {
          id,
          method: args.method,
          params: args.params,
          duration,
          pendingRequests: Array.from(this.pendingRequests.keys()).map(id => ({
            id,
            method: this.pendingRequests.get(id)?.method
          })),
          timestamp: new Date().toISOString()
        });
        this.pendingRequests.delete(id);
        reject(new ProviderRpcError(
          EIP1193_ERRORS.TIMEOUT.code,
          `Request timeout for method: ${args.method} after ${duration}ms`
        ));
      }, 60000); // Increased timeout to 60 seconds for debugging

      this.pendingRequests.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          log.debug('Request resolved:', false, {
            id,
            method: args.method,
            duration,
            timestamp: new Date().toISOString()
          });
          resolve(value);
        },
        reject: (reason) => {
          clearTimeout(timeout);
          const duration = Date.now() - startTime;
          log.error('Request rejected:', false, {
            id,
            method: args.method,
            reason,
            duration,
            timestamp: new Date().toISOString()
          });
          reject(reason);
        },
        method: args.method // Store the method for matching array responses
      });

      try {
        if (window && typeof window.postMessage === 'function') {
          const message = {
            type: 'YAKKL_REQUEST:EIP6963',
            id,
            ...args,
            requiresApproval: !noApprovalMethods.includes(args.method)
          };
          log.debug('Sending request:', false, {
            message,
            targetOrigin: getTargetOrigin(),
            timestamp: new Date().toISOString()
          });
          safePostMessage(message, getTargetOrigin());
        } else {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(new ProviderRpcError(
            EIP1193_ERRORS.DISCONNECTED.code,
            'Window context invalid for postMessage'
          ));
        }
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        log.error('Failed to send request:', false, {
          id,
          method: args.method,
          error,
          timestamp: new Date().toISOString()
        });
        reject(new ProviderRpcError(
          EIP1193_ERRORS.DISCONNECTED.code,
          'Failed to send request'
        ));
      }
    });
  }

  announce(): void {
    announceProvider();
  }
}

// Initialize provider state
const provider = new EIP1193Provider();

// Create the provider detail object
const providerDetail: EIP6963ProviderDetail = {
  provider,
  info: providerInfo
};

// Expose the provider
window.ethereum = provider;
window.yakkl = providerDetail;

let hasAnnounced = false;

// Function to announce provider
function announceProvider() {
  if (hasAnnounced) {
    log.debug('Provider already announced, skipping', false);
    return;
  }

  try {
    log.debug('Announcing EIP-6963 provider', false);

    // Dispatch the announcement event
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: providerDetail
      })
    );

    // Also listen for request events
    window.addEventListener('eip6963:requestProvider', () => {
      log.debug('Received EIP-6963 provider request', false);
      window.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', {
          detail: providerDetail
        })
      );
    });

    hasAnnounced = true;
    log.debug('Provider announced with details:', false, providerInfo);
  } catch (e) {
    log.error('Error announcing EIP-6963 provider', false, e);
    hasAnnounced = false;
  }
}

// Announce provider immediately if document is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  announceProvider();
} else {
  // Otherwise wait for the document to load
  document.addEventListener('DOMContentLoaded', () => {
    announceProvider();
  });
}

// Also announce when specifically requested
window.addEventListener('eip6963:requestProvider', () => {
  announceProvider();
});

// Re-export for use in other modules
export { provider };

// Debug log for window.yakkl assignment
log.debug('window.yakkl assigned', false, {
  provider: providerInfo,
  readyState: document.readyState
});

function post(message: any, targetOrigin: string | null) {
  safePostMessage(message, targetOrigin, { context: 'inpage' });
}

// Helper function to safely send messages
// function safePostMessage(message: any, targetOrigin: string | null) {
//   if (!targetOrigin) {
//     log.warn('Cannot send message - invalid target origin', false);
//     return;
//   }
//   window.postMessage(message, targetOrigin);
// }

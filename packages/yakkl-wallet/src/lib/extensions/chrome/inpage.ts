// inpage.ts - Complete implementation with proper error handling and public initialization
import { log } from "$lib/plugins/Logger";
import {
  type EIP6963ProviderDetail,
  type EIP6963Provider,
  type EIP6963ProviderInfo,
  EIP1193_ERRORS
} from '$lib/plugins/providers/network/ethereum_provider/eip-types';
import type { RequestArguments } from '$lib/common';
import { EventEmitter } from 'events';
import { isValidOrigin } from '$lib/common/origin';
import { generateEipId } from '$lib/common/id-generator';
import { getSafeUUID } from "$lib/common/uuid";

// Type definitions for internal use
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  method: string;
  timestamp: number;
  id: string;
  retryCount: number;
}

interface ProviderState {
  isConnected: boolean;
  chainId: string | null;
  networkVersion: string | null;
  accounts: string[];
  selectedAddress: string | null;
}

// Chrome type declarations remain the same
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

// Window declarations
declare global {
  var yakkl: EIP6963ProviderDetail;
  interface Window {
    ethereum: EIP6963Provider;
  }
}

// ProviderRpcError class using standard EIP errors
class ProviderRpcError extends Error {
  code: number;
  data?: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
    this.name = 'ProviderRpcError';
  }

  // Factory methods for standard errors
  static userRejected(data?: unknown): ProviderRpcError {
    return new ProviderRpcError(
      EIP1193_ERRORS.USER_REJECTED.code,
      EIP1193_ERRORS.USER_REJECTED.message,
      data
    );
  }

  static unauthorized(data?: unknown): ProviderRpcError {
    return new ProviderRpcError(
      EIP1193_ERRORS.UNAUTHORIZED.code,
      EIP1193_ERRORS.UNAUTHORIZED.message,
      data
    );
  }

  static unsupportedMethod(data?: unknown): ProviderRpcError {
    return new ProviderRpcError(
      EIP1193_ERRORS.UNSUPPORTED_METHOD.code,
      EIP1193_ERRORS.UNSUPPORTED_METHOD.message,
      data
    );
  }

  static disconnected(data?: unknown): ProviderRpcError {
    return new ProviderRpcError(
      EIP1193_ERRORS.DISCONNECTED.code,
      EIP1193_ERRORS.DISCONNECTED.message,
      data
    );
  }

  static chainDisconnected(data?: unknown): ProviderRpcError {
    return new ProviderRpcError(
      EIP1193_ERRORS.CHAIN_DISCONNECTED.code,
      EIP1193_ERRORS.CHAIN_DISCONNECTED.message,
      data
    );
  }

  static timeout(data?: unknown): ProviderRpcError {
    return new ProviderRpcError(
      EIP1193_ERRORS.TIMEOUT.code,
      EIP1193_ERRORS.TIMEOUT.message,
      data
    );
  }

  static internalError(data?: unknown): ProviderRpcError {
    return new ProviderRpcError(
      EIP1193_ERRORS.INTERNAL_ERROR.code,
      EIP1193_ERRORS.INTERNAL_ERROR.message,
      data
    );
  }
}

// Main EIP1193Provider class with public ready promise
class EIP1193Provider extends EventEmitter implements EIP6963Provider {
  private state: ProviderState = {
    isConnected: false,
    chainId: '0x1',
    networkVersion: '1',
    accounts: [],
    selectedAddress: null
  };

  private pendingRequests: Map<string, PendingRequest> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;
  private isInitializing: boolean = false;
  private connectionWatchdog: number | undefined;
  private processedResponses = new Set<string>();
  private requestTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Public property for external access to initialization status
  public readonly ready: Promise<void>;

  // Provider configuration
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly REQUEST_TIMEOUT = 30000;
  private readonly CONNECTION_CHECK_INTERVAL = 10000;
  private readonly PROVIDER_NAME = 'YAKKL Smart Wallet';

  constructor() {
    super();
    // Create a public promise that resolves when initialization is complete
    this.ready = this.initialize();
  }

  // Initialize the provider
  private async initialize(): Promise<void> {
    if (this.isInitializing) {
      return this.ready;
    }

    this.isInitializing = true;

    try {
      log.debug('Initializing YAKKL provider...', false);

      // Set up message listener
      this.setupMessageListener();

      // Set up connection watchdog
      this.startConnectionWatchdog();

      // Initial connection
      await this.ensureConnection();

      log.debug('YAKKL provider initialized successfully', false);
    } catch (error) {
      log.error('Failed to initialize provider:', false, error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  // Set up the main message listener
  private setupMessageListener() {
    // Remove any existing listener
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }

    this.messageListener = (event: MessageEvent) => {
      // Only accept messages from valid origins
      if (!isValidOrigin(event.origin)) {
        return;
      }

      const message = event.data;
      if (!message || typeof message !== 'object') {
        return;
      }

      // Handle different message types
      switch (message.type) {
        case 'YAKKL_RESPONSE:EIP6963':
        case 'YAKKL_RESPONSE:EIP1193':
          this.handleResponse(message);
          break;

        case 'YAKKL_EVENT:EIP6963':
        case 'YAKKL_EVENT:EIP1193':
          this.handleEvent(message);
          break;

        case 'YAKKL_CONNECTION_LOST':
          this.handleConnectionLoss();
          break;

        case 'YAKKL_CONNECTION_RESTORED':
          this.handleConnectionRestored();
          break;

        default:
          // Unknown message type
          break;
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  // Ensure connection to content script
  private async ensureConnection(): Promise<void> {
    if (this.state.isConnected) {
      return;
    }

    // If already connecting, wait for that
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  // Connect to content script
  private async connect(): Promise<void> {
    try {
      log.debug('Attempting to connect to content script...', false);

      // Send a test message to verify connection
      const testId = `connect-${Date.now()}`;
      const connected = await this.sendTestMessage(testId);

      if (connected) {
        this.state.isConnected = true;

        // Emit connect event
        this.emit('connect', { chainId: this.state.chainId || '0x1' });

        log.debug('Connected to content script', false);
      } else {
        throw new Error('Failed to establish connection');
      }
    } catch (error) {
      this.state.isConnected = false;
      log.error('Failed to connect to content script:', false, error);
      throw error;
    }
  }

  // Send a test message to verify connection
  private async sendTestMessage(testId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000);

      const testHandler = (event: MessageEvent) => {
        if (event.data?.type === 'YAKKL_TEST_RESPONSE' && event.data?.id === testId) {
          clearTimeout(timeout);
          window.removeEventListener('message', testHandler);
          resolve(true);
        }
      };

      window.addEventListener('message', testHandler);

      // Send test message
      window.postMessage({
        type: 'YAKKL_TEST_REQUEST',
        id: testId
      }, '*');
    });
  }

  // Handle provider responses
  private handleResponse(response: any) {
    const { id, result, error, method } = response;

    log.debug('Inpage received response:', false, {
      id,
      method,
      hasError: !!error,
      hasResult: result !== undefined,
      timestamp: new Date().toISOString()
    });

    // Skip if already processed
    if (this.processedResponses.has(id)) {
      log.debug('Inpage: Skipping duplicate response:', false, { id });
      return;
    }

    this.processedResponses.add(id);

    // Clean up old processed responses
    if (this.processedResponses.size > 100) {
      const oldestResponses = Array.from(this.processedResponses).slice(0, 100);
      oldestResponses.forEach(id => this.processedResponses.delete(id));
    }

    const pendingRequest = this.pendingRequests.get(id);
    if (!pendingRequest) {
      log.debug('No pending request found for response:', false, {
        id,
        method,
        pendingIds: Array.from(this.pendingRequests.keys())
      });
      return;
    }

    // Remove from pending requests and timeouts
    this.pendingRequests.delete(id);

    // Clear the timeout if it exists
    const timeoutId = this.requestTimeouts.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.requestTimeouts.delete(id);
    }

    // Update cached state if applicable
    this.updateCachedState(method, result);

    // Resolve or reject the promise with proper error types
    if (error) {
      const rpcError = new ProviderRpcError(error.code, error.message, error.data);
      pendingRequest.reject(rpcError);
    } else {
      pendingRequest.resolve(result);
    }

    log.debug('Inpage successfully processed response', false, { id, method });
  }

  // Handle provider events
  private handleEvent(event: any) {
    const { event: eventName, data } = event;

    log.debug('Received provider event:', false, { eventName, data });

    // Update state and emit events
    switch (eventName) {
      case 'accountsChanged':
        this.state.accounts = data || [];
        this.state.selectedAddress = data?.[0] || null;
        this.emit('accountsChanged', data);
        break;

      case 'chainChanged':
        this.state.chainId = data;
        // Update network version from chain ID
        if (data) {
          this.state.networkVersion = parseInt(data, 16).toString();
        }
        this.emit('chainChanged', data);
        break;

      case 'connect':
        this.state.isConnected = true;
        this.emit('connect', { chainId: this.state.chainId || '0x1' });
        break;

      case 'disconnect':
        this.handleDisconnect();
        break;

      case 'message':
        this.emit('message', data);
        break;

      default:
        log.debug('Unknown event:', false, { eventName, data });
        break;
    }
  }

  // Handle connection loss
  private handleConnectionLoss() {
    log.debug('Connection lost to content script', false);

    this.state.isConnected = false;

    // Cancel all pending requests with proper error
    this.pendingRequests.forEach((request) => {
      request.reject(ProviderRpcError.disconnected());
    });
    this.pendingRequests.clear();

    // Schedule reconnection attempts
    this.scheduleReconnection();
  }

  // Handle connection restored
  private async handleConnectionRestored() {
    log.debug('Connection restored to content script', false);

    try {
      // Verify connection is actually restored
      await this.ensureConnection();

      // Re-retrieve current state
      await this.refreshProviderState();

      // Emit reconnect event
      this.emit('connect', { chainId: this.state.chainId });
    } catch (error) {
      log.error('Failed to restore connection:', false, error);
      this.scheduleReconnection();
    }
  }

  // Handle disconnect event
  private handleDisconnect() {
    this.state.isConnected = false;
    this.state.accounts = [];
    this.state.selectedAddress = null;

    this.emit('disconnect', {
      code: 1000,
      reason: 'Disconnected'
    });
  }

  // Schedule reconnection attempts
  private scheduleReconnection() {
    let attempts = 0;
    const maxAttempts = 5;
    const baseDelay = 1000;

    const attemptReconnection = async () => {
      if (this.state.isConnected || attempts >= maxAttempts) {
        return;
      }

      attempts++;
      const delay = baseDelay * Math.pow(2, attempts - 1);

      setTimeout(async () => {
        try {
          await this.ensureConnection();
          log.debug('Reconnection successful', false);
        } catch (error) {
          log.debug(`Reconnection attempt ${attempts} failed`, false);
          attemptReconnection();
        }
      }, delay);
    };

    attemptReconnection();
  }

  // Start connection watchdog
  private startConnectionWatchdog() {
    if (this.connectionWatchdog) {
      clearInterval(this.connectionWatchdog);
    }

    this.connectionWatchdog = window.setInterval(async () => {
      if (this.state.isConnected) {
        try {
          const testId = `watchdog-${Date.now()}`;
          const isConnected = await this.sendTestMessage(testId);

          if (!isConnected) {
            this.handleConnectionLoss();
          }
        } catch (error) {
          log.error('Connection watchdog error:', false, error);
        }
      }
    }, this.CONNECTION_CHECK_INTERVAL);
  }

  // Update cached state
  private updateCachedState(method: string, result: any) {
    switch (method) {
      case 'eth_chainId':
        this.state.chainId = result;
        break;

      case 'net_version':
        this.state.networkVersion = result;
        break;

      case 'eth_accounts':
      case 'eth_requestAccounts':
        this.state.accounts = result || [];
        this.state.selectedAddress = result?.[0] || null;
        break;

      default:
        break;
    }
  }

  // Refresh provider state
  private async refreshProviderState() {
    try {
      // Get current chain ID
      const chainId = await this.request({ method: 'eth_chainId' });

      // Get current accounts
      const accounts = await this.request({ method: 'eth_accounts' });

      // Update state
      this.state.chainId = chainId as string;
      this.state.accounts = accounts as string[];
      this.state.selectedAddress = this.state.accounts[0] || null;

      if (this.state.chainId) {
        this.state.networkVersion = parseInt(this.state.chainId, 16).toString();
      }
    } catch (error) {
      log.error('Failed to refresh provider state:', false, error);
    }
  }

  // Check if connection is valid
  public isConnected(): boolean {
    return this.state.isConnected;
  }

  // Main request method
  public async request(args: RequestArguments): Promise<unknown> {
    const { method, params = [] } = args;

    log.debug('Provider request:', false, { method, params });

    // Ensure we're connected
    await this.ensureConnection();

    // Check for cached results for certain methods
    const cachedResult = this.getCachedResult(method);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Create unique request ID
    const id = generateEipId();

    // Create promise for the request
    return new Promise((resolve, reject) => {
      const pendingRequest: PendingRequest = {
        resolve,
        reject,
        method,
        timestamp: Date.now(),
        id,
        retryCount: 0
      };

      // Store pending request
      this.pendingRequests.set(id, pendingRequest);

      // Send the request
      this.sendRequest(id, method, params as any[]);

      // Set timeout and store the timeout ID separately
      const timeoutId = setTimeout(() => {
        const request = this.pendingRequests.get(id);
        if (request) {
          this.pendingRequests.delete(id);
          this.requestTimeouts.delete(id); // Clean up timeout tracking
          request.reject(ProviderRpcError.timeout());
        }
      }, this.REQUEST_TIMEOUT);

      // Store the timeout ID
      this.requestTimeouts.set(id, timeoutId);

      // Override resolve/reject to clear timeout
      const originalResolve = pendingRequest.resolve;
      const originalReject = pendingRequest.reject;

      pendingRequest.resolve = (value: any) => {
        const storedTimeoutId = this.requestTimeouts.get(id);
        if (storedTimeoutId) {
          clearTimeout(storedTimeoutId);
          this.requestTimeouts.delete(id);
        }
        originalResolve(value);
      };

      pendingRequest.reject = (error: any) => {
        const storedTimeoutId = this.requestTimeouts.get(id);
        if (storedTimeoutId) {
          clearTimeout(storedTimeoutId);
          this.requestTimeouts.delete(id);
        }
        originalReject(error);
      };
    });
  }


  // Send request to content script
  private sendRequest(id: string, method: string, params: any[]) {
    const message = {
      type: 'YAKKL_REQUEST:EIP6963',
      id,
      method,
      params,
      requiresApproval: this.requiresApproval(method),
      timestamp: Date.now()
    };

    log.debug('Sending request to content script:', false, message);

    window.postMessage(message, '*');
  }

  // Get cached result if available
  private getCachedResult(method: string): any {
    switch (method) {
      case 'eth_chainId':
        return this.state.chainId;

      case 'net_version':
        return this.state.networkVersion;

      case 'eth_accounts':
        // Only return cached accounts if we've already connected
        return this.state.accounts.length > 0 ? this.state.accounts : undefined;

      default:
        return undefined;
    }
  }

  // Check if method requires approval
  private requiresApproval(method: string): boolean {
    const approvalMethods = [
      'eth_requestAccounts',
      'eth_sendTransaction',
      'eth_signTransaction',
      'eth_sign',
      'personal_sign',
      'eth_signTypedData_v4',
      'wallet_addEthereumChain',
      'wallet_switchEthereumChain',
      'wallet_watchAsset',
      'wallet_requestPermissions',
      'wallet_revokePermissions'
    ];

    return approvalMethods.includes(method);
  }

  // Announce the provider
  public announce(): void {
    announceProvider();
  }

  // Clean up resources
  public destroy() {
    if (this.connectionWatchdog) {
      clearInterval(this.connectionWatchdog);
    }

    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }

    // Clear all pending requests and their timeouts
    this.pendingRequests.forEach((request) => {
      request.reject(ProviderRpcError.disconnected());
    });
    this.pendingRequests.clear();

    // Clear all timeouts
    this.requestTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.requestTimeouts.clear();

    this.removeAllListeners();
  }
}

// Provider information
const providerInfo: EIP6963ProviderInfo = {
  uuid: getSafeUUID(),
  name: 'YAKKL',
  icon: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJhIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNzU4LjczIDczOC45MiI+PGRlZnM+PHJhZGlhbEdyYWRpZW50IGlkPSJiIiBjeD0iMzk5LjMiIGN5PSIzNTkuNDIiIGZ4PSIzOTkuMyIgZnk9IjM1OS40MiIgcj0iMzUxLjY2IiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIuMDMiIHN0b3AtY29sb3I9IiNhZTVlYTQiLz48c3RvcCBvZmZzZXQ9Ii4zNCIgc3RvcC1jb2xvcj0iIzhmNGI5YiIvPjxzdG9wIG9mZnNldD0iLjg5IiBzdG9wLWNvbG9yPSIjNWMyZDhjIi8+PHN0b3Agb2Zmc2V0PSIuOTUiIHN0b3AtY29sb3I9IiM1YTJjOGEiLz48c3RvcCBvZmZzZXQ9Ii45OCIgc3RvcC1jb2xvcj0iIzU1MmI4MyIvPjxzdG9wIG9mZnNldD0iLjk5IiBzdG9wLWNvbG9yPSIjNGQyODc3Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNDgyNzcwIi8+PC9yYWRpYWxHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImMiIHgxPSIyMTkuNjMiIHkxPSI0OC4yMSIgeDI9IjU3OC45OCIgeTI9IjY3MC42MyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2RlOWQyNiIvPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4YzkyNyIvPjxzdG9wIG9mZnNldD0iLjMyIiBzdG9wLWNvbG9yPSIjZTJhZTI0Ii8+PHN0b3Agb2Zmc2V0PSIuNjgiIHN0b3AtY29sb3I9IiNmY2YyOTAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmQ0M2YiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iZCIgeDE9IjI3MS40MSIgeTE9IjQxMy40OSIgeDI9IjM0MC45MyIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImUiIHgxPSI0NTcuNjciIHkxPSI0MTMuNDkiIHgyPSI1MjcuMiIgeTI9IjQxMy40OSIgeGxpbms6aHJlZj0iI2MiLz48bGluZWFyR3JhZGllbnQgaWQ9ImYiIHgxPSIxMjAuNjIiIHkxPSI0MTkuMjgiIHgyPSI2NzcuOTkiIHkyPSI0MTkuMjgiIHhsaW5rOmhyZWY9IiNjIi8+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMzU4LjU5IiB5MT0iMjkzLjk3IiB4Mj0iNDQwLjAyIiB5Mj0iMjkzLjk3IiB4bGluazpocmVmPSIjYyIvPjwvZGVmcz48Y2lyY2xlIGN4PSIzOTkuMyIgY3k9IjM1OS40MiIgcj0iMzUxLjY2IiBzdHlsZT0iZmlsbDp1cmwoI2IpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im0zOTkuMyw3MTguODRjLTE5OC4xOSwwLTM1OS40Mi0xNjEuMjQtMzU5LjQyLTM1OS40MlMyMDEuMTIsMCwzOTkuMywwczM1OS40MiwxNjEuMjQsMzU5LjQyLDM1OS40Mi0xNjEuMjQsMzU5LjQyLTM1OS40MiwzNTkuNDJabTAtNzAzLjMzQzIwOS42NywxNS41Miw1NS40LDE2OS43OSw1NS40LDM1OS40MnMxNTQuMjcsMzQzLjksMzQzLjksMzQzLjksMzQzLjktMTU0LjI3LDM0My45LTM0My45UzU4OC45MywxNS41MiwzOTkuMywxNS41MloiIHN0eWxlPSJmaWxsOnVybCgjYyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTMwNS4xNywzNjkuODhzLTE5LjM0LTE4LjI5LTMzLjc2LTIxLjF2NTQuODZsNjcuNTMsNzQuNTZzNi4zMy0yMy4yMS0zLjUyLTUzLjQ2YzAsMC0zNC4xMS0xNC40Mi0zMC4yNS01NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZCk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2My4xOSw0MjQuNzRjLTkuODUsMzAuMjUtMy41Miw1My40Ni0zLjUyLDUzLjQ2bDY3LjUzLTc0LjU2di01NC44NmMtMTQuNDIsMi44MS0zMy43NiwyMS4xLTMzLjc2LDIxLjEsMy44Nyw0MC40NC0zMC4yNSw1NC44Ni0zMC4yNSw1NC44NloiIHN0eWxlPSJmaWxsOnVybCgjZSk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHBhdGggZD0ibTQ2MC40LDI2Mi45M2wtNDkuMzYsODUuNDljLTUuMDgsOC43OS0xOC40MSw4Ljc5LTIzLjQ4LDBsLTQ5LjM2LTg1LjQ5Yy04NS4wOCw0Ny4yNS0yMTcuNTgtMzUuOTgtMjE3LjU4LTM1Ljk4LDM3LjI2LDQ4LjUxLDc5LjcxLDY5LjczLDExNS4zLDc4LjM3LDU2LjczLDEzLjc3LDEwNS43LDQ3LjYxLDEzNS4xNiw5NS41M2wuNjYsMS4wN2MtMS45OCw3Ljk3LTIuOTgsMTYuMTMtMi45OCwyNC4zMnYxMDguODVjMCwyLjQzLS4yNiw0LjgzLS42OSw3LjItMTEuMDQsNy4xNy0xOC4wOSwxOC4wNS0xOC4wOSwzMC4yMywwLDIxLjU4LDIyLjA5LDM5LjA4LDQ5LjMzLDM5LjA4czQ5LjMzLTE3LjUsNDkuMzMtMzkuMDhjMC0xMi4xOS03LjA1LTIzLjA3LTE4LjA5LTMwLjIzLS40My0yLjM3LS42OS00Ljc3LS42OS03LjJ2LTEwOC44NWMwLTguMTktMS0xNi4zNS0yLjk4LTI0LjMybC42Ni0xLjA3YzI5LjQ2LTQ3LjkyLDc4LjQzLTgxLjc3LDEzNS4xNi05NS41MywzNS41OS04LjY0LDc4LjA0LTI5Ljg2LDExNS4zLTc4LjM3LDAsMC0xNjEuMDgsODUuOTYtMjE3LjU4LDM1Ljk4Wm0tNjEuMSwzNDIuNDljLTIyLjksMC00MS41Mi0xNC43Ni00MS41Mi0zMi45LDAtMi41Ni40MS01LjAzLDEuMTEtNy40Mmg4MC44NGMuNywyLjM5LDEuMTEsNC44NywxLjExLDcuNDIsMCwxOC4xNC0xOC42MywzMi45LTQxLjUyLDMyLjlaIiBzdHlsZT0iZmlsbDp1cmwoI2YpOyBzdHJva2Utd2lkdGg6MHB4OyIvPjxwYXRoIGQ9Im00MDcuMTMsMzIxLjA3bDMyLjg5LTYwLjE3cy00Mi41MywxNi45Mi04MS40MywwbDMyLjg5LDYwLjE3czguMzEsMTMuNDMsMTUuNjUsMFoiIHN0eWxlPSJmaWxsOnVybCgjZyk7IHN0cm9rZS13aWR0aDowcHg7Ii8+PHRleHQvPjwvc3ZnPg==",
  rdns: 'com.yakkl',
  walletId: 'yakkl'
};

// Create the provider instance
const provider = new EIP1193Provider();

// Create the provider detail object that will be announced
const providerDetail: EIP6963ProviderDetail = {
  provider,
  info: providerInfo
};

// Track whether the provider has been announced
let hasAnnounced = false;

// Function to announce the provider according to EIP-6963 specification
function announceProvider() {
  if (hasAnnounced) {
    return; // Don't announce multiple times
  }

  try {
    log.debug('Announcing YAKKL provider via EIP-6963', false);

    // Dispatch the announcement event with our provider details
    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: providerDetail
      })
    );

    // Set up listener for provider request events
    window.addEventListener('eip6963:requestProvider', handleProviderRequest);

    hasAnnounced = true;
    log.debug('YAKKL provider announced successfully', false);
  } catch (error) {
    log.error('Error announcing EIP-6963 provider', false, error);
    hasAnnounced = false;
  }
}

// Handle provider request events from dapps
function handleProviderRequest() {
  log.debug('Received EIP-6963 provider request', false);

  // Re-announce the provider when requested
  window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider', {
      detail: providerDetail
    })
  );
}

// Handle page visibility changes to ensure provider remains available
function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // When page becomes visible, check if provider is still connected
    provider.ready.then(() => {
      log.debug('Page visible, checking provider status', false);
      if (!provider.isConnected()) {
        // If not connected, try to announce again
        provider.announce();
      }
    }).catch(error => {
      log.error('Error checking provider status on visibility change', false, error);
    });
  }
}

// Main initialization function for the inpage script
async function initializeInpageScript() {
  try {
    log.debug('Inpage script starting initialization...', false);

    // Wait for the provider to be ready
    await provider.ready;

    // Expose the provider on the window object for backward compatibility
    window.ethereum = provider;
    window.yakkl = providerDetail;

    // Set up visibility change handler to handle tab switches
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Announce the provider when the document is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      announceProvider();
    } else {
      // If document isn't ready yet, wait for it
      document.addEventListener('DOMContentLoaded', () => {
        announceProvider();
      });
    }

    // Also announce immediately for single-page applications
    // This ensures the provider is available even if the page is already loaded
    setTimeout(() => {
      announceProvider();
    }, 100);

    log.debug('Inpage script initialized successfully', false);
  } catch (error) {
    log.error('Failed to initialize inpage script:', false, error);
  }
}

// Handle script cleanup when page is unloading
function cleanup() {
  try {
    provider.destroy();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('eip6963:requestProvider', handleProviderRequest);
    log.debug('Inpage script cleaned up successfully', false);
  } catch (error) {
    log.error('Error during cleanup:', false, error);
  }
}

// Set up cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Start the initialization process
initializeInpageScript();

// Export the provider for use in other modules if needed
export { provider };

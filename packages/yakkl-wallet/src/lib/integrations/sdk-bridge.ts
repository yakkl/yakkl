/**
 * SDK Bridge
 * Advanced integration between YAKKL wallet and SDK
 * Provides RPC handling, event bridging, and state synchronization
 */

import type { 
  RPCRequest, 
  RPCResponse, 
  WalletInfo,
  EthereumRequest 
} from '@yakkl/sdk';
import { 
  createYAKKLRPCHandler,
  createWalletConnector,
  createEventBridge,
  YakklProvider,
  StandardRPCMethods,
  YAKKLRPCMethods,
  RPC_ERROR_CODES
} from '@yakkl/sdk';

import { currentAccount } from '$lib/stores/account.store';
import { currentChain } from '$lib/stores/chain.store';
import { walletCacheStore } from '$lib/stores/wallet-cache.store';
import { transactionStore } from '$lib/stores/transaction.store';
import { get } from 'svelte/store';
import { browser } from '$app/environment';

export class SDKBridge {
  private rpcHandler = createYAKKLRPCHandler();
  private walletConnector = createWalletConnector();
  private eventBridge = createEventBridge();
  private provider: YakklProvider | null = null;
  private initialized = false;

  constructor() {
    if (browser) {
      this.initialize();
    }
  }

  /**
   * Initialize SDK bridge
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create YAKKL provider
    this.provider = new YakklProvider({
      autoConnect: false,
      enableMods: true
    });

    // Register custom RPC handlers
    this.registerCustomHandlers();

    // Setup store subscriptions
    this.setupStoreSync();

    // Setup event listeners
    this.setupEventListeners();

    this.initialized = true;
    console.log('[SDKBridge] Initialized');
  }

  /**
   * Register custom RPC method handlers
   */
  private registerCustomHandlers(): void {
    // Account methods
    this.rpcHandler.register(StandardRPCMethods.ETH_ACCOUNTS, async () => {
      const account = get(currentAccount);
      return account ? [account.address] : [];
    });

    this.rpcHandler.register(StandardRPCMethods.ETH_REQUEST_ACCOUNTS, async () => {
      const account = get(currentAccount);
      if (!account) {
        throw {
          code: RPC_ERROR_CODES.UNAUTHORIZED,
          message: 'No account available'
        };
      }
      return [account.address];
    });

    // Chain methods
    this.rpcHandler.register(StandardRPCMethods.ETH_CHAIN_ID, async () => {
      const chain = get(currentChain);
      return chain ? `0x${chain.chainId.toString(16)}` : '0x1';
    });

    // Transaction methods
    this.rpcHandler.register(StandardRPCMethods.ETH_SEND_TRANSACTION, async (params) => {
      const [txRequest] = params;
      
      // Validate transaction request
      if (!txRequest.from || !txRequest.to) {
        throw {
          code: RPC_ERROR_CODES.INVALID_PARAMS,
          message: 'Invalid transaction parameters'
        };
      }

      // TODO: Integrate with actual transaction manager
      // For now, return a mock transaction hash
      console.log('[SDKBridge] Transaction request:', txRequest);
      return '0x' + '0'.repeat(64); // Mock transaction hash
    });

    // Signature methods
    this.rpcHandler.register(StandardRPCMethods.PERSONAL_SIGN, async (params) => {
      const [message, address] = params;
      
      // Request signature through wallet
      const signature = await this.requestSignature(address, message);
      return signature;
    });

    // YAKKL-specific methods
    this.rpcHandler.register(YAKKLRPCMethods.YAKKL_GET_PLAN, async () => {
      // For now, return default plan
      // TODO: Get actual plan from user profile or settings
      return {
        plan: 'explorer',
        features: ['basic', 'secure-recovery', 'multi-chain']
      };
    });

    this.rpcHandler.register(YAKKLRPCMethods.YAKKL_GET_SUPPORTED_CHAINS, async () => {
      // Return supported chains from wallet configuration
      return [
        { chainId: 1, name: 'Ethereum Mainnet' },
        { chainId: 137, name: 'Polygon' },
        { chainId: 42161, name: 'Arbitrum One' },
        { chainId: 10, name: 'Optimism' },
        { chainId: 8453, name: 'Base' },
        { chainId: 43114, name: 'Avalanche' },
        { chainId: 56, name: 'BNB Chain' }
      ];
    });

    this.rpcHandler.register(YAKKLRPCMethods.YAKKL_GET_VERSION, async () => {
      return {
        version: '2.0.2',
        build: 'stable',
        sdk: '1.0.0'
      };
    });
  }

  /**
   * Setup store synchronization
   */
  private setupStoreSync(): void {
    // Sync account changes
    currentAccount.subscribe(account => {
      if (account && this.provider) {
        this.eventBridge.send('*', 'accounts:changed', [account.address]);
      }
    });

    // Sync chain changes
    currentChain.subscribe(chain => {
      if (chain && this.provider) {
        const chainId = `0x${chain.chainId.toString(16)}`;
        this.eventBridge.send('*', 'chain:changed', chainId);
      }
    });

    // Sync wallet cache changes
    walletCacheStore.subscribe(cache => {
      if (cache && this.provider) {
        // Send wallet state update based on cache
        this.eventBridge.send('*', 'wallet:stateChanged', {
          hasAccounts: Object.keys(cache.chainAccountCache || {}).length > 0,
          networks: Object.keys(cache.chainAccountCache || {})
        });
      }
    });
  }

  /**
   * Setup event listeners for external events
   */
  private setupEventListeners(): void {
    if (!browser) return;

    // Listen for extension messages
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'RPC_REQUEST') {
          this.handleRPCRequest(request.data)
            .then(sendResponse)
            .catch(error => sendResponse({ error }));
          return true; // Keep channel open for async response
        }
      });
    }

    // Listen for window messages (for injected provider)
    window.addEventListener('message', async (event) => {
      if (event.data?.type === 'YAKKL_RPC_REQUEST') {
        const response = await this.handleRPCRequest(event.data.request);
        window.postMessage({
          type: 'YAKKL_RPC_RESPONSE',
          id: event.data.id,
          response
        }, '*');
      }
    });
  }

  /**
   * Handle RPC request
   */
  async handleRPCRequest(request: RPCRequest): Promise<RPCResponse> {
    console.log('[SDKBridge] Handling RPC request:', request.method);
    
    try {
      return await this.rpcHandler.handle(request);
    } catch (error) {
      console.error('[SDKBridge] RPC error:', error);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: RPC_ERROR_CODES.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Request signature from wallet
   */
  private async requestSignature(address: string, message: string): Promise<string> {
    // This would integrate with the wallet's signing manager
    // For now, return a placeholder
    console.log('[SDKBridge] Signature requested for:', address, message);
    
    // TODO: Integrate with actual signing manager
    return '0x' + '0'.repeat(130); // Placeholder signature
  }

  /**
   * Connect to dApp
   */
  async connectDApp(origin: string): Promise<string[]> {
    const account = get(currentAccount);
    if (!account) {
      throw new Error('No account available');
    }

    // Send connection message
    this.eventBridge.send('*', 'dapp:connected', { 
      origin, 
      account: account.address 
    });
    
    return [account.address];
  }

  /**
   * Disconnect from dApp
   */
  async disconnectDApp(origin: string): Promise<void> {
    this.eventBridge.send('*', 'dapp:disconnected', { origin });
  }

  /**
   * Get wallet info for SDK
   */
  getWalletInfo(): WalletInfo {
    return {
      name: 'YAKKL Wallet',
      icon: '/yakkl-icon.svg',
      description: 'The most secure and user-friendly crypto wallet',
      installed: true,
      provider: this.provider
    };
  }

  /**
   * Check if method is supported
   */
  isMethodSupported(method: string): boolean {
    return this.rpcHandler.isMethodSupported(method);
  }

  /**
   * Get supported methods
   */
  getSupportedMethods(): string[] {
    return this.rpcHandler.getSupportedMethods();
  }

  /**
   * Export provider for injection
   */
  getProvider(): YakklProvider | null {
    return this.provider;
  }

  /**
   * Export event bridge for external listeners
   */
  getEventBridge() {
    return this.eventBridge;
  }
}

// Create singleton instance
export const sdkBridge = new SDKBridge();

// Export convenience methods
export const connectDApp = (origin: string) => sdkBridge.connectDApp(origin);
export const disconnectDApp = (origin: string) => sdkBridge.disconnectDApp(origin);
export const handleRPCRequest = (request: RPCRequest) => sdkBridge.handleRPCRequest(request);
export const getWalletInfo = () => sdkBridge.getWalletInfo();
export const getSupportedMethods = () => sdkBridge.getSupportedMethods();
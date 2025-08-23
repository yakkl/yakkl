import { RPCProvider } from '../base/RPCProvider';

/**
 * Generic RPC Provider that works with any JSON-RPC endpoint
 * Supports BlockPI, public RPC endpoints, and any custom RPC URLs
 */
export class GenericRPCProvider extends RPCProvider {
  private customHeaders?: Record<string, string>;
  private authToken?: string;

  constructor(
    endpoint: string,
    chainId: number,
    blockchain: string = 'ethereum',
    options: {
      name?: string;
      supportedChainIds?: number[];
      timeout?: number;
      retries?: number;
      headers?: Record<string, string>;
      authToken?: string;
    } = {}
  ) {
    const {
      name = `RPC-${chainId}`,
      supportedChainIds = [chainId],
      timeout,
      retries,
      headers,
      authToken
    } = options;

    super(
      name,
      chainId,
      blockchain,
      supportedChainIds,
      endpoint,
      { timeout, retries }
    );

    this.customHeaders = headers;
    this.authToken = authToken;
  }

  /**
   * Factory method to create providers for popular RPC services
   */
  static createBlockPIProvider(
    chainId: number,
    apiKey?: string,
    blockchain: string = 'ethereum'
  ): GenericRPCProvider {
    const endpoints: Record<number, string> = {
      1: 'https://ethereum.blockpi.network/v1/rpc',
      137: 'https://polygon.blockpi.network/v1/rpc',
      56: 'https://bsc.blockpi.network/v1/rpc',
      43114: 'https://avalanche.blockpi.network/v1/rpc',
      250: 'https://fantom.blockpi.network/v1/rpc',
      42161: 'https://arbitrum.blockpi.network/v1/rpc',
      10: 'https://optimism.blockpi.network/v1/rpc',
      8453: 'https://base.blockpi.network/v1/rpc'
    };

    const baseEndpoint = endpoints[chainId];
    if (!baseEndpoint) {
      throw new Error(`BlockPI does not support chain ID ${chainId}`);
    }

    const endpoint = apiKey ? `${baseEndpoint}/${apiKey}` : baseEndpoint;
    const name = `BlockPI-${chainId}`;

    return new GenericRPCProvider(endpoint, chainId, blockchain, {
      name,
      supportedChainIds: [chainId],
      headers: {
        'User-Agent': 'YAKKL-SDK/1.0.0'
      }
    });
  }

  /**
   * Factory method for LlamaRPC endpoints
   */
  static createLlamaRPCProvider(
    chainId: number,
    blockchain: string = 'ethereum'
  ): GenericRPCProvider {
    const endpoints: Record<number, string> = {
      1: 'https://eth.llamarpc.com',
      137: 'https://polygon.llamarpc.com',
      56: 'https://binance.llamarpc.com',
      43114: 'https://avalanche.llamarpc.com',
      250: 'https://fantom.llamarpc.com',
      42161: 'https://arbitrum.llamarpc.com',
      10: 'https://optimism.llamarpc.com',
      8453: 'https://base.llamarpc.com'
    };

    const endpoint = endpoints[chainId];
    if (!endpoint) {
      throw new Error(`LlamaRPC does not support chain ID ${chainId}`);
    }

    return new GenericRPCProvider(endpoint, chainId, blockchain, {
      name: `LlamaRPC-${chainId}`,
      supportedChainIds: [chainId],
      headers: {
        'User-Agent': 'YAKKL-SDK/1.0.0'
      }
    });
  }

  /**
   * Factory method for Ankr endpoints
   */
  static createAnkrProvider(
    chainId: number,
    apiKey?: string,
    blockchain: string = 'ethereum'
  ): GenericRPCProvider {
    const endpoints: Record<number, string> = {
      1: 'https://rpc.ankr.com/eth',
      137: 'https://rpc.ankr.com/polygon',
      56: 'https://rpc.ankr.com/bsc',
      43114: 'https://rpc.ankr.com/avalanche',
      250: 'https://rpc.ankr.com/fantom',
      42161: 'https://rpc.ankr.com/arbitrum',
      10: 'https://rpc.ankr.com/optimism',
      8453: 'https://rpc.ankr.com/base'
    };

    const baseEndpoint = endpoints[chainId];
    if (!baseEndpoint) {
      throw new Error(`Ankr does not support chain ID ${chainId}`);
    }

    const endpoint = apiKey ? `${baseEndpoint}/${apiKey}` : baseEndpoint;

    return new GenericRPCProvider(endpoint, chainId, blockchain, {
      name: `Ankr-${chainId}`,
      supportedChainIds: [chainId],
      headers: {
        'User-Agent': 'YAKKL-SDK/1.0.0'
      }
    });
  }

  /**
   * Factory method for custom RPC endpoints
   */
  static createCustomProvider(
    endpoint: string,
    chainId: number,
    blockchain: string = 'ethereum',
    options: {
      name?: string;
      headers?: Record<string, string>;
      authToken?: string;
      timeout?: number;
      retries?: number;
    } = {}
  ): GenericRPCProvider {
    return new GenericRPCProvider(endpoint, chainId, blockchain, {
      name: options.name || `Custom-${chainId}`,
      ...options
    });
  }

  /**
   * Override HTTP request to include custom headers and auth
   */
  protected async makeHttpRequest(payload: object): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.customHeaders
      };

      // Add auth token if provided
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const response = await fetch(this._endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * Update endpoint URL (useful for API key rotation or endpoint switching)
   */
  updateEndpoint(newEndpoint: string): void {
    this._endpoint = newEndpoint;
  }

  /**
   * Update custom headers
   */
  updateHeaders(headers: Record<string, string>): void {
    this.customHeaders = { ...this.customHeaders, ...headers };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get provider configuration for debugging
   */
  getConfig(): {
    name: string;
    endpoint: string;
    chainId: number;
    blockchain: string;
    hasAuth: boolean;
    customHeaders: boolean;
  } {
    return {
      name: this.name,
      endpoint: this._endpoint,
      chainId: this.chainId,
      blockchain: this.blockchain,
      hasAuth: !!this.authToken,
      customHeaders: !!this.customHeaders && Object.keys(this.customHeaders).length > 0
    };
  }
}

/**
 * Utility function to detect RPC endpoint type
 */
export function detectRPCProvider(endpoint: string): {
  provider: 'alchemy' | 'infura' | 'blockpi' | 'ankr' | 'llamarpc' | 'quicknode' | 'custom';
  requiresAuth: boolean;
  supportedFeatures: string[];
} {
  const url = endpoint.toLowerCase();
  
  if (url.includes('alchemy.com')) {
    return {
      provider: 'alchemy',
      requiresAuth: true,
      supportedFeatures: ['archive', 'trace', 'websocket', 'nft', 'enhanced']
    };
  }
  
  if (url.includes('infura.io')) {
    return {
      provider: 'infura',
      requiresAuth: true,
      supportedFeatures: ['archive', 'websocket', 'ipfs']
    };
  }
  
  if (url.includes('blockpi.network')) {
    return {
      provider: 'blockpi',
      requiresAuth: false, // Optional API key
      supportedFeatures: ['archive']
    };
  }
  
  if (url.includes('ankr.com')) {
    return {
      provider: 'ankr',
      requiresAuth: false, // Optional API key
      supportedFeatures: ['archive', 'multichain']
    };
  }
  
  if (url.includes('llamarpc.com')) {
    return {
      provider: 'llamarpc',
      requiresAuth: false,
      supportedFeatures: ['basic']
    };
  }
  
  if (url.includes('quicknode.pro')) {
    return {
      provider: 'quicknode',
      requiresAuth: true,
      supportedFeatures: ['archive', 'trace', 'websocket', 'analytics']
    };
  }
  
  return {
    provider: 'custom',
    requiresAuth: false,
    supportedFeatures: ['basic']
  };
}
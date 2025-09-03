/**
 * RPC Handler
 * Processes RPC requests and routes to appropriate handlers
 */

import {
  StandardRPCMethods,
  YAKKLRPCMethods,
  RPCRequest,
  RPCResponse,
  RPCError,
  RPC_ERROR_CODES
} from './RPCMethods';

export type RPCHandlerFunction = (params: any) => Promise<any>;

export class RPCHandler {
  private handlers: Map<string, RPCHandlerFunction> = new Map();
  private middleware: Array<(req: RPCRequest) => Promise<void>> = [];

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register default RPC handlers
   */
  private registerDefaultHandlers(): void {
    // Account methods
    this.register(StandardRPCMethods.ETH_ACCOUNTS, async () => {
      // Return empty array if not connected
      return [];
    });

    this.register(StandardRPCMethods.ETH_REQUEST_ACCOUNTS, async () => {
      // Request account access
      throw this.createError(
        RPC_ERROR_CODES.UNAUTHORIZED,
        'User must authorize account access'
      );
    });

    // Chain methods
    this.register(StandardRPCMethods.ETH_CHAIN_ID, async () => {
      return '0x1'; // Default to mainnet
    });

    // YAKKL-specific methods
    this.register(YAKKLRPCMethods.YAKKL_GET_VERSION, async () => {
      return { version: '2.0.0', build: 'stable' };
    });

    this.register(YAKKLRPCMethods.YAKKL_GET_FEATURES, async () => {
      return [
        'multi-chain',
        'hardware-wallet',
        'defi-swaps',
        'nft-support',
        'emergency-kit'
      ];
    });
  }

  /**
   * Register RPC method handler
   */
  register(method: string, handler: RPCHandlerFunction): void {
    this.handlers.set(method, handler);
  }

  /**
   * Unregister RPC method handler
   */
  unregister(method: string): void {
    this.handlers.delete(method);
  }

  /**
   * Add middleware
   */
  use(middleware: (req: RPCRequest) => Promise<void>): void {
    this.middleware.push(middleware);
  }

  /**
   * Handle RPC request
   */
  async handle(request: RPCRequest): Promise<RPCResponse> {
    try {
      // Validate request
      this.validateRequest(request);

      // Run middleware
      for (const mw of this.middleware) {
        await mw(request);
      }

      // Get handler
      const handler = this.handlers.get(request.method);
      if (!handler) {
        throw this.createError(
          RPC_ERROR_CODES.METHOD_NOT_FOUND,
          `Method "${request.method}" not found`
        );
      }

      // Execute handler
      const result = await handler(request.params);

      // Return response
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } catch (error: any) {
      // Return error response
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Handle batch requests
   */
  async handleBatch(requests: RPCRequest[]): Promise<RPCResponse[]> {
    return Promise.all(requests.map(req => this.handle(req)));
  }

  /**
   * Validate RPC request
   */
  private validateRequest(request: RPCRequest): void {
    if (!request.jsonrpc || request.jsonrpc !== '2.0') {
      throw this.createError(
        RPC_ERROR_CODES.INVALID_REQUEST,
        'Invalid JSON-RPC version'
      );
    }

    if (!request.method || typeof request.method !== 'string') {
      throw this.createError(
        RPC_ERROR_CODES.INVALID_REQUEST,
        'Method is required'
      );
    }

    if (request.id === undefined || request.id === null) {
      throw this.createError(
        RPC_ERROR_CODES.INVALID_REQUEST,
        'ID is required'
      );
    }
  }

  /**
   * Create RPC error
   */
  private createError(code: number, message: string, data?: any): RPCError {
    return { code, message, data };
  }

  /**
   * Format error for response
   */
  private formatError(error: any): RPCError {
    if (error.code && error.message) {
      return error;
    }

    return {
      code: RPC_ERROR_CODES.INTERNAL_ERROR,
      message: error.message || 'Internal error',
      data: error.data
    };
  }

  /**
   * Check if method is supported
   */
  isMethodSupported(method: string): boolean {
    return this.handlers.has(method);
  }

  /**
   * Get supported methods
   */
  getSupportedMethods(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Create preconfigured RPC handler for YAKKL wallet
 */
export function createYAKKLRPCHandler(): RPCHandler {
  const handler = new RPCHandler();

  // Add YAKKL-specific handlers
  handler.register(YAKKLRPCMethods.YAKKL_GET_PLAN, async () => {
    return { plan: 'explorer', features: ['basic'] };
  });

  handler.register(YAKKLRPCMethods.YAKKL_GET_SUPPORTED_CHAINS, async () => {
    return [
      { chainId: 1, name: 'Ethereum Mainnet' },
      { chainId: 137, name: 'Polygon' },
      { chainId: 42161, name: 'Arbitrum One' },
      { chainId: 10, name: 'Optimism' },
      { chainId: 8453, name: 'Base' }
    ];
  });

  // Add logging middleware
  handler.use(async (request) => {
    console.log(`[RPC] ${request.method}`, request.params);
  });

  return handler;
}
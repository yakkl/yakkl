/**
 * RPC Handler
 * Processes RPC requests and routes to appropriate handlers
 */
import { RPCRequest, RPCResponse } from './RPCMethods';
export type RPCHandlerFunction = (params: any) => Promise<any>;
export declare class RPCHandler {
    private handlers;
    private middleware;
    constructor();
    /**
     * Register default RPC handlers
     */
    private registerDefaultHandlers;
    /**
     * Register RPC method handler
     */
    register(method: string, handler: RPCHandlerFunction): void;
    /**
     * Unregister RPC method handler
     */
    unregister(method: string): void;
    /**
     * Add middleware
     */
    use(middleware: (req: RPCRequest) => Promise<void>): void;
    /**
     * Handle RPC request
     */
    handle(request: RPCRequest): Promise<RPCResponse>;
    /**
     * Handle batch requests
     */
    handleBatch(requests: RPCRequest[]): Promise<RPCResponse[]>;
    /**
     * Validate RPC request
     */
    private validateRequest;
    /**
     * Create RPC error
     */
    private createError;
    /**
     * Format error for response
     */
    private formatError;
    /**
     * Check if method is supported
     */
    isMethodSupported(method: string): boolean;
    /**
     * Get supported methods
     */
    getSupportedMethods(): string[];
}
/**
 * Create preconfigured RPC handler for YAKKL wallet
 */
export declare function createYAKKLRPCHandler(): RPCHandler;

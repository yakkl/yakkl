/**
 * Message Router Implementation
 * Routes messages to appropriate handlers based on patterns
 */
import type { IMessageRouter, MessageEnvelope, MessageMiddleware } from '../interfaces/messaging-enhanced.interface';
import type { MessageHandler } from '../interfaces/messaging.interface';
/**
 * Message router implementation
 */
export declare class MessageRouter implements IMessageRouter {
    private routes;
    private middlewares;
    private defaultHandler?;
    /**
     * Route a message to appropriate handler
     */
    route(message: MessageEnvelope): Promise<void>;
    /**
     * Register a route handler
     */
    registerRoute(pattern: string | RegExp, handler: MessageHandler): void;
    /**
     * Unregister a route
     */
    unregisterRoute(pattern: string | RegExp): void;
    /**
     * Set default handler for unmatched routes
     */
    setDefaultHandler(handler: MessageHandler): void;
    /**
     * Add middleware
     */
    use(middleware: MessageMiddleware): void;
    /**
     * Get all registered routes
     */
    getRoutes(): Map<string | RegExp, MessageHandler>;
    /**
     * Find handler for channel
     */
    private findHandler;
    /**
     * Match wildcard pattern
     */
    private matchPattern;
    /**
     * Run before middleware
     */
    private runMiddleware;
    /**
     * Run after middleware
     */
    private runAfterMiddleware;
    /**
     * Run error middleware
     */
    private runErrorMiddleware;
    /**
     * Clear all routes and middleware
     */
    clear(): void;
}
/**
 * Create a new message router
 */
export declare function createMessageRouter(): MessageRouter;
/**
 * Logging middleware
 */
export declare const loggingMiddleware: MessageMiddleware;
/**
 * Validation middleware factory
 */
export declare function createValidationMiddleware(validator: (message: MessageEnvelope) => boolean): MessageMiddleware;
/**
 * Rate limiting middleware factory
 */
export declare function createRateLimitMiddleware(maxRequests: number, windowMs: number): MessageMiddleware;
/**
 * Retry middleware factory
 */
export declare function createRetryMiddleware(maxRetries?: number, retryDelay?: number): MessageMiddleware;
//# sourceMappingURL=MessageRouter.d.ts.map
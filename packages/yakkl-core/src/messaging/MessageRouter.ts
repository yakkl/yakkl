/**
 * Message Router Implementation
 * Routes messages to appropriate handlers based on patterns
 */

import type {
  IMessageRouter,
  MessageEnvelope,
  MessageMiddleware
} from '../interfaces/messaging-enhanced.interface';
import type { MessageHandler } from '../interfaces/messaging.interface';

/**
 * Message router implementation
 */
export class MessageRouter implements IMessageRouter {
  private routes: Map<string | RegExp, MessageHandler> = new Map();
  private middlewares: MessageMiddleware[] = [];
  private defaultHandler?: MessageHandler;

  /**
   * Route a message to appropriate handler
   */
  async route(message: MessageEnvelope): Promise<void> {
    try {
      // Run before middleware
      await this.runMiddleware('before', message);

      // Find matching handler
      const handler = this.findHandler(message.channel);
      
      if (!handler) {
        if (this.defaultHandler) {
          await this.defaultHandler(message);
        } else {
          throw new Error(`No handler found for channel: ${message.channel}`);
        }
        return;
      }

      // Execute handler
      const response = await handler(message);

      // Run after middleware
      await this.runAfterMiddleware(message, response);

      return response;
    } catch (error) {
      // Run error middleware
      await this.runErrorMiddleware(error as Error, message);
      throw error;
    }
  }

  /**
   * Register a route handler
   */
  registerRoute(pattern: string | RegExp, handler: MessageHandler): void {
    this.routes.set(pattern, handler);
  }

  /**
   * Unregister a route
   */
  unregisterRoute(pattern: string | RegExp): void {
    this.routes.delete(pattern);
  }

  /**
   * Set default handler for unmatched routes
   */
  setDefaultHandler(handler: MessageHandler): void {
    this.defaultHandler = handler;
  }

  /**
   * Add middleware
   */
  use(middleware: MessageMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Get all registered routes
   */
  getRoutes(): Map<string | RegExp, MessageHandler> {
    return new Map(this.routes);
  }

  /**
   * Find handler for channel
   */
  private findHandler(channel: string): MessageHandler | undefined {
    // Exact match
    if (this.routes.has(channel)) {
      return this.routes.get(channel);
    }

    // Pattern match
    for (const [pattern, handler] of this.routes) {
      if (pattern instanceof RegExp && pattern.test(channel)) {
        return handler;
      }
      if (typeof pattern === 'string' && this.matchPattern(pattern, channel)) {
        return handler;
      }
    }

    return undefined;
  }

  /**
   * Match wildcard pattern
   */
  private matchPattern(pattern: string, channel: string): boolean {
    // Convert wildcard pattern to regex
    const regex = new RegExp(
      '^' + pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') + '$'
    );
    return regex.test(channel);
  }

  /**
   * Run before middleware
   */
  private async runMiddleware(
    phase: 'before',
    message: MessageEnvelope
  ): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.before) {
        await new Promise<void>((resolve, reject) => {
          middleware.before!(message, async () => {
            resolve();
          }).catch(reject);
        });
      }
    }
  }

  /**
   * Run after middleware
   */
  private async runAfterMiddleware(
    message: MessageEnvelope,
    response: any
  ): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.after) {
        await new Promise<void>((resolve, reject) => {
          middleware.after!(message, response, async () => {
            resolve();
          }).catch(reject);
        });
      }
    }
  }

  /**
   * Run error middleware
   */
  private async runErrorMiddleware(
    error: Error,
    message: MessageEnvelope
  ): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.error) {
        await new Promise<void>((resolve, reject) => {
          middleware.error!(error, message, async () => {
            resolve();
          }).catch(reject);
        });
      }
    }
  }

  /**
   * Clear all routes and middleware
   */
  clear(): void {
    this.routes.clear();
    this.middlewares = [];
    this.defaultHandler = undefined;
  }
}

/**
 * Create a new message router
 */
export function createMessageRouter(): MessageRouter {
  return new MessageRouter();
}

/**
 * Logging middleware
 */
export const loggingMiddleware: MessageMiddleware = {
  name: 'logging',
  before: async (message, next) => {
    console.log(`[MessageRouter] Routing message:`, {
      channel: message.channel,
      type: message.type,
      id: message.id
    });
    await next();
  },
  after: async (message, response, next) => {
    console.log(`[MessageRouter] Message handled:`, {
      channel: message.channel,
      hasResponse: response !== undefined
    });
    await next();
  },
  error: async (error, message, next) => {
    console.error(`[MessageRouter] Error handling message:`, {
      channel: message.channel,
      error: error.message
    });
    await next();
  }
};

/**
 * Validation middleware factory
 */
export function createValidationMiddleware(
  validator: (message: MessageEnvelope) => boolean
): MessageMiddleware {
  return {
    name: 'validation',
    before: async (message, next) => {
      if (!validator(message)) {
        throw new Error(`Message validation failed for channel: ${message.channel}`);
      }
      await next();
    }
  };
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(
  maxRequests: number,
  windowMs: number
): MessageMiddleware {
  const requests = new Map<string, number[]>();

  return {
    name: 'rate-limit',
    before: async (message, next) => {
      const key = message.sender?.id || 'anonymous';
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get existing requests
      let timestamps = requests.get(key) || [];
      
      // Filter out old requests
      timestamps = timestamps.filter(t => t > windowStart);
      
      // Check rate limit
      if (timestamps.length >= maxRequests) {
        throw new Error(`Rate limit exceeded for ${key}`);
      }

      // Add current request
      timestamps.push(now);
      requests.set(key, timestamps);

      await next();
    }
  };
}

/**
 * Retry middleware factory
 */
export function createRetryMiddleware(
  maxRetries: number = 3,
  retryDelay: number = 1000
): MessageMiddleware {
  return {
    name: 'retry',
    error: async (error, message, next) => {
      const retryCount = message.retryCount || 0;
      
      if (retryCount < maxRetries) {
        console.log(`[Retry] Retrying message (${retryCount + 1}/${maxRetries}):`, message.channel);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        
        // Update retry count
        message.retryCount = retryCount + 1;
        
        // Re-throw to trigger retry
        throw error;
      }
      
      await next();
    }
  };
}
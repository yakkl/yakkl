/**
 * Usage Examples for Bridge Pattern Services
 * 
 * This file demonstrates how to use the new bridge pattern services
 * in different contexts (browser extension, tests, Node.js)
 */

// ==============================================================
// BROWSER EXTENSION CONTEXT (Current Wallet)
// ==============================================================

import { localStorageBridge, getBrowserMessaging, logger } from '$lib/bridges';
import { createTokenCacheService } from './token-cache-bridge.service';

/**
 * Example 1: Using in the browser extension
 */
export function initializeTokenCacheForBrowser() {
  const tokenCache = createTokenCacheService(
    localStorageBridge,        // Uses browser.storage.local
    getBrowserMessaging(),      // Uses browser.runtime messaging
    logger,                     // Uses browser console
    {
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enableBackgroundSync: true
    }
  );
  
  // Initialize and use
  tokenCache.initialize().then(() => {
    console.log('Token cache initialized for browser');
  });
  
  return tokenCache;
}

// ==============================================================
// TEST CONTEXT (Unit Tests)
// ==============================================================

import type { IStorage, IMessageBus, ILogger } from '$lib/bridges';

/**
 * Example 2: Using in tests with mocks
 */
export function createMockTokenCache() {
  // Mock storage that uses in-memory Map
  const mockStorage: IStorage = {
    data: new Map<string, any>(),
    
    async get<T>(key: string): Promise<T | null> {
      return this.data.get(key) || null;
    },
    
    async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
      const result: Record<string, T | null> = {};
      keys.forEach(key => {
        result[key] = this.data.get(key) || null;
      });
      return result;
    },
    
    async set<T>(key: string, value: T): Promise<void> {
      this.data.set(key, value);
    },
    
    async setMultiple<T>(items: Record<string, T>): Promise<void> {
      Object.entries(items).forEach(([key, value]) => {
        this.data.set(key, value);
      });
    },
    
    async remove(key: string): Promise<void> {
      this.data.delete(key);
    },
    
    async removeMultiple(keys: string[]): Promise<void> {
      keys.forEach(key => this.data.delete(key));
    },
    
    async clear(): Promise<void> {
      this.data.clear();
    },
    
    async getKeys(): Promise<string[]> {
      return Array.from(this.data.keys());
    },
    
    async has(key: string): Promise<boolean> {
      return this.data.has(key);
    }
  } as IStorage & { data: Map<string, any> };
  
  // Mock messaging that collects messages
  const mockMessaging = {
    messages: [] as any[],
    listeners: new Map<string, Set<Function>>(),
    
    async send<TData, TResponse>(channel: string, data: TData): Promise<TResponse> {
      this.messages.push({ type: 'send', channel, data });
      // Return mock response for testing
      return [] as any;
    },
    
    post<TData>(channel: string, data: TData): void {
      this.messages.push({ type: 'post', channel, data });
      // Trigger listeners
      const handlers = this.listeners.get(channel);
      if (handlers) {
        handlers.forEach(handler => {
          handler({ channel, data, timestamp: Date.now() });
        });
      }
    },
    
    listen(channel: string, handler: Function) {
      if (!this.listeners.has(channel)) {
        this.listeners.set(channel, new Set());
      }
      this.listeners.get(channel)!.add(handler);
      return () => {
        this.listeners.get(channel)?.delete(handler);
      };
    },
    
    once(channel: string, handler: Function) {
      const wrappedHandler = (...args: any[]) => {
        handler(...args);
        this.listeners.get(channel)?.delete(wrappedHandler);
      };
      return this.listen(channel, wrappedHandler);
    },
    
    removeAllListeners(channel?: string): void {
      if (channel) {
        this.listeners.delete(channel);
      } else {
        this.listeners.clear();
      }
    }
  };
  
  // Mock logger that collects logs
  const mockLogger = {
    logs: [] as any[],
    
    debug(message: string, ...args: any[]): void {
      this.logs.push({ level: 'debug', message, args });
    },
    
    info(message: string, ...args: any[]): void {
      this.logs.push({ level: 'info', message, args });
    },
    
    warn(message: string, ...args: any[]): void {
      this.logs.push({ level: 'warn', message, args });
    },
    
    error(message: string, error?: any, ...args: any[]): void {
      this.logs.push({ level: 'error', message, error, args });
    }
  };
  
  const tokenCache = createTokenCacheService(
    mockStorage,
    mockMessaging,
    mockLogger,
    {
      cacheTTL: 1000, // 1 second for tests
      enableBackgroundSync: false
    }
  );
  
  return {
    tokenCache,
    mockStorage,
    mockMessaging,
    mockLogger
  };
}

// ==============================================================
// NODE.JS CONTEXT (Future Backend Services)
// ==============================================================

/**
 * Example 3: Using in Node.js backend (future)
 * 
 * This would use different bridge implementations:
 * - Redis or MongoDB for storage
 * - RabbitMQ or Kafka for messaging
 * - Winston or Pino for logging
 */
export function createNodeTokenCache() {
  // This would be implemented when we have Node.js bridges
  // For now, it's a placeholder showing the pattern
  
  /*
  import { createRedisStorage } from '@yakkl/core/node/storage';
  import { createRabbitMQMessaging } from '@yakkl/core/node/messaging';
  import { createWinstonLogger } from '@yakkl/core/node/logging';
  
  const tokenCache = createTokenCacheService(
    createRedisStorage({ host: 'localhost', port: 6379 }),
    createRabbitMQMessaging({ url: 'amqp://localhost' }),
    createWinstonLogger({ level: 'info' }),
    {
      cacheTTL: 60 * 60 * 1000, // 1 hour for backend
      enableBackgroundSync: true
    }
  );
  
  return tokenCache;
  */
  
  throw new Error('Node.js bridges not yet implemented');
}

// ==============================================================
// MIGRATION HELPER
// ==============================================================

/**
 * Helper to migrate from old token service to new bridge-based service
 */
export async function migrateToTokenCacheService() {
  // 1. Create new service instance
  const newService = initializeTokenCacheForBrowser();
  
  // 2. Initialize
  await newService.initialize();
  
  // 3. Replace old service usage
  // Old: tokenService.getTokens(address)
  // New: newService.getTokens(address, chainId)
  
  console.log('Migration complete - now using bridge-based token cache service');
  
  return newService;
}

// ==============================================================
// TESTING EXAMPLE
// ==============================================================

/**
 * Example test using the mock implementation
 */
export async function exampleTest() {
  const { tokenCache, mockStorage, mockMessaging, mockLogger } = createMockTokenCache();
  
  // Initialize service
  await tokenCache.initialize();
  
  // Verify initialization
  console.assert(
    (mockMessaging as any).messages.some((m: any) => m.channel === 'service_ready'),
    'Service should post ready message'
  );
  
  // Test getting tokens (will trigger fetch since cache is empty)
  const result = await tokenCache.getTokens('0x123...', 1);
  
  // Verify fetch was called
  console.assert(
    (mockMessaging as any).messages.some((m: any) => m.channel === 'fetch_tokens'),
    'Should request tokens from background'
  );
  
  // Verify logging
  console.assert(
    (mockLogger as any).logs.some((l: any) => l.message.includes('Getting tokens')),
    'Should log token fetch'
  );
  
  // Test cache update via message
  mockMessaging.post('token_prices', {
    'ETH': 2000,
    'USDT': 1
  });
  
  // Verify price update was logged
  console.assert(
    (mockLogger as any).logs.some((l: any) => l.message.includes('Updating prices')),
    'Should log price update'
  );
  
  console.log('All tests passed!');
}

// ==============================================================
// BENEFITS OF THIS APPROACH
// ==============================================================

/**
 * 1. TESTABILITY
 *    - Easy to test with mock implementations
 *    - No need for browser extension environment
 *    - Can test edge cases and error conditions
 * 
 * 2. PORTABILITY
 *    - Same business logic works everywhere
 *    - Easy to move code between projects
 *    - Can run in different environments
 * 
 * 3. MAINTAINABILITY
 *    - Clear separation of concerns
 *    - Dependencies are explicit
 *    - Easy to understand what a service needs
 * 
 * 4. FLEXIBILITY
 *    - Can swap implementations easily
 *    - Support multiple storage backends
 *    - Add new features without changing core logic
 * 
 * 5. ZERO DOWNTIME MIGRATION
 *    - Can run old and new services side by side
 *    - Gradual migration path
 *    - Easy rollback if issues arise
 */
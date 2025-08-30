/**
 * Browser Bridge Implementations
 * 
 * These bridges implement the platform-agnostic interfaces from @yakkl/core
 * using browser-specific APIs (browser.storage, browser.runtime, etc.)
 * 
 * This pattern allows the same business logic to run in different environments
 * by swapping out the implementation layer.
 */

// Storage Bridge
export {
  BrowserStorageBridge,
  createBrowserStorage,
  localStorageBridge,
  syncStorageBridge
} from './storage.bridge';

// Messaging Bridge
export {
  BrowserMessagingBridge,
  createBrowserMessaging,
  getBrowserMessaging
} from './messaging.bridge';

// Logger Bridge
export {
  BrowserLoggerBridge,
  BrowserStorageTransport,
  createBrowserLogger,
  logger,
  persistentLogger,
  LogLevel
} from './logger.bridge';

// Re-export types from @yakkl/core for convenience
export type { 
  IStorage,
  IMessageBus,
  Message,
  MessageHandler,
  MessageOptions,
  MessageSender,
  UnsubscribeFn,
  ILogger,
  LogEntry,
  LoggerConfig,
  LogTransport
} from '@yakkl/core';
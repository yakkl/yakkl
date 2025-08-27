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

// Type exports are now from the local bridge files until @yakkl/core is set up
export type { 
  IStorage
} from './storage.bridge';

export type {
  IMessageBus,
  Message,
  MessageHandler,
  MessageOptions,
  MessageSender,
  UnsubscribeFn
} from './messaging.bridge';

export type {
  ILogger,
  LogEntry,
  LoggerConfig,
  LogTransport
} from './logger.bridge';
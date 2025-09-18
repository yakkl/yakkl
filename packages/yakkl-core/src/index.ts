/**
 * YAKKL Core - Foundation wallet engine for all YAKKL products
 * 
 * This is the core that powers:
 * - Browser extension
 * - Embedded wallets  
 * - White label solutions
 * - Enterprise integrations
 * - Mobile apps (future)
 * - Desktop apps (future)
 */

// Core Engine
export { WalletEngine } from './engine/WalletEngine';
export { AccountManager } from './engine/AccountManager';
export { NetworkManager } from './engine/NetworkManager';
export { TransactionManager } from './engine/TransactionManager';

// Mod System
export { ModRegistry } from './mods/ModRegistry';
export { DiscoveryProtocol } from './mods/DiscoveryProtocol';
export { ModLoader } from './mods/ModLoader';

// Types
export type { 
  Mod, 
  ModManifest, 
  ModCapabilities,
  ModUI,
  ModBackground,
  ModStorage,
  ModCategory,
  ModPermission,
  ModAPI,
  ModComponent 
} from './mods/types';

export type {
  Account,
  Network,
  Transaction,
  Balance,
  WalletConfig,
  WalletRestriction,
  BrandingConfig
} from './engine/types';

// APIs
export { EmbeddedAPI } from './apis/EmbeddedAPI';
export { RemoteAPI } from './apis/RemoteAPI';
export { IntegrationAPI } from './apis/IntegrationAPI';

// Interfaces (browser-agnostic abstractions)
// Export everything from interfaces except the types that conflict with ./types
export {
  // Storage interfaces
  type IStorage,
  type IStorageBackup,
  // Messaging interfaces
  type IMessageBus,
  type Message,
  type MessageOptions,
  type MessageHandler,
  type MessageSender,
  type MessageMiddleware,
  type IMessageRouter,
  type MessageEnvelope,
  type UnsubscribeFn,
  MessageType,
  // Logger interfaces
  type ILogger,
  type LogEntry,
  type LoggerConfig,
  type LogTransport,
  LogLevel,
  // Network interfaces
  type NetworkInfo,
  type NetworkProvider,
  type JsonRpcRequest,
  type JsonRpcResponse,
  // Wallet interfaces
  type TransactionSignRequest,
  type SignatureRequest,
  type SignatureResult,
  type NetworkConfig,
  // Token interfaces
  type Token,
  type TokenBalance,
  type TokenMetadata,
  type TokenTransfer,
  // Service interfaces
  type IService,
  type ServiceHealth,
  type IntervalConfig,
  type CacheConfig,
  // Crypto interfaces
  type IKeystore,
  type EncryptionOptions,
  type KeyDerivationOptions,
  type SignatureType,
  // Provider interfaces - export these explicitly
  type ProviderInterface,
  type EVMProviderInterface,
  type BitcoinProviderInterface,
  type SolanaProviderInterface,
  type ProviderFactoryInterface,
  type MultiProviderManagerInterface,
  // Legacy aliases for backward compatibility
  type ProviderInterface as IBlockchainProvider,
  type MultiProviderManagerInterface as IMultiProviderManager,
  type ChainInfo,
  ChainType, // Enum, not a type
  type ProviderConfig,
  type ProviderMetadata,
  type ProviderCostMetrics,
  type ProviderHealthMetrics,
  type Block,
  type BlockWithTransactions,
  type BlockTag,
  type TransactionRequest,
  type TransactionResponse,
  type TransactionReceipt,
  type FeeData,
  type Log,
  type Filter,
  type UTXO,
  type Output,
  type ProviderEvents,
  // Transaction interfaces
  type ITransaction,
  type SignedTransaction,
  type ITransactionSigner,
  type TransactionCategory,
  // Cache interfaces
  type ICache,
  type ICacheConfig,
  type ICacheEntry,
  type ICacheStats,
  // State interfaces
  type IState,
  type StateSubscriber,
  type StateValue,
  type StateOptions
} from './interfaces';

// Core Types - export everything except conflicting provider types
export {
  // Re-export types but skip the ones already in interfaces
  type Address,
  type HexString,
  type BytesLike,
  type Numeric,
  ChainId,
  type Timestamp,
  type Milliseconds,
  type ErrorBody,
  type Result,
  type AsyncResult,
  type TokenInfo,
  type PaginationParams,
  type PaginatedResponse,
  // Enums
  SystemTheme,
  AccountTypeCategory,
  AccountTypeStatus,
  RegisteredType,
  TransactionStatus,
  SortDirection,
  Status,
  // Validation helpers
  isAddress,
  isHexString,
  isTransactionHash
} from './types';

// Re-export specific types from provider interfaces
export type {
  BigNumberish
} from './interfaces/provider.interface';

// Constants
export * from './constants';

// Utilities
export * from './utils';
export { createWallet } from './utils/factory';
export { validateMod } from './utils/validation';
export { Logger } from './utils/Logger';

// Providers
export * from './providers';

// Builders
export * from './builders';

// Dependency Injection
export * from './di';

// Services
export * from './services';

// Messaging
export * from './messaging';

// Storage
export * from './storage';

// State Management
export * from './state';
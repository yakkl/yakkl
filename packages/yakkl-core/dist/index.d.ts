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
export { WalletEngine } from './engine/WalletEngine';
export { AccountManager } from './engine/AccountManager';
export { NetworkManager } from './engine/NetworkManager';
export { TransactionManager } from './engine/TransactionManager';
export { ModRegistry } from './mods/ModRegistry';
export { DiscoveryProtocol } from './mods/DiscoveryProtocol';
export { ModLoader } from './mods/ModLoader';
export type { Mod, ModManifest, ModCapabilities, ModUI, ModBackground, ModStorage, ModCategory, ModPermission, ModAPI, ModComponent } from './mods/types';
export type { Account, Network, Transaction, Balance, WalletConfig, WalletRestriction, BrandingConfig } from './engine/types';
export { EmbeddedAPI } from './apis/EmbeddedAPI';
export { RemoteAPI } from './apis/RemoteAPI';
export { IntegrationAPI } from './apis/IntegrationAPI';
export { type IStorage, type IStorageBackup, type IMessageBus, type Message, type MessageOptions, type MessageHandler, type MessageSender, type MessageMiddleware, type IMessageRouter, type MessageEnvelope, type UnsubscribeFn, MessageType, type ILogger, type LogEntry, type LoggerConfig, type LogTransport, LogLevel, type NetworkInfo, type NetworkProvider, type JsonRpcRequest, type JsonRpcResponse, type TransactionSignRequest, type SignatureRequest, type SignatureResult, type NetworkConfig, type Token, type TokenBalance, type TokenMetadata, type TokenTransfer, type IService, type ServiceHealth, type IntervalConfig, type CacheConfig, type IKeystore, type EncryptionOptions, type KeyDerivationOptions, type SignatureType, type ProviderInterface, type EVMProviderInterface, type BitcoinProviderInterface, type SolanaProviderInterface, type ProviderFactoryInterface, type MultiProviderManagerInterface, type ProviderInterface as IBlockchainProvider, type MultiProviderManagerInterface as IMultiProviderManager, type ChainInfo, ChainType, // Enum, not a type
type ProviderConfig, type ProviderMetadata, type ProviderCostMetrics, type ProviderHealthMetrics, type Block, type BlockWithTransactions, type BlockTag, type TransactionRequest, type TransactionResponse, type TransactionReceipt, type FeeData, type Log, type Filter, type UTXO, type Output, type ProviderEvents, type ITransaction, type SignedTransaction, type ITransactionSigner, type TransactionCategory, type ICache, type ICacheConfig, type ICacheEntry, type ICacheStats, type IState, type StateSubscriber, type StateValue, type StateOptions } from './interfaces';
export { type Address, type HexString, type BytesLike, type Numeric, ChainId, type Timestamp, type Milliseconds, type ErrorBody, type Result, type AsyncResult, type TokenInfo, type PaginationParams, type PaginatedResponse, SystemTheme, AccountTypeCategory, AccountTypeStatus, RegisteredType, TransactionStatus, SortDirection, Status, isAddress, isHexString, isTransactionHash } from './types';
export type { BigNumberish } from './interfaces/provider.interface';
export * from './constants';
export * from './utils';
export { createWallet } from './utils/factory';
export { validateMod } from './utils/validation';
export { Logger } from './utils/Logger';
export * from './providers';
export * from './builders';
export * from './di';
export * from './services';
export * from './messaging';
export * from './storage';
export * from './state';
//# sourceMappingURL=index.d.ts.map
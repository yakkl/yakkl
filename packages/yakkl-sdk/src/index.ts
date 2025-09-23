/**
 * YAKKL SDK - Integration tools for developers
 * 
 * This SDK provides everything developers need to integrate YAKKL:
 * - Wallet client API
 * - RPC method handlers
 * - Embedded wallet components
 * - Mod development tools  
 * - White label solutions
 * - Enterprise integrations
 */

// Client API
export { WalletClient } from './client';
export type { 
  WalletClientConfig,
  WalletClientOptions,
  WalletAccount,
  WalletTransaction
} from './client';

// RPC Methods
export {
  StandardRPCMethods,
  YAKKLRPCMethods,
  RPC_ERROR_CODES,
  RPCHandler,
  createYAKKLRPCHandler
} from './rpc';
export type {
  RPCRequest,
  RPCResponse,
  RPCError,
  RPCMethodParams,
  RPCMethodReturns,
  RPCHandlerFunction
} from './rpc';

// Embedded Wallet SDK
export { EmbeddedWallet } from './embedded/EmbeddedWallet';
export { EmbeddedProvider } from './embedded/EmbeddedProvider';
export { createEmbeddedWallet } from './embedded/factory';

// Mod Development SDK
export { ModBuilder } from './mod/ModBuilder';
export { ModTemplate } from './mod/ModTemplate';
export { createMod, createModFromTemplate, modTemplates, generateModPackage } from './mod/factory';

// White Label SDK
export { WhiteLabelWallet } from './white-label/WhiteLabelWallet';
export { BrandingManager } from './white-label/BrandingManager';
export { 
  createWhiteLabelWallet, 
  createBrandingManager, 
  createQuickWhiteLabelWallet,
  createEnterpriseWhiteLabelWallet,
  whitelabelTemplates 
} from './white-label/factory';

// Integration Utilities
export { YakklProvider, createYakklProvider } from './integration/YakklProvider';
export { WalletConnector, createWalletConnector } from './integration/WalletConnector';
export { EventBridge, SecureChannel, createEventBridge } from './integration/EventBridge';

// Provider System
export { ProviderManager } from './providers/ProviderManager';
export { AlchemyProvider } from './providers/plugins/AlchemyProvider';
export type { ProviderConfig, BaseProvider } from './providers/ProviderInterface';

// Historical Pricing
export { HistoricalPriceService } from './historical-price/HistoricalPriceService';
export { CoinGeckoHistoricalProvider } from './historical-price/providers/CoinGeckoHistoricalProvider';
export { OnChainDEXProvider } from './historical-price/providers/OnChainDEXProvider';
export type { PricePoint, PriceRange, ProviderCapabilities } from './historical-price/HistoricalPriceService';

// Transaction Providers
export { AbstractTransactionProvider } from './providers/abstract/AbstractTransactionProvider';
export { AlchemyTransactionProvider } from './providers/alchemy/AlchemyTransactionProvider';
export { EtherscanTransactionProvider } from './providers/etherscan/EtherscanTransactionProvider';
export { InfuraTransactionProvider } from './providers/infura/InfuraTransactionProvider';
export { QuickNodeTransactionProvider } from './providers/quicknode/QuickNodeTransactionProvider';
export type {
  TransactionData,
  TransactionProviderConfig,
  TransactionFetchOptions
} from './providers/abstract/AbstractTransactionProvider';

// Types
export type { 
  EmbeddedWalletConfig,
  ModConfig,
  WhiteLabelConfig,
  BrandingConfig,
  IntegrationConfig,
  WalletInfo,
  YakklProviderConfig,
  EthereumRequest,
  BridgeMessage
} from './types';

// Re-export core types for convenience
export type {
  WalletEngine,
  Account,
  Transaction,
  Network,
  Mod,
  ModManifest
} from '@yakkl/core';

// Crypto utilities (public-safe)
export { encryptData, decryptData, isEncryptedData } from './crypto/encryption';
export { deriveKeyFromPassword, generateSalt } from './crypto/keyDerivation';
export type { SaltedKey, EncryptedData } from './crypto/types';

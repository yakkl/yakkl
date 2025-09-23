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
export { WalletClient } from './client';
export type { WalletClientConfig, WalletClientOptions, WalletAccount, WalletTransaction } from './client';
export { StandardRPCMethods, YAKKLRPCMethods, RPC_ERROR_CODES, RPCHandler, createYAKKLRPCHandler } from './rpc';
export type { RPCRequest, RPCResponse, RPCError, RPCMethodParams, RPCMethodReturns, RPCHandlerFunction } from './rpc';
export { EmbeddedWallet } from './embedded/EmbeddedWallet';
export { EmbeddedProvider } from './embedded/EmbeddedProvider';
export { createEmbeddedWallet } from './embedded/factory';
export { ModBuilder } from './mod/ModBuilder';
export { ModTemplate } from './mod/ModTemplate';
export { createMod, createModFromTemplate, modTemplates, generateModPackage } from './mod/factory';
export { WhiteLabelWallet } from './white-label/WhiteLabelWallet';
export { BrandingManager } from './white-label/BrandingManager';
export { createWhiteLabelWallet, createBrandingManager, createQuickWhiteLabelWallet, createEnterpriseWhiteLabelWallet, whitelabelTemplates } from './white-label/factory';
export { YakklProvider, createYakklProvider } from './integration/YakklProvider';
export { WalletConnector, createWalletConnector } from './integration/WalletConnector';
export { EventBridge, SecureChannel, createEventBridge } from './integration/EventBridge';
export { ProviderManager } from './providers/ProviderManager';
export { AlchemyProvider } from './providers/plugins/AlchemyProvider';
export type { ProviderConfig, BaseProvider } from './providers/ProviderInterface';
export { HistoricalPriceService } from './historical-price/HistoricalPriceService';
export { CoinGeckoHistoricalProvider } from './historical-price/providers/CoinGeckoHistoricalProvider';
export { OnChainDEXProvider } from './historical-price/providers/OnChainDEXProvider';
export type { PricePoint, PriceRange, ProviderCapabilities } from './historical-price/HistoricalPriceService';
export { AbstractTransactionProvider } from './providers/abstract/AbstractTransactionProvider';
export { AlchemyTransactionProvider } from './providers/alchemy/AlchemyTransactionProvider';
export { EtherscanTransactionProvider } from './providers/etherscan/EtherscanTransactionProvider';
export { InfuraTransactionProvider } from './providers/infura/InfuraTransactionProvider';
export { QuickNodeTransactionProvider } from './providers/quicknode/QuickNodeTransactionProvider';
export type { TransactionData, TransactionProviderConfig, TransactionFetchOptions } from './providers/abstract/AbstractTransactionProvider';
export type { EmbeddedWalletConfig, ModConfig, WhiteLabelConfig, BrandingConfig, IntegrationConfig, WalletInfo, YakklProviderConfig, EthereumRequest, BridgeMessage } from './types';
export type { WalletEngine, Account, Transaction, Network, Mod, ModManifest } from '@yakkl/core';
export { encryptData, decryptData, isEncryptedData } from './crypto/encryption';
export { deriveKeyFromPassword, generateSalt } from './crypto/keyDerivation';
export type { SaltedKey, EncryptedData } from './crypto/types';

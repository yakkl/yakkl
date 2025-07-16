/**
 * YAKKL SDK - Integration tools for developers
 *
 * This SDK provides everything developers need to integrate YAKKL:
 * - Embedded wallet components
 * - Mod development tools
 * - White label solutions
 * - Enterprise integrations
 */
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
export type { EmbeddedWalletConfig, ModConfig, WhiteLabelConfig, BrandingConfig, IntegrationConfig, WalletInfo, YakklProviderConfig, EthereumRequest, BridgeMessage } from './types';
export type { WalletEngine, Account, Transaction, Network, Mod, ModManifest } from '@yakkl/core';

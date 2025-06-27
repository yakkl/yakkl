/**
 * YAKKL SDK - Integration tools for developers
 * 
 * This SDK provides everything developers need to integrate YAKKL:
 * - Embedded wallet components
 * - Mod development tools  
 * - White label solutions
 * - Enterprise integrations
 */

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
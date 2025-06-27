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
export type { Mod, ModManifest, ModCapabilities, ModUI, ModBackground } from './mods/types';
export type { Account, Network, Transaction, SignedTransaction, Balance, WalletConfig } from './engine/types';
export { EmbeddedAPI } from './apis/EmbeddedAPI';
export { RemoteAPI } from './apis/RemoteAPI';
export { IntegrationAPI } from './apis/IntegrationAPI';
export { createWallet } from './utils/factory';
export { validateMod } from './utils/validation';
export { Logger } from './utils/Logger';
//# sourceMappingURL=index.d.ts.map
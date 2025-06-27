/**
 * YAKKL Core Embedded API - For embedded wallet implementations
 */

export { EmbeddedAPI } from '../apis/EmbeddedAPI';
export { RemoteAPI } from '../apis/RemoteAPI';
export { IntegrationAPI } from '../apis/IntegrationAPI';

// Re-export core functionality for embedded use
export { WalletEngine } from '../engine/WalletEngine';
export type { WalletConfig, Account, Network } from '../engine/types';
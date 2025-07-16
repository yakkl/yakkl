/**
 * Factory function for creating embedded wallets
 */
import { EmbeddedWallet } from './EmbeddedWallet';
import type { EmbeddedWalletConfig } from '../types';
export declare function createEmbeddedWallet(config: EmbeddedWalletConfig): EmbeddedWallet;

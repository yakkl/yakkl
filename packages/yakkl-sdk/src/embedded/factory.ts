/**
 * Factory function for creating embedded wallets
 */

import { EmbeddedWallet } from './EmbeddedWallet';
import type { EmbeddedWalletConfig } from '../types';

export function createEmbeddedWallet(config: EmbeddedWalletConfig): EmbeddedWallet {
  return new EmbeddedWallet(config);
}
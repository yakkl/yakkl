/**
 * Factory functions for creating wallet instances
 */

import { WalletEngine } from '../engine/WalletEngine';
import type { WalletConfig } from '../engine/types';

/**
 * Create a new wallet engine instance
 */
export async function createWallet(config: Partial<WalletConfig> = {}): Promise<WalletEngine> {
  const defaultConfig: WalletConfig = {
    name: 'YAKKL Wallet',
    version: '1.0.0',
    embedded: false,
    restrictions: [],
    modDiscovery: true,
    enableMods: true,
    enableDiscovery: true,
    storagePrefix: 'yakkl',
    logLevel: 'info',
    ...config
  };

  const engine = new WalletEngine(defaultConfig);
  await engine.initialize();
  
  return engine;
}
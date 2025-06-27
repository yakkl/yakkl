/**
 * Factory functions for creating wallet instances
 */
import { WalletEngine } from '../engine/WalletEngine';
import type { WalletConfig } from '../engine/types';
/**
 * Create a new wallet engine instance
 */
export declare function createWallet(config?: Partial<WalletConfig>): Promise<WalletEngine>;
//# sourceMappingURL=factory.d.ts.map
/**
 * Chain-agnostic key and account interfaces
 */
import type { ChainType } from './provider.interface';
export interface ChainAccount {
    address: string;
    publicKey: string;
    privateKey?: string;
    path?: string;
    chainType: ChainType;
    meta?: Record<string, unknown>;
}
export interface AccountCreateOptions {
    chainType: ChainType;
    wordCount?: number;
    locale?: string;
    path?: string;
    entropy?: Uint8Array | string;
}
export interface AccountImportOptions {
    chainType: ChainType;
    path?: string;
}
export interface IKeyManager {
    /** Create a new random account for a specific chain */
    createRandomAccount(options: AccountCreateOptions): Promise<ChainAccount>;
    /** Import account from mnemonic phrase */
    importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount>;
    /** Import account from raw private key */
    importFromPrivateKey(privateKey: string, options: AccountImportOptions): Promise<ChainAccount>;
    /** Import account from seed/entropy */
    importFromSeed(seed: Uint8Array | string, options: AccountImportOptions): Promise<ChainAccount>;
    /** Derive a child account (e.g., different index in path) */
    deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount>;
}
//# sourceMappingURL=keys.interface.d.ts.map
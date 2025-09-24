import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
export declare class SolanaKeyManager implements IKeyManager {
    private libs;
    private masterFromSeed;
    private ckdPrivEd25519;
    private parsePath;
    private deriveEd25519FromSeed;
    createRandomAccount(_options: AccountCreateOptions): Promise<ChainAccount>;
    importFromPrivateKey(privateKey: string): Promise<ChainAccount>;
    importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount>;
    importFromSeed(seed: Uint8Array | string, options: AccountImportOptions): Promise<ChainAccount>;
    deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount>;
}
//# sourceMappingURL=SolanaKeyManager.d.ts.map
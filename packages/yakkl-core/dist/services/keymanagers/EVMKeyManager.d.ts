import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
export declare class EVMKeyManager implements IKeyManager {
    createRandomAccount(options: AccountCreateOptions): Promise<ChainAccount>;
    importFromPrivateKey(privateKey: string, _options: AccountImportOptions): Promise<ChainAccount>;
    importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount>;
    importFromSeed(_seed: Uint8Array | string, _options: AccountImportOptions): Promise<ChainAccount>;
    deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount>;
}
//# sourceMappingURL=EVMKeyManager.d.ts.map
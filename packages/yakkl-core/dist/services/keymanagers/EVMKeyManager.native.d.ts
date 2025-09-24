import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
export declare class NativeEVMKeyManager implements IKeyManager {
    private libs;
    private toChecksumAddress;
    private privToAccount;
    createRandomAccount(options: AccountCreateOptions): Promise<ChainAccount>;
    importFromPrivateKey(privateKey: string): Promise<ChainAccount>;
    importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount>;
    importFromSeed(seed: Uint8Array | string, options: AccountImportOptions): Promise<ChainAccount>;
    deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount>;
}
//# sourceMappingURL=EVMKeyManager.native.d.ts.map
import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
export declare class BitcoinKeyManager implements IKeyManager {
    private libs;
    private hash160;
    private pubkeyCreate;
    private p2pkhAddress;
    private p2wpkhAddress;
    private p2trAddress;
    private p2wshAddress;
    private purposeFromPath;
    createRandomAccount(options: AccountCreateOptions): Promise<ChainAccount>;
    importFromPrivateKey(privateKey: string): Promise<ChainAccount>;
    importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount>;
    importFromSeed(seed: Uint8Array | string, options: AccountImportOptions): Promise<ChainAccount>;
    deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount>;
}
//# sourceMappingURL=BitcoinKeyManager.d.ts.map
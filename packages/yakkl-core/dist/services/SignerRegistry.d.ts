import type { ISigner } from '../interfaces/signer.interface';
import { ChainType } from '../interfaces/provider.interface';
export declare class SignerRegistry {
    private static instance;
    private signers;
    private fallback;
    static getInstance(): SignerRegistry;
    register(chain: ChainType, signer: ISigner): void;
    get(chain: ChainType): ISigner;
    clear(): void;
}
export declare const signers: SignerRegistry;
//# sourceMappingURL=SignerRegistry.d.ts.map
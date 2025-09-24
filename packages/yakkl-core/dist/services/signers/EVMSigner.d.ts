import type { ISigner } from '../../interfaces/signer.interface';
import { ChainType } from '../../interfaces/provider.interface';
export declare class EVMSigner implements ISigner {
    chain(): ChainType;
    signMessage(privateKeyHex: string, message: string | Uint8Array): Promise<string>;
}
//# sourceMappingURL=EVMSigner.d.ts.map
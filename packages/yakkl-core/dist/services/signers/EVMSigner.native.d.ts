import type { ISigner } from '../../interfaces/signer.interface';
import { ChainType } from '../../interfaces/provider.interface';
export declare class NativeEVMSigner implements ISigner {
    chain(): ChainType;
    private libs;
    private toBytes;
    private eip191MessageBytes;
    signMessage(privateKeyHex: string, message: string | Uint8Array): Promise<string>;
}
//# sourceMappingURL=EVMSigner.native.d.ts.map
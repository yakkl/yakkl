import type { ChainType } from './provider.interface';
export interface ISigner {
    /** Chain this signer targets */
    chain(): ChainType;
    /** Sign an arbitrary message (e.g., EIP-191 for EVM) */
    signMessage(privateKeyHex: string, message: string | Uint8Array): Promise<string>;
}
//# sourceMappingURL=signer.interface.d.ts.map
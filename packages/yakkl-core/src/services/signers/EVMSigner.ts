/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ISigner } from '../../interfaces/signer.interface';
import { ChainType } from '../../interfaces/provider.interface';
import { ethers } from 'ethers';

// Transitional EVM signer using ethers (to be replaced by native noble version)
export class EVMSigner implements ISigner {
  chain(): ChainType { return ChainType.EVM; }

  async signMessage(privateKeyHex: string, message: string | Uint8Array): Promise<string> {
    const pk = privateKeyHex.startsWith('0x') ? privateKeyHex : ('0x' + privateKeyHex);
    const wallet = new ethers.Wallet(pk);
    return wallet.signMessage(message);
  }
}


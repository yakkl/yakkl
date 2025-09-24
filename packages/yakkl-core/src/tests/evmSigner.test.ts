import { describe, it, expect } from 'vitest';
import { NativeEVMSigner } from '../services/signers/EVMSigner.native';
import { ethers } from 'ethers';

describe('NativeEVMSigner', () => {
  it('matches ethers signMessage (EIP-191)', async () => {
    const wallet = ethers.Wallet.createRandom();
    const msg = 'yakkl-core test message';
    const expected = await wallet.signMessage(msg);

    const signer = new NativeEVMSigner();
    const actual = await signer.signMessage(wallet.privateKey, msg);

    expect(actual.toLowerCase()).toEqual(expected.toLowerCase());
  });
});


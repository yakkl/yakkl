import { describe, it, expect } from 'vitest';
import { NativeEVMKeyManager } from '../services/keymanagers/EVMKeyManager.native';
import { ethers } from 'ethers';

describe('NativeEVMKeyManager', () => {
  it('derives same address as ethers for private key', async () => {
    const wallet = ethers.Wallet.createRandom();
    const km = new NativeEVMKeyManager();
    const acct = await km.importFromPrivateKey(wallet.privateKey);
    expect(acct.address.toLowerCase()).toEqual(wallet.address.toLowerCase());
    expect(acct.publicKey.startsWith('0x')).toBe(true);
    expect(acct.privateKey?.toLowerCase()).toEqual(wallet.privateKey.toLowerCase());
  });
});


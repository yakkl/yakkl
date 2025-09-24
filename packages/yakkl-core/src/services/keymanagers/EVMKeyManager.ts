/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from 'ethers';
import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
import { ChainType } from '../../interfaces/provider.interface';

// Transitional EVM KeyManager backed by ethers v5
// NOTE: This is a stopgap; we will replace with noble-based primitives.
export class EVMKeyManager implements IKeyManager {
  async createRandomAccount(options: AccountCreateOptions): Promise<ChainAccount> {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      path: wallet.mnemonic?.path,
      chainType: ChainType.EVM
    };
  }

  async importFromPrivateKey(privateKey: string, _options: AccountImportOptions): Promise<ChainAccount> {
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      chainType: ChainType.EVM
    };
  }

  async importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount> {
    const path = options.path ?? ethers.utils.defaultPath;
    const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
    return {
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      path,
      chainType: ChainType.EVM
    };
  }

  async importFromSeed(_seed: Uint8Array | string, _options: AccountImportOptions): Promise<ChainAccount> {
    // Seed import not supported via ethers API directly; require mnemonic
    throw new Error('importFromSeed not implemented for EVM yet');
  }

  async deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount> {
    if (!parent.privateKey && !parent.path) {
      throw new Error('Cannot derive without mnemonic/path in this transitional implementation');
    }
    // Attempt to derive using mnemonic if present on parent; otherwise unsupported
    // For now, reconstitute a wallet from private key and return same (no derivation)
    if (parent.privateKey) {
      const wallet = new ethers.Wallet(parent.privateKey);
      return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        chainType: ChainType.EVM,
        meta: { note: 'derivation not implemented; returned same key', index }
      };
    }
    throw new Error('Derivation from mnemonic not implemented yet');
  }
}


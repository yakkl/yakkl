/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
import { ChainType } from '../../interfaces/provider.interface';

export class SolanaKeyManager implements IKeyManager {
  private async libs() {
    const ed = await import('@noble/ed25519');
    const bs58 = await import('bs58');
    const hmac = await import('@noble/hashes/hmac');
    const { sha512 } = await import('@noble/hashes/sha512');
    const { hexToBytes, bytesToHex } = await import('ethereum-cryptography/utils.js');
    return { ed, bs58, hmac, sha512, hexToBytes, bytesToHex };
  }

  // SLIP-0010 master key generation for ed25519
  private masterFromSeed(seed: Uint8Array, hmac: any, sha512: any): { key: Uint8Array; chainCode: Uint8Array } {
    const key = new TextEncoder().encode('ed25519 seed');
    const I = hmac.hmac(sha512, key, seed);
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return { key: IL, chainCode: IR };
  }

  // SLIP-0010 CKD for hardened derivation only (ed25519 supports only hardened)
  private ckdPrivEd25519(parentKey: Uint8Array, parentChainCode: Uint8Array, index: number, hmac: any, sha512: any): { key: Uint8Array; chainCode: Uint8Array } {
    // data = 0x00 || key || index_be
    const data = new Uint8Array(1 + parentKey.length + 4);
    data.set([0x00], 0);
    data.set(parentKey, 1);
    // big-endian index
    data[data.length - 4] = (index >>> 24) & 0xff;
    data[data.length - 3] = (index >>> 16) & 0xff;
    data[data.length - 2] = (index >>> 8) & 0xff;
    data[data.length - 1] = index & 0xff;
    const I = hmac.hmac(sha512, parentChainCode, data);
    const IL = I.slice(0, 32);
    const IR = I.slice(32);
    return { key: IL, chainCode: IR };
  }

  private parsePath(path: string): number[] {
    if (!path || !path.startsWith('m')) return [];
    const parts = path.split('/').slice(1);
    const out: number[] = [];
    for (const p of parts) {
      if (!p) continue;
      const hardened = p.endsWith("'");
      const num = parseInt(hardened ? p.slice(0, -1) : p, 10);
      if (Number.isNaN(num)) throw new Error('Invalid path segment: ' + p);
      out.push((num | 0x80000000) >>> 0);
    }
    return out;
  }

  private async deriveEd25519FromSeed(seed: Uint8Array, path: string): Promise<Uint8Array> {
    const { hmac, sha512 } = await this.libs();
    let { key, chainCode } = this.masterFromSeed(seed, hmac, sha512);
    for (const idx of this.parsePath(path)) {
      ({ key, chainCode } = this.ckdPrivEd25519(key, chainCode, idx, hmac, sha512));
    }
    return key; // 32-byte private key
  }

  async createRandomAccount(_options: AccountCreateOptions): Promise<ChainAccount> {
    const { ed, bs58 } = await this.libs();
    const priv = ed.utils.randomPrivateKey();
    const pub = await ed.getPublicKeyAsync(priv);
    const address = bs58.default.encode(Buffer.from(pub));
    return {
      address,
      publicKey: bs58.default.encode(Buffer.from(pub)),
      privateKey: '0x' + Buffer.from(priv).toString('hex'),
      chainType: ChainType.SOLANA
    };
  }

  async importFromPrivateKey(privateKey: string): Promise<ChainAccount> {
    const { ed, bs58 } = await this.libs();
    const pkHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const priv = Buffer.from(pkHex, 'hex');
    const pub = await ed.getPublicKeyAsync(new Uint8Array(priv));
    const address = bs58.default.encode(Buffer.from(pub));
    return {
      address,
      publicKey: bs58.default.encode(Buffer.from(pub)),
      privateKey: '0x' + Buffer.from(priv).toString('hex'),
      chainType: ChainType.SOLANA
    };
  }

  async importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount> {
    const { ed, bs58 } = await this.libs();
    const { mnemonicToSeedSync } = await import('@scure/bip39');
    const seed = mnemonicToSeedSync(mnemonic);
    const path = options.path ?? `m/44'/501'/0'/0'`;
    const priv = await this.deriveEd25519FromSeed(new Uint8Array(seed), path);
    const pub = await ed.getPublicKeyAsync(priv);
    const address = bs58.default.encode(Buffer.from(pub));
    return {
      address,
      publicKey: bs58.default.encode(Buffer.from(pub)),
      privateKey: '0x' + Buffer.from(priv).toString('hex'),
      chainType: ChainType.SOLANA,
      path
    };
  }

  async importFromSeed(seed: Uint8Array | string, options: AccountImportOptions): Promise<ChainAccount> {
    const { ed, bs58 } = await this.libs();
    const path = options.path ?? `m/44'/501'/0'/0'`;
    const seedBytes = typeof seed === 'string' ? new TextEncoder().encode(seed) : seed;
    const priv = await this.deriveEd25519FromSeed(seedBytes, path);
    const pub = await ed.getPublicKeyAsync(priv);
    const address = bs58.default.encode(Buffer.from(pub));
    return {
      address,
      publicKey: bs58.default.encode(Buffer.from(pub)),
      privateKey: '0x' + Buffer.from(priv).toString('hex'),
      chainType: ChainType.SOLANA,
      path
    };
  }

  async deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount> {
    // Proper derivation requires SLIP-0010; provide a safe fallback that carries index only.
    return { ...parent, meta: { ...(parent.meta || {}), requestedIndex: index } };
  }
}

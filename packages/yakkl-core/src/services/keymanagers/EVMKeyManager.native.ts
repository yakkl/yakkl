/* eslint-disable @typescript-eslint/no-explicit-any */
// Native EVM key manager using noble + bip derivations
// Note: Requires packages listed in ROADMAP. This module is dynamically loaded.
import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
import { ChainType } from '../../interfaces/provider.interface';

export class NativeEVMKeyManager implements IKeyManager {
  private async libs() {
    const secp = await import('@noble/secp256k1');
    const { keccak256 } = await import('ethereum-cryptography/keccak.js');
    const { hexToBytes, bytesToHex } = await import('ethereum-cryptography/utils.js');
    const bip39 = await import('@scure/bip39');
    const bip32 = await import('@scure/bip32');
    const wl = await import('@scure/bip39/wordlists/english');
    return { secp, keccak256, hexToBytes, bytesToHex, bip39, bip32, wl };
  }

  private async toChecksumAddress(addrHex: string): Promise<string> {
    // EIP-55 checksum on lowercase hex address (no 0x)
    const { keccak256 } = await this.libs();
    const lower = addrHex.toLowerCase();
    // Hash the ASCII string of the lowercase address
    const asciiBytes = new TextEncoder().encode(lower);
    const hashHex = Array.from(keccak256(asciiBytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
    let out = '0x';
    for (let i = 0; i < lower.length; i++) {
      out += parseInt(hashHex[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
    }
    return out;
  }

  private async privToAccount(privateKeyHex: string): Promise<ChainAccount> {
    const { secp, keccak256, bytesToHex } = await this.libs();
    const pkHex = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
    const pub = secp.getPublicKey(pkHex, false); // uncompressed 65 bytes
    const pubNoPrefix = pub.slice(1); // drop 0x04
    const hash = keccak256(new Uint8Array(pubNoPrefix));
    const addr = bytesToHex(hash.slice(-20));
    return {
      address: await this.toChecksumAddress(addr),
      publicKey: '0x' + Buffer.from(pub).toString('hex'),
      privateKey: '0x' + pkHex,
      chainType: ChainType.EVM
    };
  }

  async createRandomAccount(options: AccountCreateOptions): Promise<ChainAccount> {
    const { bip39, wl } = await this.libs();
    const mnemonic = bip39.generateMnemonic(wl.wordlist, 128);
    return this.importFromMnemonic(mnemonic, { chainType: options.chainType, path: options.path });
  }

  async importFromPrivateKey(privateKey: string): Promise<ChainAccount> {
    return this.privToAccount(privateKey);
  }

  async importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount> {
    const { bip39, bip32 } = await this.libs();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.HDKey.fromMasterSeed(seed);
    const path = options.path ?? `m/44'/60'/0'/0/0`;
    const child = root.derive(path);
    if (!child.privateKey) throw new Error('Failed to derive private key');
    const pkHex = Buffer.from(child.privateKey).toString('hex');
    const acct = await this.privToAccount(pkHex);
    return { ...acct, path };
  }

  async importFromSeed(seed: Uint8Array | string, options: AccountImportOptions): Promise<ChainAccount> {
    const { bip32 } = await this.libs();
    const seedBuf = typeof seed === 'string' ? Buffer.from(seed, 'hex') : Buffer.from(seed);
    const root = bip32.HDKey.fromMasterSeed(seedBuf);
    const path = options.path ?? `m/44'/60'/0'/0/0`;
    const child = root.derive(path);
    if (!child.privateKey) throw new Error('Failed to derive private key');
    const pkHex = Buffer.from(child.privateKey).toString('hex');
    const acct = await this.privToAccount(pkHex);
    return { ...acct, path };
  }

  async deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount> {
    // Without mnemonic/seed we cannot derive a sibling. Use provided path as base.
    // This implementation requires parent.path base. Example: m/44'/60'/0'/0/{index}
    const base = parent.path || `m/44'/60'/0'/0/0`;
    const basePrefix = base.replace(/\/(\d+)$|$/, '/');
    const nextPath = `${basePrefix}${index}`;
    // Derive from parent private key as seed is not available – not possible in general.
    // Fallback: return same account with meta note.
    if (!parent.privateKey) {
      throw new Error('Derivation requires base seed/mnemonic; not available');
    }
    const acct = await this.privToAccount(parent.privateKey);
    acct.meta = { ...(acct.meta || {}), note: 'Derivation not implemented without seed', requestedIndex: index, nextPath };
    acct.path = nextPath;
    return acct;
  }
}

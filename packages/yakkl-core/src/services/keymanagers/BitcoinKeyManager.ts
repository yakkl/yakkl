/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IKeyManager, ChainAccount, AccountCreateOptions, AccountImportOptions } from '../../interfaces/keys.interface';
import { ChainType } from '../../interfaces/provider.interface';

export class BitcoinKeyManager implements IKeyManager {
  private async libs() {
    const secp = await import('@noble/secp256k1');
    const { sha256 } = await import('@noble/hashes/sha256');
    const { ripemd160 } = await import('@noble/hashes/ripemd160');
    const { hexToBytes, bytesToHex } = await import('ethereum-cryptography/utils.js');
    const bip39 = await import('@scure/bip39');
    const bip32 = await import('@scure/bip32');
    const wl = await import('@scure/bip39/wordlists/english');
    const bs58check = await import('bs58check');
    const bech32 = await import('bech32');
    return { secp, sha256, ripemd160, hexToBytes, bytesToHex, bip39, bip32, wl, bs58check, bech32 };
  }

  private hash160(bytes: Uint8Array, sha256: any, ripemd160: any): Uint8Array {
    return ripemd160(sha256(bytes));
  }

  private pubkeyCreate(secp: any, privKey: Uint8Array, compressed = true): Uint8Array {
    return secp.getPublicKey(privKey, compressed);
  }

  private p2pkhAddress(pubkey: Uint8Array, sha256: any, ripemd160: any, bs58check: any, version = 0x00): string {
    const h160 = this.hash160(pubkey, sha256, ripemd160);
    const payload = new Uint8Array(h160.length + 1);
    payload[0] = version;
    payload.set(h160, 1);
    // bs58check expects Buffer
    const buf = Buffer.from(payload);
    return bs58check.default.encode(buf);
  }

  private p2wpkhAddress(pubkey: Uint8Array, sha256: any, ripemd160: any, bech32: any, hrp = 'bc'): string {
    const h160 = this.hash160(pubkey, sha256, ripemd160);
    const words = bech32.bech32.toWords(h160);
    // witness version 0 is prepended as single word 0
    return bech32.bech32.encode(hrp, [0, ...words]);
  }

  private p2trAddress(pubkey: Uint8Array, bech32: any, hrp = 'bc'): string {
    // x-only (drop first byte of compressed pubkey) or compute x from Point
    const xonly = pubkey.length === 33 ? pubkey.slice(1) : pubkey; // assume compressed input
    const words = bech32.bech32m.toWords(xonly);
    // witness version 1 (taproot)
    return bech32.bech32m.encode(hrp, [1, ...words]);
  }

  private p2wshAddress(pubkey: Uint8Array, sha256: any, ripemd160: any, bech32: any, hrp = 'bc'): string {
    // Build a standard P2PKH script as witness script: OP_DUP OP_HASH160 <h160> OP_EQUALVERIFY OP_CHECKSIG
    const h160 = this.hash160(pubkey, sha256, ripemd160);
    const script = new Uint8Array(1 + 1 + 1 + h160.length + 1 + 1);
    // OP_DUP
    script[0] = 0x76;
    // OP_HASH160
    script[1] = 0xa9;
    // push 20
    script[2] = 0x14;
    script.set(h160, 3);
    // OP_EQUALVERIFY
    script[3 + h160.length] = 0x88;
    // OP_CHECKSIG
    script[4 + h160.length] = 0xac;
    const prog = sha256(script);
    const words = bech32.bech32.toWords(prog);
    return bech32.bech32.encode(hrp, [0, ...words]);
  }

  private purposeFromPath(path?: string): number | null {
    if (!path) return null;
    const parts = path.split('/');
    if (parts.length < 2) return null;
    const seg = parts[1];
    const hardened = seg.endsWith("'") ? seg.slice(0, -1) : seg;
    const num = parseInt(hardened, 10);
    return Number.isNaN(num) ? null : num;
  }

  async createRandomAccount(options: AccountCreateOptions): Promise<ChainAccount> {
    const { bip39, wl } = await this.libs();
    const mnemonic = bip39.generateMnemonic(wl.wordlist, 128);
    return this.importFromMnemonic(mnemonic, { chainType: options.chainType, path: options.path });
  }

  async importFromPrivateKey(privateKey: string): Promise<ChainAccount> {
    const { secp, sha256, ripemd160, hexToBytes } = await this.libs();
    const pkHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const pk = hexToBytes(pkHex);
    const libs = await this.libs();
    const pub = this.pubkeyCreate(secp, pk, true);
    const p2pkh = this.p2pkhAddress(pub, sha256, ripemd160, libs.bs58check);
    const p2wpkh = this.p2wpkhAddress(pub, sha256, ripemd160, libs.bech32);
    const p2tr = this.p2trAddress(pub, libs.bech32);
    const p2wsh = this.p2wshAddress(pub, sha256, ripemd160, libs.bech32);
    const address = p2wpkh; // default for random
    return {
      address,
      publicKey: '0x' + Buffer.from(pub).toString('hex'),
      privateKey: '0x' + pkHex,
      chainType: ChainType.BITCOIN,
      meta: { p2pkh, p2wpkh, p2wsh, p2tr }
    };
  }

  async importFromMnemonic(mnemonic: string, options: AccountImportOptions): Promise<ChainAccount> {
    const { bip39, bip32, sha256, ripemd160 } = await this.libs();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.HDKey.fromMasterSeed(seed);
    const path = options.path ?? `m/44'/0'/0'/0/0`;
    const child = root.derive(path);
    if (!child.privateKey) throw new Error('Failed to derive private key');
    const pk = new Uint8Array(child.privateKey);
    const { secp } = await this.libs();
    const libs = await this.libs();
    const pub = this.pubkeyCreate(secp, pk, true);
    const p2pkh = this.p2pkhAddress(pub, sha256, ripemd160, libs.bs58check);
    const p2wpkh = this.p2wpkhAddress(pub, sha256, ripemd160, libs.bech32);
    const p2tr = this.p2trAddress(pub, libs.bech32);
    const p2wsh = this.p2wshAddress(pub, sha256, ripemd160, libs.bech32);
    const purpose = this.purposeFromPath(path);
    const address = purpose === 44 ? p2pkh : purpose === 86 ? p2tr : p2wpkh;
    return {
      address,
      publicKey: '0x' + Buffer.from(pub).toString('hex'),
      privateKey: '0x' + Buffer.from(pk).toString('hex'),
      chainType: ChainType.BITCOIN,
      path,
      meta: { p2pkh, p2wpkh, p2wsh, p2tr }
    };
  }

  async importFromSeed(seed: Uint8Array | string, options: AccountImportOptions): Promise<ChainAccount> {
    const { bip32, sha256, ripemd160 } = await this.libs();
    const seedBuf = typeof seed === 'string' ? Buffer.from(seed, 'hex') : Buffer.from(seed);
    const root = bip32.HDKey.fromMasterSeed(seedBuf);
    const path = options.path ?? `m/44'/0'/0'/0/0`;
    const child = root.derive(path);
    if (!child.privateKey) throw new Error('Failed to derive private key');
    const pk = new Uint8Array(child.privateKey);
    const { secp } = await this.libs();
    const libs = await this.libs();
    const pub = this.pubkeyCreate(secp, pk, true);
    const p2pkh = this.p2pkhAddress(pub, sha256, ripemd160, libs.bs58check);
    const p2wpkh = this.p2wpkhAddress(pub, sha256, ripemd160, libs.bech32);
    const p2tr = this.p2trAddress(pub, libs.bech32);
    const p2wsh = this.p2wshAddress(pub, sha256, ripemd160, libs.bech32);
    const purpose = this.purposeFromPath(path);
    const address = purpose === 44 ? p2pkh : purpose === 86 ? p2tr : p2wpkh;
    return {
      address,
      publicKey: '0x' + Buffer.from(pub).toString('hex'),
      privateKey: '0x' + Buffer.from(pk).toString('hex'),
      chainType: ChainType.BITCOIN,
      path,
      meta: { p2pkh, p2wpkh, p2wsh, p2tr }
    };
  }

  async deriveAccount(parent: ChainAccount, index: number | string): Promise<ChainAccount> {
    // Without xprv or seed we cannot derive; return fallback
    if (!parent.path) {
      const acct = { ...parent };
      acct.meta = { ...(acct.meta || {}), note: 'Derivation requires seed/xprv', requestedIndex: index };
      return acct;
    }
    // For simplicity, just modify path suffix
    const basePrefix = parent.path.replace(/\/(\d+)$|$/, '/');
    const path = `${basePrefix}${index}`;
    return { ...parent, path };
  }
}

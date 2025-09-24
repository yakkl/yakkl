import { describe, it, expect } from 'vitest';
import { keyManagers } from '../services/KeyManagerRegistry';
import { ChainType } from '../interfaces/provider.interface';
import { mnemonicToSeedSync, generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

describe('KeyManager scaffolds', () => {
  it('EVM create/import basic formatting', async () => {
    const km = keyManagers.get(ChainType.EVM);
    const acct = await km.createRandomAccount({ chainType: ChainType.EVM });
    expect(acct.address.startsWith('0x')).toBe(true);
    expect(acct.publicKey.startsWith('0x')).toBe(true);
    expect(acct.privateKey?.startsWith('0x')).toBe(true);
  });

  it('Bitcoin create/import basic formatting', async () => {
    const km = keyManagers.get(ChainType.BITCOIN);
    const acct = await km.createRandomAccount({ chainType: ChainType.BITCOIN });
    // Default to segwit address
    expect(acct.address.startsWith('bc1')).toBe(true);
    expect(acct.publicKey.startsWith('0x')).toBe(true);
  });

  it('Solana create/import basic formatting', async () => {
    const km = keyManagers.get(ChainType.SOLANA);
    const acct = await km.createRandomAccount({ chainType: ChainType.SOLANA });
    // Base58 address length typically 44 for ed25519
    expect(acct.address.length).toBeGreaterThan(30);
  });

  it('Solana mnemonic vs seed deterministic equivalence', async () => {
    const km = keyManagers.get(ChainType.SOLANA);
    const m = generateMnemonic(wordlist, 128);
    const seed = mnemonicToSeedSync(m);
    const path = `m/44'/501'/0'/0'`;
    // @ts-ignore
    const a = await km.importFromMnemonic(m, { chainType: ChainType.SOLANA, path });
    // @ts-ignore
    const b = await km.importFromSeed(seed, { chainType: ChainType.SOLANA, path });
    expect(a.address).toEqual(b.address);
    expect(a.publicKey).toEqual(b.publicKey);
  });

  it('Bitcoin meta contains multiple address formats', async () => {
    const km = keyManagers.get(ChainType.BITCOIN);
    const acct = await km.createRandomAccount({ chainType: ChainType.BITCOIN });
    const meta: any = acct.meta || {};
    expect(String(meta.p2wpkh).startsWith('bc1')).toBe(true);
    expect(String(meta.p2wsh).startsWith('bc1')).toBe(true);
    expect(String(meta.p2tr).startsWith('bc1p')).toBe(true);
    expect(acct.address).toEqual(meta.p2wpkh);
  });

  it('Bitcoin default address respects purpose from path', async () => {
    const km = keyManagers.get(ChainType.BITCOIN);
    // Legacy 44' → P2PKH default
    // @ts-ignore
    const a44 = await km.importFromMnemonic(generateMnemonic(wordlist, 128), { chainType: ChainType.BITCOIN, path: "m/44'/0'/0'/0/0" });
    expect(a44.address).toEqual((a44.meta as any)?.p2pkh);
    // Native segwit 84' → P2WPKH default
    // @ts-ignore
    const a84 = await km.importFromMnemonic(generateMnemonic(wordlist, 128), { chainType: ChainType.BITCOIN, path: "m/84'/0'/0'/0/0" });
    expect(a84.address).toEqual((a84.meta as any)?.p2wpkh);
    // Taproot 86' → P2TR default
    // @ts-ignore
    const a86 = await km.importFromMnemonic(generateMnemonic(wordlist, 128), { chainType: ChainType.BITCOIN, path: "m/86'/0'/0'/0/0" });
    expect(a86.address).toEqual((a86.meta as any)?.p2tr);
  });
});

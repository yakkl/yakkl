# Yakkl TODO (Short-Term)

This is a concise, execution-oriented list to resume work quickly even in a fresh session.

## 1) Native EVM Key Manager (replace ethers step-by-step)

- [x] Add deps to `packages/yakkl-core/package.json`:
  - `@noble/secp256k1`, `@scure/bip39`, `@scure/bip32`, `ethereum-cryptography`
- [x] Implement `NativeEVMKeyManager` (scaffold + dynamic import):
  - File: `packages/yakkl-core/src/services/keymanagers/EVMKeyManager.native.ts`
  - Methods: `createRandomAccount`, `importFromMnemonic`, `importFromPrivateKey`, `importFromSeed`, `deriveAccount`
  - Address derivation: keccak256(uncompressedPubKey[1..]) → last 20 bytes; checksum EIP‑55
- [x] Update registry (`src/services/keymanagers/register.ts`) to prefer native manager; keep ethers fallback
- [ ] (Optional) Unit tests for derivation/signing

## 2) Chain‑Agnostic Signer

- [x] Define `ISigner` interface + `SignerRegistry`
- [x] Implement `EVMSigner` (native secp256k1) without ethers (dynamic override)
- [x] Update `AccountManager.signMessage` to use the registry (transitional -> native when available)

## 3) Additional Chains

- [x] `SolanaKeyManager` (ed25519; base58 address; SLIP-0010 hardened path for mnemonic/seed)
- [x] `BitcoinKeyManager` (secp256k1; P2PKH/P2WPKH/Taproot meta, default P2WPKH)
- [ ] Add P2WSH + test vectors; add derivation variants (49/84/86)

## 4) Wallet UX

- [x] Add Settings / Diagnostics link to `/(wallet)/support/logs`

## Notes

- After changing core deps, run: `pnpm --filter @yakkl/core install` then `pnpm --filter @yakkl/core build`.
- Logs are already sanitized. Use `log.copyLogs(...)` for exports.

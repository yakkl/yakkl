# Yakkl Roadmap (Logging + Key Managers)

This document captures ongoing cross‑package work so you can resume in a new session easily.

## Phase A — Unified Logging (core + wallet)

- Core logger with transports (DONE)
  - `ConsoleTransport`, `MemoryTransport`, `LocalStorageTransport`, `DexieTransport`,
    `WebExtensionStorageTransport`, `HttpTransport`, `D1Transport`, `PostgresTransport`, `WebSocketTransport`.
  - `log.flush()`, `log.getLogs()`, `log.copyLogs()` with filtering and sanitization.
- Wallet default transports (DONE)
  - Register `WebExtensionStorageTransport('yakklLogs', 500)` and `DexieTransport('yakklLogsDB', 'logs', 1000)`.
  - Replace imports to `log` via `$lib/common/logger-wrapper` (DONE for sources under `src/`).
- Pro support features (IN PROGRESS)
  - Expose UI to copy filtered logs via `log.copyLogs()` (sanitized).
  - Optional: Enable WSS per user tier via `enableWSS(url)`.

Next Steps:
- Add a “Support > Copy Logs” UI action that calls `log.copyLogs({ levelAtLeast, startTime, endTime, textIncludes })`.
- Consider a UI switch to opt‑in/out of WSS livestream.

## Phase B — Chain‑Agnostic Key Managers (scaffolded)

- Interfaces + registry (DONE)
  - `IKeyManager`, `ChainAccount`, `AccountCreateOptions`, `AccountImportOptions`.
  - `KeyManagerRegistry` + `keyManagers` singleton.
- EVM KeyManager (TRANSITIONAL DONE)
  - `EVMKeyManager` (uses ethers for now; to be replaced by noble‑based impl).
  - Registered by default via `services/keymanagers/register.ts`.
- First consumer (DONE)
  - `AccountManager` now uses `keyManagers.get(ChainType.EVM)` for create/import.

Next Steps:
- Implement noble‑based EVM key manager (no ethers/viem):
  - Dependencies to add in @yakkl/core: `@noble/secp256k1`, `@scure/bip39`, `@scure/bip32`, `ethereum-cryptography` (for keccak256).
  - Features: secp256k1 keygen/sign, keccak256 address derivation, mnemonic import/derive (BIP‑39/44), HD derivation paths.
  - Replace transitional ethers logic once parity achieved; keep fallback path for environments not yet updated.
- Add Solana and Bitcoin key managers with proper primitives.
  - [x] SolanaKeyManager: random/import private key; SLIP-0010 hardened path for mnemonic/seed
  - [x] BitcoinKeyManager: BIP-39/32 import + P2PKH/P2WPKH/Taproot/P2WSH meta
  - [ ] Add test vectors for Bitcoin (all formats) and Solana derivation
- Gradually migrate other engine pieces (TransactionManager, Signer) to chain‑agnostic interfaces.

## Phase C — Remove legacy logger usages (IN PROGRESS)

- `packages/yakkl-wallet/src/lib/managers/Logger.ts` remains for compatibility.
- All source imports now use `$lib/common/logger-wrapper`.

Next Steps:
- Confirm there are no remaining references in any runtime bundle entrypoints.
- Remove legacy `Logger.ts` once verified.

---

## Phase D — Execution Checklist (Detailed TODO)

- [x] Add deps in `packages/yakkl-core/package.json`:
  - `@noble/secp256k1`, `@scure/bip39`, `@scure/bip32`, `ethereum-cryptography`
- [x] Implement `NativeEVMKeyManager` (scaffold, dynamic load):
  - Create `src/services/keymanagers/EVMKeyManager.native.ts`
  - Implement: `createRandomAccount`, `importFromMnemonic`, `importFromPrivateKey`, `importFromSeed`, `deriveAccount`
  - Compute address: `keccak256(uncompressedPubKey.slice(1)).slice(-20)`
  - Unit tests (if test infra available) for address derivation vs known vectors
- [x] Wire registry to prefer `NativeEVMKeyManager` if deps available, else fallback to transitional version
- [x] Add `ISigner` (chain‑agnostic) + `SignerRegistry`
  - [x] Implement `EVMSigner` (native) using `@noble/secp256k1` (dynamic; overrides transitional when deps exist)
  - [x] Migrate `AccountManager.signMessage` to use registry (transitional -> native when available)
- [ ] Add `SolanaKeyManager` (ed25519) + `BitcoinKeyManager` (secp256k1 + UTXO)
  - Plan derivation standards and address formats
- [x] Wallet UI: add a visible nav/Settings link to `/(wallet)/support/logs`
  - Label: “Support Logs (Pro)”
  - Feature flag via env if needed

Notes:
- Builds will require `pnpm --filter @yakkl/core install` after adding deps.
- Keep redaction tests (manual or automated) for logs; never emit secrets.

## Security Notes

- Logger sanitization redacts secrets: JWTs, Bearer tokens, private keys, mnemonics, seeds, api keys, tokens, authorization headers.
- Sanitization is applied before writing to transports and when copying logs.

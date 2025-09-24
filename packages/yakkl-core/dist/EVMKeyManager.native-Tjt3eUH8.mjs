import { C as ChainType } from "./IntegrationAPI-dTXFGWkx.mjs";
class NativeEVMKeyManager {
  async libs() {
    const secp = await import("./index-DJp6qroY.mjs");
    const { keccak256 } = await import("./keccak-ccXshCCX.mjs");
    const { hexToBytes, bytesToHex } = await import("./utils-DOvC7oEF.mjs").then((n) => n.d);
    const bip39 = await import("./index-dq9b1K3y.mjs");
    const bip32 = await import("./index-DEGopolQ.mjs");
    const wl = await import("./english-DgimtB_l.mjs");
    return { secp, keccak256, hexToBytes, bytesToHex, bip39, bip32, wl };
  }
  async toChecksumAddress(addrHex) {
    const { keccak256 } = await this.libs();
    const lower = addrHex.toLowerCase();
    const asciiBytes = new TextEncoder().encode(lower);
    const hashHex = Array.from(keccak256(asciiBytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
    let out = "0x";
    for (let i = 0; i < lower.length; i++) {
      out += parseInt(hashHex[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
    }
    return out;
  }
  async privToAccount(privateKeyHex) {
    const { secp, keccak256, bytesToHex } = await this.libs();
    const pkHex = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
    const pub = secp.getPublicKey(pkHex, false);
    const pubNoPrefix = pub.slice(1);
    const hash = keccak256(new Uint8Array(pubNoPrefix));
    const addr = bytesToHex(hash.slice(-20));
    return {
      address: await this.toChecksumAddress(addr),
      publicKey: "0x" + Buffer.from(pub).toString("hex"),
      privateKey: "0x" + pkHex,
      chainType: ChainType.EVM
    };
  }
  async createRandomAccount(options) {
    const { bip39, wl } = await this.libs();
    const mnemonic = bip39.generateMnemonic(wl.wordlist, 128);
    return this.importFromMnemonic(mnemonic, { chainType: options.chainType, path: options.path });
  }
  async importFromPrivateKey(privateKey) {
    return this.privToAccount(privateKey);
  }
  async importFromMnemonic(mnemonic, options) {
    const { bip39, bip32 } = await this.libs();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.HDKey.fromMasterSeed(seed);
    const path = options.path ?? `m/44'/60'/0'/0/0`;
    const child = root.derive(path);
    if (!child.privateKey) throw new Error("Failed to derive private key");
    const pkHex = Buffer.from(child.privateKey).toString("hex");
    const acct = await this.privToAccount(pkHex);
    return { ...acct, path };
  }
  async importFromSeed(seed, options) {
    const { bip32 } = await this.libs();
    const seedBuf = typeof seed === "string" ? Buffer.from(seed, "hex") : Buffer.from(seed);
    const root = bip32.HDKey.fromMasterSeed(seedBuf);
    const path = options.path ?? `m/44'/60'/0'/0/0`;
    const child = root.derive(path);
    if (!child.privateKey) throw new Error("Failed to derive private key");
    const pkHex = Buffer.from(child.privateKey).toString("hex");
    const acct = await this.privToAccount(pkHex);
    return { ...acct, path };
  }
  async deriveAccount(parent, index) {
    const base = parent.path || `m/44'/60'/0'/0/0`;
    const basePrefix = base.replace(/\/(\d+)$|$/, "/");
    const nextPath = `${basePrefix}${index}`;
    if (!parent.privateKey) {
      throw new Error("Derivation requires base seed/mnemonic; not available");
    }
    const acct = await this.privToAccount(parent.privateKey);
    acct.meta = { ...acct.meta || {}, note: "Derivation not implemented without seed", requestedIndex: index, nextPath };
    acct.path = nextPath;
    return acct;
  }
}
export {
  NativeEVMKeyManager
};
//# sourceMappingURL=EVMKeyManager.native-Tjt3eUH8.mjs.map

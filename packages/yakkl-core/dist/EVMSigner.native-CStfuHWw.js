"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const IntegrationAPI = require("./IntegrationAPI-DEGxZLmd.js");
class NativeEVMSigner {
  chain() {
    return IntegrationAPI.ChainType.EVM;
  }
  async libs() {
    const secp = await Promise.resolve().then(() => require("./index-DkgY3dSa.js"));
    const { keccak256 } = await Promise.resolve().then(() => require("./keccak-C9bNE7u0.js"));
    const { hexToBytes, bytesToHex } = await Promise.resolve().then(() => require("./utils-KUNibzZe.js")).then((n) => n.utils);
    return { secp, keccak256, hexToBytes, bytesToHex };
  }
  toBytes(input) {
    if (typeof input === "string") return new TextEncoder().encode(input);
    return input;
  }
  eip191MessageBytes(message) {
    const msgBytes = this.toBytes(message);
    const prefix = `Ethereum Signed Message:
${msgBytes.length}`;
    const prefixBytes = new TextEncoder().encode(prefix);
    const out = new Uint8Array(prefixBytes.length + msgBytes.length);
    out.set(prefixBytes, 0);
    out.set(msgBytes, prefixBytes.length);
    return out;
  }
  async signMessage(privateKeyHex, message) {
    const { secp, keccak256, hexToBytes, bytesToHex } = await this.libs();
    const pk = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
    const pkBytes = hexToBytes(pk);
    const digest = keccak256(this.eip191MessageBytes(message));
    const sigObj = await secp.sign(digest, pkBytes);
    let compact;
    if (typeof sigObj.toCompactRawBytes === "function") compact = sigObj.toCompactRawBytes();
    else if (typeof sigObj.toRawBytes === "function") compact = sigObj.toRawBytes();
    else compact = sigObj;
    const recid = 0;
    const r = bytesToHex(compact.slice(0, 32));
    const s = bytesToHex(compact.slice(32, 64));
    const v = recid + 27;
    const vHex = v.toString(16).padStart(2, "0");
    return "0x" + r + s + vHex;
  }
}
exports.NativeEVMSigner = NativeEVMSigner;
//# sourceMappingURL=EVMSigner.native-CStfuHWw.js.map

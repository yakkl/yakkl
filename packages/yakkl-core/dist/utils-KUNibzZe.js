"use strict";
function number(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error(`positive integer expected, not ${n}`);
}
function bool(b) {
  if (typeof b !== "boolean")
    throw new Error(`boolean expected, not ${b}`);
}
function isBytes(a) {
  return a instanceof Uint8Array || a != null && typeof a === "object" && a.constructor.name === "Uint8Array";
}
function bytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error(`Uint8Array expected of length ${lengths}, not of length=${b.length}`);
}
function hash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  number(h.outputLen);
  number(h.blockLen);
}
function exists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function output(out, instance) {
  bytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error(`digestInto() expects output buffer of length at least ${min}`);
  }
}
const assert = { number, bool, bytes, hash, exists, output };
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
const isLE = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
const byteSwap = (word) => word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
}
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes$1) {
  bytes(bytes$1);
  let hex = "";
  for (let i = 0; i < bytes$1.length; i++) {
    hex += hexes[bytes$1[i]];
  }
  return hex;
}
const asciis = { _0: 48, _9: 57, _A: 65, _F: 70, _a: 97, _f: 102 };
function asciiToBase16(char) {
  if (char >= asciis._0 && char <= asciis._9)
    return char - asciis._0;
  if (char >= asciis._A && char <= asciis._F)
    return char - (asciis._A - 10);
  if (char >= asciis._a && char <= asciis._f)
    return char - (asciis._a - 10);
  return;
}
function hexToBytes$1(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("padded hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  bytes(data);
  return data;
}
class Hash {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
}
function wrapConstructor(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function hexToBytes(data) {
  const sliced = data.startsWith("0x") ? data.substring(2) : data;
  return hexToBytes$1(sliced);
}
function wrapHash(hash2) {
  return (msg) => {
    assert.bytes(msg);
    return hash2(msg);
  };
}
(() => {
  const webCrypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
  const nodeRequire = typeof module !== "undefined" && typeof module.require === "function" && module.require.bind(module);
  return {
    node: nodeRequire && !webCrypto ? nodeRequire("crypto") : void 0,
    web: webCrypto
  };
})();
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  bytesToHex,
  hexToBytes,
  toHex: bytesToHex,
  utf8ToBytes,
  wrapHash
}, Symbol.toStringTag, { value: "Module" }));
exports.Hash = Hash;
exports.byteSwap32 = byteSwap32;
exports.bytes = bytes;
exports.exists = exists;
exports.isLE = isLE;
exports.number = number;
exports.output = output;
exports.toBytes = toBytes;
exports.u32 = u32;
exports.utils = utils;
exports.wrapConstructor = wrapConstructor;
exports.wrapHash = wrapHash;
//# sourceMappingURL=utils-KUNibzZe.js.map

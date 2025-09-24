"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const hmac = require("./hmac-D6-yBQ0n.js");
const utils = require("./utils-DMCh2wpV.js");
const sha2 = require("./sha2-jDGBU03y.js");
const index = require("./index-DJ6DC5vt.js");
function pbkdf2Init(hash, _password, _salt, _opts) {
  utils.ahash(hash);
  const opts = utils.checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
  const { c, dkLen, asyncTick } = opts;
  utils.anumber(c);
  utils.anumber(dkLen);
  utils.anumber(asyncTick);
  if (c < 1)
    throw new Error("iterations (c) should be >= 1");
  const password = utils.kdfInputToBytes(_password);
  const salt = utils.kdfInputToBytes(_salt);
  const DK = new Uint8Array(dkLen);
  const PRF = hmac.hmac.create(hash, password);
  const PRFSalt = PRF._cloneInto().update(salt);
  return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
}
function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
  PRF.destroy();
  PRFSalt.destroy();
  if (prfW)
    prfW.destroy();
  utils.clean(u);
  return DK;
}
function pbkdf2(hash, password, salt, opts) {
  const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
  let prfW;
  const arr = new Uint8Array(4);
  const view = utils.createView(arr);
  const u = new Uint8Array(PRF.outputLen);
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
    const Ti = DK.subarray(pos, pos + PRF.outputLen);
    view.setInt32(0, ti, false);
    (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
    Ti.set(u.subarray(0, Ti.length));
    for (let ui = 1; ui < c; ui++) {
      PRF._cloneInto(prfW).update(u).digestInto(u);
      for (let i = 0; i < Ti.length; i++)
        Ti[i] ^= u[i];
    }
  }
  return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
async function pbkdf2Async(hash, password, salt, opts) {
  const { c, dkLen, asyncTick, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
  let prfW;
  const arr = new Uint8Array(4);
  const view = utils.createView(arr);
  const u = new Uint8Array(PRF.outputLen);
  for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
    const Ti = DK.subarray(pos, pos + PRF.outputLen);
    view.setInt32(0, ti, false);
    (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
    Ti.set(u.subarray(0, Ti.length));
    await utils.asyncLoop(c - 1, asyncTick, () => {
      PRF._cloneInto(prfW).update(u).digestInto(u);
      for (let i = 0; i < Ti.length; i++)
        Ti[i] ^= u[i];
    });
  }
  return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
/*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
const isJapanese = (wordlist) => wordlist[0] === "あいこくしん";
function nfkd(str) {
  if (typeof str !== "string")
    throw new TypeError("invalid mnemonic type: " + typeof str);
  return str.normalize("NFKD");
}
function normalize(str) {
  const norm = nfkd(str);
  const words = norm.split(" ");
  if (![12, 15, 18, 21, 24].includes(words.length))
    throw new Error("Invalid mnemonic");
  return { nfkd: norm, words };
}
function aentropy(ent) {
  utils.abytes(ent, 16, 20, 24, 28, 32);
}
function generateMnemonic(wordlist, strength = 128) {
  utils.anumber(strength);
  if (strength % 32 !== 0 || strength > 256)
    throw new TypeError("Invalid entropy");
  return entropyToMnemonic(utils.randomBytes(strength / 8), wordlist);
}
const calcChecksum = (entropy) => {
  const bitsLeft = 8 - entropy.length / 4;
  return new Uint8Array([sha2.sha256(entropy)[0] >> bitsLeft << bitsLeft]);
};
function getCoder(wordlist) {
  if (!Array.isArray(wordlist) || wordlist.length !== 2048 || typeof wordlist[0] !== "string")
    throw new Error("Wordlist: expected array of 2048 strings");
  wordlist.forEach((i) => {
    if (typeof i !== "string")
      throw new Error("wordlist: non-string element: " + i);
  });
  return index.utils.chain(index.utils.checksum(1, calcChecksum), index.utils.radix2(11, true), index.utils.alphabet(wordlist));
}
function mnemonicToEntropy(mnemonic, wordlist) {
  const { words } = normalize(mnemonic);
  const entropy = getCoder(wordlist).decode(words);
  aentropy(entropy);
  return entropy;
}
function entropyToMnemonic(entropy, wordlist) {
  aentropy(entropy);
  const words = getCoder(wordlist).encode(entropy);
  return words.join(isJapanese(wordlist) ? "　" : " ");
}
function validateMnemonic(mnemonic, wordlist) {
  try {
    mnemonicToEntropy(mnemonic, wordlist);
  } catch (e) {
    return false;
  }
  return true;
}
const psalt = (passphrase) => nfkd("mnemonic" + passphrase);
function mnemonicToSeed(mnemonic, passphrase = "") {
  return pbkdf2Async(sha2.sha512, normalize(mnemonic).nfkd, psalt(passphrase), { c: 2048, dkLen: 64 });
}
function mnemonicToSeedSync(mnemonic, passphrase = "") {
  return pbkdf2(sha2.sha512, normalize(mnemonic).nfkd, psalt(passphrase), { c: 2048, dkLen: 64 });
}
exports.entropyToMnemonic = entropyToMnemonic;
exports.generateMnemonic = generateMnemonic;
exports.mnemonicToEntropy = mnemonicToEntropy;
exports.mnemonicToSeed = mnemonicToSeed;
exports.mnemonicToSeedSync = mnemonicToSeedSync;
exports.validateMnemonic = validateMnemonic;
//# sourceMappingURL=index-DlOg4ZL9.js.map

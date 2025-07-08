// Mock crypto module for SSR - prevents Buffer errors during prerendering
export const randomBytes = (size) => new Uint8Array(size);
export const createHash = () => ({
  update: () => ({ digest: () => '' }),
  digest: () => ''
});
export const createHmac = () => ({
  update: () => ({ digest: () => '' }),
  digest: () => ''
});
export const pbkdf2 = (password, salt, iterations, keylen, digest, callback) => {
  if (callback) callback(null, new Uint8Array(keylen));
  return new Uint8Array(keylen);
};
export const pbkdf2Sync = () => new Uint8Array(32);
export default {
  randomBytes,
  createHash,
  createHmac,
  pbkdf2,
  pbkdf2Sync
};
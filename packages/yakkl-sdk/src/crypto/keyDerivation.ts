let _crypto: Crypto;

if (typeof window !== 'undefined' && (window as any).crypto) {
  _crypto = (window as any).crypto;
} else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
  _crypto = (globalThis as any).crypto as Crypto;
} else {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _crypto = require('crypto').webcrypto as Crypto;
  } catch {
    throw new Error('No crypto support found');
  }
}

export async function generateSalt(): Promise<string> {
  const saltBuffer = _crypto.getRandomValues(new Uint8Array(64));
  return bufferToBase64(saltBuffer);
}

export function bufferToBase64(array: Uint8Array): string {
  if (typeof btoa !== 'undefined') {
    let binary = '';
    for (let i = 0; i < array.length; i++) binary += String.fromCharCode(array[i]);
    return btoa(binary);
  }
  // Node fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return Buffer.from(array).toString('base64');
}

export function base64ToUint8(base64: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  }
  // Node fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

export function bufferForCrypto(base64: string): ArrayBuffer {
  return base64ToUint8(base64).buffer;
}

export async function deriveKeyFromPassword(
  password: string,
  existingSalt?: string
): Promise<{ key: CryptoKey; salt: string }> {
  const salt = existingSalt || (await generateSalt());
  const encoder = new TextEncoder();

  const derivationKey = await _crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await _crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 1_000_000,
      hash: 'SHA-256'
    },
    derivationKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return { key, salt };
}

export { _crypto as crypto }; 


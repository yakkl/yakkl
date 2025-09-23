import { crypto, bufferForCrypto, bufferToBase64, base64ToUint8, deriveKeyFromPassword } from './keyDerivation';
import type { EncryptedData, SaltedKey } from './types';

function encodeJSON<T>(obj: T): string {
  return JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
}

export function isEncryptedData(data: any): data is EncryptedData {
  return (
    data != null && typeof data === 'object' &&
    typeof (data as any).iv === 'string' &&
    typeof (data as any).data === 'string' &&
    typeof (data as any).salt === 'string'
  );
}

export async function encryptData(
  data: any,
  passwordOrSaltedKey: string | SaltedKey
): Promise<EncryptedData> {
  if (data == null) throw new Error('Missing data to encrypt');
  if (!passwordOrSaltedKey) throw new Error('Missing password or key');

  const { key, salt } =
    typeof passwordOrSaltedKey === 'string'
      ? await deriveKeyFromPassword(passwordOrSaltedKey)
      : passwordOrSaltedKey;

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encoded = encoder.encode(encodeJSON(data));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    data: bufferToBase64(new Uint8Array(cipher)),
    iv: bufferToBase64(iv),
    salt
  };
}

export async function decryptData<T>(
  encryptedData: EncryptedData,
  passwordOrSaltedKey: string | SaltedKey
): Promise<T> {
  if (!passwordOrSaltedKey) throw new Error('Missing password or key');
  const { data, iv, salt } = encryptedData;

  const { key } =
    typeof passwordOrSaltedKey === 'string'
      ? await deriveKeyFromPassword(passwordOrSaltedKey, salt)
      : passwordOrSaltedKey;

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bufferForCrypto(iv) },
    key,
    bufferForCrypto(data)
  );

  const txt = new TextDecoder().decode(plain);
  return JSON.parse(txt) as T;
}

export type { EncryptedData, SaltedKey };


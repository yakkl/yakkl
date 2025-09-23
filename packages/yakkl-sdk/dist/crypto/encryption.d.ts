import type { EncryptedData, SaltedKey } from './types';
export declare function isEncryptedData(data: any): data is EncryptedData;
export declare function encryptData(data: any, passwordOrSaltedKey: string | SaltedKey): Promise<EncryptedData>;
export declare function decryptData<T>(encryptedData: EncryptedData, passwordOrSaltedKey: string | SaltedKey): Promise<T>;
export type { EncryptedData, SaltedKey };

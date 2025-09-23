declare let _crypto: Crypto;
export declare function generateSalt(): Promise<string>;
export declare function bufferToBase64(array: Uint8Array): string;
export declare function base64ToUint8(base64: string): Uint8Array;
export declare function bufferForCrypto(base64: string): ArrayBuffer;
export declare function deriveKeyFromPassword(password: string, existingSalt?: string): Promise<{
    key: CryptoKey;
    salt: string;
}>;
export { _crypto as crypto };

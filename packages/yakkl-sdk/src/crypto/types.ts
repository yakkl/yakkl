export type SaltedKey = {
  salt: string;
  key: CryptoKey;
};

export interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}


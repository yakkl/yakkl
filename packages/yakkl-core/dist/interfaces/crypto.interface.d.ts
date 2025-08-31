/**
 * Cryptographic and security-related interfaces
 */
import type { Address, HexString } from '../types';
/**
 * Key derivation options
 */
export interface KeyDerivationOptions {
    path?: string;
    index?: number;
    hardened?: boolean;
    password?: string;
}
/**
 * Encryption options
 */
export interface EncryptionOptions {
    algorithm?: 'AES-GCM' | 'AES-CBC' | 'ChaCha20-Poly1305';
    keySize?: 128 | 192 | 256;
    iterations?: number;
    salt?: Uint8Array;
}
/**
 * Signature types
 */
export type SignatureType = 'personal_sign' | 'eth_sign' | 'eth_signTypedData' | 'eth_signTypedData_v3' | 'eth_signTypedData_v4';
/**
 * Signature request
 */
export interface SignatureRequest {
    from: Address;
    data: HexString | string;
    type: SignatureType;
    origin?: string;
    metadata?: Record<string, any>;
}
/**
 * Signature result
 */
export interface SignatureResult {
    signature: HexString;
    signatureType: SignatureType;
    address: Address;
    timestamp: number;
}
/**
 * Key import/export formats
 */
export interface ExportedKey {
    format: 'json-keystore' | 'private-key' | 'mnemonic';
    data: string;
    encrypted: boolean;
    metadata?: {
        createdAt: number;
        exportedAt: number;
        version: string;
    };
}
/**
 * Wallet creation result
 */
export interface WalletCreationResult {
    address: Address;
    publicKey: string;
    mnemonic?: string;
    privateKey?: string;
    derivationPath?: string;
}
/**
 * Account derivation result
 */
export interface AccountDerivationResult {
    address: Address;
    publicKey: string;
    derivationPath: string;
    index: number;
}
/**
 * Private key import result
 */
export interface PrivateKeyImportResult {
    success: boolean;
    address?: Address;
    error?: string;
    accountId?: string;
}
/**
 * Mnemonic import result
 */
export interface MnemonicImportResult {
    success: boolean;
    addresses?: Address[];
    error?: string;
    accountIds?: string[];
}
/**
 * Keystore interface
 */
export interface IKeystore {
    generateMnemonic(wordCount?: 12 | 15 | 18 | 21 | 24): string;
    validateMnemonic(mnemonic: string): boolean;
    deriveAccount(mnemonic: string, options: KeyDerivationOptions): Promise<AccountDerivationResult>;
    importPrivateKey(privateKey: string): Promise<PrivateKeyImportResult>;
    importMnemonic(mnemonic: string): Promise<MnemonicImportResult>;
    exportAccount(address: Address, password: string): Promise<ExportedKey>;
    sign(request: SignatureRequest): Promise<SignatureResult>;
    encrypt(data: Uint8Array, password: string, options?: EncryptionOptions): Promise<Uint8Array>;
    decrypt(encryptedData: Uint8Array, password: string): Promise<Uint8Array>;
}
/**
 * Hardware wallet interface
 */
export interface IHardwareWallet {
    type: 'ledger' | 'trezor' | 'lattice' | 'keystone';
    isConnected(): Promise<boolean>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getAccounts(options?: {
        count?: number;
        offset?: number;
    }): Promise<Address[]>;
    signTransaction(txData: any, accountIndex: number): Promise<HexString>;
    signMessage(message: string, accountIndex: number): Promise<HexString>;
    getPublicKey(accountIndex: number): Promise<string>;
}
/**
 * Secure storage interface
 */
export interface ISecureStorage {
    store(key: string, value: any, encrypted?: boolean): Promise<void>;
    retrieve(key: string): Promise<any>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    exists(key: string): Promise<boolean>;
    getAllKeys(): Promise<string[]>;
}
/**
 * Password validation rules
 */
export interface PasswordPolicy {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    preventCommonPasswords?: boolean;
    preventReuse?: number;
}
/**
 * Two-factor authentication interface
 */
export interface ITwoFactorAuth {
    generateSecret(): Promise<{
        secret: string;
        qrCode: string;
    }>;
    verifyToken(secret: string, token: string): Promise<boolean>;
    enable(secret: string): Promise<void>;
    disable(): Promise<void>;
    isEnabled(): Promise<boolean>;
    generateBackupCodes(): Promise<string[]>;
    verifyBackupCode(code: string): Promise<boolean>;
}
//# sourceMappingURL=crypto.interface.d.ts.map
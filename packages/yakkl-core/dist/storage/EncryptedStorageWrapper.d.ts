/**
 * Encrypted Storage Wrapper
 * Adds encryption layer to any storage provider
 */
import type { IStorage, IEncryptedStorage, StorageEntry, StorageMetadata, StorageQuery, StorageWatchCallback, UnwatchFn } from '../interfaces/storage-enhanced.interface';
export declare class EncryptedStorageWrapper implements IEncryptedStorage {
    private storage;
    private encryptionKey;
    private textEncoder;
    private textDecoder;
    constructor(storage: IStorage);
    setEncryptionKey(key: string | CryptoKey): Promise<void>;
    rotateEncryptionKey(newKey: string | CryptoKey): Promise<void>;
    isEncrypted(): boolean;
    encrypt<T>(value: T): Promise<string>;
    decrypt<T>(encryptedValue: string): Promise<T>;
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T): Promise<void>;
    getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>>;
    setMultiple<T = any>(items: Record<string, T>): Promise<void>;
    remove(key: string): Promise<void>;
    removeMultiple(keys: string[]): Promise<void>;
    clear(): Promise<void>;
    getKeys(): Promise<string[]>;
    has(key: string): Promise<boolean>;
    getInfo?(): Promise<{
        bytesInUse?: number;
        quota?: number;
        usage?: number;
    }>;
    getWithMetadata<T = any>(key: string): Promise<StorageEntry<T> | null>;
    setWithMetadata<T = any>(key: string, value: T, metadata?: Partial<StorageMetadata>): Promise<void>;
    updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void>;
    getByTag<T = any>(tag: string): Promise<StorageEntry<T>[]>;
    query<T = any>(filter: StorageQuery): Promise<StorageEntry<T>[]>;
    watch(key: string | string[], callback: StorageWatchCallback): UnwatchFn;
    transaction<T>(operations: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=EncryptedStorageWrapper.d.ts.map
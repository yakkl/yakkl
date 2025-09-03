/**
 * IndexedDB Provider
 * Browser IndexedDB implementation with transaction support
 */
import { BaseStorageProvider } from './BaseStorageProvider';
import type { StorageOptions, IStorageProvider, StorageCapabilities, IStorage } from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';
export declare class IndexedDBProvider extends BaseStorageProvider {
    private db;
    private dbName;
    private storeName;
    private version;
    constructor(options?: StorageOptions);
    private ensureDB;
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
    getKeys(): Promise<string[]>;
    transaction<T>(operations: () => Promise<T>): Promise<T>;
    getInfo(): Promise<{
        bytesInUse?: number;
        quota?: number;
        usage?: number;
    }>;
    close(): Promise<void>;
}
export declare class IndexedDBProviderFactory implements IStorageProvider {
    readonly type: StorageType;
    createStorage(options?: StorageOptions): IStorage;
    isAvailable(): boolean;
    getCapabilities(): StorageCapabilities;
}
//# sourceMappingURL=IndexedDBProvider.d.ts.map
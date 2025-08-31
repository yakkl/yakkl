/**
 * Storage Manager
 * Manages storage providers and coordinates between different storage types
 */
import type { IStorage, IStorageManager, IStorageProvider, IEncryptedStorage, IVersionedStorage, IStorageMigrator, StorageOptions, StorageMigration, StorageSyncOptions, StorageSyncResult } from '../interfaces/storage-enhanced.interface';
import { StorageType } from '../interfaces/storage-enhanced.interface';
export declare class StorageManager implements IStorageManager {
    private providers;
    private storageInstances;
    constructor();
    private registerDefaultProviders;
    registerProvider(provider: IStorageProvider): void;
    getStorage(type: StorageType, options?: StorageOptions): IStorage;
    getEncryptedStorage(type: StorageType, options?: StorageOptions): IEncryptedStorage;
    getVersionedStorage(type: StorageType, options?: StorageOptions): IVersionedStorage;
    createMigrator(storage: IStorage, migrations: StorageMigration[]): IStorageMigrator;
    sync(source: IStorage, target: IStorage, options?: StorageSyncOptions): Promise<StorageSyncResult>;
    /**
     * Get the best available storage provider for the current environment
     */
    getBestAvailableStorage(options?: StorageOptions): IStorage;
    /**
     * Clear all storage instances
     */
    clearAll(): Promise<void>;
}
//# sourceMappingURL=StorageManager.d.ts.map
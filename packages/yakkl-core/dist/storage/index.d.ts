/**
 * Storage Module Exports
 */
export { BaseStorageProvider } from './BaseStorageProvider';
export { LocalStorageProvider, LocalStorageProviderFactory } from './LocalStorageProvider';
export { IndexedDBProvider, IndexedDBProviderFactory } from './IndexedDBProvider';
export { ChromeStorageProvider, ChromeLocalStorageProviderFactory, ChromeSyncStorageProviderFactory } from './ChromeStorageProvider';
export { MemoryStorageProvider, MemoryStorageProviderFactory } from './MemoryStorageProvider';
export { EncryptedStorageWrapper } from './EncryptedStorageWrapper';
export { VersionedStorageWrapper } from './VersionedStorageWrapper';
export { StorageManager } from './StorageManager';
export { StorageMigrator } from './StorageMigrator';
export type { IStorage, IEnhancedStorage, IEncryptedStorage, IVersionedStorage, IStorageProvider, IStorageManager, IStorageMigrator, IStorageQuota, IStorageBackup, StorageEntry, StorageMetadata, StorageQuery, StorageChange, StorageWatchCallback, UnwatchFn, StorageVersion, StorageMigration, MigrationHistory, StorageOptions, StorageCapabilities, StorageSyncOptions, StorageSyncResult, StorageSyncConflict, QuotaInfo, StorageEstimate, BackupOptions, Backup } from '../interfaces/storage-enhanced.interface';
export { StorageType } from '../interfaces/storage-enhanced.interface';
//# sourceMappingURL=index.d.ts.map
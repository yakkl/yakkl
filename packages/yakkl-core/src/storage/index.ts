/**
 * Storage Module Exports
 */

// Base and providers
export { BaseStorageProvider } from './BaseStorageProvider';
export { LocalStorageProvider, LocalStorageProviderFactory } from './LocalStorageProvider';
export { IndexedDBProvider, IndexedDBProviderFactory } from './IndexedDBProvider';
export { ChromeStorageProvider, ChromeLocalStorageProviderFactory, ChromeSyncStorageProviderFactory } from './ChromeStorageProvider';
export { MemoryStorageProvider, MemoryStorageProviderFactory } from './MemoryStorageProvider';

// Wrappers
export { EncryptedStorageWrapper } from './EncryptedStorageWrapper';
export { VersionedStorageWrapper } from './VersionedStorageWrapper';

// Manager and migrator
export { StorageManager } from './StorageManager';
export { StorageMigrator } from './StorageMigrator';

// Re-export types from interfaces (excluding enums which are exported separately)
export type {
  IStorage,
  IEnhancedStorage,
  IEncryptedStorage,
  IVersionedStorage,
  IStorageProvider,
  IStorageManager,
  IStorageMigrator,
  IStorageQuota,
  IStorageBackup,
  StorageEntry,
  StorageMetadata,
  StorageQuery,
  StorageChange,
  StorageWatchCallback,
  UnwatchFn,
  StorageVersion,
  StorageMigration,
  MigrationHistory,
  StorageOptions,
  StorageCapabilities,
  StorageSyncOptions,
  StorageSyncResult,
  StorageSyncConflict,
  QuotaInfo,
  StorageEstimate,
  BackupOptions,
  Backup
} from '../interfaces/storage-enhanced.interface';

// Export enum directly (not as type)
export { StorageType } from '../interfaces/storage-enhanced.interface';
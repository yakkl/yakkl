/**
 * Enhanced Storage Interfaces
 * Comprehensive storage system with encryption, versioning, and migrations
 */
import type { IStorage } from './storage.interface';
export type { IStorage } from './storage.interface';
/**
 * Storage types
 */
export declare enum StorageType {
    LOCAL = "local",
    SESSION = "session",
    INDEXED_DB = "indexeddb",
    CHROME_LOCAL = "chrome_local",
    CHROME_SYNC = "chrome_sync",
    MEMORY = "memory",
    FILE = "file"
}
/**
 * Storage entry with metadata
 */
export interface StorageEntry<T = any> {
    key: string;
    value: T;
    metadata?: StorageMetadata;
}
/**
 * Storage metadata
 */
export interface StorageMetadata {
    created: number;
    updated: number;
    accessed?: number;
    expires?: number;
    version?: string;
    encrypted?: boolean;
    compressed?: boolean;
    checksum?: string;
    tags?: string[];
}
/**
 * Enhanced storage interface with metadata support
 */
export interface IEnhancedStorage extends IStorage {
    /**
     * Get with metadata
     */
    getWithMetadata<T = any>(key: string): Promise<StorageEntry<T> | null>;
    /**
     * Set with metadata
     */
    setWithMetadata<T = any>(key: string, value: T, metadata?: Partial<StorageMetadata>): Promise<void>;
    /**
     * Update metadata
     */
    updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void>;
    /**
     * Get entries by tag
     */
    getByTag<T = any>(tag: string): Promise<StorageEntry<T>[]>;
    /**
     * Query entries
     */
    query<T = any>(filter: StorageQuery): Promise<StorageEntry<T>[]>;
    /**
     * Watch for changes
     */
    watch(key: string | string[], callback: StorageWatchCallback): UnwatchFn;
    /**
     * Transaction support
     */
    transaction<T>(operations: () => Promise<T>): Promise<T>;
}
/**
 * Storage query filter
 */
export interface StorageQuery {
    keyPattern?: string | RegExp;
    tags?: string[];
    createdAfter?: number;
    createdBefore?: number;
    updatedAfter?: number;
    updatedBefore?: number;
    expired?: boolean;
    limit?: number;
    offset?: number;
}
/**
 * Storage watch callback
 */
export type StorageWatchCallback = (changes: StorageChange[]) => void;
/**
 * Storage change event
 */
export interface StorageChange {
    key: string;
    oldValue?: any;
    newValue?: any;
    type: 'set' | 'remove' | 'clear';
}
/**
 * Unwatch function
 */
export type UnwatchFn = () => void;
/**
 * Encrypted storage interface
 */
export interface IEncryptedStorage extends IEnhancedStorage {
    /**
     * Set encryption key
     */
    setEncryptionKey(key: string | CryptoKey): Promise<void>;
    /**
     * Rotate encryption key
     */
    rotateEncryptionKey(newKey: string | CryptoKey): Promise<void>;
    /**
     * Check if storage is encrypted
     */
    isEncrypted(): boolean;
    /**
     * Encrypt a value
     */
    encrypt<T>(value: T): Promise<string>;
    /**
     * Decrypt a value
     */
    decrypt<T>(encryptedValue: string): Promise<T>;
}
/**
 * Versioned storage interface
 */
export interface IVersionedStorage extends IEnhancedStorage {
    /**
     * Get version history
     */
    getHistory(key: string, limit?: number): Promise<StorageVersion[]>;
    /**
     * Get specific version
     */
    getVersion<T = any>(key: string, version: string): Promise<T | null>;
    /**
     * Restore to version
     */
    restoreVersion(key: string, version: string): Promise<void>;
    /**
     * Prune old versions
     */
    pruneVersions(key: string, keepCount: number): Promise<void>;
}
/**
 * Storage version entry
 */
export interface StorageVersion<T = any> {
    version: string;
    value: T;
    timestamp: number;
    metadata?: StorageMetadata;
}
/**
 * Storage migration
 */
export interface StorageMigration {
    version: string;
    description?: string;
    up: (storage: IStorage) => Promise<void>;
    down?: (storage: IStorage) => Promise<void>;
}
/**
 * Storage migrator interface
 */
export interface IStorageMigrator {
    /**
     * Run migrations
     */
    migrate(targetVersion?: string): Promise<void>;
    /**
     * Rollback migrations
     */
    rollback(targetVersion: string): Promise<void>;
    /**
     * Get current version
     */
    getCurrentVersion(): Promise<string>;
    /**
     * Get migration history
     */
    getHistory(): Promise<MigrationHistory[]>;
    /**
     * Register migration
     */
    registerMigration(migration: StorageMigration): void;
}
/**
 * Migration history entry
 */
export interface MigrationHistory {
    version: string;
    executedAt: number;
    direction: 'up' | 'down';
    success: boolean;
    error?: string;
}
/**
 * Storage provider interface
 */
export interface IStorageProvider {
    /**
     * Provider type
     */
    readonly type: StorageType;
    /**
     * Create storage instance
     */
    createStorage(options?: StorageOptions): IStorage;
    /**
     * Check if provider is available
     */
    isAvailable(): boolean;
    /**
     * Get provider capabilities
     */
    getCapabilities(): StorageCapabilities;
}
/**
 * Storage options
 */
export interface StorageOptions {
    name?: string;
    version?: number;
    encrypted?: boolean;
    compressed?: boolean;
    ttl?: number;
    maxSize?: number;
    namespace?: string;
    autoSync?: boolean;
}
/**
 * Storage capabilities
 */
export interface StorageCapabilities {
    persistent: boolean;
    synchronizable: boolean;
    searchable: boolean;
    transactional: boolean;
    versionable: boolean;
    encryptable: boolean;
    maxSize?: number;
    maxKeys?: number;
}
/**
 * Storage manager interface
 */
export interface IStorageManager {
    /**
     * Register storage provider
     */
    registerProvider(provider: IStorageProvider): void;
    /**
     * Get storage instance
     */
    getStorage(type: StorageType, options?: StorageOptions): IStorage;
    /**
     * Get encrypted storage
     */
    getEncryptedStorage(type: StorageType, options?: StorageOptions): IEncryptedStorage;
    /**
     * Get versioned storage
     */
    getVersionedStorage(type: StorageType, options?: StorageOptions): IVersionedStorage;
    /**
     * Create migrator
     */
    createMigrator(storage: IStorage, migrations: StorageMigration[]): IStorageMigrator;
    /**
     * Sync between storages
     */
    sync(source: IStorage, target: IStorage, options?: StorageSyncOptions): Promise<StorageSyncResult>;
}
/**
 * Sync options
 */
export interface StorageSyncOptions {
    direction?: 'push' | 'pull' | 'bidirectional';
    conflictResolution?: 'source' | 'target' | 'newest' | 'manual';
    filter?: (entry: StorageEntry) => boolean;
    batchSize?: number;
}
/**
 * Sync result
 */
export interface StorageSyncResult {
    itemsSynced: number;
    itemsSkipped: number;
    conflicts: StorageSyncConflict[];
    errors: Error[];
    duration: number;
}
/**
 * Sync conflict
 */
export interface StorageSyncConflict {
    key: string;
    sourceValue: any;
    targetValue: any;
    resolution?: 'source' | 'target' | 'merged';
    mergedValue?: any;
}
/**
 * Storage quota interface
 */
export interface IStorageQuota {
    /**
     * Get quota info
     */
    getQuota(): Promise<QuotaInfo>;
    /**
     * Request more quota
     */
    requestQuota(bytes: number): Promise<boolean>;
    /**
     * Estimate storage usage
     */
    estimate(): Promise<StorageEstimate>;
    /**
     * Clear unused storage
     */
    cleanup(): Promise<number>;
}
/**
 * Quota information
 */
export interface QuotaInfo {
    usage: number;
    quota: number;
    persistent?: boolean;
}
/**
 * Storage estimate
 */
export interface StorageEstimate {
    usage: number;
    quota: number;
    usageDetails?: {
        indexedDB?: number;
        caches?: number;
        serviceWorker?: number;
    };
}
/**
 * Backup and restore interface
 */
export interface IStorageBackup {
    /**
     * Create backup
     */
    backup(storage: IStorage, options?: BackupOptions): Promise<Backup>;
    /**
     * Restore from backup
     */
    restore(storage: IStorage, backup: Backup): Promise<void>;
    /**
     * Validate backup
     */
    validate(backup: Backup): Promise<boolean>;
    /**
     * Export backup
     */
    export(backup: Backup, format: 'json' | 'binary'): Promise<Blob>;
    /**
     * Import backup
     */
    import(data: Blob | string): Promise<Backup>;
}
/**
 * Backup options
 */
export interface BackupOptions {
    compress?: boolean;
    encrypt?: boolean;
    includeMetadata?: boolean;
    filter?: (entry: StorageEntry) => boolean;
}
/**
 * Backup data
 */
export interface Backup {
    id: string;
    timestamp: number;
    version: string;
    entries: StorageEntry[];
    metadata?: {
        description?: string;
        compressed?: boolean;
        encrypted?: boolean;
        checksum?: string;
    };
}
//# sourceMappingURL=storage-enhanced.interface.d.ts.map
/**
 * Versioned Storage Wrapper
 * Adds versioning support to any storage provider
 */
import type { IStorage, IVersionedStorage, StorageEntry, StorageMetadata, StorageQuery, StorageWatchCallback, UnwatchFn, StorageVersion } from '../interfaces/storage-enhanced.interface';
export declare class VersionedStorageWrapper implements IVersionedStorage {
    private storage;
    private maxVersions;
    private versionPrefix;
    constructor(storage: IStorage, maxVersions?: number);
    private getVersionKey;
    private getVersionListKey;
    private generateVersion;
    getHistory(key: string, limit?: number): Promise<StorageVersion[]>;
    getVersion<T = any>(key: string, version: string): Promise<T | null>;
    restoreVersion(key: string, version: string): Promise<void>;
    pruneVersions(key: string, keepCount: number): Promise<void>;
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
//# sourceMappingURL=VersionedStorageWrapper.d.ts.map
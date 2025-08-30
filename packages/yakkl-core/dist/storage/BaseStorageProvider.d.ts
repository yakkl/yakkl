/**
 * Base Storage Provider
 * Abstract base class for all storage providers
 */
import type { IEnhancedStorage, StorageEntry, StorageMetadata, StorageQuery, StorageChange, StorageWatchCallback, UnwatchFn } from '../interfaces/storage-enhanced.interface';
export declare abstract class BaseStorageProvider implements IEnhancedStorage {
    protected watchers: Map<string, Set<StorageWatchCallback>>;
    protected metadata: Map<string, StorageMetadata>;
    abstract get<T = any>(key: string): Promise<T | null>;
    abstract set<T = any>(key: string, value: T): Promise<void>;
    abstract remove(key: string): Promise<void>;
    abstract clear(): Promise<void>;
    abstract getKeys(): Promise<string[]>;
    getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>>;
    setMultiple<T = any>(items: Record<string, T>): Promise<void>;
    removeMultiple(keys: string[]): Promise<void>;
    has(key: string): Promise<boolean>;
    getWithMetadata<T = any>(key: string): Promise<StorageEntry<T> | null>;
    setWithMetadata<T = any>(key: string, value: T, metadata?: Partial<StorageMetadata>): Promise<void>;
    updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void>;
    getByTag<T = any>(tag: string): Promise<StorageEntry<T>[]>;
    query<T = any>(filter: StorageQuery): Promise<StorageEntry<T>[]>;
    watch(key: string | string[], callback: StorageWatchCallback): UnwatchFn;
    transaction<T>(operations: () => Promise<T>): Promise<T>;
    protected createDefaultMetadata(): StorageMetadata;
    protected matchesFilter(metadata: StorageMetadata | undefined, filter: StorageQuery): boolean;
    protected notifyWatchers(key: string, change: StorageChange): void;
}
//# sourceMappingURL=BaseStorageProvider.d.ts.map
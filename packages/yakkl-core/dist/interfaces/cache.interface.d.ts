/**
 * Cache-related interfaces for data caching and synchronization
 */
/**
 * Cache entry with metadata
 */
export interface ICacheEntry<T = any> {
    key: string;
    data: T;
    timestamp: number;
    ttl?: number;
    hits?: number;
    size?: number;
    checksum?: string;
    tags?: string[];
}
/**
 * Cache statistics
 */
export interface ICacheStats {
    hits: number;
    misses: number;
    entries: number;
    size: number;
    evictions: number;
    hitRate: number;
}
/**
 * Cache eviction policy
 */
export declare enum CacheEvictionPolicy {
    LRU = "lru",// Least Recently Used
    LFU = "lfu",// Least Frequently Used
    FIFO = "fifo",// First In First Out
    TTL = "ttl",// Time To Live based
    SIZE = "size"
}
/**
 * Cache configuration
 */
export interface ICacheConfig {
    maxSize?: number;
    maxEntries?: number;
    ttl?: number;
    evictionPolicy?: CacheEvictionPolicy;
    persistToStorage?: boolean;
    compressionEnabled?: boolean;
    encryptionEnabled?: boolean;
    syncEnabled?: boolean;
}
/**
 * Base cache interface
 */
export interface ICache<T = any> {
    get(key: string): Promise<T | undefined>;
    set(key: string, value: T, ttl?: number): Promise<void>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    getMany(keys: string[]): Promise<Map<string, T>>;
    setMany(entries: Map<string, T>, ttl?: number): Promise<void>;
    deleteMany(keys: string[]): Promise<number>;
    getEntry(key: string): Promise<ICacheEntry<T> | undefined>;
    getTTL(key: string): Promise<number | undefined>;
    setTTL(key: string, ttl: number): Promise<boolean>;
    getStats(): ICacheStats;
    getSize(): number;
    getCount(): number;
    on(event: 'set' | 'get' | 'delete' | 'evict' | 'expire', handler: (key: string) => void): void;
    off(event: string, handler: (key: string) => void): void;
}
/**
 * Cache with tagging support
 */
export interface ITaggedCache<T = any> extends ICache<T> {
    setWithTags(key: string, value: T, tags: string[], ttl?: number): Promise<void>;
    getByTag(tag: string): Promise<Map<string, T>>;
    getByTags(tags: string[], mode: 'any' | 'all'): Promise<Map<string, T>>;
    deleteByTag(tag: string): Promise<number>;
    deleteByTags(tags: string[], mode: 'any' | 'all'): Promise<number>;
    getTags(key: string): Promise<string[]>;
    addTags(key: string, tags: string[]): Promise<boolean>;
    removeTags(key: string, tags: string[]): Promise<boolean>;
}
/**
 * Distributed cache interface
 */
export interface IDistributedCache<T = any> extends ICache<T> {
    sync(): Promise<void>;
    syncKey(key: string): Promise<void>;
    getLastSync(): number;
    resolveConflict(key: string, local: T, remote: T): Promise<T>;
    setConflictResolver(resolver: (key: string, local: T, remote: T) => T): void;
    getPartition(): string;
    setPartition(partition: string): void;
    getReplicas(): string[];
    addReplica(url: string): Promise<void>;
    removeReplica(url: string): Promise<void>;
}
/**
 * Cache synchronization interface
 */
export interface ICacheSync {
    configure(config: CacheSyncConfig): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    syncNow(): Promise<SyncResult>;
    isRunning(): boolean;
    getLastSyncTime(): number;
    getSyncStatus(): SyncStatus;
    getPendingChanges(): number;
    getConflicts(): ConflictEntry[];
    resolveConflict(id: string, resolution: 'local' | 'remote' | 'merge'): Promise<void>;
    setAutoResolveStrategy(strategy: 'local' | 'remote' | 'newest' | 'manual'): void;
}
/**
 * Cache sync configuration
 */
export interface CacheSyncConfig {
    syncInterval?: number;
    batchSize?: number;
    retryAttempts?: number;
    retryDelay?: number;
    conflictResolution?: 'local' | 'remote' | 'newest' | 'manual';
    syncDirection?: 'push' | 'pull' | 'bidirectional';
    syncFilter?: (entry: ICacheEntry) => boolean;
}
/**
 * Sync result
 */
export interface SyncResult {
    success: boolean;
    itemsSynced: number;
    itemsFailed: number;
    conflicts: number;
    duration: number;
    errors?: Error[];
}
/**
 * Sync status
 */
export interface SyncStatus {
    isRunning: boolean;
    lastSync?: number;
    nextSync?: number;
    pendingChanges: number;
    conflicts: number;
    errors: number;
}
/**
 * Conflict entry
 */
export interface ConflictEntry {
    id: string;
    key: string;
    localValue: any;
    remoteValue: any;
    localTimestamp: number;
    remoteTimestamp: number;
    type: 'update' | 'delete';
}
/**
 * Cache factory interface
 */
export interface ICacheFactory {
    createCache<T>(name: string, config?: ICacheConfig): ICache<T>;
    createTaggedCache<T>(name: string, config?: ICacheConfig): ITaggedCache<T>;
    createDistributedCache<T>(name: string, config?: ICacheConfig): IDistributedCache<T>;
    getCache<T>(name: string): ICache<T> | undefined;
    deleteCache(name: string): boolean;
    listCaches(): string[];
}
/**
 * Cache manager interface
 */
export interface ICacheManager {
    createCache<T>(name: string, config?: ICacheConfig): ICache<T>;
    getCache<T>(name: string): ICache<T> | undefined;
    deleteCache(name: string): boolean;
    clearAll(): Promise<void>;
    getGlobalStats(): Map<string, ICacheStats>;
    getTotalSize(): number;
    getTotalEntries(): number;
    setDefaultConfig(config: ICacheConfig): void;
    getDefaultConfig(): ICacheConfig;
    saveToStorage(): Promise<void>;
    loadFromStorage(): Promise<void>;
    on(event: 'create' | 'delete' | 'clear', handler: (name: string) => void): void;
    off(event: string, handler: (name: string) => void): void;
}
//# sourceMappingURL=cache.interface.d.ts.map
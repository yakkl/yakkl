import { Buffer } from 'buffer';

/**
 * @yakkl/cache Types
 * Unified type definitions for all caching strategies
 */
type CacheTier = 'hot' | 'warm' | 'cold';
type CacheStrategy = 'blockchain' | 'semantic' | 'transaction' | 'token' | 'generic';
interface CacheOptions {
    /** Cache tier determining storage location and TTL */
    tier?: CacheTier;
    /** Time to live in milliseconds */
    ttl?: number;
    /** Caching strategy to use */
    strategy?: CacheStrategy;
    /** Enable query deduplication */
    deduplicate?: boolean;
    /** Enable batch processing */
    batch?: boolean;
    /** Maximum items in cache (for memory tier) */
    maxSize?: number;
    /** Custom namespace for cache keys */
    namespace?: string;
    /** Enable compression for large data */
    compress?: boolean;
    /** Priority for cache operations (higher = more important) */
    priority?: number;
}
interface CacheEntry<T = any> {
    /** The cached value */
    value: T;
    /** Timestamp when entry was created */
    createdAt: number;
    /** Timestamp when entry expires */
    expiresAt: number;
    /** Number of times this entry has been accessed */
    hitCount: number;
    /** Last access timestamp */
    lastAccessedAt: number;
    /** Size of the entry in bytes */
    size?: number;
    /** Metadata about the entry */
    metadata?: CacheMetadata;
}
interface CacheMetadata {
    /** Source of the cached data */
    source?: string;
    /** Cost associated with fetching this data */
    cost?: number;
    /** Hash of the query that produced this data */
    queryHash?: string;
    /** Version of the cached data */
    version?: number;
    /** Tags for categorization */
    tags?: string[];
    /** Whether this data is immutable */
    immutable?: boolean;
}
interface CacheStats {
    /** Total number of cache hits */
    hits: number;
    /** Total number of cache misses */
    misses: number;
    /** Cache hit ratio */
    hitRatio: number;
    /** Total size of cached data in bytes */
    totalSize: number;
    /** Number of items in cache */
    itemCount: number;
    /** Number of evictions */
    evictions: number;
    /** Average response time for cache hits (ms) */
    avgHitTime: number;
    /** Average response time for cache misses (ms) */
    avgMissTime: number;
    /** Estimated cost savings from cache hits */
    costSavings?: number;
}
interface BlockchainCacheData {
    /** Chain ID */
    chainId: number;
    /** Block number when data was fetched */
    blockNumber?: number;
    /** Whether this data can change */
    mutable: boolean;
    /** Type of blockchain data */
    dataType: 'balance' | 'transaction' | 'block' | 'gas' | 'token' | 'nft' | 'ens';
}
interface SemanticCacheData {
    /** Text content */
    text: string;
    /** Vector embedding */
    embedding?: number[];
    /** Similarity score if from search */
    similarity?: number;
    /** Language of the content */
    language?: string;
    /** Category or topic */
    category?: string;
}
interface CacheProvider {
    /** Get value from cache */
    get<T>(key: string): Promise<T | null>;
    /** Set value in cache */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /** Delete value from cache */
    delete(key: string): Promise<boolean>;
    /** Clear all cached values */
    clear(): Promise<void>;
    /** Check if key exists */
    has(key: string): Promise<boolean>;
    /** Get multiple values */
    getMany<T>(keys: string[]): Promise<(T | null)[]>;
    /** Set multiple values */
    setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>;
    /** Get cache statistics */
    getStats(): Promise<CacheStats>;
    /** Get all keys matching pattern */
    keys(pattern?: string): Promise<string[]>;
    /** Get size of cached data */
    size(): Promise<number>;
}
interface CacheSyncEvent {
    /** Type of sync event */
    type: 'set' | 'delete' | 'clear' | 'invalidate';
    /** Cache key affected */
    key?: string;
    /** New value (for set events) */
    value?: any;
    /** Timestamp of the event */
    timestamp: number;
    /** Source of the sync event */
    source: 'local' | 'remote' | 'background' | 'ui';
}
interface QueryFingerprint {
    /** Unique hash of the query */
    hash: string;
    /** Original query parameters */
    params: Record<string, any>;
    /** Timestamp when query was made */
    timestamp: number;
    /** Whether this query is in progress */
    pending?: boolean;
    /** Promise that resolves when query completes */
    promise?: Promise<any>;
}
interface BatchOperation<T = any> {
    /** Unique ID for the operation */
    id: string;
    /** Type of operation */
    type: 'get' | 'set' | 'delete';
    /** Cache key(s) */
    keys: string | string[];
    /** Value(s) for set operations */
    values?: T | T[];
    /** Options for the operation */
    options?: CacheOptions;
    /** Callback when operation completes */
    callback?: (result: any) => void;
}
interface CacheConfig {
    /** Default TTL for each tier (ms) */
    tierTTL: {
        hot: number;
        warm: number;
        cold: number;
    };
    /** Maximum size for each tier */
    tierMaxSize: {
        hot: number;
        warm: number;
        cold: number;
    };
    /** Enable automatic tier promotion/demotion */
    autoTiering: boolean;
    /** Enable cross-context synchronization */
    enableSync: boolean;
    /** Enable metrics collection */
    enableMetrics: boolean;
    /** Enable compression for large values */
    enableCompression: boolean;
    /** Compression threshold in bytes */
    compressionThreshold: number;
    /** Batch processing configuration */
    batch: {
        enabled: boolean;
        maxSize: number;
        maxWait: number;
    };
    /** Deduplication configuration */
    dedupe: {
        enabled: boolean;
        ttl: number;
    };
}
/** Error types specific to caching */
declare class CacheError extends Error {
    code: 'CACHE_MISS' | 'CACHE_FULL' | 'SERIALIZATION_ERROR' | 'SYNC_ERROR' | 'INVALID_KEY';
    details?: any | undefined;
    constructor(message: string, code: 'CACHE_MISS' | 'CACHE_FULL' | 'SERIALIZATION_ERROR' | 'SYNC_ERROR' | 'INVALID_KEY', details?: any | undefined);
}
/** Cache key builder utility type */
type CacheKeyBuilder = (...args: any[]) => string;
/** Cache value transformer */
type CacheTransformer<T = any> = {
    serialize: (value: T) => string | ArrayBuffer;
    deserialize: (data: string | ArrayBuffer) => T;
};

/**
 * CacheManager - Central orchestrator for all caching operations
 * Manages multiple cache tiers and strategies with automatic promotion/demotion
 */

declare class CacheManager implements CacheProvider {
    private tiers;
    private strategies;
    private config;
    private deduplicator?;
    private batchProcessor?;
    private costTracker?;
    private syncListeners;
    private stats;
    constructor(config?: Partial<CacheConfig>);
    private mergeConfig;
    private initStats;
    private initializeTiers;
    private initializeUtilities;
    private setupSynchronization;
    private handleSyncEvent;
    /**
     * Get value from cache with automatic tier checking
     */
    get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    /**
     * Set value in cache with automatic tier selection
     */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * Delete value from all tiers
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all caches
     */
    clear(): Promise<void>;
    /**
     * Check if key exists in any tier
     */
    has(key: string): Promise<boolean>;
    /**
     * Get multiple values efficiently
     */
    getMany<T>(keys: string[]): Promise<(T | null)[]>;
    /**
     * Set multiple values efficiently
     */
    setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<CacheStats>;
    /**
     * Get all keys matching pattern
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get total size of cached data
     */
    size(): Promise<number>;
    /**
     * Register a strategy for specific cache operations
     */
    registerStrategy(name: CacheStrategy, strategy: any): void;
    /**
     * Add sync event listener
     */
    onSync(listener: (event: CacheSyncEvent) => void): () => void;
    private getFromTiers;
    private setInTiers;
    private deleteFromTiers;
    private selectTier;
    private promote;
    private updateStats;
}

/**
 * MemoryCache - Fast in-memory LRU cache for hot data
 * Uses LRU eviction policy to keep most frequently accessed data
 */

interface MemoryCacheOptions {
    maxSize?: number;
    ttl?: number;
    updateAgeOnGet?: boolean;
    updateAgeOnHas?: boolean;
}
declare class MemoryCache implements CacheProvider {
    private cache;
    private stats;
    private defaultTTL;
    constructor(options?: MemoryCacheOptions);
    private initStats;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    getMany<T>(keys: string[]): Promise<(T | null)[]>;
    setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>;
    getStats(): Promise<CacheStats>;
    keys(pattern?: string): Promise<string[]>;
    size(): Promise<number>;
    private estimateSize;
    private updateStats;
    /**
     * Get cache dump for debugging
     */
    dump(): Array<[string, CacheEntry]>;
    /**
     * Load cache from dump
     */
    load(entries: Array<[string, CacheEntry]>): void;
}

/**
 * IndexedDBCache - Persistent browser storage using IndexedDB
 * Provides larger storage capacity than localStorage with async API
 */

interface IndexedDBCacheOptions {
    dbName?: string;
    storeName?: string;
    maxSize?: number;
    ttl?: number;
    version?: number;
}
declare class IndexedDBCache implements CacheProvider {
    private db;
    private dbName;
    private storeName;
    private maxSize;
    private defaultTTL;
    private stats;
    private initPromise;
    constructor(options?: IndexedDBCacheOptions);
    private initStats;
    private initializeDB;
    private ensureDB;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    getMany<T>(keys: string[]): Promise<(T | null)[]>;
    setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>;
    getStats(): Promise<CacheStats>;
    keys(pattern?: string): Promise<string[]>;
    size(): Promise<number>;
    private count;
    private cleanupExpired;
    private enforceMaxSize;
    private estimateSize;
    private updateStats;
}

/**
 * PersistentCache - Long-term storage with compression for cold data
 * Uses localStorage/sessionStorage with compression for large data sets
 */

interface PersistentCacheOptions {
    storageType?: 'local' | 'session';
    maxSize?: number;
    ttl?: number;
    compress?: boolean;
    compressionThreshold?: number;
    prefix?: string;
}
declare class PersistentCache implements CacheProvider {
    private storage;
    private maxSize;
    private defaultTTL;
    private compress;
    private compressionThreshold;
    private prefix;
    private stats;
    constructor(options?: PersistentCacheOptions);
    private initStats;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    getMany<T>(keys: string[]): Promise<(T | null)[]>;
    setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void>;
    getStats(): Promise<CacheStats>;
    keys(pattern?: string): Promise<string[]>;
    size(): Promise<number>;
    private serialize;
    private deserialize;
    private compressString;
    private decompressString;
    private simpleLZCompress;
    private simpleLZDecompress;
    private getAllKeys;
    private getItemCount;
    private getTotalSize;
    private hasStorageSpace;
    private evictOldest;
    private cleanupExpired;
    private estimateSize;
    private updateStats;
}

/**
 * BlockchainCache - Specialized caching strategy for blockchain data
 * Implements intelligent TTL based on data mutability and cost optimization
 */

interface BlockchainQuery {
    method: string;
    params: any[];
    chainId: number;
    blockNumber?: number;
}
interface RPCCost {
    method: string;
    computeUnits: number;
    dollarCost: number;
}
declare class BlockchainCache {
    private cacheManager;
    private rpcCosts;
    private totalSavings;
    constructor(cacheManager: CacheManager);
    private initializeRPCCosts;
    /**
     * Get cached blockchain data with intelligent TTL
     */
    get<T>(query: BlockchainQuery): Promise<T | null>;
    /**
     * Cache blockchain data with appropriate strategy
     */
    set<T>(query: BlockchainQuery, data: T): Promise<void>;
    /**
     * Batch multiple blockchain queries efficiently
     */
    batchGet<T>(queries: BlockchainQuery[]): Promise<(T | null)[]>;
    /**
     * Batch set multiple blockchain results
     */
    batchSet<T>(queries: Array<{
        query: BlockchainQuery;
        data: T;
    }>): Promise<void>;
    /**
     * Invalidate cache for specific block range
     */
    invalidateBlockRange(chainId: number, fromBlock: number, toBlock: number): Promise<void>;
    /**
     * Get total cost savings from cache hits
     */
    getTotalSavings(): number;
    /**
     * Build cache key from query parameters
     */
    private buildCacheKey;
    /**
     * Determine cache options based on query type
     */
    private getCacheOptions;
    /**
     * Determine data type from RPC method
     */
    private getDataType;
    /**
     * Determine if data is mutable
     */
    private getDataMutability;
    /**
     * Check if block is recent (might reorg)
     */
    private isRecentBlock;
    /**
     * Simple string hash for cache keys
     */
    private hashString;
    /**
     * Optimize batch queries by deduplicating and caching
     */
    optimizeBatchQuery<T>(queries: BlockchainQuery[], fetcher: (queries: BlockchainQuery[]) => Promise<T[]>): Promise<T[]>;
}

/**
 * VectorDBManager - Unified interface for vector database operations
 * Supports multiple vector database providers with consistent API
 */
interface VectorDocument {
    id: string;
    vector: number[];
    metadata?: Record<string, any>;
    text?: string;
}
interface VectorSearchResult {
    id: string;
    score: number;
    vector?: number[];
    metadata?: Record<string, any>;
    text?: string;
}
interface VectorDBConfig {
    provider: 'cloudflare' | 'postgres' | 'pinecone' | 'weaviate' | 'qdrant' | 'chroma';
    connectionString?: string;
    apiKey?: string;
    environment?: string;
    namespace?: string;
    dimension?: number;
    metric?: 'cosine' | 'euclidean' | 'dotproduct';
    indexName?: string;
}
interface VectorDBProvider {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    createIndex(name: string, dimension: number, metric?: string): Promise<void>;
    deleteIndex(name: string): Promise<void>;
    listIndexes(): Promise<string[]>;
    upsert(documents: VectorDocument[]): Promise<void>;
    delete(ids: string[]): Promise<void>;
    fetch(ids: string[]): Promise<VectorDocument[]>;
    search(vector: number[], topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
    searchByText(text: string, topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
    getStats(): Promise<{
        documentCount: number;
        indexSize: number;
    }>;
}
declare class VectorDBManager {
    private provider;
    private config;
    private isConnected;
    constructor(config: VectorDBConfig);
    initialize(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Create a new vector index
     */
    createIndex(name: string, dimension?: number, metric?: string): Promise<void>;
    /**
     * Delete a vector index
     */
    deleteIndex(name: string): Promise<void>;
    /**
     * List all indexes
     */
    listIndexes(): Promise<string[]>;
    /**
     * Upsert documents with vectors
     */
    upsert(documents: VectorDocument[]): Promise<void>;
    /**
     * Delete documents by IDs
     */
    delete(ids: string[]): Promise<void>;
    /**
     * Fetch documents by IDs
     */
    fetch(ids: string[]): Promise<VectorDocument[]>;
    /**
     * Search for similar vectors
     */
    search(vector: number[], topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
    /**
     * Search by text (requires embedding generation)
     */
    searchByText(text: string, topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[]>;
    /**
     * Get database statistics
     */
    getStats(): Promise<{
        documentCount: number;
        indexSize: number;
    }>;
    /**
     * Batch upsert with automatic chunking
     */
    batchUpsert(documents: VectorDocument[], chunkSize?: number): Promise<void>;
    /**
     * Hybrid search combining vector similarity and metadata filters
     */
    hybridSearch(vector: number[], filter: Record<string, any>, topK?: number, vectorWeight?: number): Promise<VectorSearchResult[]>;
    /**
     * Find nearest neighbors for multiple vectors
     */
    batchSearch(vectors: number[][], topK?: number, filter?: Record<string, any>): Promise<VectorSearchResult[][]>;
    private ensureConnected;
    /**
     * Create a collection with automatic index configuration
     */
    createCollection(name: string, schema?: {
        dimension?: number;
        metric?: string;
        fields?: Array<{
            name: string;
            type: string;
            indexed?: boolean;
        }>;
    }): Promise<void>;
    /**
     * Get similar documents with pagination
     */
    getSimilar(id: string, topK?: number, offset?: number): Promise<VectorSearchResult[]>;
}

/**
 * SemanticCache - Intelligent caching for support questions using embeddings
 * Finds similar questions and reuses answers for better support experience
 */

interface SemanticQuery {
    id: string;
    question: string;
    answer: string;
    embedding?: number[];
    category?: string;
    confidence?: number;
    metadata?: {
        source?: 'user' | 'agent' | 'documentation' | 'faq';
        timestamp?: number;
        helpful?: boolean;
        votes?: number;
        tags?: string[];
        language?: string;
    };
}
interface SemanticSearchOptions {
    threshold?: number;
    topK?: number;
    category?: string;
    includeMetadata?: boolean;
    boostRecent?: boolean;
    boostHelpful?: boolean;
}
interface EmbeddingProvider {
    generate(text: string): Promise<number[]>;
    generateBatch(texts: string[]): Promise<number[][]>;
}
declare class SemanticCache {
    private cacheManager;
    private vectorDB;
    private embeddingProvider;
    private similarityThreshold;
    private stats;
    constructor(cacheManager: CacheManager, vectorDB?: VectorDBManager, embeddingProvider?: EmbeddingProvider);
    /**
     * Set embedding provider for generating vectors
     */
    setEmbeddingProvider(provider: EmbeddingProvider): void;
    /**
     * Set vector database for similarity search
     */
    setVectorDB(vectorDB: VectorDBManager): void;
    /**
     * Find similar questions and return cached answer if available
     */
    findSimilar(question: string, options?: SemanticSearchOptions): Promise<SemanticQuery[]>;
    /**
     * Learn from a new question-answer pair
     */
    learn(query: SemanticQuery): Promise<void>;
    /**
     * Learn from multiple Q&A pairs
     */
    learnBatch(queries: SemanticQuery[]): Promise<void>;
    /**
     * Update answer feedback (helpful/not helpful)
     */
    updateFeedback(questionId: string, helpful: boolean, additionalMetadata?: Record<string, any>): Promise<void>;
    /**
     * Get frequently asked questions
     */
    getFAQs(category?: string, limit?: number): Promise<SemanticQuery[]>;
    /**
     * Search by category and tags
     */
    searchByMetadata(filters: {
        category?: string;
        tags?: string[];
        source?: string;
        language?: string;
    }, limit?: number): Promise<SemanticQuery[]>;
    /**
     * Clear semantic cache for a category
     */
    clearCategory(category: string): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): {
        queries: number;
        hits: number;
        misses: number;
        hitRate: number;
        learned: number;
        avgConfidence: number;
    };
    /**
     * Reset statistics
     */
    resetStats(): void;
    private getCacheKey;
    private hashString;
    private generateId;
}
/**
 * Mock embedding provider for development
 */
declare class MockEmbeddingProvider implements EmbeddingProvider {
    generate(text: string): Promise<number[]>;
    generateBatch(texts: string[]): Promise<number[][]>;
}

/**
 * SQLManager - Unified interface for SQL database operations
 * Supports multiple SQL database providers with consistent API
 */
interface SQLConfig {
    provider: 'postgres' | 'cloudflare-d1' | 'sqlite' | 'mysql' | 'cockroachdb';
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    ssl?: boolean | {
        rejectUnauthorized?: boolean;
    };
    poolSize?: number;
    idleTimeout?: number;
    maxRetries?: number;
    retryDelay?: number;
}
interface SQLQuery {
    text: string;
    values?: any[];
    name?: string;
}
interface SQLResult<T = any> {
    rows: T[];
    rowCount: number;
    fields?: Array<{
        name: string;
        type: string;
    }>;
    command?: string;
}
interface SQLTransaction {
    query<T>(query: SQLQuery): Promise<SQLResult<T>>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
interface SQLProvider {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query<T>(query: SQLQuery): Promise<SQLResult<T>>;
    queryOne<T>(query: SQLQuery): Promise<T | null>;
    queryMany<T>(query: SQLQuery): Promise<T[]>;
    prepare(name: string, text: string): Promise<void>;
    execute<T>(name: string, values?: any[]): Promise<SQLResult<T>>;
    beginTransaction(): Promise<SQLTransaction>;
    batch<T>(queries: SQLQuery[]): Promise<SQLResult<T>[]>;
    createTable(name: string, schema: TableSchema): Promise<void>;
    dropTable(name: string, ifExists?: boolean): Promise<void>;
    tableExists(name: string): Promise<boolean>;
    getTableSchema(name: string): Promise<TableSchema | null>;
    ping(): Promise<boolean>;
    getVersion(): Promise<string>;
    getStats(): Promise<DatabaseStats>;
}
interface TableSchema {
    columns: Array<{
        name: string;
        type: string;
        primaryKey?: boolean;
        unique?: boolean;
        notNull?: boolean;
        default?: any;
        references?: {
            table: string;
            column: string;
        };
    }>;
    indexes?: Array<{
        name: string;
        columns: string[];
        unique?: boolean;
    }>;
}
interface DatabaseStats {
    connectionCount: number;
    activeQueries: number;
    totalQueries: number;
    avgQueryTime: number;
    databaseSize?: number;
    tableCount?: number;
}
declare class SQLManager {
    private provider;
    private config;
    private isConnected;
    private queryCache;
    private cacheTimeout;
    constructor(config: SQLConfig);
    initialize(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Execute a SQL query
     */
    query<T>(query: SQLQuery, useCache?: boolean): Promise<SQLResult<T>>;
    /**
     * Execute a query expecting a single row result
     */
    queryOne<T>(query: SQLQuery, useCache?: boolean): Promise<T | null>;
    /**
     * Execute a query expecting multiple rows
     */
    queryMany<T>(query: SQLQuery, useCache?: boolean): Promise<T[]>;
    /**
     * Prepare a statement for repeated execution
     */
    prepare(name: string, text: string): Promise<void>;
    /**
     * Execute a prepared statement
     */
    execute<T>(name: string, values?: any[]): Promise<SQLResult<T>>;
    /**
     * Begin a transaction
     */
    beginTransaction(): Promise<SQLTransaction>;
    /**
     * Execute multiple queries in a batch
     */
    batch<T>(queries: SQLQuery[]): Promise<SQLResult<T>[]>;
    /**
     * Create a table
     */
    createTable(name: string, schema: TableSchema): Promise<void>;
    /**
     * Drop a table
     */
    dropTable(name: string, ifExists?: boolean): Promise<void>;
    /**
     * Check if a table exists
     */
    tableExists(name: string): Promise<boolean>;
    /**
     * Get table schema
     */
    getTableSchema(name: string): Promise<TableSchema | null>;
    /**
     * Test connection
     */
    ping(): Promise<boolean>;
    /**
     * Get database version
     */
    getVersion(): Promise<string>;
    /**
     * Get database statistics
     */
    getStats(): Promise<DatabaseStats>;
    /**
     * Execute a parameterized query (safe from SQL injection)
     */
    safeQuery<T>(text: string, values?: any[]): Promise<SQLResult<T>>;
    /**
     * Insert data into a table
     */
    insert<T>(table: string, data: Record<string, any>, returning?: string[]): Promise<T | null>;
    /**
     * Update data in a table
     */
    update<T>(table: string, data: Record<string, any>, where: Record<string, any>, returning?: string[]): Promise<T[]>;
    /**
     * Delete data from a table
     */
    delete<T>(table: string, where: Record<string, any>, returning?: string[]): Promise<T[]>;
    /**
     * Select data from a table with options
     */
    select<T>(options: {
        table: string;
        columns?: string[];
        where?: Record<string, any>;
        orderBy?: Array<{
            column: string;
            direction?: 'ASC' | 'DESC';
        }>;
        limit?: number;
        offset?: number;
    }): Promise<T[]>;
    private ensureConnected;
    private getCacheKey;
    /**
     * Clear query cache
     */
    clearCache(): void;
    /**
     * Set cache timeout
     */
    setCacheTimeout(ms: number): void;
}

/**
 * ObjectStorageManager - Unified interface for object/blob storage operations
 * Supports multiple cloud storage providers with consistent API
 */

interface ObjectStorageConfig {
    provider: 's3' | 'gcs' | 'azure' | 'cloudflare-r2' | 'backblaze-b2' | 'minio';
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    bucket?: string;
    projectId?: string;
    accountName?: string;
    accountKey?: string;
    connectionString?: string;
    apiKey?: string;
    applicationKeyId?: string;
    applicationKey?: string;
    maxRetries?: number;
    timeout?: number;
    useSSL?: boolean;
}
interface ObjectMetadata {
    contentType?: string;
    contentLength?: number;
    contentEncoding?: string;
    contentLanguage?: string;
    cacheControl?: string;
    contentDisposition?: string;
    lastModified?: Date;
    etag?: string;
    customMetadata?: Record<string, string>;
    storageClass?: string;
    encryption?: string;
    versionId?: string;
}
interface ListObjectsOptions {
    prefix?: string;
    delimiter?: string;
    maxKeys?: number;
    continuationToken?: string;
    startAfter?: string;
    includeVersions?: boolean;
}
interface ListObjectsResult {
    objects: Array<{
        key: string;
        size: number;
        lastModified: Date;
        etag?: string;
        storageClass?: string;
        owner?: {
            id: string;
            displayName: string;
        };
    }>;
    commonPrefixes?: string[];
    isTruncated: boolean;
    continuationToken?: string;
    keyCount: number;
}
interface UploadOptions {
    metadata?: ObjectMetadata;
    partSize?: number;
    concurrency?: number;
    progress?: (loaded: number, total: number) => void;
    abortSignal?: AbortSignal;
}
interface DownloadOptions {
    range?: {
        start: number;
        end: number;
    };
    versionId?: string;
    progress?: (loaded: number, total: number) => void;
    abortSignal?: AbortSignal;
}
interface SignedUrlOptions {
    expires?: number;
    method?: 'GET' | 'PUT' | 'DELETE';
    contentType?: string;
    contentDisposition?: string;
    customHeaders?: Record<string, string>;
}
interface CopyOptions {
    metadata?: ObjectMetadata;
    metadataDirective?: 'COPY' | 'REPLACE';
    tagging?: Record<string, string>;
    storageClass?: string;
}
interface ObjectStorageProvider {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    createBucket(name: string, options?: {
        region?: string;
        acl?: string;
    }): Promise<void>;
    deleteBucket(name: string): Promise<void>;
    listBuckets(): Promise<Array<{
        name: string;
        creationDate: Date;
    }>>;
    bucketExists(name: string): Promise<boolean>;
    putObject(bucket: string, key: string, data: Buffer | Uint8Array | ReadableStream | string, options?: UploadOptions): Promise<{
        etag?: string;
        versionId?: string;
    }>;
    getObject(bucket: string, key: string, options?: DownloadOptions): Promise<{
        data: Buffer;
        metadata: ObjectMetadata;
    }>;
    deleteObject(bucket: string, key: string, versionId?: string): Promise<void>;
    deleteObjects(bucket: string, keys: Array<{
        key: string;
        versionId?: string;
    }>): Promise<Array<{
        key: string;
        error?: string;
    }>>;
    copyObject(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string, options?: CopyOptions): Promise<{
        etag?: string;
    }>;
    headObject(bucket: string, key: string, versionId?: string): Promise<ObjectMetadata>;
    objectExists(bucket: string, key: string): Promise<boolean>;
    listObjects(bucket: string, options?: ListObjectsOptions): Promise<ListObjectsResult>;
    getSignedUrl(bucket: string, key: string, options?: SignedUrlOptions): Promise<string>;
    createMultipartUpload(bucket: string, key: string, metadata?: ObjectMetadata): Promise<string>;
    uploadPart(bucket: string, key: string, uploadId: string, partNumber: number, data: Buffer | Uint8Array): Promise<{
        etag: string;
    }>;
    completeMultipartUpload(bucket: string, key: string, uploadId: string, parts: Array<{
        partNumber: number;
        etag: string;
    }>): Promise<{
        etag?: string;
        location?: string;
    }>;
    abortMultipartUpload(bucket: string, key: string, uploadId: string): Promise<void>;
    getStats(): Promise<{
        totalObjects?: number;
        totalSize?: number;
        bandwidthUsed?: number;
    }>;
}
declare class ObjectStorageManager {
    private provider;
    private config;
    private isConnected;
    private defaultBucket;
    constructor(config: ObjectStorageConfig);
    initialize(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Upload an object to storage
     */
    upload(key: string, data: Buffer | Uint8Array | ReadableStream | string, options?: UploadOptions & {
        bucket?: string;
    }): Promise<{
        etag?: string;
        versionId?: string;
        url?: string;
    }>;
    /**
     * Download an object from storage
     */
    download(key: string, options?: DownloadOptions & {
        bucket?: string;
    }): Promise<{
        data: Buffer;
        metadata: ObjectMetadata;
    }>;
    /**
     * Delete an object
     */
    delete(key: string, options?: {
        bucket?: string;
        versionId?: string;
    }): Promise<void>;
    /**
     * Delete multiple objects
     */
    deleteMany(keys: Array<{
        key: string;
        versionId?: string;
    }>, options?: {
        bucket?: string;
    }): Promise<Array<{
        key: string;
        error?: string;
    }>>;
    /**
     * Copy an object
     */
    copy(sourceKey: string, destKey: string, options?: CopyOptions & {
        sourceBucket?: string;
        destBucket?: string;
    }): Promise<{
        etag?: string;
    }>;
    /**
     * Get object metadata without downloading
     */
    getMetadata(key: string, options?: {
        bucket?: string;
        versionId?: string;
    }): Promise<ObjectMetadata>;
    /**
     * Check if object exists
     */
    exists(key: string, options?: {
        bucket?: string;
    }): Promise<boolean>;
    /**
     * List objects in bucket
     */
    list(options?: ListObjectsOptions & {
        bucket?: string;
    }): Promise<ListObjectsResult>;
    /**
     * Get a signed/presigned URL for an object
     */
    getSignedUrl(key: string, options?: SignedUrlOptions & {
        bucket?: string;
    }): Promise<string>;
    /**
     * Get public URL for an object (if publicly accessible)
     */
    getUrl(key: string, options?: {
        bucket?: string;
    }): Promise<string>;
    /**
     * Upload large file using multipart upload
     */
    uploadLarge(key: string, data: Buffer | ReadableStream, options?: UploadOptions & {
        bucket?: string;
    }): Promise<{
        etag?: string;
        location?: string;
    }>;
    /**
     * Create a bucket
     */
    createBucket(name: string, options?: {
        region?: string;
        acl?: string;
    }): Promise<void>;
    /**
     * Delete a bucket
     */
    deleteBucket(name: string): Promise<void>;
    /**
     * List all buckets
     */
    listBuckets(): Promise<Array<{
        name: string;
        creationDate: Date;
    }>>;
    /**
     * Check if bucket exists
     */
    bucketExists(name: string): Promise<boolean>;
    /**
     * Set default bucket for operations
     */
    setDefaultBucket(bucket: string): void;
    /**
     * Get storage statistics
     */
    getStats(): Promise<{
        totalObjects?: number;
        totalSize?: number;
        bandwidthUsed?: number;
    }>;
    private ensureConnected;
}

/**
 * KVStoreManager - Unified interface for key-value store operations
 * Supports multiple KV store providers with consistent API
 */
interface KVStoreConfig {
    provider: 'cloudflare-kv' | 'redis' | 'upstash' | 'memcached' | 'dynamodb' | 'etcd';
    connectionString?: string;
    host?: string;
    port?: number;
    password?: string;
    database?: number;
    namespace?: string;
    bindingName?: string;
    apiToken?: string;
    accountId?: string;
    region?: string;
    tableName?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    maxRetries?: number;
    retryDelay?: number;
    connectionTimeout?: number;
}
interface KVMetadata {
    expiration?: number;
    expirationTtl?: number;
    metadata?: Record<string, any>;
    version?: string;
    cas?: number;
}
interface KVListOptions {
    prefix?: string;
    limit?: number;
    cursor?: string;
}
interface KVListResult {
    keys: Array<{
        name: string;
        expiration?: number;
        metadata?: Record<string, any>;
    }>;
    list_complete: boolean;
    cursor?: string;
}
interface KVTransaction {
    get(key: string): KVTransaction;
    set(key: string, value: any, metadata?: KVMetadata): KVTransaction;
    delete(key: string): KVTransaction;
    execute(): Promise<any[]>;
}
interface KVStoreProvider {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get<T = any>(key: string): Promise<T | null>;
    getWithMetadata<T = any>(key: string): Promise<{
        value: T | null;
        metadata?: KVMetadata;
    }>;
    set(key: string, value: any, metadata?: KVMetadata): Promise<void>;
    delete(key: string): Promise<boolean>;
    getMany<T = any>(keys: string[]): Promise<Map<string, T>>;
    setMany(entries: Array<{
        key: string;
        value: any;
        metadata?: KVMetadata;
    }>): Promise<void>;
    deleteMany(keys: string[]): Promise<number>;
    increment(key: string, amount?: number): Promise<number>;
    decrement(key: string, amount?: number): Promise<number>;
    compareAndSwap(key: string, oldValue: any, newValue: any): Promise<boolean>;
    setIfNotExists(key: string, value: any, metadata?: KVMetadata): Promise<boolean>;
    list(options?: KVListOptions): Promise<KVListResult>;
    keys(pattern?: string): Promise<string[]>;
    expire(key: string, seconds: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    persist(key: string): Promise<boolean>;
    transaction?(): KVTransaction;
    exists(key: string): Promise<boolean>;
    type(key: string): Promise<string>;
    size(key: string): Promise<number>;
    flush(): Promise<void>;
    ping(): Promise<boolean>;
    getStats(): Promise<{
        keys: number;
        size: number;
        hits?: number;
        misses?: number;
        evictions?: number;
    }>;
}
declare class KVStoreManager {
    private provider;
    private config;
    private isConnected;
    private defaultTTL;
    private cache;
    private cacheEnabled;
    constructor(config: KVStoreConfig);
    initialize(): Promise<void>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Get a value by key
     */
    get<T = any>(key: string, useCache?: boolean): Promise<T | null>;
    /**
     * Get value with metadata
     */
    getWithMetadata<T = any>(key: string): Promise<{
        value: T | null;
        metadata?: KVMetadata;
    }>;
    /**
     * Set a value with optional TTL and metadata
     */
    set(key: string, value: any, options?: {
        ttl?: number;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Delete a key
     */
    delete(key: string): Promise<boolean>;
    /**
     * Get multiple values
     */
    getMany<T = any>(keys: string[]): Promise<Map<string, T>>;
    /**
     * Set multiple values
     */
    setMany(entries: Array<{
        key: string;
        value: any;
        ttl?: number;
        metadata?: Record<string, any>;
    }>): Promise<void>;
    /**
     * Delete multiple keys
     */
    deleteMany(keys: string[]): Promise<number>;
    /**
     * Increment a numeric value
     */
    increment(key: string, amount?: number): Promise<number>;
    /**
     * Decrement a numeric value
     */
    decrement(key: string, amount?: number): Promise<number>;
    /**
     * Compare and swap - atomic update if value matches
     */
    compareAndSwap(key: string, oldValue: any, newValue: any): Promise<boolean>;
    /**
     * Set if not exists
     */
    setIfNotExists(key: string, value: any, options?: {
        ttl?: number;
        metadata?: Record<string, any>;
    }): Promise<boolean>;
    /**
     * List keys with optional prefix
     */
    list(options?: KVListOptions): Promise<KVListResult>;
    /**
     * Get all keys matching pattern
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Set expiration on a key
     */
    expire(key: string, seconds: number): Promise<boolean>;
    /**
     * Get remaining TTL
     */
    ttl(key: string): Promise<number>;
    /**
     * Remove expiration
     */
    persist(key: string): Promise<boolean>;
    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get type of value
     */
    type(key: string): Promise<string>;
    /**
     * Get size of value in bytes
     */
    size(key: string): Promise<number>;
    /**
     * Clear all data
     */
    flush(): Promise<void>;
    /**
     * Test connection
     */
    ping(): Promise<boolean>;
    /**
     * Get statistics
     */
    getStats(): Promise<{
        keys: number;
        size: number;
        hits?: number;
        misses?: number;
        evictions?: number;
    }>;
    /**
     * Begin a transaction (if supported)
     */
    transaction(): KVTransaction;
    /**
     * Enable local caching
     */
    enableCache(): void;
    /**
     * Disable local caching
     */
    disableCache(): void;
    /**
     * Clear local cache
     */
    clearCache(): void;
    /**
     * Set default TTL
     */
    setDefaultTTL(seconds: number): void;
    private ensureConnected;
    /**
     * JSON-safe operations
     */
    getJSON<T = any>(key: string): Promise<T | null>;
    setJSON(key: string, value: any, options?: {
        ttl?: number;
        metadata?: Record<string, any>;
    }): Promise<void>;
}

/**
 * Deduplicator - Prevents duplicate concurrent requests
 * Ensures only one request is made for the same resource
 */
interface DeduplicatorOptions {
    ttl?: number;
    keyGenerator?: (...args: any[]) => string;
    onDeduplicated?: (key: string) => void;
}
declare class Deduplicator {
    private pending;
    private results;
    private ttl;
    private keyGenerator;
    private stats;
    constructor(options?: DeduplicatorOptions);
    /**
     * Wrap an async function to deduplicate concurrent calls
     */
    wrap<T extends (...args: any[]) => Promise<any>>(fn: T, options?: DeduplicatorOptions): T;
    /**
     * Execute a function with deduplication
     */
    execute<T>(key: string, fn: () => Promise<T>, ttl?: number, onDeduplicated?: (key: string) => void): Promise<T>;
    /**
     * Alias for execute for better readability
     */
    deduplicate<T>(key: string, fn: () => Promise<T>, ttl?: number, onDeduplicated?: (key: string) => void): Promise<T>;
    /**
     * Clear all pending and cached results
     */
    clear(): void;
    /**
     * Clear specific key
     */
    clearKey(key: string): void;
    /**
     * Get statistics
     */
    getStats(): {
        totalRequests: number;
        deduplicatedRequests: number;
        deduplicationRatio: number;
        cacheHits: number;
        cacheMisses: number;
        cacheHitRatio: number;
        pendingRequests: number;
        cachedResults: number;
    };
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Cleanup expired results
     */
    private cleanup;
    /**
     * Create a deduplication group with shared state
     */
    static createGroup(options?: DeduplicatorOptions): DeduplicatorGroup;
}
/**
 * DeduplicatorGroup - Manage multiple deduplicators with shared configuration
 */
declare class DeduplicatorGroup {
    private deduplicators;
    private defaultOptions;
    constructor(options?: DeduplicatorOptions);
    /**
     * Get or create a deduplicator for a namespace
     */
    get(namespace: string): Deduplicator;
    /**
     * Clear all deduplicators
     */
    clearAll(): void;
    /**
     * Get combined statistics
     */
    getStats(): Record<string, any>;
}

/**
 * BatchProcessor - Groups multiple requests into batches for efficient processing
 * Reduces API calls and improves performance
 */
interface BatchProcessorOptions<T, R> {
    maxBatchSize?: number;
    maxWaitTime?: number;
    concurrency?: number;
    processor: (batch: T[]) => Promise<R[]>;
    keyExtractor?: (item: T) => string;
    resultMapper?: (items: T[], results: R[]) => Map<T, R>;
}
declare class BatchProcessor<T, R> {
    private queue;
    private promises;
    private timer;
    private processing;
    private pQueue;
    private options;
    private stats;
    constructor(options: BatchProcessorOptions<T, R>);
    /**
     * Add an item to be processed
     */
    add(item: T): Promise<R>;
    /**
     * Add multiple items
     */
    addMany(items: T[]): Promise<R[]>;
    /**
     * Process all pending items immediately
     */
    flush(): Promise<void>;
    /**
     * Wait for all pending items to be processed
     */
    waitForAll(): Promise<void>;
    /**
     * Clear all pending items
     */
    clear(): void;
    /**
     * Get statistics
     */
    getStats(): {
        totalItems: number;
        totalBatches: number;
        avgBatchSize: number;
        errors: number;
        errorRate: number;
        pendingItems: number;
        activeJobs: number;
    };
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Default result mapper - assumes results are in same order as items
     */
    private defaultResultMapper;
}
/**
 * AutoBatchProcessor - Automatically batches function calls
 */
declare class AutoBatchProcessor {
    private processors;
    /**
     * Create a batched version of a function
     */
    batch<T extends any[], R>(fn: (batch: T) => Promise<R[]>, options?: Partial<BatchProcessorOptions<T[0], R>>): (...args: T) => Promise<R>;
    /**
     * Clear all processors
     */
    clearAll(): void;
    /**
     * Get statistics for all processors
     */
    getStats(): Record<string, any>;
}

/**
 * CostTracker - Tracks RPC costs and calculates savings from caching
 * Monitors usage patterns and provides cost analytics
 */
interface RPCMethod {
    name: string;
    computeUnits: number;
    dollarCost: number;
    category: 'read' | 'write' | 'compute' | 'storage';
}
interface CostMetrics {
    method: string;
    calls: number;
    cachedCalls: number;
    totalCost: number;
    savedCost: number;
    avgResponseTime: number;
    cacheHitRate: number;
}
declare class CostTracker {
    private methods;
    private metrics;
    private sessionStartTime;
    private totalSavings;
    private totalCost;
    constructor();
    /**
     * Initialize with common RPC methods and their costs
     */
    private initializeDefaultMethods;
    /**
     * Register a new RPC method with its cost
     */
    registerMethod(method: RPCMethod): void;
    /**
     * Track an RPC call
     */
    trackCall(method: string, wasCached: boolean, responseTime?: number): void;
    /**
     * Track a batch of calls
     */
    trackBatch(method: string, count: number, cachedCount: number, avgResponseTime?: number): void;
    /**
     * Get metrics for a specific method
     */
    getMethodMetrics(method: string): CostMetrics | undefined;
    /**
     * Get all metrics
     */
    getAllMetrics(): CostMetrics[];
    /**
     * Get summary statistics
     */
    getSummary(): {
        sessionDuration: number;
        totalCalls: number;
        cachedCalls: number;
        cacheHitRate: number;
        totalCost: number;
        totalSavings: number;
        savingsPercentage: number;
        topMethods: Array<{
            method: string;
            calls: number;
            cost: number;
        }>;
        costByCategory: Record<string, number>;
        projectedMonthlySavings: number;
    };
    /**
     * Get cost breakdown by time period
     */
    getCostByPeriod(periodMs?: number): Array<{
        period: number;
        cost: number;
        savings: number;
        calls: number;
    }>;
    /**
     * Export metrics as CSV
     */
    exportCSV(): string;
    /**
     * Reset all metrics
     */
    reset(): void;
    /**
     * Calculate ROI for caching implementation
     */
    calculateROI(implementationCost: number): {
        breakEvenDays: number;
        monthlyROI: number;
        yearlyROI: number;
    };
}

/**
 * @yakkl/cache - Unified caching solution for YAKKL ecosystem
 * Provides multi-tier caching, storage abstractions, and intelligent strategies
 */

declare const CachePresets: {
    browserExtension: {
        hot: {
            provider: "memory";
            maxSize: number;
            ttl: number;
        };
        warm: {
            provider: "indexeddb";
            maxSize: number;
            ttl: number;
        };
        cold: {
            provider: "persistent";
            compress: boolean;
            ttl: number;
        };
        autoTiering: boolean;
        deduplication: boolean;
    };
    mcpServer: {
        hot: {
            provider: "memory";
            maxSize: number;
            ttl: number;
        };
        warm: {
            provider: "memory";
            maxSize: number;
            ttl: number;
        };
        autoTiering: boolean;
        deduplication: boolean;
        costTracking: boolean;
    };
    supportAgent: {
        hot: {
            provider: "memory";
            maxSize: number;
            ttl: number;
        };
        warm: {
            provider: "indexeddb";
            maxSize: number;
            ttl: number;
        };
        cold: {
            provider: "persistent";
            compress: boolean;
        };
        autoTiering: boolean;
        strategies: string[];
    };
    performance: {
        hot: {
            provider: "memory";
            maxSize: number;
            ttl: number;
        };
        autoTiering: boolean;
        deduplication: boolean;
    };
    costOptimized: {
        hot: {
            provider: "memory";
            maxSize: number;
            ttl: number;
        };
        warm: {
            provider: "indexeddb";
            maxSize: number;
            ttl: number;
        };
        cold: {
            provider: "persistent";
            compress: boolean;
            ttl: number;
        };
        autoTiering: boolean;
        deduplication: boolean;
        costTracking: boolean;
    };
};

declare function createCache(config?: Partial<CacheConfig>): CacheManager;

export { AutoBatchProcessor, type BatchOperation, BatchProcessor, type BatchProcessorOptions, BlockchainCache, type BlockchainCacheData, type BlockchainQuery, type CacheConfig, type CacheEntry, CacheError, type CacheKeyBuilder, CacheManager, type CacheConfig as CacheManagerConfig, type CacheMetadata, type CacheOptions, CachePresets, type CacheProvider, type CacheStats, type CacheStrategy, type CacheSyncEvent, type CacheTier, type CacheTransformer, type CopyOptions, type CostMetrics, CostTracker, type DatabaseStats, Deduplicator, DeduplicatorGroup, type DeduplicatorOptions, type DownloadOptions, type EmbeddingProvider, IndexedDBCache, type IndexedDBCacheOptions, type KVListOptions, type KVListResult, type KVMetadata, type KVStoreConfig, KVStoreManager, type KVStoreProvider, type KVTransaction, type ListObjectsOptions, type ListObjectsResult, MemoryCache, type MemoryCacheOptions, MockEmbeddingProvider, type ObjectMetadata, type ObjectStorageConfig, ObjectStorageManager, type ObjectStorageProvider, PersistentCache, type PersistentCacheOptions, type QueryFingerprint, type RPCCost, type RPCMethod, type SQLConfig, SQLManager, type SQLProvider, type SQLQuery, type SQLResult, type SQLTransaction, SemanticCache, type SemanticCacheData, type SemanticQuery, type SemanticSearchOptions, type SignedUrlOptions, type TableSchema, type UploadOptions, type VectorDBConfig, VectorDBManager, type VectorDBProvider, type VectorDocument, type VectorSearchResult, createCache };

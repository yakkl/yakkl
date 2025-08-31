/**
 * @yakkl/cache Types
 * Unified type definitions for all caching strategies
 */

export type CacheTier = 'hot' | 'warm' | 'cold';
export type CacheStrategy = 'blockchain' | 'semantic' | 'transaction' | 'token' | 'generic';

export interface CacheOptions {
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

export interface CacheEntry<T = any> {
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

export interface CacheMetadata {
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

export interface CacheStats {
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

export interface BlockchainCacheData {
  /** Chain ID */
  chainId: number;
  
  /** Block number when data was fetched */
  blockNumber?: number;
  
  /** Whether this data can change */
  mutable: boolean;
  
  /** Type of blockchain data */
  dataType: 'balance' | 'transaction' | 'block' | 'gas' | 'token' | 'nft' | 'ens';
}

export interface SemanticCacheData {
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

export interface CacheProvider {
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

export interface CacheSyncEvent {
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

export interface QueryFingerprint {
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

export interface BatchOperation<T = any> {
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

export interface CacheConfig {
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
export class CacheError extends Error {
  constructor(
    message: string,
    public code: 'CACHE_MISS' | 'CACHE_FULL' | 'SERIALIZATION_ERROR' | 'SYNC_ERROR' | 'INVALID_KEY',
    public details?: any
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

/** Cache key builder utility type */
export type CacheKeyBuilder = (...args: any[]) => string;

/** Cache value transformer */
export type CacheTransformer<T = any> = {
  serialize: (value: T) => string | ArrayBuffer;
  deserialize: (data: string | ArrayBuffer) => T;
};
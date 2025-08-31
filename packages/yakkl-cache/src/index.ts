/**
 * @yakkl/cache - Unified caching solution for YAKKL ecosystem
 * Provides multi-tier caching, storage abstractions, and intelligent strategies
 */

// Core
export { CacheManager } from './core/CacheManager';
export type { CacheConfig as CacheManagerConfig } from './types';
import type { CacheConfig } from './types';
import { CacheManager } from './core/CacheManager';// Types
export * from './types';

// Cache Tiers
export { MemoryCache } from './tiers/MemoryCache';
export type { MemoryCacheOptions } from './tiers/MemoryCache';

export { IndexedDBCache } from './tiers/IndexedDBCache';
export type { IndexedDBCacheOptions } from './tiers/IndexedDBCache';

export { PersistentCache } from './tiers/PersistentCache';
export type { PersistentCacheOptions } from './tiers/PersistentCache';

// Caching Strategies
export { BlockchainCache } from './strategies/BlockchainCache';
export type { BlockchainQuery, RPCCost } from './strategies/BlockchainCache';

export { SemanticCache, MockEmbeddingProvider } from './strategies/SemanticCache';
export type { 
  SemanticQuery, 
  SemanticSearchOptions, 
  EmbeddingProvider 
} from './strategies/SemanticCache';

// Storage Abstractions

// Vector Database
export { VectorDBManager } from './storage/vector/VectorDBManager';
export type {
  VectorDocument,
  VectorSearchResult,
  VectorDBConfig,
  VectorDBProvider
} from './storage/vector/VectorDBManager';

// SQL Database
export { SQLManager } from './storage/sql/SQLManager';
export type {
  SQLConfig,
  SQLQuery,
  SQLResult,
  SQLTransaction,
  SQLProvider,
  TableSchema,
  DatabaseStats
} from './storage/sql/SQLManager';

// Object Storage
export { ObjectStorageManager } from './storage/object/ObjectStorageManager';
export type {
  ObjectStorageConfig,
  ObjectMetadata,
  ListObjectsOptions,
  ListObjectsResult,
  UploadOptions,
  DownloadOptions,
  SignedUrlOptions,
  CopyOptions,
  ObjectStorageProvider
} from './storage/object/ObjectStorageManager';

// Key-Value Store
export { KVStoreManager } from './storage/kv/KVStoreManager';
export type {
  KVStoreConfig,
  KVMetadata,
  KVListOptions,
  KVListResult,
  KVTransaction,
  KVStoreProvider
} from './storage/kv/KVStoreManager';

// Utilities
export { Deduplicator, DeduplicatorGroup } from './utilities/Deduplicator';
export type { DeduplicatorOptions } from './utilities/Deduplicator';

export { BatchProcessor, AutoBatchProcessor } from './utilities/BatchProcessor';
export type { BatchProcessorOptions } from './utilities/BatchProcessor';

export { CostTracker } from './utilities/CostTracker';
export type { RPCMethod, CostMetrics } from './utilities/CostTracker';


// Preset configurations
export const CachePresets = {
  // For browser extension (yakkl-wallet)
  browserExtension: {
    hot: { provider: 'memory' as const, maxSize: 500, ttl: 60000 },
    warm: { provider: 'indexeddb' as const, maxSize: 5000, ttl: 300000 },
    cold: { provider: 'persistent' as const, compress: true, ttl: 86400000 },
    autoTiering: true,
    deduplication: true
  },
  
  // For MCP server (yakkl-mcp)
  mcpServer: {
    hot: { provider: 'memory' as const, maxSize: 2000, ttl: 30000 },
    warm: { provider: 'memory' as const, maxSize: 10000, ttl: 300000 },
    autoTiering: true,
    deduplication: true,
    costTracking: true
  },
  
  // For support agent
  supportAgent: {
    hot: { provider: 'memory' as const, maxSize: 100, ttl: 300000 },
    warm: { provider: 'indexeddb' as const, maxSize: 1000, ttl: 3600000 },
    cold: { provider: 'persistent' as const, compress: true },
    autoTiering: false,
    strategies: ['semantic']
  },
  
  // For high-performance scenarios
  performance: {
    hot: { provider: 'memory' as const, maxSize: 5000, ttl: 10000 },
    autoTiering: false,
    deduplication: true
  },
  
  // For cost optimization
  costOptimized: {
    hot: { provider: 'memory' as const, maxSize: 100, ttl: 5000 },
    warm: { provider: 'indexeddb' as const, maxSize: 1000, ttl: 60000 },
    cold: { provider: 'persistent' as const, compress: true, ttl: 3600000 },
    autoTiering: true,
    deduplication: true,
    costTracking: true
  }
};

// Re-export types for convenience
export type {
  CacheTier,
  CacheStrategy,
  CacheProvider,
  CacheEntry,
  CacheOptions,
  CacheStats
} from './types';// Factory function for quick setup
export function createCache(config?: Partial<CacheConfig>): CacheManager {
  return new CacheManager(config);
}

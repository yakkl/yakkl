/**
 * Cache-related interfaces for data caching and synchronization
 */

import type { HexString } from '../types';

/**
 * Cache entry with metadata
 */
export interface ICacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  hits?: number;
  size?: number; // Size in bytes
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
export enum CacheEvictionPolicy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  FIFO = 'fifo', // First In First Out
  TTL = 'ttl', // Time To Live based
  SIZE = 'size' // Size based
}

/**
 * Cache configuration
 */
export interface ICacheConfig {
  maxSize?: number; // Maximum cache size in bytes
  maxEntries?: number; // Maximum number of entries
  ttl?: number; // Default TTL for entries
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
  // Basic operations
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  
  // Bulk operations
  getMany(keys: string[]): Promise<Map<string, T>>;
  setMany(entries: Map<string, T>, ttl?: number): Promise<void>;
  deleteMany(keys: string[]): Promise<number>;
  
  // Metadata operations
  getEntry(key: string): Promise<ICacheEntry<T> | undefined>;
  getTTL(key: string): Promise<number | undefined>;
  setTTL(key: string, ttl: number): Promise<boolean>;
  
  // Statistics
  getStats(): ICacheStats;
  getSize(): number;
  getCount(): number;
  
  // Events
  on(event: 'set' | 'get' | 'delete' | 'evict' | 'expire', handler: (key: string) => void): void;
  off(event: string, handler: (key: string) => void): void;
}

/**
 * Cache with tagging support
 */
export interface ITaggedCache<T = any> extends ICache<T> {
  // Tag operations
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
  // Sync operations
  sync(): Promise<void>;
  syncKey(key: string): Promise<void>;
  getLastSync(): number;
  
  // Conflict resolution
  resolveConflict(key: string, local: T, remote: T): Promise<T>;
  setConflictResolver(resolver: (key: string, local: T, remote: T) => T): void;
  
  // Partitioning
  getPartition(): string;
  setPartition(partition: string): void;
  
  // Replication
  getReplicas(): string[];
  addReplica(url: string): Promise<void>;
  removeReplica(url: string): Promise<void>;
}

/**
 * Cache synchronization interface
 */
export interface ICacheSync {
  // Sync configuration
  configure(config: CacheSyncConfig): void;
  
  // Sync operations
  start(): Promise<void>;
  stop(): Promise<void>;
  syncNow(): Promise<SyncResult>;
  
  // Sync status
  isRunning(): boolean;
  getLastSyncTime(): number;
  getSyncStatus(): SyncStatus;
  getPendingChanges(): number;
  
  // Conflict handling
  getConflicts(): ConflictEntry[];
  resolveConflict(id: string, resolution: 'local' | 'remote' | 'merge'): Promise<void>;
  setAutoResolveStrategy(strategy: 'local' | 'remote' | 'newest' | 'manual'): void;
}

/**
 * Cache sync configuration
 */
export interface CacheSyncConfig {
  syncInterval?: number; // Milliseconds between syncs
  batchSize?: number; // Number of items to sync at once
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
  // Cache lifecycle
  createCache<T>(name: string, config?: ICacheConfig): ICache<T>;
  getCache<T>(name: string): ICache<T> | undefined;
  deleteCache(name: string): boolean;
  clearAll(): Promise<void>;
  
  // Global operations
  getGlobalStats(): Map<string, ICacheStats>;
  getTotalSize(): number;
  getTotalEntries(): number;
  
  // Configuration
  setDefaultConfig(config: ICacheConfig): void;
  getDefaultConfig(): ICacheConfig;
  
  // Persistence
  saveToStorage(): Promise<void>;
  loadFromStorage(): Promise<void>;
  
  // Events
  on(event: 'create' | 'delete' | 'clear', handler: (name: string) => void): void;
  off(event: string, handler: (name: string) => void): void;
}
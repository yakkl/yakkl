/**
 * KVStoreManager - Unified interface for key-value store operations
 * Supports multiple KV store providers with consistent API
 */

export interface KVStoreConfig {
  provider: 'cloudflare-kv' | 'redis' | 'upstash' | 'memcached' | 'dynamodb' | 'etcd';
  connectionString?: string;
  host?: string;
  port?: number;
  password?: string;
  database?: number; // For Redis
  namespace?: string; // For Cloudflare KV
  bindingName?: string; // For Cloudflare KV Workers binding
  apiToken?: string; // For Upstash/Cloudflare
  accountId?: string; // For Cloudflare
  region?: string; // For DynamoDB
  tableName?: string; // For DynamoDB
  accessKeyId?: string; // For DynamoDB
  secretAccessKey?: string; // For DynamoDB
  maxRetries?: number;
  retryDelay?: number;
  connectionTimeout?: number;
}

export interface KVMetadata {
  expiration?: number; // Unix timestamp
  expirationTtl?: number; // Seconds from now
  metadata?: Record<string, any>;
  version?: string;
  cas?: number; // Compare-and-swap token
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: Record<string, any>;
  }>;
  list_complete: boolean;
  cursor?: string;
}

export interface KVTransaction {
  get(key: string): KVTransaction;
  set(key: string, value: any, metadata?: KVMetadata): KVTransaction;
  delete(key: string): KVTransaction;
  execute(): Promise<any[]>;
}

export interface KVStoreProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Basic operations
  get<T = any>(key: string): Promise<T | null>;
  getWithMetadata<T = any>(key: string): Promise<{ value: T | null; metadata?: KVMetadata }>;
  set(key: string, value: any, metadata?: KVMetadata): Promise<void>;
  delete(key: string): Promise<boolean>;
  
  // Batch operations
  getMany<T = any>(keys: string[]): Promise<Map<string, T>>;
  setMany(entries: Array<{ key: string; value: any; metadata?: KVMetadata }>): Promise<void>;
  deleteMany(keys: string[]): Promise<number>; // Returns count of deleted keys
  
  // Atomic operations
  increment(key: string, amount?: number): Promise<number>;
  decrement(key: string, amount?: number): Promise<number>;
  compareAndSwap(key: string, oldValue: any, newValue: any): Promise<boolean>;
  setIfNotExists(key: string, value: any, metadata?: KVMetadata): Promise<boolean>;
  
  // List operations
  list(options?: KVListOptions): Promise<KVListResult>;
  keys(pattern?: string): Promise<string[]>;
  
  // Expiration
  expire(key: string, seconds: number): Promise<boolean>;
  ttl(key: string): Promise<number>; // Returns remaining TTL in seconds, -1 if no TTL, -2 if not exists
  persist(key: string): Promise<boolean>; // Remove expiration
  
  // Transactions (if supported)
  transaction?(): KVTransaction;
  
  // Utility
  exists(key: string): Promise<boolean>;
  type(key: string): Promise<string>; // 'string', 'number', 'object', 'array', 'null'
  size(key: string): Promise<number>; // Size in bytes
  flush(): Promise<void>; // Clear all data
  ping(): Promise<boolean>;
  getStats(): Promise<{
    keys: number;
    size: number;
    hits?: number;
    misses?: number;
    evictions?: number;
  }>;
}

export class KVStoreManager {
  private provider: KVStoreProvider | null = null;
  private config: KVStoreConfig;
  private isConnected: boolean = false;
  private defaultTTL: number = 3600; // 1 hour default
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private cacheEnabled: boolean = false;

  constructor(config: KVStoreConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Dynamically import the appropriate provider
    switch (this.config.provider) {
      case 'cloudflare-kv':
        const { CloudflareKVProvider } = await import('./providers/CloudflareKVProvider');
        this.provider = new CloudflareKVProvider(this.config);
        break;
        
      case 'redis':
        const { RedisProvider } = await import('./providers/RedisProvider');
        this.provider = new RedisProvider(this.config);
        break;
        
      case 'upstash':
        const { UpstashProvider } = await import('./providers/UpstashProvider');
        this.provider = new UpstashProvider(this.config);
        break;
        
      case 'memcached':
        const { MemcachedProvider } = await import('./providers/MemcachedProvider');
        this.provider = new MemcachedProvider(this.config);
        break;
        
      case 'dynamodb':
        const { DynamoDBProvider } = await import('./providers/DynamoDBProvider');
        this.provider = new DynamoDBProvider(this.config);
        break;
        
      case 'etcd':
        const { EtcdProvider } = await import('./providers/EtcdProvider');
        this.provider = new EtcdProvider(this.config);
        break;
        
      default:
        throw new Error(`Unsupported KV store provider: ${this.config.provider}`);
    }

    await this.connect();
  }

  async connect(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
    
    await this.provider.connect();
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Get a value by key
   */
  async get<T = any>(key: string, useCache: boolean = false): Promise<T | null> {
    this.ensureConnected();
    
    if (useCache && this.cacheEnabled) {
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value as T;
      }
    }
    
    const value = await this.provider!.get<T>(key);
    
    if (useCache && this.cacheEnabled && value !== null) {
      this.cache.set(key, {
        value,
        expires: Date.now() + 60000 // 1 minute cache
      });
      
      // Cleanup old cache entries
      if (this.cache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of this.cache.entries()) {
          if (v.expires < now) {
            this.cache.delete(k);
          }
        }
      }
    }
    
    return value;
  }

  /**
   * Get value with metadata
   */
  async getWithMetadata<T = any>(key: string): Promise<{ value: T | null; metadata?: KVMetadata }> {
    this.ensureConnected();
    return this.provider!.getWithMetadata<T>(key);
  }

  /**
   * Set a value with optional TTL and metadata
   */
  async set(
    key: string,
    value: any,
    options?: { ttl?: number; metadata?: Record<string, any> }
  ): Promise<void> {
    this.ensureConnected();
    
    const metadata: KVMetadata = {
      expirationTtl: options?.ttl || this.defaultTTL,
      metadata: options?.metadata
    };
    
    await this.provider!.set(key, value, metadata);
    
    // Update cache if enabled
    if (this.cacheEnabled) {
      this.cache.set(key, {
        value,
        expires: Date.now() + (metadata.expirationTtl! * 1000)
      });
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<boolean> {
    this.ensureConnected();
    
    // Remove from cache
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    
    return this.provider!.delete(key);
  }

  /**
   * Get multiple values
   */
  async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
    this.ensureConnected();
    return this.provider!.getMany<T>(keys);
  }

  /**
   * Set multiple values
   */
  async setMany(
    entries: Array<{ key: string; value: any; ttl?: number; metadata?: Record<string, any> }>
  ): Promise<void> {
    this.ensureConnected();
    
    const formattedEntries = entries.map(e => ({
      key: e.key,
      value: e.value,
      metadata: {
        expirationTtl: e.ttl || this.defaultTTL,
        metadata: e.metadata
      }
    }));
    
    await this.provider!.setMany(formattedEntries);
    
    // Update cache if enabled
    if (this.cacheEnabled) {
      entries.forEach(e => {
        this.cache.set(e.key, {
          value: e.value,
          expires: Date.now() + ((e.ttl || this.defaultTTL) * 1000)
        });
      });
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    this.ensureConnected();
    
    // Remove from cache
    if (this.cacheEnabled) {
      keys.forEach(key => this.cache.delete(key));
    }
    
    return this.provider!.deleteMany(keys);
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    this.ensureConnected();
    
    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    
    return this.provider!.increment(key, amount);
  }

  /**
   * Decrement a numeric value
   */
  async decrement(key: string, amount: number = 1): Promise<number> {
    this.ensureConnected();
    
    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    
    return this.provider!.decrement(key, amount);
  }

  /**
   * Compare and swap - atomic update if value matches
   */
  async compareAndSwap(key: string, oldValue: any, newValue: any): Promise<boolean> {
    this.ensureConnected();
    
    // Invalidate cache
    if (this.cacheEnabled) {
      this.cache.delete(key);
    }
    
    return this.provider!.compareAndSwap(key, oldValue, newValue);
  }

  /**
   * Set if not exists
   */
  async setIfNotExists(
    key: string,
    value: any,
    options?: { ttl?: number; metadata?: Record<string, any> }
  ): Promise<boolean> {
    this.ensureConnected();
    
    const metadata: KVMetadata = {
      expirationTtl: options?.ttl || this.defaultTTL,
      metadata: options?.metadata
    };
    
    const result = await this.provider!.setIfNotExists(key, value, metadata);
    
    if (result && this.cacheEnabled) {
      this.cache.set(key, {
        value,
        expires: Date.now() + (metadata.expirationTtl! * 1000)
      });
    }
    
    return result;
  }

  /**
   * List keys with optional prefix
   */
  async list(options?: KVListOptions): Promise<KVListResult> {
    this.ensureConnected();
    return this.provider!.list(options);
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    this.ensureConnected();
    return this.provider!.keys(pattern);
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    this.ensureConnected();
    return this.provider!.expire(key, seconds);
  }

  /**
   * Get remaining TTL
   */
  async ttl(key: string): Promise<number> {
    this.ensureConnected();
    return this.provider!.ttl(key);
  }

  /**
   * Remove expiration
   */
  async persist(key: string): Promise<boolean> {
    this.ensureConnected();
    return this.provider!.persist(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    this.ensureConnected();
    
    if (this.cacheEnabled) {
      const cached = this.cache.get(key);
      if (cached && cached.expires > Date.now()) {
        return true;
      }
    }
    
    return this.provider!.exists(key);
  }

  /**
   * Get type of value
   */
  async type(key: string): Promise<string> {
    this.ensureConnected();
    return this.provider!.type(key);
  }

  /**
   * Get size of value in bytes
   */
  async size(key: string): Promise<number> {
    this.ensureConnected();
    return this.provider!.size(key);
  }

  /**
   * Clear all data
   */
  async flush(): Promise<void> {
    this.ensureConnected();
    
    // Clear local cache
    if (this.cacheEnabled) {
      this.cache.clear();
    }
    
    await this.provider!.flush();
  }

  /**
   * Test connection
   */
  async ping(): Promise<boolean> {
    this.ensureConnected();
    return this.provider!.ping();
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    keys: number;
    size: number;
    hits?: number;
    misses?: number;
    evictions?: number;
  }> {
    this.ensureConnected();
    return this.provider!.getStats();
  }

  /**
   * Begin a transaction (if supported)
   */
  transaction(): KVTransaction {
    this.ensureConnected();
    
    if (!this.provider!.transaction) {
      throw new Error(`Provider ${this.config.provider} does not support transactions`);
    }
    
    return this.provider!.transaction();
  }

  /**
   * Enable local caching
   */
  enableCache(): void {
    this.cacheEnabled = true;
  }

  /**
   * Disable local caching
   */
  disableCache(): void {
    this.cacheEnabled = false;
    this.cache.clear();
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set default TTL
   */
  setDefaultTTL(seconds: number): void {
    this.defaultTTL = seconds;
  }

  private ensureConnected(): void {
    if (!this.isConnected || !this.provider) {
      throw new Error('KV store not connected. Call initialize() first.');
    }
  }

  /**
   * JSON-safe operations
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (value === null) return null;
    
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value as T;
    }
  }

  async setJSON(
    key: string,
    value: any,
    options?: { ttl?: number; metadata?: Record<string, any> }
  ): Promise<void> {
    const jsonValue = JSON.stringify(value);
    await this.set(key, jsonValue, options);
  }
}
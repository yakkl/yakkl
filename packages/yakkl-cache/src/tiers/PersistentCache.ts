/**
 * PersistentCache - Long-term storage with compression for cold data
 * Uses localStorage/sessionStorage with compression for large data sets
 */

import type { 
  CacheProvider, 
  CacheOptions, 
  CacheStats, 
  CacheEntry 
} from '../types';

export interface PersistentCacheOptions {
  storageType?: 'local' | 'session';
  maxSize?: number;
  ttl?: number;
  compress?: boolean;
  compressionThreshold?: number;
  prefix?: string;
}

export class PersistentCache implements CacheProvider {
  private storage: Storage;
  private maxSize: number;
  private defaultTTL: number;
  private compress: boolean;
  private compressionThreshold: number;
  private prefix: string;
  private stats: CacheStats;

  constructor(options: PersistentCacheOptions = {}) {
    this.storage = options.storageType === 'session' ? sessionStorage : localStorage;
    this.maxSize = options.maxSize || 100000;
    this.defaultTTL = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    this.compress = options.compress ?? true;
    this.compressionThreshold = options.compressionThreshold || 1024; // 1KB
    this.prefix = options.prefix || 'yakkl-cache-cold:';
    
    this.stats = this.initStats();
    this.cleanupExpired();
  }

  private initStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalSize: 0,
      itemCount: 0,
      evictions: 0,
      avgHitTime: 0,
      avgMissTime: 0,
      costSavings: 0
    };
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const fullKey = this.prefix + key;
    
    try {
      const stored = this.storage.getItem(fullKey);
      
      if (!stored) {
        this.updateStats('miss', performance.now() - startTime);
        return null;
      }
      
      const entry: CacheEntry = await this.deserialize(stored);
      
      // Check if expired
      if (entry.expiresAt < Date.now()) {
        this.storage.removeItem(fullKey);
        this.updateStats('miss', performance.now() - startTime);
        return null;
      }
      
      // Update access metadata
      entry.hitCount++;
      entry.lastAccessedAt = Date.now();
      
      // Update stored entry
      const serialized = await this.serialize(entry);
      this.storage.setItem(fullKey, serialized);
      
      this.updateStats('hit', performance.now() - startTime);
      return entry.value as T;
    } catch (error) {
      console.error('PersistentCache get error:', error);
      this.updateStats('miss', performance.now() - startTime);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.prefix + key;
    const ttl = options?.ttl || this.defaultTTL;
    const now = Date.now();
    
    try {
      const entry: CacheEntry<T> = {
        value,
        createdAt: now,
        expiresAt: now + ttl,
        hitCount: 0,
        lastAccessedAt: now,
        size: this.estimateSize(value),
        metadata: {
          source: 'persistent',
          version: 1,
          immutable: ttl > 7 * 24 * 60 * 60 * 1000 // > 7 days = immutable
        }
      };
      
      const serialized = await this.serialize(entry);
      
      // Check storage quota
      if (!this.hasStorageSpace(serialized.length)) {
        await this.evictOldest();
      }
      
      this.storage.setItem(fullKey, serialized);
      this.stats.itemCount = this.getItemCount();
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        await this.evictOldest();
        // Retry once after eviction
        try {
          const entry: CacheEntry<T> = {
            value,
            createdAt: now,
            expiresAt: now + ttl,
            hitCount: 0,
            lastAccessedAt: now,
            size: this.estimateSize(value),
            metadata: { source: 'persistent', version: 1 }
          };
          
          const serialized = await this.serialize(entry);
          this.storage.setItem(fullKey, serialized);
        } catch (retryError) {
          console.error('PersistentCache set failed after eviction:', retryError);
          throw retryError;
        }
      } else {
        console.error('PersistentCache set error:', error);
        throw error;
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    const fullKey = this.prefix + key;
    const existed = this.storage.getItem(fullKey) !== null;
    this.storage.removeItem(fullKey);
    this.stats.itemCount = this.getItemCount();
    return existed;
  }

  async clear(): Promise<void> {
    const keys = this.getAllKeys();
    keys.forEach(key => this.storage.removeItem(key));
    this.stats = this.initStats();
  }

  async has(key: string): Promise<boolean> {
    const fullKey = this.prefix + key;
    const stored = this.storage.getItem(fullKey);
    
    if (!stored) return false;
    
    try {
      const entry: CacheEntry = await this.deserialize(stored);
      
      // Check if expired
      if (entry.expiresAt < Date.now()) {
        this.storage.removeItem(fullKey);
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }

  async setMany<T>(entries: Array<[string, T]>, options?: CacheOptions): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }

  async getStats(): Promise<CacheStats> {
    return {
      ...this.stats,
      itemCount: this.getItemCount(),
      totalSize: this.getTotalSize()
    };
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = this.getAllKeys();
    const cleanKeys = allKeys.map(key => key.replace(this.prefix, ''));
    
    if (!pattern) {
      return cleanKeys;
    }
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return cleanKeys.filter(key => regex.test(key));
  }

  async size(): Promise<number> {
    return this.getTotalSize();
  }

  private async serialize(entry: CacheEntry): Promise<string> {
    const json = JSON.stringify(entry);
    
    // Compress if enabled and data is large enough
    if (this.compress && json.length > this.compressionThreshold) {
      return await this.compressString(json);
    }
    
    return json;
  }

  private async deserialize(data: string): Promise<CacheEntry> {
    // Check if compressed (starts with specific marker)
    if (data.startsWith('COMPRESSED:')) {
      const decompressed = await this.decompressString(data.substring(11));
      return JSON.parse(decompressed);
    }
    
    return JSON.parse(data);
  }

  private async compressString(str: string): Promise<string> {
    // Use browser's native compression API if available
    if (typeof CompressionStream !== 'undefined') {
      const encoder = new TextEncoder();
      const stream = new Response(
        new Blob([encoder.encode(str)]).stream().pipeThrough(
          new CompressionStream('gzip')
        )
      );
      
      const compressed = await stream.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(compressed)));
      return 'COMPRESSED:' + base64;
    }
    
    // Fallback: simple LZ-based compression
    return 'COMPRESSED:' + this.simpleLZCompress(str);
  }

  private async decompressString(compressed: string): Promise<string> {
    // Use browser's native decompression API if available
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const binary = atob(compressed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const stream = new Response(
          new Blob([bytes]).stream().pipeThrough(
            new DecompressionStream('gzip')
          )
        );
        
        const decompressed = await stream.arrayBuffer();
        const decoder = new TextDecoder();
        return decoder.decode(decompressed);
      } catch (error) {
        // Fallback to simple decompression
        return this.simpleLZDecompress(compressed);
      }
    }
    
    // Fallback: simple LZ-based decompression
    return this.simpleLZDecompress(compressed);
  }

  // Simple LZ compression fallback
  private simpleLZCompress(str: string): string {
    const dict: Record<string, number> = {};
    const out: (string | number)[] = [];
    let phrase = str[0];
    let code = 256;
    
    for (let i = 1; i < str.length; i++) {
      const currChar = str[i];
      if (dict[phrase + currChar] != null) {
        phrase += currChar;
      } else {
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        dict[phrase + currChar] = code;
        code++;
        phrase = currChar;
      }
    }
    
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    return out.map(v => String.fromCharCode(typeof v === 'number' ? v : v.charCodeAt(0))).join('');
  }

  private simpleLZDecompress(compressed: string): string {
    const dict: Record<number, string> = {};
    let currChar = compressed[0];
    let oldPhrase = currChar;
    const out = [currChar];
    let code = 256;
    let phrase: string;
    
    for (let i = 1; i < compressed.length; i++) {
      const currCode = compressed.charCodeAt(i);
      if (currCode < 256) {
        phrase = compressed[i];
      } else {
        phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
      }
      
      out.push(phrase);
      currChar = phrase[0];
      dict[code] = oldPhrase + currChar;
      code++;
      oldPhrase = phrase;
    }
    
    return out.join('');
  }

  private getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  private getItemCount(): number {
    return this.getAllKeys().length;
  }

  private getTotalSize(): number {
    let total = 0;
    const keys = this.getAllKeys();
    
    for (const key of keys) {
      const value = this.storage.getItem(key);
      if (value) {
        total += key.length + value.length;
      }
    }
    
    return total * 2; // UTF-16 characters
  }

  private hasStorageSpace(size: number): boolean {
    try {
      // Try to estimate available space
      const used = this.getTotalSize();
      const estimated = used + size;
      
      // Most browsers have 5-10MB limit for localStorage
      const limit = 5 * 1024 * 1024; // 5MB
      
      return estimated < limit;
    } catch {
      return true; // Assume we have space and handle quota errors
    }
  }

  private async evictOldest(): Promise<void> {
    const keys = this.getAllKeys();
    const entries: Array<{ key: string; entry: CacheEntry }> = [];
    
    // Load all entries
    for (const key of keys) {
      const stored = this.storage.getItem(key);
      if (stored) {
        try {
          const entry = await this.deserialize(stored);
          entries.push({ key, entry });
        } catch {
          // Remove corrupted entry
          this.storage.removeItem(key);
        }
      }
    }
    
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a.entry.lastAccessedAt - b.entry.lastAccessedAt);
    
    // Remove oldest 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.storage.removeItem(entries[i].key);
      this.stats.evictions++;
    }
  }

  private cleanupExpired(): void {
    const keys = this.getAllKeys();
    const now = Date.now();
    
    keys.forEach(async key => {
      const stored = this.storage.getItem(key);
      if (stored) {
        try {
          const entry: CacheEntry = await this.deserialize(stored);
          if (entry.expiresAt < now) {
            this.storage.removeItem(key);
          }
        } catch {
          // Remove corrupted entries
          this.storage.removeItem(key);
        }
      }
    });
  }

  private estimateSize(value: any): number {
    try {
      const str = JSON.stringify(value);
      return str.length * 2; // UTF-16
    } catch {
      return 1;
    }
  }

  private updateStats(type: 'hit' | 'miss', responseTime: number): void {
    if (type === 'hit') {
      this.stats.hits++;
      this.stats.avgHitTime = 
        (this.stats.avgHitTime * (this.stats.hits - 1) + responseTime) / this.stats.hits;
    } else {
      this.stats.misses++;
      this.stats.avgMissTime = 
        (this.stats.avgMissTime * (this.stats.misses - 1) + responseTime) / this.stats.misses;
    }
    
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? this.stats.hits / total : 0;
  }
}
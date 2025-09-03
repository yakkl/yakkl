/**
 * CloudflareKVProvider - Cloudflare Workers KV implementation
 * Globally distributed key-value storage at the edge
 */

import type {
  KVStoreProvider,
  KVStoreConfig,
  KVMetadata,
  KVListOptions,
  KVListResult,
  KVTransaction
} from '../KVStoreManager';

interface CloudflareKVNamespace {
  get(key: string, options?: any): Promise<any>;
  getWithMetadata(key: string, options?: any): Promise<any>;
  put(key: string, value: string, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
}

export class CloudflareKVProvider implements KVStoreProvider {
  private config: KVStoreConfig;
  private kv: CloudflareKVNamespace | null = null;
  private accountId: string;
  private namespaceId: string;
  private apiToken: string;
  private useWorkerBinding: boolean = false;

  constructor(config: KVStoreConfig) {
    this.config = config;
    this.accountId = config.accountId || '';
    this.namespaceId = config.namespace || '';
    this.apiToken = config.apiToken || '';
    
    // Check if running in Workers environment
    if (typeof globalThis !== 'undefined' && config.bindingName) {
      const binding = (globalThis as any)[config.bindingName];
      if (binding) {
        this.kv = binding;
        this.useWorkerBinding = true;
      }
    }
  }

  async connect(): Promise<void> {
    if (this.useWorkerBinding) {
      // Already connected via Workers binding
      return;
    }
    
    // Use REST API for external access
    this.kv = this.createRESTClient();
  }

  async disconnect(): Promise<void> {
    this.kv = null;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.kv) {
      throw new Error('Not connected to Cloudflare KV');
    }
    
    if (this.useWorkerBinding) {
      const value = await this.kv.get(key, { type: 'json' });
      return value;
    }
    
    // REST API
    const response = await this.restGet(key);
    return response;
  }

  async getWithMetadata<T = any>(key: string): Promise<{ value: T | null; metadata?: KVMetadata }> {
    if (!this.kv) {
      throw new Error('Not connected to Cloudflare KV');
    }
    
    if (this.useWorkerBinding) {
      const result = await this.kv.getWithMetadata(key, { type: 'json' });
      return {
        value: result?.value || null,
        metadata: result?.metadata ? {
          metadata: result.metadata,
          expiration: result.expiration
        } : undefined
      };
    }
    
    // REST API with metadata
    const response = await this.restGetWithMetadata(key);
    return response;
  }

  async set(key: string, value: any, metadata?: KVMetadata): Promise<void> {
    if (!this.kv) {
      throw new Error('Not connected to Cloudflare KV');
    }
    
    const options: any = {};
    
    if (metadata?.expiration) {
      options.expiration = metadata.expiration;
    } else if (metadata?.expirationTtl) {
      options.expirationTtl = metadata.expirationTtl;
    }
    
    if (metadata?.metadata) {
      options.metadata = metadata.metadata;
    }
    
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (this.useWorkerBinding) {
      await this.kv.put(key, stringValue, options);
    } else {
      await this.restPut(key, stringValue, options);
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.kv) {
      throw new Error('Not connected to Cloudflare KV');
    }
    
    try {
      if (this.useWorkerBinding) {
        await this.kv.delete(key);
      } else {
        await this.restDelete(key);
      }
      return true;
    } catch {
      return false;
    }
  }

  async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    // Cloudflare KV doesn't have native batch get, so we parallelize
    const promises = keys.map(async key => {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  async setMany(entries: Array<{ key: string; value: any; metadata?: KVMetadata }>): Promise<void> {
    // Cloudflare KV doesn't have native batch set, so we parallelize
    const promises = entries.map(entry =>
      this.set(entry.key, entry.value, entry.metadata)
    );
    
    await Promise.all(promises);
  }

  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;
    
    const promises = keys.map(async key => {
      const result = await this.delete(key);
      if (result) deleted++;
    });
    
    await Promise.all(promises);
    return deleted;
  }

  async increment(key: string, amount: number = 1): Promise<number> {
    // Cloudflare KV doesn't support atomic increment
    // Implement with get-modify-put (not truly atomic)
    const current = await this.get<number>(key);
    const newValue = (current || 0) + amount;
    await this.set(key, newValue);
    return newValue;
  }

  async decrement(key: string, amount: number = 1): Promise<number> {
    return this.increment(key, -amount);
  }

  async compareAndSwap(key: string, oldValue: any, newValue: any): Promise<boolean> {
    // Cloudflare KV doesn't support CAS natively
    // This is a best-effort implementation
    const current = await this.get(key);
    
    if (JSON.stringify(current) === JSON.stringify(oldValue)) {
      await this.set(key, newValue);
      return true;
    }
    
    return false;
  }

  async setIfNotExists(key: string, value: any, metadata?: KVMetadata): Promise<boolean> {
    const exists = await this.exists(key);
    
    if (!exists) {
      await this.set(key, value, metadata);
      return true;
    }
    
    return false;
  }

  async list(options?: KVListOptions): Promise<KVListResult> {
    if (!this.kv) {
      throw new Error('Not connected to Cloudflare KV');
    }
    
    const listOptions: any = {
      limit: options?.limit || 1000,
      prefix: options?.prefix,
      cursor: options?.cursor
    };
    
    let result: any;
    
    if (this.useWorkerBinding) {
      result = await this.kv.list(listOptions);
    } else {
      result = await this.restList(listOptions);
    }
    
    return {
      keys: result.keys.map((k: any) => ({
        name: k.name,
        expiration: k.expiration,
        metadata: k.metadata
      })),
      list_complete: result.list_complete,
      cursor: result.cursor
    };
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys: string[] = [];
    let cursor: string | undefined;
    
    do {
      const result = await this.list({
        prefix: pattern,
        limit: 1000,
        cursor
      });
      
      allKeys.push(...result.keys.map(k => k.name));
      cursor = result.cursor;
    } while (cursor);
    
    return allKeys;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    // Re-set the key with new expiration
    const { value, metadata } = await this.getWithMetadata(key);
    
    if (value === null) {
      return false;
    }
    
    await this.set(key, value, {
      ...metadata,
      expirationTtl: seconds
    });
    
    return true;
  }

  async ttl(key: string): Promise<number> {
    const { value, metadata } = await this.getWithMetadata(key);
    
    if (value === null) {
      return -2; // Key doesn't exist
    }
    
    if (!metadata?.expiration) {
      return -1; // No TTL set
    }
    
    const remaining = Math.floor((metadata.expiration - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  async persist(key: string): Promise<boolean> {
    // Re-set the key without expiration
    const { value, metadata } = await this.getWithMetadata(key);
    
    if (value === null) {
      return false;
    }
    
    await this.set(key, value, {
      metadata: metadata?.metadata
      // Omit expiration fields
    });
    
    return true;
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  async type(key: string): Promise<string> {
    const value = await this.get(key);
    
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  async size(key: string): Promise<number> {
    const value = await this.get(key);
    
    if (value === null) return 0;
    
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return new TextEncoder().encode(str).length;
  }

  async flush(): Promise<void> {
    // Delete all keys (expensive operation)
    const allKeys = await this.keys();
    await this.deleteMany(allKeys);
  }

  async ping(): Promise<boolean> {
    try {
      // Try to list with limit 1 to test connection
      await this.list({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    keys: number;
    size: number;
    hits?: number;
    misses?: number;
    evictions?: number;
  }> {
    // Cloudflare KV doesn't provide detailed stats via API
    // We can only get approximate counts
    const allKeys = await this.keys();
    
    let totalSize = 0;
    for (const key of allKeys.slice(0, 100)) {
      // Sample first 100 keys for size estimate
      totalSize += await this.size(key);
    }
    
    const avgSize = allKeys.length > 0 ? totalSize / Math.min(100, allKeys.length) : 0;
    
    return {
      keys: allKeys.length,
      size: Math.floor(avgSize * allKeys.length)
    };
  }

  // REST API implementation
  private createRESTClient(): CloudflareKVNamespace {
    const baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}`;
    
    return {
      get: async (key: string) => {
        const response = await fetch(`${baseURL}/values/${key}`, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        });
        
        if (response.status === 404) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`KV get failed: ${response.statusText}`);
        }
        
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      },
      
      getWithMetadata: async (key: string) => {
        const response = await fetch(`${baseURL}/values/${key}?include_metadata=true`, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        });
        
        if (response.status === 404) {
          return { value: null };
        }
        
        if (!response.ok) {
          throw new Error(`KV get with metadata failed: ${response.statusText}`);
        }
        
        return response.json();
      },
      
      put: async (key: string, value: string, options?: any) => {
        const body = new FormData();
        body.append('value', value);
        
        if (options?.metadata) {
          body.append('metadata', JSON.stringify(options.metadata));
        }
        
        const params = new URLSearchParams();
        if (options?.expiration) {
          params.append('expiration', options.expiration.toString());
        } else if (options?.expirationTtl) {
          params.append('expiration_ttl', options.expirationTtl.toString());
        }
        
        const url = params.toString() ? `${baseURL}/values/${key}?${params}` : `${baseURL}/values/${key}`;
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          },
          body
        });
        
        if (!response.ok) {
          throw new Error(`KV put failed: ${response.statusText}`);
        }
      },
      
      delete: async (key: string) => {
        const response = await fetch(`${baseURL}/values/${key}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`KV delete failed: ${response.statusText}`);
        }
      },
      
      list: async (options?: any) => {
        const params = new URLSearchParams();
        if (options?.prefix) params.append('prefix', options.prefix);
        if (options?.limit) params.append('limit', options.limit.toString());
        if (options?.cursor) params.append('cursor', options.cursor);
        
        const response = await fetch(`${baseURL}/keys?${params}`, {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`KV list failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.result;
      }
    };
  }

  private async restGet(key: string): Promise<any> {
    return this.kv!.get(key);
  }

  private async restGetWithMetadata(key: string): Promise<any> {
    return this.kv!.getWithMetadata(key);
  }

  private async restPut(key: string, value: string, options?: any): Promise<void> {
    return this.kv!.put(key, value, options);
  }

  private async restDelete(key: string): Promise<void> {
    return this.kv!.delete(key);
  }

  private async restList(options?: any): Promise<any> {
    return this.kv!.list(options);
  }
}
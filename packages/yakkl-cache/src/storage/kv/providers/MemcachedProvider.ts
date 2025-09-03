import type { KVStoreProvider, KVStoreConfig } from '../KVStoreManager';
export class MemcachedProvider implements KVStoreProvider {
  constructor(config: KVStoreConfig) {}
  async connect(): Promise<void> { throw new Error('MemcachedProvider not yet implemented'); }
  async disconnect(): Promise<void> {}
  async get(): Promise<any> { return null; }
  async getWithMetadata(): Promise<any> { return { value: null }; }
  async set(): Promise<void> {}
  async delete(): Promise<boolean> { return false; }
  async getMany(): Promise<Map<string, any>> { return new Map(); }
  async setMany(): Promise<void> {}
  async deleteMany(): Promise<number> { return 0; }
  async increment(): Promise<number> { return 0; }
  async decrement(): Promise<number> { return 0; }
  async compareAndSwap(): Promise<boolean> { return false; }
  async setIfNotExists(): Promise<boolean> { return false; }
  async list(): Promise<any> { return { keys: [], list_complete: true }; }
  async keys(): Promise<string[]> { return []; }
  async expire(): Promise<boolean> { return false; }
  async ttl(): Promise<number> { return -2; }
  async persist(): Promise<boolean> { return false; }
  async exists(): Promise<boolean> { return false; }
  async type(): Promise<string> { return 'null'; }
  async size(): Promise<number> { return 0; }
  async flush(): Promise<void> {}
  async ping(): Promise<boolean> { return false; }
  async getStats(): Promise<any> { return { keys: 0, size: 0 }; }
}

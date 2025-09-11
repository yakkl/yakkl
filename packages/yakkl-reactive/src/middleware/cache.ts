import { Middleware, StoreAdapter } from '../types';

export class CacheMiddleware<T> implements Middleware<T> {
  name = 'CacheMiddleware';
  private cache = new Map<string, { value: T; expiry: number }>();

  constructor(
    private cacheAdapter?: StoreAdapter<T>,
    private options: {
      ttlMs?: number;
      maxSize?: number;
    } = {}
  ) {}

  async afterRead(value: T | null, key: string): Promise<T | null> {
    if (value !== null) {
      this.setCache(key, value);
    }
    return value;
  }

  async beforeRead(key: string): Promise<void> {
    const cached = this.getCache(key);
    if (cached !== null) {
      // Cache hit - value will be returned from the main store's cache
      return;
    }

    // Try to read from cache adapter if available
    if (this.cacheAdapter) {
      const cachedValue = await this.cacheAdapter.read();
      if (cachedValue !== null) {
        this.setCache(key, cachedValue);
      }
    }
  }

  async afterWrite(value: T, key: string): Promise<void> {
    this.setCache(key, value);

    if (this.cacheAdapter) {
      await this.cacheAdapter.write(value);
    }
  }

  private getCache(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (this.options.ttlMs && entry.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  private setCache(key: string, value: T): void {
    // Enforce max size
    if (this.options.maxSize && this.cache.size >= this.options.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    const expiry = this.options.ttlMs ? Date.now() + this.options.ttlMs : Infinity;
    this.cache.set(key, { value, expiry });
  }
}

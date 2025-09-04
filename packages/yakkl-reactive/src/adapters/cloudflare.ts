import { StoreAdapter } from '../types';

// Stub for Cloudflare Durable Object adapter
export class DurableObjectAdapter<T> implements StoreAdapter<T> {
  constructor(
    _storage: any, // DurableObjectStorage type
    _key: string
  ) {}

  async read(): Promise<T | null> {
    // Stub implementation
    console.warn('DurableObjectAdapter: Using stub implementation');
    return null;
  }

  async write(_value: T): Promise<void> {
    // Stub implementation
    console.warn('DurableObjectAdapter: Using stub implementation');
  }

  async delete(): Promise<void> {
    // Stub implementation
    console.warn('DurableObjectAdapter: Using stub implementation');
  }
}

// Stub for Cloudflare D1 adapter
export class D1Adapter<T> implements StoreAdapter<T> {
  constructor(
    _db: any, // D1Database type
    _config: {
      table: string;
      keyColumn: string;
      valueColumn: string;
      key: string;
    }
  ) {}

  async read(): Promise<T | null> {
    // Stub implementation
    console.warn('D1Adapter: Using stub implementation');
    return null;
  }

  async write(_value: T): Promise<void> {
    // Stub implementation
    console.warn('D1Adapter: Using stub implementation');
  }

  async delete(): Promise<void> {
    // Stub implementation
    console.warn('D1Adapter: Using stub implementation');
  }
}

// Stub for Cloudflare KV adapter
export class KVAdapter<T> implements StoreAdapter<T> {
  constructor(
    _namespace: any, // KVNamespace type
    _key: string
  ) {}

  async read(): Promise<T | null> {
    // Stub implementation
    console.warn('KVAdapter: Using stub implementation');
    return null;
  }

  async write(_value: T): Promise<void> {
    // Stub implementation
    console.warn('KVAdapter: Using stub implementation');
  }

  async delete(): Promise<void> {
    // Stub implementation
    console.warn('KVAdapter: Using stub implementation');
  }
}

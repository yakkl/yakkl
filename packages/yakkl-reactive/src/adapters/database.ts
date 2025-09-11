import { StoreAdapter } from '../types';

// Stub for PostgreSQL adapter
export class PostgresAdapter<T> implements StoreAdapter<T> {
  constructor(
    _pool: any, // Pool type from pg
    _config: {
      table: string;
      keyColumn: string;
      valueColumn: string;
      key: string;
    }
  ) {}

  async read(): Promise<T | null> {
    // Stub implementation
    console.warn('PostgresAdapter: Using stub implementation');
    return null;
  }

  async write(_value: T): Promise<void> {
    // Stub implementation
    console.warn('PostgresAdapter: Using stub implementation');
  }

  async delete(): Promise<void> {
    // Stub implementation
    console.warn('PostgresAdapter: Using stub implementation');
  }
}

// Stub for Redis adapter
export class RedisAdapter<T> implements StoreAdapter<T> {
  constructor(
    _client: any, // Redis client type
    _key: string
  ) {}

  async read(): Promise<T | null> {
    // Stub implementation
    console.warn('RedisAdapter: Using stub implementation');
    return null;
  }

  async write(_value: T): Promise<void> {
    // Stub implementation
    console.warn('RedisAdapter: Using stub implementation');
  }

  async delete(): Promise<void> {
    // Stub implementation
    console.warn('RedisAdapter: Using stub implementation');
  }
}

// Stub for MongoDB adapter
export class MongoAdapter<T> implements StoreAdapter<T> {
  constructor(
    _collection: any, // MongoDB Collection type
    _key: string
  ) {}

  async read(): Promise<T | null> {
    // Stub implementation
    console.warn('MongoAdapter: Using stub implementation');
    return null;
  }

  async write(_value: T): Promise<void> {
    // Stub implementation
    console.warn('MongoAdapter: Using stub implementation');
  }

  async delete(): Promise<void> {
    // Stub implementation
    console.warn('MongoAdapter: Using stub implementation');
  }
}

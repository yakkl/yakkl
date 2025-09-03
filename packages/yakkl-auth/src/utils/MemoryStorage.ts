/**
 * In-memory storage implementation
 * Used as default storage when no persistent storage is provided
 */

import type { AuthStorage } from '../types';

export class MemoryStorage implements AuthStorage {
  private store: Map<string, any> = new Map();

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
/**
 * Storage Interface
 * Platform-agnostic storage abstraction
 * Implementations can use browser.storage, localStorage, or any other storage mechanism
 */

export interface IStorage {
  /**
   * Get a value from storage
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * Get multiple values from storage
   */
  getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>>;
  
  /**
   * Set a value in storage
   */
  set<T = any>(key: string, value: T): Promise<void>;
  
  /**
   * Set multiple values in storage
   */
  setMultiple<T = any>(items: Record<string, T>): Promise<void>;
  
  /**
   * Remove a key from storage
   */
  remove(key: string): Promise<void>;
  
  /**
   * Remove multiple keys from storage
   */
  removeMultiple(keys: string[]): Promise<void>;
  
  /**
   * Clear all storage
   */
  clear(): Promise<void>;
  
  /**
   * Get all keys in storage
   */
  getKeys(): Promise<string[]>;
  
  /**
   * Check if a key exists
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Get storage size/usage info
   */
  getInfo?(): Promise<{
    bytesInUse?: number;
    quota?: number;
    usage?: number;
  }>;
}
/**
 * Encrypted Storage Wrapper
 * Adds encryption layer to any storage provider
 */

import type { 
  IStorage,
  IEncryptedStorage,
  StorageEntry,
  StorageMetadata,
  StorageQuery,
  StorageWatchCallback,
  UnwatchFn,
  StorageChange
} from '../interfaces/storage-enhanced.interface';

export class EncryptedStorageWrapper implements IEncryptedStorage {
  private storage: IStorage;
  private encryptionKey: CryptoKey | null = null;
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async setEncryptionKey(key: string | CryptoKey): Promise<void> {
    if (typeof key === 'string') {
      // Convert string to CryptoKey
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        this.textEncoder.encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: this.textEncoder.encode('yakkl-wallet-salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } else {
      this.encryptionKey = key;
    }
  }

  async rotateEncryptionKey(newKey: string | CryptoKey): Promise<void> {
    if (!this.encryptionKey) {
      throw new Error('No encryption key set');
    }

    // Get all keys and decrypt with old key
    const keys = await this.storage.getKeys();
    const decryptedData: Record<string, any> = {};

    for (const key of keys) {
      const encryptedValue = await this.storage.get<string>(key);
      if (encryptedValue) {
        try {
          decryptedData[key] = await this.decrypt(encryptedValue);
        } catch {
          // Skip items that couldn't be decrypted
        }
      }
    }

    // Set new encryption key
    await this.setEncryptionKey(newKey);

    // Re-encrypt with new key
    for (const [key, value] of Object.entries(decryptedData)) {
      const encrypted = await this.encrypt(value);
      await this.storage.set(key, encrypted);
    }
  }

  isEncrypted(): boolean {
    return this.encryptionKey !== null;
  }

  async encrypt<T>(value: T): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('No encryption key set');
    }

    const data = JSON.stringify(value);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      this.textEncoder.encode(data)
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  }

  async decrypt<T>(encryptedValue: string): Promise<T> {
    if (!this.encryptionKey) {
      throw new Error('No encryption key set');
    }

    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedValue), c => c.charCodeAt(0));
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encrypted
    );

    const data = this.textDecoder.decode(decrypted);
    return JSON.parse(data);
  }

  // IStorage implementation with encryption
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isEncrypted()) {
      return this.storage.get<T>(key);
    }

    const encryptedValue = await this.storage.get<string>(key);
    if (encryptedValue === null) return null;

    try {
      return await this.decrypt<T>(encryptedValue);
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    if (!this.isEncrypted()) {
      return this.storage.set(key, value);
    }

    const encrypted = await this.encrypt(value);
    return this.storage.set(key, encrypted);
  }

  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.get<T>(key);
      })
    );
    
    return result;
  }

  async setMultiple<T = any>(items: Record<string, T>): Promise<void> {
    await Promise.all(
      Object.entries(items).map(([key, value]) => this.set(key, value))
    );
  }

  // Delegate non-encrypted methods to base storage
  async remove(key: string): Promise<void> {
    return this.storage.remove(key);
  }

  async removeMultiple(keys: string[]): Promise<void> {
    return this.storage.removeMultiple(keys);
  }

  async clear(): Promise<void> {
    return this.storage.clear();
  }

  async getKeys(): Promise<string[]> {
    return this.storage.getKeys();
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async getInfo?(): Promise<{ bytesInUse?: number; quota?: number; usage?: number }> {
    return this.storage.getInfo?.() || {};
  }

  // IEnhancedStorage implementation
  async getWithMetadata<T = any>(key: string): Promise<StorageEntry<T> | null> {
    const value = await this.get<T>(key);
    if (value === null) return null;

    // If the base storage is enhanced, use its metadata
    if ('getWithMetadata' in this.storage) {
      const entry = await (this.storage as any).getWithMetadata(key);
      if (entry) {
        return { ...entry, value };
      }
    }

    return { key, value };
  }

  async setWithMetadata<T = any>(
    key: string, 
    value: T, 
    metadata?: Partial<StorageMetadata>
  ): Promise<void> {
    // Encrypt the value
    if (this.isEncrypted()) {
      const encrypted = await this.encrypt(value);
      
      // If base storage is enhanced, use its metadata support
      if ('setWithMetadata' in this.storage) {
        return (this.storage as any).setWithMetadata(key, encrypted, {
          ...metadata,
          encrypted: true
        });
      }
      
      return this.storage.set(key, encrypted);
    }

    if ('setWithMetadata' in this.storage) {
      return (this.storage as any).setWithMetadata(key, value, metadata);
    }
    
    return this.storage.set(key, value);
  }

  async updateMetadata(key: string, metadata: Partial<StorageMetadata>): Promise<void> {
    if ('updateMetadata' in this.storage) {
      return (this.storage as any).updateMetadata(key, metadata);
    }
    throw new Error('Base storage does not support metadata');
  }

  async getByTag<T = any>(tag: string): Promise<StorageEntry<T>[]> {
    if ('getByTag' in this.storage) {
      const entries = await (this.storage as any).getByTag(tag);
      
      // Decrypt values if encrypted
      if (this.isEncrypted()) {
        return Promise.all(
          entries.map(async (entry: StorageEntry) => ({
            ...entry,
            value: await this.decrypt<T>(entry.value)
          }))
        );
      }
      
      return entries;
    }
    return [];
  }

  async query<T = any>(filter: StorageQuery): Promise<StorageEntry<T>[]> {
    if ('query' in this.storage) {
      const entries = await (this.storage as any).query(filter);
      
      // Decrypt values if encrypted
      if (this.isEncrypted()) {
        return Promise.all(
          entries.map(async (entry: StorageEntry) => ({
            ...entry,
            value: await this.decrypt<T>(entry.value)
          }))
        );
      }
      
      return entries;
    }
    return [];
  }

  watch(key: string | string[], callback: StorageWatchCallback): UnwatchFn {
    if ('watch' in this.storage) {
      // Wrap callback to decrypt values
      const wrappedCallback = async (changes: StorageChange[]) => {
        if (this.isEncrypted()) {
          const decryptedChanges = await Promise.all(
            changes.map(async (change) => ({
              ...change,
              oldValue: change.oldValue ? await this.decrypt(change.oldValue) : undefined,
              newValue: change.newValue ? await this.decrypt(change.newValue) : undefined
            }))
          );
          callback(decryptedChanges);
        } else {
          callback(changes);
        }
      };
      
      return (this.storage as any).watch(key, wrappedCallback);
    }
    
    return () => {};
  }

  async transaction<T>(operations: () => Promise<T>): Promise<T> {
    if ('transaction' in this.storage) {
      return (this.storage as any).transaction(operations);
    }
    return operations();
  }
}
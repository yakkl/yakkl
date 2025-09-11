import { StoreAdapter, SyncAdapter, ChangeMetadata, Unsubscriber } from '../types';

// Async version for StoreAdapter
export class MemoryAdapter<T> implements StoreAdapter<T> {
  private watchers = new Set<(value: T, metadata?: ChangeMetadata) => void>();

  constructor(private value: T | null = null) {}

  async read(): Promise<T | null> {
    return this.value;
  }

  async write(value: T): Promise<void> {
    this.value = value;
    this.notifyWatchers(value);
  }

  async delete(): Promise<void> {
    this.value = null;
    this.notifyWatchers(null as any);
  }

  watch(callback: (value: T, metadata?: ChangeMetadata) => void): Unsubscriber {
    this.watchers.add(callback);
    return () => {
      this.watchers.delete(callback);
    };
  }

  private notifyWatchers(value: T): void {
    const metadata: ChangeMetadata = {
      timestamp: Date.now(),
      source: 'memory-adapter',
      operation: 'set',
    };

    this.watchers.forEach((watcher) => {
      watcher(value, metadata);
    });
  }

  clone(): MemoryAdapter<T> {
    return new MemoryAdapter(this.value ? JSON.parse(JSON.stringify(this.value)) : null);
  }
}

// Sync version for SyncAdapter
export class SyncMemoryAdapter<T> implements SyncAdapter<T> {
  private watchers = new Set<(value: T, metadata?: ChangeMetadata) => void>();

  constructor(private value: T | null = null) {}

  read(): T | null {
    return this.value;
  }

  write(value: T): void {
    this.value = value;
    this.notifyWatchers(value);
  }

  delete(): void {
    this.value = null;
    this.notifyWatchers(null as any);
  }

  watch(callback: (value: T, metadata?: ChangeMetadata) => void): Unsubscriber {
    this.watchers.add(callback);
    return () => {
      this.watchers.delete(callback);
    };
  }

  private notifyWatchers(value: T): void {
    const metadata: ChangeMetadata = {
      timestamp: Date.now(),
      source: 'sync-memory-adapter',
      operation: 'set',
    };

    this.watchers.forEach((watcher) => {
      watcher(value, metadata);
    });
  }
}

export class SecureMemoryAdapter<T> extends MemoryAdapter<T> {
  //@ts-ignore
  private encryptionKey?: CryptoKey;

  constructor(
    value: T | null = null,
    private useEncryption: boolean = false
  ) {
    super(value);
    // Only initialize encryption in browser environment
    if (this.useEncryption && typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined') {
      this.initializeEncryption();
    }
  }

  private async initializeEncryption(): Promise<void> {
    if (typeof globalThis === 'undefined' || typeof globalThis.crypto === 'undefined') return;

    this.encryptionKey = await globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  async read(): Promise<T | null> {
    const value = await super.read();
    return value;
  }

  async write(value: T): Promise<void> {
    await super.write(value);
  }
}

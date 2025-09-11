import { Middleware, Store } from '../types';

export interface SyncTarget<T> {
  store: Store<T>;
  filter?: (value: T) => boolean;
  transform?: (value: T) => T;
  bidirectional?: boolean;
}

export class SyncMiddleware<T> implements Middleware<T> {
  name = 'SyncMiddleware';
  private syncTargets: SyncTarget<T>[] = [];
  private syncing = false;
  private debounceTimer?: NodeJS.Timeout;

  constructor(
    private options: {
      debounceMs?: number;
      conflictResolution?: 'local-wins' | 'remote-wins' | 'merge';
      mergeFunction?: (local: T, remote: T) => T;
    } = {}
  ) {}

  addTarget(target: SyncTarget<T>): void {
    this.syncTargets.push(target);

    if (target.bidirectional) {
      target.store.subscribe((value) => {
        if (!this.syncing) {
          this.handleRemoteChange(value, target);
        }
      });
    }
  }

  private async handleRemoteChange(_value: T, source: SyncTarget<T>): Promise<void> {
    // Handle incoming changes from remote stores
    // This would need to be connected to the parent store
    console.log('Remote change detected from', source);
  }

  async afterWrite(value: T, _key: string): Promise<void> {
    if (this.syncing) return;

    if (this.options.debounceMs) {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.syncToTargets(value);
      }, this.options.debounceMs);
    } else {
      await this.syncToTargets(value);
    }
  }

  private async syncToTargets(value: T): Promise<void> {
    this.syncing = true;

    try {
      await Promise.allSettled(
        this.syncTargets.map(async ({ store, filter, transform }) => {
          if (filter && !filter(value)) return;

          const syncValue = transform ? transform(value) : value;
          await store.set(syncValue);
        })
      );
    } finally {
      this.syncing = false;
    }
  }
}

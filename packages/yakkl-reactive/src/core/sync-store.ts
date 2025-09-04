import { SyncStore, SyncAdapter, Subscriber, Unsubscriber, ChangeMetadata } from '../types';

export class SynchronousStore<T> implements SyncStore<T> {
  private subscribers = new Set<Subscriber<T>>();
  private value: T | null = null;
  private watchUnsubscribe?: Unsubscriber;

  constructor(
    private adapter: SyncAdapter<T>,
    private key: string = 'default'
  ) {
    this.value = this.adapter.read();

    if (this.adapter.watch) {
      this.watchUnsubscribe = this.adapter.watch((value, metadata) => {
        this.value = value;
        this.notify(
          value,
          metadata || {
            timestamp: Date.now(),
            source: 'adapter-watch',
            operation: 'sync',
          }
        );
      });
    }
  }

  get(): T | null {
    return this.value;
  }

  set(value: T): void {
    this.value = value;
    this.adapter.write(value);
    this.notify(value, {
      timestamp: Date.now(),
      source: 'local',
      operation: 'set',
    });
  }

  update(updater: (value: T) => T): void {
    const updated = updater(this.value!);
    this.set(updated);
  }

  subscribe(subscriber: Subscriber<T>): Unsubscriber {
    this.subscribers.add(subscriber);

    if (this.value !== null) {
      subscriber(this.value, {
        timestamp: Date.now(),
        source: 'subscription',
        operation: 'set',
      });
    }

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  select<K>(selector: (value: T) => K): SyncStore<K> {
    const derivedAdapter: SyncAdapter<K> = {
      read: () => {
        const parentValue = this.get();
        return parentValue ? selector(parentValue) : null;
      },
      write: () => {
        throw new Error('Cannot write to derived store');
      },
    };

    const derivedStore = new SynchronousStore(derivedAdapter, `${this.key}.derived`);

    this.subscribe((value) => {
      const selected = selector(value);
      derivedStore.set(selected);
    });

    return derivedStore;
  }

  private notify(value: T, metadata: ChangeMetadata): void {
    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(value, metadata);
      } catch (error) {
        console.error(`Subscriber error in store ${this.key}:`, error);
      }
    });
  }

  dispose(): void {
    if (this.watchUnsubscribe) {
      this.watchUnsubscribe();
    }
    this.subscribers.clear();
  }
}

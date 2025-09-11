import {
  Store,
  StoreAdapter,
  Subscriber,
  Unsubscriber,
  ChangeMetadata,
  Middleware,
  StoreOptions,
  Transform,
} from '../types';

export class ReactiveStore<T> implements Store<T> {
  private subscribers = new Set<Subscriber<T>>();
  private middlewares: Middleware<T>[] = [];
  private cache: T | null = null;
  private cacheValid = false;
  private cacheTimer?: NodeJS.Timeout;
  private disposed = false;
  private initialized = false;
  private initPromise?: Promise<void>;
  private watchUnsubscribe?: Unsubscriber;

  constructor(
    private adapter: StoreAdapter<T> | null = null,
    private options: StoreOptions = { key: 'default' }
  ) {
    if (!options.lazyInit) {
      this.initPromise = this.initialize();
    }
    if (!adapter) throw new Error('Adapter is not set');
  }

  private async initialize(): Promise<void> {
    if (!this.adapter) throw new Error('Adapter is not set');

    if (this.initialized) return;

    try {
      if (this.adapter.initialize) {
        await this.adapter.initialize();
      }

      if (this.adapter.watch) {
        this.watchUnsubscribe = this.adapter.watch((value, metadata) => {
          this.cache = value;
          this.cacheValid = true;
          this.resetCacheTimer();
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

      this.initialized = true;
    } catch (error) {
      console.error(`Failed to initialize store ${this.options.key}:`, error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized && !this.initPromise) {
      this.initPromise = this.initialize();
    }
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private resetCacheTimer(): void {
    if (this.cacheTimer) {
      clearTimeout(this.cacheTimer);
    }

    if (this.options.cacheMs && this.options.cacheMs > 0) {
      this.cacheTimer = setTimeout(() => {
        this.cacheValid = false;
        this.cacheTimer = undefined;
      }, this.options.cacheMs);
    }
  }

  async get(): Promise<T | null> {
    if (!this.adapter) throw new Error('Adapter is not set');
    if (this.disposed) {
      throw new Error(`Store ${this.options.key} is disposed`);
    }

    await this.ensureInitialized();

    if (this.cacheValid && this.cache !== null) {
      return this.cache;
    }

    for (const mw of this.middlewares) {
      if (mw.beforeRead) {
        await mw.beforeRead(this.options.key);
      }
    }

    try {
      if (!this.adapter) throw new Error('Adapter is not set');
      let value = await this.adapter.read();

      for (const mw of this.middlewares) {
        if (mw.afterRead) {
          value = await mw.afterRead(value, this.options.key);
        }
      }

      this.cache = value;
      this.cacheValid = true;
      this.resetCacheTimer();

      return value;
    } catch (error) {
      await this.handleError(error as Error, 'read');
      return null;
    }
  }

  async set(value: T): Promise<void> {
    if (this.disposed) {
      throw new Error(`Store ${this.options.key} is disposed`);
    }

    await this.ensureInitialized();

    const prev = this.cache;
    let processedValue = value;

    for (const mw of this.middlewares) {
      if (mw.beforeWrite) {
        processedValue = await mw.beforeWrite(processedValue, prev, this.options.key);
      }
    }

    try {
      if (!this.adapter) throw new Error('Adapter is not set');
      await this.adapter.write(processedValue!);

      this.cache = processedValue;
      this.cacheValid = true;
      this.resetCacheTimer();

      for (const mw of this.middlewares) {
        if (mw.afterWrite) {
          await mw.afterWrite(processedValue, this.options.key);
        }
      }

      this.notify(processedValue, {
        timestamp: Date.now(),
        source: 'local',
        operation: 'set',
      });
    } catch (error) {
      await this.handleError(error as Error, 'write');
      throw error;
    }
  }

  async update(updater: (value: T) => T | Promise<T>): Promise<void> {
    const current = await this.get();
    const updated = await updater(current!);
    await this.set(updated);
  }

  subscribe(subscriber: Subscriber<T>): Unsubscriber {
    if (this.disposed) {
      throw new Error(`Store ${this.options.key} is disposed`);
    }

    this.subscribers.add(subscriber);

    for (const mw of this.middlewares) {
      if (mw.onSubscribe) {
        mw.onSubscribe(subscriber);
      }
    }

    if (this.cache !== null && this.cacheValid) {
      Promise.resolve(
        subscriber(this.cache, {
          timestamp: Date.now(),
          source: 'subscription',
          operation: 'set',
        })
      ).catch(console.error);
    } else {
      this.get()
        .then((value) => {
          if (value !== null && this.subscribers.has(subscriber)) {
            subscriber(value, {
              timestamp: Date.now(),
              source: 'subscription-load',
              operation: 'set',
            });
          }
        })
        .catch(console.error);
    }

    return () => {
      this.subscribers.delete(subscriber);

      for (const mw of this.middlewares) {
        if (mw.onUnsubscribe) {
          mw.onUnsubscribe(subscriber);
        }
      }
    };
  }

  select<K>(selector: (value: T) => K): Store<K> {
    const derivedStore = new ReactiveStore<K>(
      {
        read: async () => {
          const parentValue = await this.get();
          return parentValue ? selector(parentValue) : null;
        },
        write: async () => {
          throw new Error('Cannot write to derived store');
        },
      },
      { ...this.options, key: `${this.options.key}.derived` }
    );

    this.subscribe((value) => {
      const selected = selector(value);
      derivedStore.notify(selected, {
        timestamp: Date.now(),
        source: 'parent-update',
        operation: 'set',
      });
    });

    return derivedStore;
  }

  pipe<R>(...transforms: Transform<any, any>[]): Store<R> {
    const transform = async (value: T): Promise<R> => {
      let result: any = value;
      for (const fn of transforms) {
        result = await fn(result);
      }
      return result as R;
    };

    const pipedStore = new ReactiveStore<R>(
      {
        read: async () => {
          const parentValue = await this.get();
          return parentValue ? await transform(parentValue) : null;
        },
        write: async () => {
          throw new Error('Cannot write to piped store');
        },
      },
      { ...this.options, key: `${this.options.key}.piped` }
    );

    this.subscribe(async (value) => {
      const transformed = await transform(value);
      pipedStore.notify(transformed, {
        timestamp: Date.now(),
        source: 'parent-transform',
        operation: 'set',
      });
    });

    return pipedStore;
  }

  use(middleware: Middleware<T>): this {
    this.middlewares.push(middleware);
    return this;
  }

  private notify(value: T, metadata: ChangeMetadata): void {
    this.subscribers.forEach((subscriber) => {
      Promise.resolve(subscriber(value, metadata)).catch((error) => {
        console.error(`Subscriber error in store ${this.options.key}:`, error);
      });
    });
  }

  private async handleError(error: Error, operation: 'read' | 'write' | 'delete'): Promise<void> {
    for (const mw of this.middlewares) {
      if (mw.onError) {
        await mw.onError(error, operation);
      }
    }
    console.error(`Store ${this.options.key} ${operation} error:`, error);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;

    this.disposed = true;

    if (this.cacheTimer) {
      clearTimeout(this.cacheTimer);
    }

    if (this.watchUnsubscribe) {
      this.watchUnsubscribe();
    }

    this.subscribers.clear();
    this.middlewares = [];

    if (this.adapter && this.adapter.dispose) {
      await this.adapter.dispose();
    }
  }
}

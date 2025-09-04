import { Store, StoreAdapter, Middleware } from '../types';
import { ReactiveStore } from '../core/reactive-store';
import { MemoryAdapter } from '../adapters/memory';

export interface StoreDefinition<T> {
  name: string;
  initialValue: T;
  adapter?: StoreAdapter<T>;
  options?: {
    cacheMs?: number;
    lazyInit?: boolean;
  };
  middleware?: Middleware<T>[];
}

export class StoreRegistry {
  private stores = new Map<string, Store<any>>();
  private definitions = new Map<string, StoreDefinition<any>>();

  register<T>(definition: StoreDefinition<T>): Store<T> {
    if (this.stores.has(definition.name)) {
      return this.stores.get(definition.name)!;
    }

    const adapter = definition.adapter || new MemoryAdapter<T>(definition.initialValue);
    const store = new ReactiveStore(adapter, {
      key: definition.name,
      ...definition.options,
    });

    if (definition.middleware) {
      definition.middleware.forEach((mw) => store.use(mw));
    }

    this.stores.set(definition.name, store);
    this.definitions.set(definition.name, definition);

    return store;
  }

  get<T>(name: string): Store<T> | undefined {
    return this.stores.get(name);
  }

  has(name: string): boolean {
    return this.stores.has(name);
  }

  list(): string[] {
    return Array.from(this.stores.keys());
  }

  async getAll(): Promise<Map<string, any>> {
    const values = new Map<string, any>();

    for (const [name, store] of this.stores) {
      values.set(name, await store.get());
    }

    return values;
  }

  async dispose(name: string): Promise<boolean> {
    const store = this.stores.get(name);
    if (!store) return false;

    await store.dispose();
    this.stores.delete(name);
    this.definitions.delete(name);

    return true;
  }

  async disposeAll(): Promise<void> {
    const disposePromises = Array.from(this.stores.values()).map((store) => store.dispose());
    await Promise.all(disposePromises);

    this.stores.clear();
    this.definitions.clear();
  }

  combine<T extends Record<string, any>>(
    name: string,
    storeMap: { [K in keyof T]: string }
  ): Store<T> {
    const getValues = async (): Promise<T> => {
      const result = {} as T;

      for (const [key, storeName] of Object.entries(storeMap)) {
        const store = this.stores.get(storeName as string);
        if (store) {
          result[key as keyof T] = await store.get();
        }
      }

      return result;
    };

    const combinedAdapter: StoreAdapter<T> = {
      read: getValues,
      write: async () => {
        throw new Error('Cannot write to combined store');
      },
    };

    const combinedStore = new ReactiveStore(combinedAdapter, { key: name });

    // Subscribe to all component stores
    for (const storeName of Object.values(storeMap)) {
      const store = this.stores.get(storeName as string);
      if (store) {
        store.subscribe(async () => {
          const values = await getValues();
          // Notify combined store subscribers
          (combinedStore as any).notify(values, {
            timestamp: Date.now(),
            source: 'component-update',
            operation: 'set',
          });
        });
      }
    }

    this.stores.set(name, combinedStore);
    return combinedStore;
  }
}

// Create and export the global registry instance
export const globalRegistry = new StoreRegistry();

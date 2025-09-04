/**
 * Core type definitions for @yakkl/reactive
 */

// Store types
export interface Readable<T> {
  subscribe(subscriber: Subscriber<T>): Unsubscriber;
  get(): T;
}

export interface Writable<T> extends Readable<T> {
  set(value: T): void;
  update(updater: Updater<T>): void;
}

export interface Derived<T> extends Readable<T> {
  readonly value: T;
}

// Function types
export type Updater<T> = (value: T) => T;
export type Invalidator<T> = (value?: T) => void;
export type StartStopNotifier<T> = (set: Subscriber<T>) => Unsubscriber | void;

// Computed and effect types
export interface ComputedOptions {
  equals?: <T>(a: T, b: T) => boolean;
  lazy?: boolean;
}

export interface EffectOptions {
  immediate?: boolean;
  flush?: 'sync' | 'pre' | 'post';
  onTrack?: (event: TrackEvent) => void;
  onTrigger?: (event: TriggerEvent) => void;
}

export interface WatchOptions<T = any> extends EffectOptions {
  deep?: boolean;
  oldValue?: T;
}

// Tracking types for debugging
export interface TrackEvent {
  effect: Effect;
  target: object;
  type: 'get' | 'has' | 'iterate';
  key?: any;
}

export interface TriggerEvent {
  effect: Effect;
  target: object;
  type: 'set' | 'add' | 'delete' | 'clear';
  key?: any;
  newValue?: any;
  oldValue?: any;
}

// Effect class interface
export interface Effect {
  id: number;
  active: boolean;
  deps: Set<Dep>;
  run(): any;
  stop(): void;
}

// Dependency tracking
export interface Dep {
  effects: Set<Effect>;
  notify(): void;
}

// Batch update interface
export interface BatchOptions {
  onError?: (error: Error) => void;
  maxBatchSize?: number;
}

// Store configuration
export interface StoreConfig<T> {
  initial: T;
  equals?: (a: T, b: T) => boolean;
  name?: string;
  persist?: boolean | PersistOptions;
}

export interface PersistOptions {
  key: string;
  storage?: Storage;
  serializer?: Serializer<any>;
}

export interface Serializer<T> {
  serialize(value: T): string;
  deserialize(value: string): T;
}

// Operator types
export type OperatorFunction<T, R> = (source: Readable<T>) => Readable<R>;
export type MonoTypeOperatorFunction<T> = OperatorFunction<T, T>;

// Utility types
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

export type DeepReadonly<T> = T extends primitive
  ? T
  : T extends Array<infer U>
    ? DeepReadonlyArray<U>
    : T extends Map<infer K, infer V>
      ? DeepReadonlyMap<K, V>
      : T extends Set<infer U>
        ? DeepReadonlySet<U>
        : DeepReadonlyObject<T>;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}
interface DeepReadonlyMap<K, V> extends ReadonlyMap<K, DeepReadonly<V>> {}
interface DeepReadonlySet<T> extends ReadonlySet<DeepReadonly<T>> {}
type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };

type primitive = string | number | boolean | bigint | symbol | undefined | null;

// Reactive ref types
export interface Ref<T = any> {
  value: T;
}

export interface UnwrapRef<T> {
  value: T extends Ref<infer V> ? V : T;
}

// Reactive collection types
export type ReactiveMap<K, V> = Map<K, V> & Readable<Map<K, V>>;
export type ReactiveSet<T> = Set<T> & Readable<Set<T>>;
export type ReactiveArray<T> = Array<T> & Readable<Array<T>>;

// --------------------------

export interface Store<T> {
  get(): Promise<T | null>;
  set(value: T): Promise<void>;
  update(updater: (value: T) => T | Promise<T>): Promise<void>;
  subscribe(listener: Subscriber<T>): Unsubscriber;
  select<K>(selector: (value: T) => K): Store<K>;
  pipe<R>(...transforms: Transform<any, any>[]): Store<R>;
  dispose(): Promise<void>;
}

export interface SyncStore<T> {
  get(): T | null;
  set(value: T): void;
  update(updater: (value: T) => T): void;
  subscribe(listener: Subscriber<T>): Unsubscriber;
  select<K>(selector: (value: T) => K): SyncStore<K>;
}

export type Subscriber<T> = (value: T, metadata?: ChangeMetadata) => void | Promise<void>;

export type Unsubscriber = () => void;

export interface ChangeMetadata {
  timestamp: number;
  source: string;
  userId?: string;
  sessionId?: string;
  operation?: 'set' | 'update' | 'sync';
  [key: string]: any;
}

export interface StoreAdapter<T> {
  read(): Promise<T | null>;
  write(value: T): Promise<void>;
  delete?(): Promise<void>;
  watch?(callback: (value: T, metadata?: ChangeMetadata) => void): Unsubscriber;
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

export interface SyncAdapter<T> {
  read(): T | null;
  write(value: T): void;
  delete?(): void;
  watch?(callback: (value: T, metadata?: ChangeMetadata) => void): Unsubscriber;
}

export interface Middleware<T> {
  name?: string;
  beforeRead?(key: string): Promise<void>;
  afterRead?(value: T | null, key: string): Promise<T | null>;
  beforeWrite?(value: T, prev: T | null, key: string): Promise<T>;
  afterWrite?(value: T, key: string): Promise<void>;
  onError?(error: Error, operation: 'read' | 'write' | 'delete'): Promise<void>;
  onSubscribe?(subscriber: Subscriber<T>): void;
  onUnsubscribe?(subscriber: Subscriber<T>): void;
}

export type Transform<TIn, TOut> = (value: TIn) => TOut | Promise<TOut>;

export interface StoreOptions {
  key: string;
  cacheMs?: number;
  lazyInit?: boolean;
  metadata?: Record<string, any>;
}

export interface ReactiveStoreConfig<T> {
  adapter: StoreAdapter<T> | SyncAdapter<T>;
  options?: Partial<StoreOptions>;
  middleware?: Middleware<T>[];
}

// Re-export Chrome types
export type { ChromeStorageArea, ChromeStorageChange, ChromeStorageChangedEvent, ChromeStorage, ChromeAPI } from './chrome';


/**
 * Base View Store - Foundation for all view-specific stores
 * 
 * Provides common functionality:
 * - Storage persistence
 * - Message bridge communication
 * - Performance tracking
 * - Error handling
 * - Incremental updates
 */

import { writable, derived, type Writable, type Readable, get } from 'svelte/store';
import browser from '$lib/common/browser-wrapper';
import { log } from '$lib/common/logger-wrapper';

export interface ViewStoreConfig {
  storageKey: string;
  syncInterval?: number; // milliseconds, 0 = manual only
  maxCacheAge?: number; // milliseconds before cache is considered stale
  enableAutoSync?: boolean;
}

export interface ViewMetadata {
  lastSync: number;
  lastModified: number;
  version: string;
  isStale: boolean;
  syncInProgress: boolean;
  errorCount: number;
}

export interface ViewUpdate<T> {
  type: 'full' | 'partial' | 'delta';
  data: T;
  timestamp: number;
  source: 'background' | 'ui' | 'storage';
}

export abstract class BaseViewStore<T> {
  protected store: Writable<T>;
  protected metadata: Writable<ViewMetadata>;
  protected config: ViewStoreConfig;
  protected syncTimer: number | null = null;
  protected messageListener: ((message: any) => void) | null = null;

  constructor(initialData: T, config: ViewStoreConfig) {
    this.config = {
      syncInterval: 30000, // 30 seconds default
      maxCacheAge: 300000, // 5 minutes default
      enableAutoSync: true,
      ...config
    };

    this.store = writable(initialData);
    this.metadata = writable({
      lastSync: 0,
      lastModified: Date.now(),
      version: '2.0.0',
      isStale: true,
      syncInProgress: false,
      errorCount: 0
    });

    this.initialize();
  }

  /**
   * Initialize the view store
   */
  protected async initialize(): Promise<void> {
    try {
      // Load from storage
      await this.loadFromStorage();

      // Set up message listener
      this.setupMessageListener();

      // Start auto-sync if enabled
      if (this.config.enableAutoSync && this.config.syncInterval > 0) {
        this.startAutoSync();
      }

      // Check if cache is stale
      this.checkStaleness();
    } catch (error) {
      log.error('Failed to initialize view store', error);
      this.incrementErrorCount();
    }
  }

  /**
   * Load data from browser storage
   */
  protected async loadFromStorage(): Promise<void> {
    try {
      const stored = await browser.storage.local.get(this.config.storageKey);
      if (stored && stored[this.config.storageKey]) {
        const data = stored[this.config.storageKey] as any;
        
        // Validate and hydrate the data
        const hydrated = await this.hydrateData(data);
        this.store.set(hydrated);
        
        // Update metadata
        this.metadata.update(m => ({
          ...m,
          lastSync: data._metadata?.lastSync || 0,
          isStale: this.isDataStale(data._metadata?.lastSync || 0)
        }));
      }
    } catch (error) {
      log.error('Failed to load from storage', error);
      this.incrementErrorCount();
    }
  }

  /**
   * Save data to browser storage
   */
  protected async saveToStorage(): Promise<void> {
    try {
      const data = get(this.store);
      const metadata = get(this.metadata);
      
      // Add metadata to stored data
      const toStore = {
        ...data,
        _metadata: {
          lastSync: metadata.lastSync,
          lastModified: metadata.lastModified,
          version: metadata.version
        }
      };

      // Dehydrate for storage (convert BigInt to string, etc)
      const dehydrated = await this.dehydrateData(toStore);
      
      await browser.storage.local.set({
        [this.config.storageKey]: dehydrated
      });
    } catch (error) {
      log.error('Failed to save to storage', error);
      this.incrementErrorCount();
    }
  }

  /**
   * Set up message listener for background updates
   */
  protected setupMessageListener(): void {
    this.messageListener = (message: any) => {
      if (message.type === `VIEW_UPDATE_${this.config.storageKey.toUpperCase()}`) {
        this.handleViewUpdate(message.payload);
      }
    };

    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.onMessage.addListener(this.messageListener);
    }
  }

  /**
   * Handle view update from background
   */
  protected async handleViewUpdate(update: ViewUpdate<T>): Promise<void> {
    try {
      this.metadata.update(m => ({ ...m, syncInProgress: true }));

      switch (update.type) {
        case 'full':
          // Complete replacement
          this.store.set(update.data);
          break;
        
        case 'partial':
          // Merge with existing data
          this.store.update(current => this.mergeData(current, update.data));
          break;
        
        case 'delta':
          // Apply incremental changes
          this.store.update(current => this.applyDelta(current, update.data));
          break;
      }

      // Update metadata
      this.metadata.update(m => ({
        ...m,
        lastSync: update.timestamp,
        lastModified: Date.now(),
        isStale: false,
        syncInProgress: false,
        errorCount: 0 // Reset on successful update
      }));

      // Persist to storage
      await this.saveToStorage();

      // Notify derived stores
      this.onDataUpdated(update);
    } catch (error) {
      log.error('Failed to handle view update', error);
      this.incrementErrorCount();
      this.metadata.update(m => ({ ...m, syncInProgress: false }));
    }
  }

  /**
   * Request fresh data from background
   */
  public async requestSync(): Promise<void> {
    if (get(this.metadata).syncInProgress) {
      log.debug('Sync already in progress');
      return;
    }

    try {
      this.metadata.update(m => ({ ...m, syncInProgress: true }));

      await browser.runtime.sendMessage({
        type: `REQUEST_VIEW_DATA`,
        view: this.config.storageKey,
        timestamp: Date.now()
      });
    } catch (error) {
      log.error('Failed to request sync', error);
      this.incrementErrorCount();
      this.metadata.update(m => ({ ...m, syncInProgress: false }));
    }
  }

  /**
   * Start automatic sync
   */
  protected startAutoSync(): void {
    if (typeof window === 'undefined') {
      return; // Skip during SSR
    }
    
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = window.setInterval(() => {
      if (this.isDataStale(get(this.metadata).lastSync)) {
        this.requestSync();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic sync
   */
  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Check if data is stale
   */
  protected isDataStale(lastSync: number): boolean {
    return Date.now() - lastSync > this.config.maxCacheAge;
  }

  /**
   * Check and update staleness
   */
  protected checkStaleness(): void {
    const metadata = get(this.metadata);
    const isStale = this.isDataStale(metadata.lastSync);
    
    if (isStale !== metadata.isStale) {
      this.metadata.update(m => ({ ...m, isStale }));
      
      if (isStale && this.config.enableAutoSync) {
        this.requestSync();
      }
    }
  }

  /**
   * Increment error count
   */
  protected incrementErrorCount(): void {
    this.metadata.update(m => ({
      ...m,
      errorCount: m.errorCount + 1
    }));
  }

  /**
   * Get readable store
   */
  public subscribe(run: (value: T) => void): () => void {
    return this.store.subscribe(run);
  }

  /**
   * Get metadata store
   */
  public get metadata$(): Readable<ViewMetadata> {
    return this.metadata;
  }

  /**
   * Clear all data
   */
  public async clear(): Promise<void> {
    this.store.set(this.getEmptyData());
    this.metadata.set({
      lastSync: 0,
      lastModified: Date.now(),
      version: '2.0.0',
      isStale: true,
      syncInProgress: false,
      errorCount: 0
    });
    
    await browser.storage.local.remove(this.config.storageKey);
  }

  /**
   * Cleanup on destroy
   */
  public destroy(): void {
    this.stopAutoSync();
    
    if (this.messageListener && browser.runtime) {
      browser.runtime.onMessage.removeListener(this.messageListener);
    }
  }

  // Abstract methods to be implemented by specific view stores
  protected abstract hydrateData(data: any): Promise<T>;
  protected abstract dehydrateData(data: any): Promise<any>;
  protected abstract mergeData(current: T, update: T): T;
  protected abstract applyDelta(current: T, delta: any): T;
  protected abstract onDataUpdated(update: ViewUpdate<T>): void;
  protected abstract getEmptyData(): T;
}

/**
 * Create a derived store for filtered/sorted views
 */
export function createDerivedView<T, R>(
  source: Readable<T>,
  transform: (data: T) => R
): Readable<R> {
  return derived(source, transform);
}

/**
 * Performance monitoring wrapper
 */
export function withPerformanceTracking<T>(
  fn: () => T,
  label: string
): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  if (duration > 50) {
    log.warn(`Slow operation: ${label} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}
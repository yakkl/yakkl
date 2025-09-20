/**
 * Client Storage Loader Service
 * Implements cache-first loading strategy with background updates
 * Loads data from persistent storage and updates cache for fast subsequent loads
 */

import { log } from '$lib/common/logger-wrapper';
import { browser_ext } from '$lib/common/environment';
import type { YakklAccount, YakklCurrentlySelected, YakklSettings, TokenData } from '$lib/common/interfaces';
import {
  STORAGE_YAKKL_CURRENTLY_SELECTED,
  STORAGE_YAKKL_SETTINGS,
  STORAGE_YAKKL_ACCOUNTS,
  STORAGE_YAKKL_COMBINED_TOKENS
} from '$lib/common/constants';

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface LoadResult<T> {
  data: T | null;
  fromCache: boolean;
  error?: Error;
}

export class ClientStorageLoaderService {
  private static instance: ClientStorageLoaderService;
  private cache = new Map<string, CachedData<any>>();
  private readonly CACHE_VERSION = '1.0.0';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private updateQueue = new Set<string>();
  private isUpdating = false;

  private constructor() {
    this.initializeCache();
  }

  static getInstance(): ClientStorageLoaderService {
    if (!ClientStorageLoaderService.instance) {
      ClientStorageLoaderService.instance = new ClientStorageLoaderService();
    }
    return ClientStorageLoaderService.instance;
  }

  /**
   * Initialize cache from session storage (temporary cache)
   */
  private async initializeCache(): Promise<void> {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const cacheKeys = ['currentlySelected', 'settings', 'accounts', 'tokens'];

        for (const key of cacheKeys) {
          const cached = sessionStorage.getItem(`yakkl_cache_${key}`);
          if (cached) {
            try {
              const parsedCache = JSON.parse(cached) as CachedData<any>;

              // Validate cache version and TTL
              if (parsedCache.version === this.CACHE_VERSION &&
                  Date.now() - parsedCache.timestamp < this.CACHE_TTL) {
                this.cache.set(key, parsedCache);
                log.debug('[ClientStorageLoader] Loaded from session cache', false, { key });
              }
            } catch (error) {
              log.warn('[ClientStorageLoader] Invalid cache data', false, { key, error });
            }
          }
        }
      }
    } catch (error) {
      log.warn('[ClientStorageLoader] Failed to initialize cache', false, error);
    }
  }

  /**
   * Load currently selected account/chain with cache-first strategy
   */
  async loadCurrentlySelected(): Promise<LoadResult<YakklCurrentlySelected>> {
    const cacheKey = 'currentlySelected';

    // Try cache first
    const cached = this.getFromCache<YakklCurrentlySelected>(cacheKey);
    if (cached) {
      // Schedule background update
      this.scheduleBackgroundUpdate(cacheKey, STORAGE_YAKKL_CURRENTLY_SELECTED);

      return {
        data: cached,
        fromCache: true
      };
    }

    // Load from storage
    try {
      const data = await this.loadFromStorage<YakklCurrentlySelected>(STORAGE_YAKKL_CURRENTLY_SELECTED);

      if (data) {
        this.setCache(cacheKey, data);
      }

      return {
        data,
        fromCache: false
      };
    } catch (error) {
      log.error('[ClientStorageLoader] Failed to load currently selected', false, error);
      return {
        data: null,
        fromCache: false,
        error: error as Error
      };
    }
  }

  /**
   * Load wallet settings with cache-first strategy
   */
  async loadSettings(): Promise<LoadResult<YakklSettings>> {
    const cacheKey = 'settings';

    // Try cache first
    const cached = this.getFromCache<YakklSettings>(cacheKey);
    if (cached) {
      // Schedule background update
      this.scheduleBackgroundUpdate(cacheKey, STORAGE_YAKKL_SETTINGS);

      return {
        data: cached,
        fromCache: true
      };
    }

    // Load from storage
    try {
      const data = await this.loadFromStorage<YakklSettings>(STORAGE_YAKKL_SETTINGS);

      if (data) {
        this.setCache(cacheKey, data);
      }

      return {
        data,
        fromCache: false
      };
    } catch (error) {
      log.error('[ClientStorageLoader] Failed to load settings', false, error);
      return {
        data: null,
        fromCache: false,
        error: error as Error
      };
    }
  }

  /**
   * Load accounts with cache-first strategy
   */
  async loadAccounts(): Promise<LoadResult<YakklAccount[]>> {
    const cacheKey = 'accounts';

    // Try cache first
    const cached = this.getFromCache<YakklAccount[]>(cacheKey);
    if (cached) {
      // Schedule background update
      this.scheduleBackgroundUpdate(cacheKey, STORAGE_YAKKL_ACCOUNTS);

      return {
        data: cached,
        fromCache: true
      };
    }

    // Load from storage
    try {
      const data = await this.loadFromStorage<YakklAccount[]>(STORAGE_YAKKL_ACCOUNTS);

      if (data) {
        this.setCache(cacheKey, data);
      }

      return {
        data,
        fromCache: false
      };
    } catch (error) {
      log.error('[ClientStorageLoader] Failed to load accounts', false, error);
      return {
        data: null,
        fromCache: false,
        error: error as Error
      };
    }
  }

  /**
   * Load tokens with cache-first strategy
   */
  async loadTokens(): Promise<LoadResult<TokenData[]>> {
    const cacheKey = 'tokens';

    // Try cache first
    const cached = this.getFromCache<TokenData[]>(cacheKey);
    if (cached) {
      // Schedule background update
      this.scheduleBackgroundUpdate(cacheKey, STORAGE_YAKKL_COMBINED_TOKENS);

      return {
        data: cached,
        fromCache: true
      };
    }

    // Load from storage
    try {
      const data = await this.loadFromStorage<TokenData[]>(STORAGE_YAKKL_COMBINED_TOKENS);

      if (data) {
        this.setCache(cacheKey, data);
      }

      return {
        data,
        fromCache: false
      };
    } catch (error) {
      log.error('[ClientStorageLoader] Failed to load tokens', false, error);
      return {
        data: null,
        fromCache: false,
        error: error as Error
      };
    }
  }

  /**
   * Load data from persistent storage
   */
  private async loadFromStorage<T>(key: string): Promise<T | null> {
    if (!browser_ext?.storage?.local) {
      log.warn('[ClientStorageLoader] Storage API not available');
      return null;
    }

    try {
      const result = await browser_ext.storage.local.get(key);
      return (result[key] || null) as T;
    } catch (error) {
      log.error('[ClientStorageLoader] Storage load error', false, { key, error });
      throw error;
    }
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(key: string, data: T): void {
    const cacheData: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: this.CACHE_VERSION
    };

    this.cache.set(key, cacheData);

    // Also persist to session storage
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`yakkl_cache_${key}`, JSON.stringify(cacheData));
      }
    } catch (error) {
      // Session storage might be full or unavailable
      log.debug('[ClientStorageLoader] Failed to persist to session storage', false, { key, error });
    }
  }

  /**
   * Schedule background update of cached data
   */
  private scheduleBackgroundUpdate(cacheKey: string, storageKey: string): void {
    // Add to update queue
    this.updateQueue.add(cacheKey);

    // Process queue if not already processing
    if (!this.isUpdating) {
      this.processUpdateQueue();
    }
  }

  /**
   * Process background update queue
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isUpdating || this.updateQueue.size === 0) {
      return;
    }

    this.isUpdating = true;

    // Use requestIdleCallback for background updates if available
    const performUpdate = async () => {
      for (const cacheKey of this.updateQueue) {
        this.updateQueue.delete(cacheKey);

        // Map cache key to storage key
        const storageKey = this.getStorageKey(cacheKey);
        if (!storageKey) continue;

        try {
          const freshData = await this.loadFromStorage(storageKey);
          if (freshData) {
            this.setCache(cacheKey, freshData);
            log.debug('[ClientStorageLoader] Background update completed', false, { cacheKey });
          }
        } catch (error) {
          log.warn('[ClientStorageLoader] Background update failed', false, { cacheKey, error });
        }
      }

      this.isUpdating = false;

      // Check if more items were added during processing
      if (this.updateQueue.size > 0) {
        this.processUpdateQueue();
      }
    };

    // Use requestIdleCallback if available
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(performUpdate, { timeout: 2000 });
    } else {
      // Fallback to setTimeout
      setTimeout(performUpdate, 100);
    }
  }

  /**
   * Map cache key to storage key
   */
  private getStorageKey(cacheKey: string): string | null {
    const keyMap: Record<string, string> = {
      'currentlySelected': STORAGE_YAKKL_CURRENTLY_SELECTED,
      'settings': STORAGE_YAKKL_SETTINGS,
      'accounts': STORAGE_YAKKL_ACCOUNTS,
      'tokens': STORAGE_YAKKL_COMBINED_TOKENS
    };

    return keyMap[cacheKey] || null;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.updateQueue.clear();

    // Clear session storage cache
    try {
      if (typeof sessionStorage !== 'undefined') {
        const cacheKeys = ['currentlySelected', 'settings', 'accounts', 'tokens'];
        for (const key of cacheKeys) {
          sessionStorage.removeItem(`yakkl_cache_${key}`);
        }
      }
    } catch (error) {
      log.debug('[ClientStorageLoader] Failed to clear session storage', false, error);
    }
  }

  /**
   * Force refresh of specific cached data
   */
  async forceRefresh(cacheKey: string): Promise<void> {
    const storageKey = this.getStorageKey(cacheKey);
    if (!storageKey) return;

    try {
      const freshData = await this.loadFromStorage(storageKey);
      if (freshData) {
        this.setCache(cacheKey, freshData);
      } else {
        this.cache.delete(cacheKey);
      }
    } catch (error) {
      log.error('[ClientStorageLoader] Force refresh failed', false, { cacheKey, error });
      this.cache.delete(cacheKey);
    }
  }

  /**
   * Preload all critical data
   */
  async preloadAll(): Promise<void> {
    const loadPromises = [
      this.loadCurrentlySelected(),
      this.loadSettings(),
      this.loadAccounts(),
      this.loadTokens()
    ];

    const results = await Promise.allSettled(loadPromises);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const dataTypes = ['currentlySelected', 'settings', 'accounts', 'tokens'];
        log.warn('[ClientStorageLoader] Preload failed', false, {
          dataType: dataTypes[index],
          error: result.reason
        });
      }
    });
  }
}

// Export singleton instance
export const clientStorageLoader = ClientStorageLoaderService.getInstance();
import { writable, derived, get } from 'svelte/store';
import type { TokenDisplay } from '../types';
import { browser } from '$app/environment';
import {
  setObjectInExtensionStorage,
  getObjectFromExtensionStorage
} from '$lib/common/stores';

export type ViewMode = 'current_account' | 'single_network' | 'all_networks';

interface ViewCacheEntry {
  tokens: TokenDisplay[];
  lastUpdate: Date;
  totalValue: number;
}

interface TokenViewCache {
  current_account: ViewCacheEntry | null;
  single_network: ViewCacheEntry | null;
  all_networks: ViewCacheEntry | null;
  isFirstTimeUser?: boolean; // Track if this is first time setup
}

const CACHE_KEY = 'yakklTokenViewCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function createExtensionTokenCacheStore() {
  // Initialize with empty cache
  const initialState: TokenViewCache = {
    current_account: null,
    single_network: null,
    all_networks: null,
    isFirstTimeUser: true
  };

  const { subscribe, set, update } = writable<TokenViewCache>(initialState);

  // Load from extension storage on initialization
  async function loadFromExtensionStorage() {
    if (!browser) return;

    try {
      const cached = await getObjectFromExtensionStorage<TokenViewCache>(CACHE_KEY);
      
      if (cached) {
        // Convert date strings back to Date objects
        const hydrated = hydrateCache(cached);
        
        // Don't reset cache on login - preserve it
        console.log('[ExtensionTokenCache] Loaded existing cache from extension storage');
        set(hydrated);
      } else {
        console.log('[ExtensionTokenCache] No existing cache found, starting fresh');
      }
    } catch (error) {
      console.error('[ExtensionTokenCache] Failed to load from extension storage:', error);
    }
  }

  // Helper to convert date strings back to Date objects
  function hydrateCache(cache: any): TokenViewCache {
    const hydrated: any = { ...cache };
    
    ['current_account', 'single_network', 'all_networks'].forEach(key => {
      if (hydrated[key] && hydrated[key].lastUpdate) {
        hydrated[key].lastUpdate = new Date(hydrated[key].lastUpdate);
      }
    });
    
    return hydrated;
  }

  // Save to extension storage whenever the store updates
  let saveTimeout: NodeJS.Timeout;
  subscribe(state => {
    if (!browser) return;

    // Debounce saves to avoid excessive writes
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await setObjectInExtensionStorage(CACHE_KEY, state);
        console.log('[ExtensionTokenCache] Saved cache to extension storage');
      } catch (error) {
        console.error('[ExtensionTokenCache] Failed to save to extension storage:', error);
      }
    }, 500);
  });

  // Initialize loading
  if (browser) {
    loadFromExtensionStorage();
  }

  return {
    subscribe,

    // Set cache for a specific view mode with proper price validation
    setCache(viewMode: ViewMode, tokens: TokenDisplay[], totalValue: number) {
      update(state => {
        // Validate that we're not caching suspicious values
        const SUSPICIOUS_VALUES = [912.81, 912.47, 912.98, 2581.53];
        const isSuspicious = SUSPICIOUS_VALUES.some(val =>
          Math.abs(totalValue - val) < 1
        );

        if (isSuspicious) {
          console.warn('[ExtensionTokenCache] Refusing to cache suspicious value:', totalValue);
          return state;
        }

        // Mark as no longer first time user once we have real data
        const newState = {
          ...state,
          [viewMode]: {
            tokens,
            lastUpdate: new Date(),
            totalValue
          },
          isFirstTimeUser: false
        };

        console.log('[ExtensionTokenCache] Updated cache for', viewMode, 'with value:', totalValue);
        return newState;
      });
    },

    // Get cache for a specific view mode
    getCache(viewMode: ViewMode): ViewCacheEntry | null {
      const state = get({ subscribe });
      const cache = state[viewMode];

      if (!cache) return null;

      // For first time users, don't return stale cache
      if (state.isFirstTimeUser) {
        console.log('[ExtensionTokenCache] First time user, not returning cache');
        return null;
      }

      // Check if cache is still valid (within duration)
      const age = Date.now() - cache.lastUpdate.getTime();
      if (age > CACHE_DURATION) {
        console.log(`[ExtensionTokenCache] Cache for ${viewMode} is stale (${Math.round(age / 1000)}s old)`);
      }

      return cache;
    },

    // Clear cache for first time setup only
    async clearForFirstTimeSetup() {
      const state = get({ subscribe });
      if (state.isFirstTimeUser) {
        console.log('[ExtensionTokenCache] Clearing cache for first time setup');
        set(initialState);

        // Also clear from storage
        if (browser) {
          try {
            await setObjectInExtensionStorage(CACHE_KEY, null);
          } catch (error) {
            console.error('[ExtensionTokenCache] Failed to clear storage:', error);
          }
        }
      }
    },

    // Update prices in all cached views
    updatePrices(updatedTokens: TokenDisplay[]) {
      update(state => {
        const newState = { ...state };

        // Create a map for quick lookup
        const priceMap = new Map(
          updatedTokens.map(token => [
            `${token.address.toLowerCase()}-${token.chainId}`,
            { price: token.price, value: token.value }
          ])
        );

        // Update each view mode's cache
        Object.keys(newState).forEach(viewMode => {
          if (viewMode === 'isFirstTimeUser') return;

          const cache = newState[viewMode as ViewMode];
          if (cache && cache.tokens) {
            let newTotalValue = 0;
            cache.tokens = cache.tokens.map(token => {
              const key = `${token.address.toLowerCase()}-${token.chainId}`;
              const update = priceMap.get(key);
              if (update) {
                const updatedToken = {
                  ...token,
                  price: update.price,
                  value: update.value
                };
                newTotalValue += typeof update.value === 'number' ? update.value : 0;
                return updatedToken;
              }
              newTotalValue += typeof token.value === 'number' ? token.value : 0;
              return token;
            });
            cache.totalValue = newTotalValue;
            cache.lastUpdate = new Date();
          }
        });

        return newState;
      });
    },

    // Check if cache needs refresh
    needsRefresh(viewMode: ViewMode): boolean {
      const cache = this.getCache(viewMode);
      if (!cache) return true;

      const age = Date.now() - cache.lastUpdate.getTime();
      return age > CACHE_DURATION;
    }
  };
}

export const extensionTokenCacheStore = createExtensionTokenCacheStore();

// Derived store for current view cache
export const currentExtensionViewCache = derived(
  extensionTokenCacheStore,
  $cache => $cache
);

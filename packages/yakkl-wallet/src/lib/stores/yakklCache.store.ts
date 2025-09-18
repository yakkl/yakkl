/**
 * yakklCache.store.ts - Minimal portfolio cache for immediate UI feedback
 *
 * This replaces the complex caching system with a simple, single-line cache
 * that stores only the last portfolio total for display purposes.
 */

import { writable, derived, get } from 'svelte/store';
import browser from '$lib/common/browser-wrapper';
import { log } from '$lib/common/logger-wrapper';
import { getObjectFromLocalStorage, removeObjectFromLocalStorage, setObjectInLocalStorage } from '@yakkl/browser-extension';

// Define the cache structure
export interface YakklCache {
  id: string;                // Unique ID (account + chainId)
  account: string;           // Account address
  chainId: number;           // Chain ID
  portfolioTotal: string;    // Last known portfolio total (in cents)
  lastUpdate: string;        // ISO timestamp
  nativeTokenPrice?: number; // Last native token price
}

// Single line cache - only one record ever
export const yakklCache = writable<YakklCache | null>(null);
export const isUpdating = writable(false);
export const lastPriceUpdate = writable<Date | null>(null);

// Derived store for display with shimmer effect
export const portfolioPlaceholder = derived(
  [yakklCache, isUpdating],
  ([$cache, $updating]) => {
    if (!$cache) {
      return {
        placeholder: getPlaceholder(),
        shimmer: false,
        value: null
      };
    }

    return {
      value: $cache.portfolioTotal,
      shimmer: $updating,
      placeholder: null
    };
  }
);

/**
 * Get placeholder based on available space
 * For now, using a single format, but can be enhanced later
 */
export function getPlaceholder(): string {
  // Simple placeholder for now
  // Can enhance later to check container width or pass size as parameter
  return '$----';
}

/**
 * Update the cache with new data
 * Immediately updates both store and persistent storage
 */
export async function updateYakklCache(data: Partial<YakklCache>): Promise<void> {
  try {
    const current = get(yakklCache);
    const updated: YakklCache = {
      id: data.id || (data.account && data.chainId ? `${data.account}_${data.chainId}` : current?.id || ''),
      account: data.account || current?.account || '',
      chainId: data.chainId || current?.chainId || 1,
      portfolioTotal: data.portfolioTotal || current?.portfolioTotal || '0',
      lastUpdate: new Date().toISOString(),
      nativeTokenPrice: data.nativeTokenPrice || current?.nativeTokenPrice
    };

    // Update store immediately for UI reactivity
    yakklCache.set(updated);

    // Update persistent storage immediately (single line - overwrites)
    if (typeof window !== 'undefined') {
      await setObjectInLocalStorage('yakklCache', updated);
      log.debug('[YakklCache] Updated cache:', false, updated);
    }
  } catch (error) {
    log.error('[YakklCache] Failed to update cache:', false, error);
  }
}

/**
 * Load cache from persistent storage
 * Called on app initialization
 */
export async function loadYakklCache(): Promise<void> {
  try {
    if (typeof window === 'undefined') return; // For client context only

    const cachedData = await getObjectFromLocalStorage('yakklCache') as YakklCache | undefined;
    if (cachedData?.id) {
      // Only set if it's a valid YakklCache object
      yakklCache.set(cachedData);
      log.debug('[YakklCache] Loaded from storage:', false, cachedData);
    } else {
      log.debug('[YakklCache] No cached data found');
    }
  } catch (error) {
    log.error('[YakklCache] Failed to load cache:', false, error);
  }
}

/**
 * Clear the cache
 */
export async function clearYakklCache(): Promise<void> {
  try {
    yakklCache.set(null);
    if (typeof window !== 'undefined') {
      await removeObjectFromLocalStorage('yakklCache');
      log.debug('[YakklCache] Cache cleared');
    }
  } catch (error) {
    log.error('[YakklCache] Failed to clear cache:', false, error);
  }
}

/**
 * Set updating state
 */
export function setUpdating(updating: boolean): void {
  isUpdating.set(updating);
}

/**
 * Format portfolio total for display
 */
export function formatPortfolioTotal(valueInCents: string): string {
  try {
    const cents = parseInt(valueInCents, 10);
    if (isNaN(cents)) return getPlaceholder();

    const dollars = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(dollars);
  } catch {
    return getPlaceholder();
  }
}

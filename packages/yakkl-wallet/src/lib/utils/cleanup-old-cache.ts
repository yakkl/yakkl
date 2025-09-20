/**
 * Cleanup utility for removing old cache storage keys
 * Run this once to clean up browser storage from old caching system
 */

import browser from '$lib/common/browser-wrapper';
import { log } from '$lib/common/logger-wrapper';

export async function cleanupOldCacheKeys(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    log.info('[CleanupCache] Starting cleanup of old cache keys');

    // List of old cache-related storage keys to remove
    const oldCacheKeys = [
      'provider-cache',
      'providerCache',
      'wallet-cache',
      'walletCache',
      'wallet-cache-v2',
      'cacheSyncQueue',
      'cache-sync-queue',
      'tokenCache',
      'transactionCache',
      'portfolioCache',
      'accountCache',
      'networkCache',
      'chainAccountCache',
      'portfolioRollups',
      'accountMetadata',
      'cacheVersion',
      'cacheLastSync',
      'cacheMetadata',
      // Add any other old cache keys here
    ];

    // Get all storage keys
    const allStorage = await browser.storage.local.get(null);
    const allKeys = Object.keys(allStorage);

    // Find and remove old cache keys
    const keysToRemove: string[] = [];

    for (const key of allKeys) {
      // Check if key matches any of our old cache patterns
      if (oldCacheKeys.includes(key)) {
        keysToRemove.push(key);
      }
      // Also remove keys that start with cache-related prefixes
      if (key.startsWith('cache-') ||
          key.startsWith('provider-cache-') ||
          key.startsWith('wallet-cache-') ||
          key.includes('Cache')) {
        if (!key.includes('yakklCache')) { // Don't remove our new cache
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      log.info('[CleanupCache] Removing old cache keys:', false, keysToRemove);
      await browser.storage.local.remove(keysToRemove);
      log.info('[CleanupCache] Successfully removed', false, keysToRemove.length, 'old cache keys');
    } else {
      log.info('[CleanupCache] No old cache keys found to remove');
    }

    // Also clean up localStorage if available
    if (typeof localStorage !== 'undefined') {
      const localStorageKeys = Object.keys(localStorage);
      let removedCount = 0;

      for (const key of localStorageKeys) {
        if ((key.includes('cache') || key.includes('Cache')) &&
            !key.includes('yakklCache')) {
          localStorage.removeItem(key);
          removedCount++;
        }
      }

      if (removedCount > 0) {
        log.info('[CleanupCache] Removed', false, removedCount, 'old cache keys from localStorage');
      }
    }

  } catch (error) {
    log.error('[CleanupCache] Failed to cleanup old cache keys:', false, error);
  }
}

// Export a one-time cleanup function that can be called from the home page
export async function runCacheCleanupOnce(): Promise<void> {
  const CLEANUP_FLAG_KEY = 'yakklCacheCleanupCompleted';

  try {
    // Check if cleanup has already been done
    const result = await browser.storage.local.get(CLEANUP_FLAG_KEY);
    if (result[CLEANUP_FLAG_KEY]) {
      log.debug('[CleanupCache] Cache cleanup already completed');
      return;
    }

    // Run the cleanup
    await cleanupOldCacheKeys();

    // Mark cleanup as completed
    await browser.storage.local.set({ [CLEANUP_FLAG_KEY]: true });
    log.info('[CleanupCache] Cache cleanup marked as completed');
  } catch (error) {
    log.error('[CleanupCache] Error during cache cleanup:', false, error);
  }
}
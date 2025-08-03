// Centralized wallet locking functionality
import { log } from './logger-wrapper';
import { setBadgeText, setIconLock } from '$lib/utilities/utilities';
import { stopActivityTracking } from './messaging';
import { removeTimers } from './timers';
import { removeListeners } from './listeners';
import { setMiscStore, resetStores, setYakklTokenDataCustomStorage, yakklTokenDataCustomStore } from './stores';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from './storage';
import { resetTokenDataStoreValues } from './resetTokenDataStoreValues';
import { get } from 'svelte/store';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from './constants';
import { browserAPI } from '$lib/services/browser-api.service';
import type { Browser } from 'webextension-polyfill';
import { walletCacheStore } from '$lib/stores/wallet-cache.store';
import { SingletonWindowManager } from '$lib/managers/SingletonWindowManager';
import { invalidateJWT } from '$lib/utilities/jwt-background';

/**
 * Lock the wallet and clear all sensitive data
 * This is the central function for locking the wallet from any context
 */
export async function lockWallet(reason: string = 'manual', tokenToInvalidate?: string): Promise<void> {
  try {
    log.info(`Locking wallet - Reason: ${reason}`);

    // 1. Invalidate JWT token as early as possible for security
    try {
      await invalidateJWT(tokenToInvalidate);
      log.debug('JWT token invalidated during wallet lock');
    } catch (error) {
      log.warn('Failed to invalidate JWT during wallet lock:', false, error);
      // Continue with lock even if JWT invalidation fails
    }

    // 2. Stop all active processes
    await stopActivityTracking();

    // 3. Update UI indicators
    await setBadgeText('');
    await setIconLock();

    // Browser API check removed - browserAPI handles client/background context automatically

    // 4. Save wallet cache before clearing - CRITICAL: Do not save if being reset
    try {
      // Force save of wallet cache to ensure complete state is persisted
      const cacheState = get(walletCacheStore);

      // Only save if we have valid data (not zeroed out)
      if (cacheState && cacheState.chainAccountCache) {
        let hasValidData = false;

        // Check if there's at least one non-zero value in the cache
        Object.values(cacheState.chainAccountCache).forEach(chainData => {
          Object.values(chainData as any).forEach((accountData: any) => {
            if (accountData?.portfolio?.totalValue > 0 ||
                accountData?.tokens?.some((t: any) => t.balance && parseFloat(t.balance) > 0)) {
              hasValidData = true;
            }
          });
        });

        if (hasValidData) {
          await setObjectInLocalStorage('yakklWalletCache', cacheState);
          log.info('Wallet cache saved before lock with valid data');
        } else {
          log.warn('Skipping cache save - no valid data to persist');
        }
      }
    } catch (error) {
      log.warn('Failed to save wallet cache during lock:', false, error);
    }

    // 4. Update storage to reflect locked state
    const yakklCurrentlySelected = await getObjectFromLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED) as any;
    if (yakklCurrentlySelected?.shortcuts) {
      yakklCurrentlySelected.shortcuts.isLocked = true;
      await setObjectInLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, yakklCurrentlySelected);
    }

    // Also update settings to ensure consistent locked state
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as any;
    if (settings) {
      settings.isLocked = true;
      await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, settings);
    }

    // 5. Clear all sensitive data from memory
    removeTimers();
    removeListeners();
    setMiscStore('');
    resetTokenDataStoreValues();

    // 6. Zero out values in custom token storage
    setYakklTokenDataCustomStorage(get(yakklTokenDataCustomStore));

    // 7. Reset all stores
    resetStores();

    // 8. Clear session markers
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('wallet-authenticated');
    }

    // 9. Clear extension session storage (except windowId)
    try {
      // Session storage API not yet implemented in browserAPI
      // Will be added in future phase
      log.debug('Session storage clear skipped - API not yet implemented');
    } catch (error) {
      log.warn('Failed to clear session storage:', false, error);
    }

    // 10. Clear any auth tokens from local storage
    try {
      await browserAPI.storageRemove(['sessionToken', 'sessionExpiresAt', 'authToken']);
    } catch (error) {
      log.warn('Failed to remove auth tokens from storage:', false, error);
    }

    // 11. Reset SingletonWindowManager to clear any stale window references
    try {
      SingletonWindowManager.reset();
      log.info('SingletonWindowManager reset during wallet lock');
    } catch (error) {
      log.warn('Failed to reset SingletonWindowManager during wallet lock', false, error);
    }

    log.info(`Wallet locked successfully - Reason: ${reason}`);
  } catch (error) {
    log.warn('Failed to lock wallet:', false, { error, reason });
    // Even if there's an error, try to ensure critical data is cleared
    try {
      resetStores();
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (e) {
      log.warn('Critical error during wallet lock:', false, e);
    }
  }
}

/**
 * Register handlers to lock wallet on various exit scenarios
 * Note: Extension-specific handlers (onSuspend, idle) should only be registered in background context
 */
export function registerWalletLockHandlers(): void {
  // Handle browser/tab close - safe for all contexts
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      lockWallet('window-close').catch(err =>
        log.warn('Error locking wallet on beforeunload:', false, err)
      );
    });

    // Handle visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Optional: lock on tab switch if high security mode
        // lockWallet('visibility-hidden');
      }
    });
  }

  // Extension-specific event handlers should be registered separately in background context
  // Not here, as this function is called from client context
}

/**
 * Register background-specific wallet lock handlers
 * This should only be called from the background script
 * @param browserApi - The browser API object (pass browser from webextension-polyfill)
 */
export function registerBackgroundWalletLockHandlers(browserApi: Browser): void {
  if (!browserApi) {
    log.warn('Browser API is required for background handlers');
    return;
  }

  try {
    // Handle extension-specific events
    if (browserApi.runtime?.onSuspend) {
      browserApi.runtime.onSuspend.addListener(() => {
        lockWallet('extension-suspend').catch(err =>
          log.warn('Error locking wallet on suspend:', false, err)
        );
      });
    }

    // Handle idle detection
    if (browserApi.idle) {
      browserApi.idle.setDetectionInterval(300); // 5 minutes
      browserApi.idle.onStateChanged.addListener((state: string) => {
        if (state === 'idle' || state === 'locked') {
          lockWallet(`idle-${state}`).catch(err =>
            log.warn('Error locking wallet on idle:', false, err)
          );
        }
      });
    }
  } catch (error) {
    log.warn('Error registering background wallet lock handlers:', false, error);
  }
}

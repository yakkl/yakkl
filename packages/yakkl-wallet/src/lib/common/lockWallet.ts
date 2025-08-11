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
import type { YakklCurrentlySelected } from './interfaces';

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

    // 4. Update storage to reflect locked state
    const yakklCurrentlySelected = await getObjectFromLocalStorage<YakklCurrentlySelected>(STORAGE_YAKKL_CURRENTLY_SELECTED);
    if (yakklCurrentlySelected?.shortcuts) {
      yakklCurrentlySelected.shortcuts.isLocked = true;
      yakklCurrentlySelected.updateDate = new Date().toISOString();
      await setObjectInLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, yakklCurrentlySelected);
    }

    // Also update settings to ensure consistent locked state
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as any;
    if (settings) {
      settings.isLocked = true;
      settings.lastUpdated = new Date().toISOString();
      await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, settings);
    }

    // 5. Clear all sensitive data from memory
    removeTimers();
    removeListeners();
    setMiscStore('');
    // resetTokenDataStoreValues();

    // 6. Reset all stores
    resetStores();

    // 7. Clear session markers
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('wallet-authenticated');
    }

    // 8. Clear any auth tokens from local storage
    try {
      await browserAPI.storageRemove(['sessionToken', 'sessionExpiresAt', 'authToken']);
    } catch (error) {
      log.warn('Failed to remove auth tokens from storage:', false, error);
    }

    // 9. Reset SingletonWindowManager to clear any stale window references
    try {
      SingletonWindowManager.reset();
      log.info('SingletonWindowManager reset during wallet lock');
    } catch (error) {
      log.warn('Failed to reset SingletonWindowManager during wallet lock', false, error);
    }

    // 12. Send message to background to close windows if in client context
    if (typeof window !== 'undefined') {
      try {
        const { getBrowserExtFromGlobal } = await import('./environment');
        const browserApi = await getBrowserExtFromGlobal();
        if (browserApi && browserApi.runtime) {
          // Tell background to close all windows
          await browserApi.runtime.sendMessage({ type: 'closeAllWindows', reason });
        }
      } catch (error) {
        log.debug('Could not send close windows message:', false, error);
      }
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
      console.log('Setting idle detection interval to 300 seconds');
      browserApi.idle.setDetectionInterval(300); // 5 minutes
      browserApi.idle.onStateChanged.addListener(async (state: string) => {
        if (state === 'idle' || state === 'locked') {
          console.log('Locking wallet on idle or locked state', state);
          await lockWallet(`idle-${state}`).catch(err =>
            log.warn('Error locking wallet on idle:', false, err)
          );
        }
      });
    }
  } catch (error) {
    log.warn('Error registering background wallet lock handlers:', false, error);
  }
}

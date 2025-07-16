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
import { getBrowserExt } from './environment';
import type { Browser } from 'webextension-polyfill';

/**
 * Lock the wallet and clear all sensitive data
 * This is the central function for locking the wallet from any context
 */
export async function lockWallet(reason: string = 'manual'): Promise<void> {
  try {
    log.info(`Locking wallet - Reason: ${reason}`);

    // 1. Stop all active processes
    await stopActivityTracking();
    
    // 2. Update UI indicators
    await setBadgeText('');
    await setIconLock();

    // 3. Update storage to reflect locked state
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

    // 4. Clear all sensitive data from memory
    removeTimers();
    removeListeners();
    setMiscStore('');
    resetTokenDataStoreValues();
    
    // 5. Zero out values in custom token storage
    setYakklTokenDataCustomStorage(get(yakklTokenDataCustomStore));
    
    // 6. Reset all stores
    resetStores();

    // 7. Clear session markers
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('wallet-authenticated');
    }

    // 8. Clear extension session storage (except windowId)
    const browserExt = getBrowserExt();
    if (browserExt?.storage?.session) {
      // Get all keys from session storage
      const allData = await browserExt.storage.session.get(null);
      const keysToRemove = Object.keys(allData).filter(key => key !== 'windowId');
      
      // Remove all keys except windowId
      if (keysToRemove.length > 0) {
        await browserExt.storage.session.remove(keysToRemove);
      }
    }

    // 9. Clear any auth tokens from local storage
    if (browserExt?.storage?.local) {
      await browserExt.storage.local.remove(['sessionToken', 'sessionExpiresAt', 'authToken']);
    }

    // 10. Reset SingletonWindowManager to clear any stale window references
    try {
      const { SingletonWindowManager } = await import('$lib/managers/SingletonWindowManager');
      SingletonWindowManager.reset();
      log.info('SingletonWindowManager reset during wallet lock');
    } catch (error) {
      log.warn('Failed to reset SingletonWindowManager during wallet lock', false, error);
    }

    log.info(`Wallet locked successfully - Reason: ${reason}`);
  } catch (error) {
    log.error('Failed to lock wallet:', false, { error, reason });
    // Even if there's an error, try to ensure critical data is cleared
    try {
      resetStores();
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch (e) {
      log.error('Critical error during wallet lock:', false, e);
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
        log.error('Error locking wallet on beforeunload:', false, err)
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
    log.error('Browser API is required for background handlers');
    return;
  }

  // Handle extension-specific events
  if (browserApi.runtime?.onSuspend) {
    browserApi.runtime.onSuspend.addListener(() => {
      lockWallet('extension-suspend').catch(err =>
        log.error('Error locking wallet on suspend:', false, err)
      );
    });
  }

  // Handle idle detection
  if (browserApi.idle) {
    browserApi.idle.setDetectionInterval(300); // 5 minutes
    browserApi.idle.onStateChanged.addListener((state: string) => {
      if (state === 'idle' || state === 'locked') {
        lockWallet(`idle-${state}`).catch(err =>
          log.error('Error locking wallet on idle:', false, err)
        );
      }
    });
  }
}
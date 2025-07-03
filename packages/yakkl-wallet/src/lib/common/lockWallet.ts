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
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from './constants';
import browser from 'webextension-polyfill';

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

    // 8. Clear extension session storage
    if (browser?.storage?.session) {
      await browser.storage.session.clear();
    }

    // 9. Clear any auth tokens from local storage
    await browser.storage.local.remove(['sessionToken', 'sessionExpiresAt', 'authToken']);

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
 */
export function registerWalletLockHandlers(): void {
  // Handle browser/tab close
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

  // Handle extension-specific events
  if (browser?.runtime?.onSuspend) {
    browser.runtime.onSuspend.addListener(() => {
      lockWallet('extension-suspend').catch(err =>
        log.error('Error locking wallet on suspend:', false, err)
      );
    });
  }

  // Handle idle detection
  if (browser?.idle) {
    browser.idle.setDetectionInterval(300); // 5 minutes
    browser.idle.onStateChanged.addListener((state) => {
      if (state === 'idle' || state === 'locked') {
        lockWallet(`idle-${state}`).catch(err =>
          log.error('Error locking wallet on idle:', false, err)
        );
      }
    });
  }
}
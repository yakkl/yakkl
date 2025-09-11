// Centralized wallet locking functionality
import { log } from './logger-wrapper';
import { setBadgeText, setIconLock } from '$lib/utilities/utilities';
import { stopActivityTracking } from './messaging';
import { removeTimers } from './timers';
import { removeListeners } from './listeners';
import { setMiscStore, resetStores } from './stores';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from './storage';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from './constants';
import { browserAPI } from '$lib/services/browser-api.service';
import type { Browser } from 'webextension-polyfill';
import { SingletonWindowManager } from '$lib/managers/SingletonWindowManager';
import { browserJWT } from '@yakkl/security';

// Create a local invalidateJWT function
async function invalidateJWT(token?: string) {
  await browserJWT.clearToken();
  if (token) {
    await browserJWT.revoke(token);
  }
}
import type { YakklCurrentlySelected } from './interfaces';
import { setLocks } from './locks';

/**
 * Internal function to perform the actual lock operations
 * Optimized for speed - completes in < 1 second
 */
async function performLockWallet(reason: string = 'manual', tokenToInvalidate?: string): Promise<void> {
  console.log(`[lockWallet] === STARTING FAST LOGOUT === Reason: ${reason}`);
  const startTime = Date.now();

  // Step 1: Send close windows message (fire-and-forget)
  try {
    const isBackgroundContext = typeof (globalThis as any).importScripts !== 'undefined';
    const isClientContext = typeof window !== 'undefined' && !isBackgroundContext;

    if (isClientContext) {
      // Try to get browser API quickly
      let browserApi: any = null;

      if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
        browserApi = chrome;
      } else if (typeof window !== 'undefined' && (window as any).browser?.runtime?.sendMessage) {
        browserApi = (window as any).browser;
      }

      // Fire-and-forget message - don't await
      if (browserApi?.runtime?.sendMessage) {
        browserApi.runtime.sendMessage({ type: 'closeAllWindows', reason }).catch(() => {
          // Ignore errors - window may already be closing
        });
      }
    }
  } catch (error) {
    // Ignore and continue
  }

  // Step 2: Run all cleanup operations in parallel for speed
  try {
    console.log('[lockWallet] Starting parallel cleanup...');

    // Create an array of promises for parallel execution
    const cleanupPromises: Promise<any>[] = [];

    // 1. CRITICAL: Invalidate JWT token (keep this awaited for security)
    if (tokenToInvalidate || typeof invalidateJWT === 'function') {
      cleanupPromises.push(
        invalidateJWT(tokenToInvalidate).catch(err =>
          console.warn('[lockWallet] JWT invalidation failed:', err?.message)
        )
      );
    }

    // 2. Stop activity tracking (fire-and-forget)
    // Don't wait for response - just send the message
    stopActivityTracking().catch(() => {});

    // 3. Update UI indicators (fire-and-forget)
    setBadgeText('').catch(() => {});
    setIconLock().catch(() => {});

    // 4. Update storage state (run in parallel)
    cleanupPromises.push(
      Promise.all([
        // Update currently selected
        getObjectFromLocalStorage<YakklCurrentlySelected>(STORAGE_YAKKL_CURRENTLY_SELECTED)
          .then(selected => {
            if (selected?.shortcuts) {
              selected.shortcuts.isLocked = true;
              selected.updateDate = new Date().toISOString();
              return setObjectInLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, selected);
            }
          })
          .catch(() => {}),
        // Update settings
        getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS)
          .then((settings: any) => {
            if (settings) {
              settings.isLocked = true;
              settings.lastUpdated = new Date().toISOString();
              return setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, settings);
            }
          })
          .catch(() => {})
      ])
    );

    // 5. Clear memory and stores synchronously (fast operations)
    try {
      // These are all synchronous or near-instant operations
      removeTimers();
      removeListeners();
      setMiscStore('');
      resetStores();

      // Clear session storage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('wallet-authenticated');
      }

      // Reset window manager
      SingletonWindowManager.reset();
    } catch (error) {
      console.warn('[lockWallet] Memory cleanup error:', error);
    }

    // 6. Clear auth tokens (fire-and-forget)
    browserAPI.storageRemove(['sessionToken', 'sessionExpiresAt', 'authToken']).catch(() => {});

    // Wait only for critical operations (JWT invalidation and storage updates)
    await Promise.allSettled(cleanupPromises);

    const elapsed = Date.now() - startTime;
    console.log(`[lockWallet] ✓ FAST LOGOUT COMPLETED in ${elapsed}ms - Reason: ${reason}`);

  } catch (error) {
    console.error('[lockWallet] Error during cleanup:', error);

    // Emergency cleanup - ensure critical data is cleared
    try {
      console.log('[lockWallet] Performing emergency cleanup...');

      // Clear stores
      if (typeof resetStores === 'function') {
        resetStores();
      }

      // Clear session storage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // Clear misc store
      if (typeof setMiscStore === 'function') {
        setMiscStore('');
      }

      console.log('[lockWallet] Emergency cleanup completed');
    } catch (emergencyError) {
      console.error('[lockWallet] Emergency cleanup failed:', emergencyError);
    }
  }

  console.log('[lockWallet] === LOGOUT COMPLETED ===');
}

/**
 * Lock the wallet and clear all sensitive data
 * Optimized for speed - completes in < 1 second
 * No timeout needed as operations are fast
 */
export async function lockWallet(reason: string = 'manual', tokenToInvalidate?: string): Promise<void> {
  try {
    // Just run the lock operation - it's fast now
    await performLockWallet(reason, tokenToInvalidate);
  } catch (error) {
    console.error('[lockWallet] Operation failed:', error);

    // Emergency cleanup - just clear stores synchronously
    try {
      resetStores();
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
      setMiscStore('');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

export async function simpleLockWallet(): Promise<void> {
  try {
    setBadgeText('').catch(() => {});
    setIconLock().catch(() => {});
    setLocks(true, false);
  } catch (error) {
    console.error('[simpleLockWallet] Operation failed:', error);
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

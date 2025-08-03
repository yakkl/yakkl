// Background-specific wallet locking functionality
// This version uses direct browser API access instead of message passing
import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { setBadgeText, setIconLock } from '$lib/utilities/utilities';
import { stopActivityTracking } from '$lib/common/messaging';
import { removeTimers } from '$lib/common/timers';
import { removeListeners } from '$lib/common/listeners';
import { setMiscStore, resetStores, setYakklTokenDataCustomStorage, yakklTokenDataCustomStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from '$lib/common/constants';
import { walletCacheStore } from '$lib/stores/wallet-cache.store';
import { SingletonWindowManager } from '$lib/managers/SingletonWindowManager';

/**
 * Lock the wallet and clear all sensitive data - Background Context Version
 * This version uses direct browser API access instead of message passing
 * Used in background scripts where we have direct access to browser APIs
 */
export async function lockWalletBackground(reason: string = 'manual', tokenToInvalidate?: string): Promise<void> {
  try {
    log.info(`[Background] Locking wallet - Reason: ${reason}`);

    // 1. Invalidate JWT token - Background context specific
    try {
      if (tokenToInvalidate) {
        // In background context, we can directly invalidate JWT
        await browser.storage.local.remove(['sessionToken', 'sessionExpiresAt']);
        log.debug('[Background] JWT token invalidated during wallet lock');
      }
    } catch (error) {
      log.warn('[Background] Failed to invalidate JWT during wallet lock:', false, error);
    }

    // 2. Stop all active processes
    await stopActivityTracking();

    // 3. Update UI indicators
    await setBadgeText('');
    await setIconLock();

    // 4. Save wallet cache before clearing - CRITICAL: Do not save if being reset
    try {
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
          await browser.storage.local.set({ yakklWalletCache: cacheState });
          log.info('[Background] Wallet cache saved before lock with valid data');
        } else {
          log.warn('[Background] Skipping cache save - no valid data to persist');
        }
      }
    } catch (error) {
      log.warn('[Background] Failed to save wallet cache during lock:', false, error);
    }

    // 5. Update storage to reflect locked state
    const yakklCurrentlySelectedResult = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
    const yakklCurrentlySelected = yakklCurrentlySelectedResult[STORAGE_YAKKL_CURRENTLY_SELECTED] as any;
    
    if (yakklCurrentlySelected?.shortcuts) {
      yakklCurrentlySelected.shortcuts.isLocked = true;
      await browser.storage.local.set({ [STORAGE_YAKKL_CURRENTLY_SELECTED]: yakklCurrentlySelected });
    }

    // Also update settings to ensure consistent locked state
    const settingsResult = await browser.storage.local.get(STORAGE_YAKKL_SETTINGS);
    const settings = settingsResult[STORAGE_YAKKL_SETTINGS] as any;
    
    if (settings) {
      settings.isLocked = true;
      await browser.storage.local.set({ [STORAGE_YAKKL_SETTINGS]: settings });
    }

    // 6. Clear all sensitive data from memory
    removeTimers();
    removeListeners();
    setMiscStore('');

    // 7. Zero out values in custom token storage
    setYakklTokenDataCustomStorage(get(yakklTokenDataCustomStore));

    // 8. Reset all stores
    resetStores();

    // 9. Clear extension session storage (except windowId)
    if (browser.storage.session) {
      try {
        // Get all keys from session storage
        const allData = await browser.storage.session.get(null);
        const keysToRemove = Object.keys(allData).filter(key => key !== 'windowId');

        // Remove all keys except windowId
        if (keysToRemove.length > 0) {
          await browser.storage.session.remove(keysToRemove);
        }
      } catch (error) {
        log.warn('[Background] Failed to clear session storage:', false, error);
      }
    }

    // 10. Clear any auth tokens from local storage
    await browser.storage.local.remove(['sessionToken', 'sessionExpiresAt', 'authToken']);

    // 11. Reset SingletonWindowManager to clear any stale window references
    try {
      SingletonWindowManager.reset();
      log.info('[Background] SingletonWindowManager reset during wallet lock');
    } catch (error) {
      log.warn('[Background] Failed to reset SingletonWindowManager during wallet lock', false, error);
    }

    // 12. Close all extension windows
    try {
      const windows = await browser.windows.getAll({ windowTypes: ['popup'] });
      for (const window of windows) {
        if (window.id) {
          try {
            await browser.windows.remove(window.id);
            log.info(`[Background] Closed window ${window.id}`);
          } catch (err) {
            log.warn('[Background] Failed to close window:', false, { windowId: window.id, error: err });
          }
        }
      }
    } catch (error) {
      log.warn('[Background] Failed to enumerate/close windows:', false, error);
    }

    log.info(`[Background] Wallet locked successfully - Reason: ${reason}`);
  } catch (error) {
    log.warn('[Background] Failed to lock wallet:', false, { error, reason });
    // Even if there's an error, try to ensure critical data is cleared
    try {
      resetStores();
      // Clear auth tokens directly
      await browser.storage.local.remove(['sessionToken', 'sessionExpiresAt', 'authToken']);
    } catch (e) {
      log.warn('[Background] Critical error during wallet lock:', false, e);
    }
  }
}

/**
 * Register background-specific wallet lock handlers
 * This should only be called from the background script
 */
export function registerBackgroundWalletLockHandlers(): void {
  try {
    // Handle extension-specific events
    if (browser.runtime.onSuspend) {
      browser.runtime.onSuspend.addListener(() => {
        lockWalletBackground('extension-suspend').catch(err =>
          log.warn('[Background] Error locking wallet on suspend:', false, err)
        );
      });
    }

    // Handle idle detection
    if (browser.idle) {
      browser.idle.setDetectionInterval(300); // 5 minutes
      browser.idle.onStateChanged.addListener((state: string) => {
        if (state === 'idle' || state === 'locked') {
          lockWalletBackground(`idle-${state}`).catch(err =>
            log.warn('[Background] Error locking wallet on idle:', false, err)
          );
        }
      });
    }

    log.info('[Background] Wallet lock handlers registered');
  } catch (error) {
    log.warn('[Background] Error registering background wallet lock handlers:', false, error);
  }
}
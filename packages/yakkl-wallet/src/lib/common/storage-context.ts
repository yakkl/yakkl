/**
 * Context-aware storage utilities
 * With unified browser polyfill, this now provides a consistent interface
 * that uses browser_ext in all contexts.
 */

// import { browser_ext as browser } from './environment';
import { browserAPI } from '$lib/services/browser-api.service';
import { log } from '$lib/common/logger-wrapper';
import type { YakklCurrentlySelected } from './interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from './constants';
import type { Browser } from 'webextension-polyfill';


let browser: Browser;

if (typeof window !== 'undefined') {
  browser = await import ('./environment').then(m => m.browser_ext);
} else {
  browser = await import ('webextension-polyfill');
}

// Background context detection is no longer needed with unified polyfill
// All contexts now use browser_ext directly

/**
 * Context-aware storage getter
 * Automatically uses the correct method based on context
 */
export async function getFromStorage<T>(
  key: string,
  options?: {
    forceMethod?: 'direct' | 'browserAPI';
    timeout?: number;
  }
): Promise<T | null> {
  try {
    const timeout = options?.timeout ?? 2000;

    // Allow forcing a specific method
    if (options?.forceMethod === 'direct' && browser?.storage?.local) {
      const result = await browser.storage.local.get(key);
      return result[key] as T;
    }

    if (options?.forceMethod === 'browserAPI') {
      const result = await browserAPI.storageGet(key);
      return result?.[key] as T || null;
    }

    // With unified polyfill, we can use browser directly in all contexts
    if (browser?.storage?.local) {
      console.log('unified polyfill', key);
      const result = await browser.storage.local.get(key);
      return result[key] as T;
    } else {
      // In UI context, check if browserAPI is available and working
      try {
        console.log('browserAPI', browser);

        // Try browserAPI first with a short timeout
        const storagePromise = browserAPI.storageGet(key);
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), timeout)
        );

        const result = await Promise.race([storagePromise, timeoutPromise]);

        if (result && key in result) {
          return result[key] as T;
        }

        // Fallback - this should rarely happen with unified polyfill
        return null;
      } catch (error) {
        // If browserAPI fails, return null
        log.debug('BrowserAPI failed, unable to access storage', false, error);
        return null;
      }
    }
  } catch (error) {
    log.warn(`Error getting ${key} from storage:`, false, error);
    return null;
  }
}

/**
 * Context-aware storage setter
 */
export async function setInStorage<T extends Record<string, any>>(
  key: string,
  value: T | string,
  options?: {
    forceMethod?: 'direct' | 'browserAPI';
  }
): Promise<void> {
  try {
    // Allow forcing a specific method
    if (options?.forceMethod === 'direct' && browser?.storage?.local) {
      await browser.storage.local.set({ [key]: value });
      return;
    }

    if (options?.forceMethod === 'browserAPI') {
      await browserAPI.storageSet({ [key]: value });
      return;
    }

    // With unified polyfill, we can use browser directly in all contexts
    if (browser?.storage?.local) {
      await browser.storage.local.set({ [key]: value });
    } else {
      // In UI context, try browserAPI first, fallback to direct
      try {
        await browserAPI.storageSet({ [key]: value });
      } catch (error) {
        log.debug('BrowserAPI set failed, unable to save to storage', false, error);
        throw error;
      }
    }
  } catch (error) {
    log.error(`Error setting ${key} in storage:`, false, error);
    throw error;
  }
}

/**
 * Get currently selected account with context awareness
 */
export async function getYakklCurrentlySelectedContext(): Promise<YakklCurrentlySelected | null> {
  try {
    const value = await getFromStorage<YakklCurrentlySelected>(
      STORAGE_YAKKL_CURRENTLY_SELECTED
    );

    if (!value) {
      log.debug('No currently selected account found in storage');
      return null;
    }

    return value;
  } catch (error) {
    log.error('Error getting currently selected:', false, error);
    return null;
  }
}

/**
 * Set currently selected account with context awareness
 */
export async function setYakklCurrentlySelectedContext(
  value: YakklCurrentlySelected
): Promise<void> {
  try {
    if (!value?.shortcuts?.address || !value?.shortcuts?.accountName) {
      throw new Error('Invalid currently selected data - missing address or account name');
    }

    await setInStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, value);
    log.debug('Currently selected account saved to storage');
  } catch (error) {
    log.error('Error setting currently selected:', false, error);
    throw error;
  }
}

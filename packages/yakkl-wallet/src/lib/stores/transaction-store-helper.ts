/**
 * Helper functions for transaction store to avoid direct webextension-polyfill import
 * This prevents module resolution errors in the browser context
 */

import { browser } from '$app/environment';
import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/common/logger-wrapper';

/**
 * Add a runtime message listener for transaction updates
 * @param callback Function to call when transaction update message is received
 * @returns Cleanup function to remove the listener
 */
export function addTransactionUpdateListener(
  callback: (message: any, sender: any) => void
): () => void {
  if (!browser || typeof window === 'undefined' || !browser_ext) {
    // Return no-op cleanup function for SSR/non-extension contexts
    return () => {};
  }

  try {
    // Use the already initialized browser_ext from environment
    browser_ext.runtime.onMessage.addListener(callback);
    
    // Return cleanup function
    return () => {
      try {
        browser_ext.runtime.onMessage.removeListener(callback);
      } catch (error) {
        log.warn('Failed to remove transaction update listener', false, error);
      }
    };
  } catch (error) {
    log.warn('Failed to add transaction update listener', false, error);
    return () => {};
  }
}

/**
 * Check if we're in a browser extension context
 */
export function isExtensionContext(): boolean {
  return browser && typeof window !== 'undefined' && !!browser_ext;
}

/**
 * Get data from session storage
 * @param key Storage key to retrieve
 * @returns Promise resolving to stored data or undefined
 */
export async function getSessionStorage(key: string): Promise<any> {
  if (!isExtensionContext()) {
    return undefined;
  }

  try {
    const result = await browser_ext.storage.session.get(key);
    return result[key];
  } catch (error) {
    log.warn('Failed to get session storage', false, { key, error });
    return undefined;
  }
}
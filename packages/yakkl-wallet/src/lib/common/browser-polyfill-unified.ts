/**
 * Unified Browser Polyfill Loader
 *
 * This module provides a consistent way to access the browser extension API
 * across all contexts (background, content script, UI pages).
 *
 * It ensures the webextension-polyfill is loaded and available as a global
 * `browser` object that works identically in all environments.
 */

import type { Browser } from 'webextension-polyfill';

// Cache the browser instance
let cachedBrowser: Browser | null = null;
let loadPromise: Promise<Browser> | null = null;

/**
 * Check if we're in a browser environment (not SSR)
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if the browser API is already available globally
 */
function getBrowserFromGlobal(): Browser | null {
  if (!isBrowser()) return null;

  // Check for global browser object (from polyfill)
  if ((window as any).browser?.runtime?.id) {
    return (window as any).browser;
  }

  // Check for chrome object (native Chrome API)
  if ((window as any).chrome?.runtime?.id) {
    // If we have chrome but not browser, the polyfill might not be loaded
    return null;
  }

  return null;
}

/**
 * Wait for the browser polyfill to be available
 * The script is loaded statically in app.html
 */
async function waitForPolyfill(): Promise<void> {
  if (!isBrowser()) return;

  // Check if already available
  if (getBrowserFromGlobal()) {
    return;
  }

  // Wait for the script to load (max 5 seconds)
  const maxWait = 5000;
  const checkInterval = 50;
  const maxChecks = maxWait / checkInterval;
  
  for (let i = 0; i < maxChecks; i++) {
    if (getBrowserFromGlobal()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  throw new Error('Browser polyfill failed to load after 5 seconds');
}

/**
 * Load the browser API, ensuring polyfill is available
 */
async function loadBrowserAPI(): Promise<Browser> {
  // Return cached if available
  if (cachedBrowser) return cachedBrowser;

  // Return existing promise if already loading
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // First check if it's already available
      let browser = getBrowserFromGlobal();
      if (browser) {
        cachedBrowser = browser;
        return browser;
      }

      // In browser environment, wait for the polyfill to load
      if (isBrowser()) {
        await waitForPolyfill();

        // Check again after waiting
        browser = getBrowserFromGlobal();
        if (browser) {
          cachedBrowser = browser;
          return browser;
        }
      }

      // Try dynamic import as last resort
      try {
        const module = await import('webextension-polyfill');
        browser = module.default;
        if (browser) {
          cachedBrowser = browser;
          // Make it globally available
          if (isBrowser()) {
            (window as any).browser = browser;
          }
          return browser;
        }
      } catch (importError) {
        console.warn('[browser-polyfill-unified] Dynamic import failed:', importError);
      }

      throw new Error('Failed to load browser API from any source');
    } catch (error) {
      loadPromise = null; // Reset on error to allow retry
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Get the browser API synchronously if already loaded
 */
export function getBrowserSync(): Browser | null {
  if (cachedBrowser) return cachedBrowser;

  const browser = getBrowserFromGlobal();
  if (browser) {
    cachedBrowser = browser;
    return browser;
  }

  return null;
}

/**
 * Get the browser API (async - ensures it's loaded)
 */
export async function getBrowserAsync(): Promise<Browser> {
  return loadBrowserAPI();
}

/**
 * Initialize the browser polyfill
 * Call this early in your app initialization
 */
export async function initializeBrowserPolyfill(): Promise<Browser> {
  const browser = await loadBrowserAPI();
  console.log('[browser-polyfill-unified] Browser API initialized successfully');
  return browser;
}

/**
 * Export a proxy that loads the browser API on first access
 * This allows synchronous-looking code while handling async loading
 */
export const browserExtension = new Proxy({} as Browser, {
  get(target, prop) {
    const browser = getBrowserSync();
    if (browser) {
      return (browser as any)[prop];
    }

    // If not loaded yet, trigger loading and return a promise-like proxy
    loadBrowserAPI().catch(console.error);

    // Return a function that returns a promise for method calls
    return (...args: any[]) => {
      return loadBrowserAPI().then(browser => {
        const method = (browser as any)[prop];
        if (typeof method === 'function') {
          return method.apply(browser, args);
        }
        return method;
      });
    };
  }
});

// Auto-initialize in browser environment (non-blocking)
if (isBrowser()) {
  initializeBrowserPolyfill().catch(error => {
    console.error('[browser-polyfill-unified] Auto-initialization failed:', error);
  });
}

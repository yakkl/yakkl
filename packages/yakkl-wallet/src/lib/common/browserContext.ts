/**
 * Browser Context Detection and Direct API Access
 * 
 * With the unified browser polyfill, this module now primarily provides
 * context detection utilities. Direct API access is available through
 * browser_ext in all contexts.
 */

import { browser_ext } from './environment';
// Static import for browser API service (for fallback)
import { browserAPI } from '$lib/services/browser-api.service';

export type BrowserContext = 
  | 'content-script'    // Injected into web pages, requires message passing
  | 'popup'            // Extension popup, has direct API access
  | 'sidepanel'        // Extension sidepanel, has direct API access
  | 'background'       // Background service worker, has direct API access
  | 'options'          // Options page, has direct API access
  | 'devtools'         // DevTools page, has direct API access
  | 'unknown';         // Unable to determine context

/**
 * Detect the current browser extension context
 */
export function detectBrowserContext(): BrowserContext {
  if (!browser_ext) return 'unknown';
  
  // Check if we're in a content script (no direct access to browser.storage)
  if (!browser_ext.storage) {
    return 'content-script';
  }
  
  // Check URL patterns for different contexts
  const url = typeof window !== 'undefined' ? window.location.href : '';
  
  if (url.includes('sidepanel')) return 'sidepanel';
  if (url.includes('popup')) return 'popup';
  if (url.includes('options')) return 'options';
  if (url.includes('devtools')) return 'devtools';
  
  // Background context detection
  if (typeof window === 'undefined' || !window.location) {
    return 'background';
  }
  
  return 'unknown';
}

/**
 * Check if the current context has direct access to browser APIs
 * With unified polyfill, all contexts now have access
 */
export function hasDirectBrowserAccess(): boolean {
  return !!browser_ext?.storage?.local;
}

/**
 * Get browser storage API directly
 * With unified polyfill, this should always work
 */
export function getDirectStorageAPI() {
  return browser_ext?.storage?.local || null;
}

/**
 * Performance-optimized storage getter
 * With unified polyfill, this always uses direct access
 */
export async function fastStorageGet<T = any>(keys?: string | string[] | null): Promise<Record<string, T>> {
  if (browser_ext?.storage?.local) {
    try {
      const result = await browser_ext.storage.local.get(keys);
      return result as Record<string, T>;
    } catch (error) {
      console.error('[fastStorageGet] Storage access failed:', error);
      // Fallback to browserAPI
      return browserAPI.storageGet(keys);
    }
  }
  
  // Fallback to browserAPI if browser_ext not available
  return browserAPI.storageGet(keys);
}

/**
 * Performance-optimized storage setter
 * With unified polyfill, this always uses direct access
 */
export async function fastStorageSet(items: Record<string, any>): Promise<void> {
  if (browser_ext?.storage?.local) {
    try {
      await browser_ext.storage.local.set(items);
      return;
    } catch (error) {
      console.error('[fastStorageSet] Storage access failed:', error);
      // Fallback to browserAPI
      return browserAPI.storageSet(items);
    }
  }
  
  // Fallback to browserAPI if browser_ext not available
  return browserAPI.storageSet(items);
}
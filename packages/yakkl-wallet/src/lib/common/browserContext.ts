/**
 * Browser Context Detection and Direct API Access
 * 
 * This module provides utilities for detecting the browser extension context
 * and accessing browser APIs directly when possible, bypassing message passing
 * for better performance in privileged contexts.
 */

import { browser_ext } from './environment';

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
 */
export function hasDirectBrowserAccess(): boolean {
  const context = detectBrowserContext();
  return context !== 'content-script' && context !== 'unknown';
}

/**
 * Get browser storage API directly if available
 */
export function getDirectStorageAPI() {
  if (hasDirectBrowserAccess() && browser_ext?.storage?.local) {
    return browser_ext.storage.local;
  }
  return null;
}

/**
 * Performance-optimized storage getter that uses direct access when possible
 */
export async function fastStorageGet<T = any>(keys?: string | string[] | null): Promise<Record<string, T>> {
  const directStorage = getDirectStorageAPI();
  
  if (directStorage) {
    // Direct access - no message passing needed
    try {
      const result = await directStorage.get(keys);
      return result as Record<string, T>;
    } catch (error) {
      console.error('[fastStorageGet] Direct storage access failed:', error);
      throw error;
    }
  }
  
  // Fallback to browserAPI for content scripts
  const { browserAPI } = await import('$lib/services/browser-api.service');
  return browserAPI.storageGet(keys);
}

/**
 * Performance-optimized storage setter that uses direct access when possible
 */
export async function fastStorageSet(items: Record<string, any>): Promise<void> {
  const directStorage = getDirectStorageAPI();
  
  if (directStorage) {
    // Direct access - no message passing needed
    try {
      await directStorage.set(items);
      return;
    } catch (error) {
      console.error('[fastStorageSet] Direct storage access failed:', error);
      throw error;
    }
  }
  
  // Fallback to browserAPI for content scripts
  const { browserAPI } = await import('$lib/services/browser-api.service');
  return browserAPI.storageSet(items);
}
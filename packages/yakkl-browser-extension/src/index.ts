/**
 * YAKKL Browser Extension Utilities
 * 
 * Provides abstractions and utilities for building browser extensions
 * with support for Manifest V3 and cross-browser compatibility
 */

// Messaging
export * from './messaging';

// Storage
export * from './storage';

// Manifest
export * from './manifest';

// Context Management
export * from './context';

// Re-export types
export type { Runtime, Storage, Tabs, Windows } from 'webextension-polyfill';

/**
 * Browser API detection
 */
export function getBrowserAPI(): any {
  if (typeof browser !== 'undefined') {
    return browser;
  }
  if (typeof chrome !== 'undefined') {
    return chrome;
  }
  return null;
}

/**
 * Check if running in extension context - simple version
 */
export function isExtensionContext(): boolean {
  return !!(getBrowserAPI()?.runtime?.id);
}

/**
 * Get extension ID
 */
export function getExtensionId(): string | null {
  return getBrowserAPI()?.runtime?.id || null;
}

/**
 * Get extension version
 */
export function getExtensionVersion(): string | null {
  return getBrowserAPI()?.runtime?.getManifest?.()?.version || null;
}

/**
 * Execution context detection
 */

export type ExecutionContext = 
  | 'background'     // Service worker or background script
  | 'content'        // Content script
  | 'extension-page' // Popup, options, or other extension pages
  | 'web'           // Normal web page
  | 'ssr';          // Server-side rendering

export interface ContextInfo {
  isExtension: boolean;
  context: ExecutionContext;
  hasDOM: boolean;
  canUseSvelteStores: boolean;
}

export function getContextInfo(): ContextInfo {
  // 1. Check for SSR context first (Node.js environment)
  if (typeof globalThis === 'undefined' || 
      (!('window' in globalThis) && !('chrome' in globalThis) && !('browser' in globalThis))) {
    return {
      isExtension: false,
      context: 'ssr',
      hasDOM: false,
      canUseSvelteStores: false
    };
  }

  // 2. Check for extension APIs (works in all extension contexts)
  const hasExtensionAPI = (
    (typeof chrome !== 'undefined' && chrome?.runtime?.id) ||
    (typeof browser !== 'undefined' && browser?.runtime?.id)
  );

  // 3. Check for window/DOM availability
  const hasWindow = typeof window !== 'undefined';
  const hasDocument = typeof document !== 'undefined';
  const hasDOM = hasWindow && hasDocument;

  // 4. Not an extension at all
  if (!hasExtensionAPI) {
    return {
      isExtension: false,
      context: 'web',
      hasDOM: hasDOM,
      canUseSvelteStores: hasDOM
    };
  }

  // 5. We're in an extension, determine specific context
  
  // Background context (service worker or background page)
  if (!hasDOM) {
    return {
      isExtension: true,
      context: 'background',
      hasDOM: false,
      canUseSvelteStores: false
    };
  }

  // Content script detection
  // Content scripts have chrome.runtime but limited API access
  try {
    // Try to access an API that content scripts can't use
    const canAccessTabs = typeof chrome !== 'undefined' && chrome.tabs !== undefined;
    const isContentScript = !canAccessTabs && hasDOM;
    
    if (isContentScript) {
      return {
        isExtension: true,
        context: 'content',
        hasDOM: true,
        canUseSvelteStores: false // In theory content scripts may have access to DOM, but we don't want to use svelte stores in content scripts
      };
    }
  } catch {
    // If checking chrome.tabs throws, we're likely in a content script
    return {
      isExtension: true,
      context: 'content',
      hasDOM: true,
      canUseSvelteStores: false // In theory content scripts may have access to DOM, but we don't want to use svelte stores in content scripts
    };
  }

  // Extension page (popup, options, etc.)
  // Has full API access and DOM
  return {
    isExtension: true,
    context: 'extension-page',
    hasDOM: true,
    canUseSvelteStores: true
  };
}

// Singleton pattern for consistent results
export let cachedInfo: ContextInfo | null = null;

export function getContext(): ContextInfo {
  if (!cachedInfo) {
    cachedInfo = getContextInfo();
  }
  return cachedInfo;
}

// Helper functions for common checks
export function isExtension(): boolean {
  return getContext().isExtension;
}

export function canUseSvelteStores(): boolean {
  return getContext().canUseSvelteStores;
}

export function isBackground(): boolean {
  return getContext().context === 'background';
}

export function isContentScript(): boolean {
  return getContext().context === 'content';
}

// Extension page (popup, options, etc.)
export function isExtensionPage(): boolean {
  return getContext().context === 'extension-page';
}

export function isWeb(): boolean {
  return getContext().context === 'web';
}

// Svelte specific
export function isSSR(): boolean {
  return getContext().context === 'ssr';
}

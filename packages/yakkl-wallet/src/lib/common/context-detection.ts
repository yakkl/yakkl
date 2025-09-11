/**
 * Context detection utilities for browser extension environments
 */


/**
 * Detects if code is running in a content script context
 */
export function isContentScriptContext(): boolean {
  try {
    // Content scripts have access to chrome.runtime but not chrome.tabs
    return typeof chrome !== 'undefined' &&
           chrome.runtime &&
           chrome.runtime.id &&
           !chrome.tabs;
  } catch {
    return false;
  }
}

/**
 * Detects if code is running in background/service worker context
 */
export function isBackgroundContext(): boolean {
  try {
    // Background scripts have access to chrome.tabs
    return typeof chrome !== 'undefined' &&
           chrome.runtime &&
           chrome.tabs !== undefined;
  } catch {
    return false;
  }
}

/**
 * Detects if code is running in a popup or options page
 */
export function isExtensionPageContext(): boolean {
  try {
    // Extension pages run in chrome-extension:// protocol
    return window.location.protocol === 'chrome-extension:' ||
           window.location.protocol === 'moz-extension:';
  } catch {
    return false;
  }
}

/**
 * Check if IndexedDB is available in current context
 */
export function canUseIndexedDB(): boolean {
  try {
    // Content scripts cannot use IndexedDB
    if (isContentScriptContext()) {
      return false;
    }

    // Check if IndexedDB is available
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Check if localStorage is available in current context
 */
export function canUseLocalStorage(): boolean {
  try {
    // Content scripts cannot use localStorage
    if (isContentScriptContext()) {
      return false;
    }

    // Test localStorage availability
    const test = '__localStorage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the appropriate storage method for current context
 */
export function getStorageMethod(): 'browser' |'chrome' | 'localStorage' | 'memory' {
  const browser = (globalThis as any).browser || (globalThis as any).chrome;
  if (typeof browser !== 'undefined' && browser.storage) {
    return 'browser';
  } else if (typeof chrome !== 'undefined' && chrome.storage) {
    return 'chrome';
  } else if (canUseLocalStorage()) {
    return 'localStorage';
  } else {
    return 'memory';
  }
}

/**
 * Check if we're in a sandboxed iframe context
 */
export function isSandboxedIframe(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    // Check if we're in an iframe
    if (window.self === window.top) {
      return false;
    }

    // Check for sandboxed iframe indicators
    // Sandboxed iframes without 'allow-same-origin' will have origin 'null'
    if (window.location.origin === 'null') {
      return true;
    }

    // Try to access parent - will throw in cross-origin or sandboxed contexts
    try {
      const parentOrigin = window.parent.location.origin;
      // If we can access parent origin and it's different, we might be sandboxed
      return false;
    } catch {
      // Can't access parent, likely sandboxed or cross-origin
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Check if storage APIs are accessible
 */
export function hasStorageAccess(): boolean {
  try {
    // Check if we're in a sandboxed iframe first
    if (isSandboxedIframe()) {
      return false;
    }

    // Check both IndexedDB and localStorage
    return typeof indexedDB !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

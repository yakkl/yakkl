/**
 * Background context detection (for Manifest V3 service worker).
 * `importScripts` is available only in service worker scripts.
 */
declare const importScripts: (...args: string[]) => void; // avoid lint/TS error

export function isBackgroundContext(): boolean {
  // SSR guard
  if (typeof window === 'undefined') return false;
  
  try {
    // Dynamic import to avoid SSR issues
    const browser = (globalThis as any).browser || (globalThis as any).chrome;
    return (
      typeof self !== 'undefined' &&
      typeof importScripts === 'function' &&
      typeof browser !== 'undefined' &&
      typeof browser.runtime !== 'undefined'
    );
  } catch {
    return false;
  }
}

/**
 * True if running in an extension UI page (popup, sidepanel, options).
 */
export function isExtensionPage(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.location.protocol === 'moz-extension:' ||
     window.location.protocol === 'chrome-extension:')
  );
}

/**
 * True if running in a content script injected into a web page.
 */
export function isContentScript(): boolean {
  // SSR guard
  if (typeof window === 'undefined') return false;
  
  try {
    const browser = (globalThis as any).browser || (globalThis as any).chrome;
    return (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof browser !== 'undefined' &&
      !!browser.runtime &&
      window.location.protocol !== 'chrome-extension:' &&
      window.location.protocol !== 'moz-extension:'
    );
  } catch {
    return false;
  }
}

/**
 * True if this extension page is running in a sidepanel (V3 only).
 */
export function isSidePanel(): boolean {
  try {
    return !!window?.matchMedia('(display-mode: standalone)').matches &&
           window.location.pathname.includes('sidepanel');
  } catch {
    return false;
  }
}

/**
 * True if this extension page is the popup.
 */
export function isPopup(): boolean {
  try {
    return isExtensionPage() && window.location.pathname.includes('popup');
  } catch {
    return false;
  }
}

/**
 * True if this extension page is the options page.
 */
export function isOptionsPage(): boolean {
  try {
    return isExtensionPage() && window.location.pathname.includes('options');
  } catch {
    return false;
  }
}

/**
 * Returns a string label of the current extension context.
 */
export function getContextLabel(): string {
  if (isBackgroundContext()) return 'background';
  if (isContentScript()) return 'content-script';
  if (isSidePanel()) return 'sidepanel';
  if (isPopup()) return 'popup';
  if (isOptionsPage()) return 'options';
  if (isExtensionPage()) return 'extension-page';
  return 'unknown';
}



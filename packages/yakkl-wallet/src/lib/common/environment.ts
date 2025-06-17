// $lib/common/environment.ts
import type { Browser } from "webextension-polyfill";
import { log } from "$lib/managers/Logger";

// Helper function to check if we're in a browser environment
function isBrowserSide(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export const isClient = isBrowserSide();

// Create a mock for SSR
const mockBrowser = {
  runtime: {
    connect: () => ({}),
    sendMessage: () => Promise.resolve({}),
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
      hasListener: () => false
    }
  },
  // Add other APIs as needed
} as unknown as Browser;

// Get the browser API from the global set in hooks.client.ts
export function getBrowserExtFromGlobal(): Browser | null {
  if (!isClient) return null; // mockBrowser for SSR??

  try {
    // First try the dedicated property we set
    if (window.browserPolyfill) {
      return window.browserPolyfill;
    }

    // Then try the standard global
    if ((window as any).browser) {
      return (window as any).browser;
    }
  } catch (err) {
    log.error("Error accessing browser API from global:", false, err);
  }

  return null;
}

// Export a function that gets the browser API
export function getBrowserExt(): Browser | null {
  if (!isClient) return null;
  return getBrowserExtFromGlobal();
}

// For backward compatibility - use the getter function
export const browser_ext = isClient ? getBrowserExtFromGlobal() : null;
export const browserSvelte = isClient && !!browser_ext;

export function isBrowserEnv(): boolean {
  return isClient && getBrowserExt() !== null;
}

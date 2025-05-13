// src/hooks.client.ts
import { ensureProcessPolyfill } from '$lib/common/process';
ensureProcessPolyfill();

import type { Browser } from 'webextension-polyfill';
import { TIMER_IDLE_CHECK_INTERVAL, TIMER_IDLE_LOCK_DELAY, TIMER_IDLE_THRESHOLD } from '$lib/common';
import { syncStorageToStore } from '$lib/common/stores';
import { loadTokens } from '$lib/common/stores/tokens';
import { IdleManager } from '$lib/plugins/IdleManager';
import { ErrorHandler } from '$lib/plugins/ErrorHandler';
import { log } from '$plugins/Logger';
import { addUIListeners, removeUIListeners } from '$lib/common/listeners/ui/uiListeners';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { uiListenerManager } from '$lib/common/listeners/ui/uiListeners';

// Store the browser reference globally for SvelteKit to use
declare global {
  interface Window {
    browserPolyfill: Browser;
  }
}

// This runs very early in the page lifecycle, before other SvelteKit code
// hooks.client.ts

let browser_ext: Browser | null = null;
let initializationAttempted = false;

function getBrowserExt(): Browser | null {
  if (typeof window === 'undefined') return null;

  // If already initialized, return the existing instance
  if (browser_ext) return browser_ext;

  // Only log once
  if (!initializationAttempted) {
    initializationAttempted = true;
  }

  // First try window.browser (set by polyfill script)
  if (window.browser) {
    browser_ext = window.browser;
    window.browserPolyfill = browser_ext;
    return browser_ext;
  }

  // Then try window.browserPolyfill (may have been set manually)
  if (window.browserPolyfill) {
    browser_ext = window.browserPolyfill;
    return browser_ext;
  }

  // Finally try chrome with basic detection
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    // You might want to initialize Chrome shim here
    // For now, just return null
  }

  // Log only on first failed attempt
  if (!browser_ext && initializationAttempted) {
    log.warn("Browser extension API not available - " +
             "check if browser-polyfill.js is loading correctly");
  }

  return browser_ext;
}

// Initialize the manager but don't start it yet
const idleManager = IdleManager.initialize({
  width: 'system-wide',
  threshold: TIMER_IDLE_THRESHOLD,    // 2 minutes until idle
  lockDelay: TIMER_IDLE_LOCK_DELAY,     // +1 minute before lockdown
  checkInterval: TIMER_IDLE_CHECK_INTERVAL  // Only for app-wide mode
});

let isInitialized = false;
const errorHandler = ErrorHandler.getInstance(); // Initialize error handlers

export async function init() {
  try {
    // Prevent multiple initializations
    if (isInitialized) return;

    log.info('init', false, 'Initializing');
    
    // First get the browser API
    const browserApi = getBrowserExt();

    if (process.env.DEV_MODE) {
      log.setLevel('DEBUG', 'CONTAINS', ['DEBUG', 'DEBUG_TRACE', 'INFO', 'INFO_TRACE', 'WARN', 'ERROR', 'ERROR_TRACE', 'TRACE']);
    } else {
      log.setLevel('ERROR', 'CONTAINS', ['ERROR', 'ERROR_TRACE']);
    }

    // Register UI context with global listener manager if not already done
    if (!globalListenerManager.hasContext('ui')) {
      globalListenerManager.registerContext('ui', uiListenerManager);
    }

    // Initialize stores first (these need to be ready before any UI rendering)
    await syncStorageToStore();
    await loadTokens();

    // Set up UI listeners through the manager
    await setupUIListeners();

    // Start idle manager after other initialization is complete
    idleManager.start();

    isInitialized = true;
  } catch (error: any) {
    log.error("[hooks.client] Initialization error:", false, error);
    handleError(error);
  }
}

export function handleError(error: Error) {
  log.error('[hooks.client] Error:', false, error);
  errorHandler.handleError(error);
}

async function setupUIListeners() {
  try {
    // Clean up any existing listeners first
    removeUIListeners();

    // Add UI listeners through the manager
    addUIListeners();

    // Set up cleanup for page unload
    const cleanup = () => {
      try {
        idleManager.stop();
        removeUIListeners();
      } catch (error) {
        log.error("Cleanup error:", false, error);
      }
    };

    // Add unload handler
    try {
      // @ts-ignore
      if (!window.fencedFrameConfig) {
        window.removeEventListener('beforeunload', cleanup);
        window.addEventListener('beforeunload', cleanup);
      }
    } catch (e) {
      // Ignore error
    }

    return cleanup;
  } catch (error) {
    log.error("[hooks.client] Setup UI listeners error:", false, error);
    throw error;
  }
}

// Run init early, but only in browser context
if (typeof window !== 'undefined') {
  // Use a small delay to ensure browser API is available
  setTimeout(() => {
    init().catch(err => {
      log.error("Failed to initialize:", false, err);
    });
  }, 10);
}

// Export for external use if needed
export { idleManager, getBrowserExt };

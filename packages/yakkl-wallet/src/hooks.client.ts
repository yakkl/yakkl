// src/hooks.client.ts
import type { Browser } from 'webextension-polyfill';
import { setContextTypeStore, syncStorageToStore } from '$lib/common/stores';
import { loadTokens } from '$lib/common/stores/tokens';
import { ErrorHandler } from '$lib/plugins/ErrorHandler';
import { log } from '$lib/plugins/Logger';
import { addUIListeners, removeUIListeners } from '$lib/common/listeners/ui/uiListeners';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { uiListenerManager } from '$lib/common/listeners/ui/uiListeners';
import { protectedContexts } from '$lib/common/globals';

// Helper function to check if context needs idle protection
function contextNeedsIdleProtection(contextType: string): boolean {
  return protectedContexts.includes(contextType);
}

// Store the browser reference globally for SvelleKit to use
declare global {
  interface Window {
    browserPolyfill: Browser;
    EXTENSION_INIT_STATE: {
      initialized: boolean;
      contextId: string;
      activityTrackingStarted: boolean;
      startTime: number;
    };
  }
}

// Create a unique context ID for this execution instance
const CONTEXT_ID = typeof Date !== 'undefined' ? Date.now().toString(36) + Math.random().toString(36).substr(2, 5) : 'server';

// Early check for window existence
const isClient = typeof window !== 'undefined';

// Configure logger EARLY before any logging happens
if (isClient && typeof process !== 'undefined' && process.env && process.env.DEV_MODE) {
  log.setLevel('DEBUG', 'CONTAINS', ['DEBUG', 'DEBUG_TRACE', 'INFO', 'INFO_TRACE', 'WARN', 'ERROR', 'ERROR_TRACE', 'TRACE']);
  // console.log(`[${CONTEXT_ID}] Logger set to DEBUG mode`);
} else {
  log.setLevel('ERROR', 'CONTAINS', ['ERROR', 'ERROR_TRACE']);
  // if (isClient) {
  //   console.log(`[${CONTEXT_ID}] Logger set to ERROR mode`);
  // }
}

if (isClient) {
  // Check for existing initialization state
  if (!window.EXTENSION_INIT_STATE) {
    window.EXTENSION_INIT_STATE = {
      initialized: false,
      contextId: CONTEXT_ID,
      activityTrackingStarted: false,
      startTime: Date.now()
    };
  }
}

let browser_ext: Browser | null = null;
let initializationAttempted = false;

function getBrowserExt(): Browser | null {
  if (!isClient) return null;

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

const errorHandler = ErrorHandler.getInstance(); // Initialize error handlers

/**
 * Determine the context type based on the current URL
 */
export function getContextType(): string {
  if (!isClient) return 'unknown';

  const pathname = window.location.pathname;
  const href = window.location.href;

  if (pathname.includes('sidepanel') || href.includes('sidepanel')) {
    setContextTypeStore('sidepanel');
    return 'sidepanel';
  } else if (pathname.includes('index.html') || href.includes('index.html') || pathname === '/' || pathname === '') {
    setContextTypeStore('popup-wallet');
    return 'popup-wallet';
  } else if (pathname.includes('dapp/popups') || href.includes('dapp/popups')) {
    setContextTypeStore('popup-dapp');
    return 'popup-dapp';
  } else if (pathname.includes('options') || href.includes('options')) {
    setContextTypeStore('options');
    return 'options';
  } else {
    console.warn(`[Context Detection] Unknown context type for pathname: ${pathname}, href: ${href}`);
    setContextTypeStore('popup-wallet'); // Default to popup-wallet for main extension
    return 'popup-wallet';
  }
}

export async function init() {
  if (!isClient) return; // Skip initialization on server

  try {
    // Use window state to prevent multiple initializations across contexts
    if (window.EXTENSION_INIT_STATE && window.EXTENSION_INIT_STATE.initialized) {
      return;
    }

    // First get the browser API
    const browserApi = getBrowserExt();

    // Register UI context with global listener manager if not already done
    if (!globalListenerManager.hasContext('ui')) {
      globalListenerManager.registerContext('ui', uiListenerManager);
    }

    // Initialize stores first (these need to be ready before any UI rendering)
    await syncStorageToStore();
    await loadTokens();

    // Get context type for this initialization
    const contextType = getContextType();

    // Set up UI listeners through the manager
    await setupUIListeners();

    // Mark as initialized
    window.EXTENSION_INIT_STATE.initialized = true;
  } catch (error: any) {
    console.warn(`[${CONTEXT_ID}] Initialization error:`, error);
    handleError(error);
  }
}

export function handleError(error: Error) {
  console.warn(`[${CONTEXT_ID}] Error:`, error);
  errorHandler.handleError(error);
}

async function setupUIListeners() {
  if (!isClient) return; // Skip on server

  try {
    // Clean up any existing listeners first
    removeUIListeners();
    // Add UI listeners through the manager
    addUIListeners();
    // Set up cleanup for page unload
    const cleanup = () => {
      try {
        // Stop activity tracking if it was started
        // if (window.EXTENSION_INIT_STATE.activityTrackingStarted) {
        //   stopActivityTracking();
        // }

        removeUIListeners();
      } catch (error) {
        console.warn(`[${CONTEXT_ID}] Cleanup error:`, error);
      }
    };

    // Add unload handler
    try {
      // @ts-ignore
      if (!window.fencedFrameConfig) {
        window.removeEventListener('beforeunload', cleanup);
        window.addEventListener('beforeunload', cleanup);
      }
    } catch (e: any) {
      if (e.message.includes('fenced frames')) {
        console.warn('Skipping unload in fenced frame context');
        return;
      } else {
        console.warn(`[${CONTEXT_ID}] Failed to add unload handler:`, e);
      }
    }

    return cleanup;
  } catch (error) {
    console.warn(`[${CONTEXT_ID}] Setup UI listeners error:`, error);
  }
}

// Run init early, but only in browser context
if (isClient) {
  // Give a slight delay to ensure all globals are available
  setTimeout(() => {
    init().catch(err => {
      console.warn(`[${CONTEXT_ID}] Failed to initialize:`, err);
    });
  }, 50);
}

// Register with background script if we're in a UI context
if (isClient && getBrowserExt()) {
  try {
    const contextType = getContextType();
    const browserExt = getBrowserExt();

    browserExt?.runtime.sendMessage({
      type: 'ui_context_initialized',
      contextId: CONTEXT_ID,
      contextType: contextType,
      timestamp: Date.now()
    }).catch(err => console.warn(`[${CONTEXT_ID}] Failed to register context:`, err));

    // Only set up idle status listener for protected contexts
    if (contextNeedsIdleProtection(contextType)) {
      // Set up idle status listener
      browserExt?.runtime.onMessage.addListener((message: any, _sender: any, _sendResponse: any) => {
        if (message.type === 'IDLE_STATUS_CHANGED') {
          // Check if message is targeted to this context type
          if (message.targetContextTypes &&
              Array.isArray(message.targetContextTypes) &&
              !message.targetContextTypes.includes(contextType)) {
            return undefined;
          }

          // Dispatch event for UI components
          window.dispatchEvent(new CustomEvent('yakklIdleStateChanged', {
            detail: {
              state: message.state,
              timestamp: message.timestamp
            }
          }));

          return undefined; // Allow other listeners to process this message
        }
        return undefined;
      });
    }

    window.addEventListener('beforeunload', () => {
      browserExt?.runtime.sendMessage({
        type: 'ui_context_closing',
        contextId: CONTEXT_ID
      }).catch(err => console.warn('Failed to send context closing message', err));
    });
  } catch (err) {
    console.warn(`[${CONTEXT_ID}] Error registering context:`, err);
  }
}

// Export for external use if needed
export { getBrowserExt };

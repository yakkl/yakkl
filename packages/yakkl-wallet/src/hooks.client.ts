// src/hooks.client.ts
import type { Browser } from 'webextension-polyfill';
import { TIMER_IDLE_CHECK_INTERVAL, TIMER_IDLE_LOCK_DELAY, TIMER_IDLE_THRESHOLD } from '$lib/common';
import { handleOnMessageForExtension } from '$lib/common/listeners/ui/uiListeners';
import { syncStorageToStore } from '$lib/common/stores';
import { loadTokens } from '$lib/common/stores/tokens';
import { IdleManager } from '$lib/plugins/IdleManager';
import { ErrorHandler } from '$lib/plugins/ErrorHandler';
import { log } from '$plugins/Logger';

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

log.debug("Browser extension API found in window.browser", false, browser_ext);

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

    // First get the browser API
    const browserApi = getBrowserExt();

    if (process.env.DEV_DEBUG) {
      log.setLevel('DEBUG', 'CONTAINS', ['DEBUG', 'DEBUG_TRACE', 'INFO', 'INFO_TRACE', 'WARN', 'ERROR', 'ERROR_TRACE', 'TRACE']);
    } else {
      log.setLevel('ERROR', 'CONTAINS', ['ERROR', 'ERROR_TRACE']);
    }

    // Setup listeners first
    await setupGlobalListeners(browserApi);

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
}

export async function setupGlobalListeners(browserApi: Browser | null = null) {
  // Use the provided browser API or try to get it again
  const browser = browserApi || getBrowserExt();

  try {
    const cleanup = () => {
      try {
        // log.info("Cleaning up listeners and idle manager...");
        idleManager.stop();

        if (browser && browser.runtime.onMessage.hasListener(handleOnMessageForExtension)) {
          browser.runtime.onMessage.removeListener(handleOnMessageForExtension);
        }

        window.removeEventListener('beforeunload', handleUnload);
      } catch (error) {
        log.error("Cleanup error:", false, error);
      }
    };

    const handleUnload = (event: Event) => {
      // log.info("App is closing or reloading...");
      cleanup();
      if (browser) {
        browser.runtime.sendMessage({ type: 'lockdown' }).catch(
          (err) => log.error("Error sending lockdown message:", false, err)
        );
      }
    };

    // Initialize stores first
    await syncStorageToStore();
    await loadTokens();

    if (browser) {
      // Then set up message listeners
      if (browser.runtime.onMessage.hasListener(handleOnMessageForExtension)) {
        browser.runtime.onMessage.removeListener(handleOnMessageForExtension);
      }
      browser.runtime.onMessage.addListener(handleOnMessageForExtension);
    } else {
      log.warn("Browser API not available, skipping message listener setup");
    }

    // Finally add window listeners
    window.addEventListener('beforeunload', handleUnload);

    return cleanup;
  } catch (error) {
    log.error("[hooks.client] Setup listeners error:", false, error);
    throw error; // Propagate error to init
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

























// // src/hooks.client.ts
// import type { Browser } from 'webextension-polyfill';

// import { TIMER_IDLE_CHECK_INTERVAL, TIMER_IDLE_LOCK_DELAY, TIMER_IDLE_THRESHOLD } from '$lib/common';
// import { browser_ext } from '$lib/common/environment';
// import { handleOnMessageForExtension } from '$lib/common/listeners/ui/uiListeners';
// import { syncStorageToStore } from '$lib/common/stores';
// import { loadTokens } from '$lib/common/stores/tokens';
// import { IdleManager } from '$lib/plugins/IdleManager';
// import { ErrorHandler } from '$lib/plugins/ErrorHandler';
// import { log } from '$plugins/Logger';

// // Store the browser reference globally for SvelteKit to use
// declare global {
//   interface Window {
//     browserPolyfill: Browser;
//   }
// }

// // This runs very early in the page lifecycle
// if (typeof window !== 'undefined') {
//   // Store a reference to the polyfill loaded by the script tag
//   window.browserPolyfill = (window as any).browser;
// }

// // Initialize the manager but don't start it yet
// const idleManager = IdleManager.initialize({
//   width: 'system-wide',
//   threshold: TIMER_IDLE_THRESHOLD,    // 2 minutes until idle
//   lockDelay: TIMER_IDLE_LOCK_DELAY,     // +1 minute before lockdown
//   checkInterval: TIMER_IDLE_CHECK_INTERVAL  // Only for app-wide mode
// });

// let isInitialized = false;

// const errorHandler = ErrorHandler.getInstance(); // Initialize error handlers

// export async function init() {
//   try {
//     // Prevent multiple initializations
//     if (isInitialized) return;

//     if (process.env.DEV_DEBUG) {
//       log.setLevel('ERROR', 'CONTAINS', ['ERROR', 'DEBUG', 'WARN', 'INFO', 'TRACE']);
//     } else {
//       log.setLevel('ERROR', 'CONTAINS', ['ERROR']);
//     }

//     // Setup listeners first
//     await setupGlobalListeners();

//     // Start idle manager after other initialization is complete
//     idleManager.start();

//     isInitialized = true;
//   } catch (error: any) {
//     log.error("[hooks.client] Initialization error:", false, error);
//     handleError(error);
//   }
// }

// export function handleError(error: Error) {
//   log.error('[hooks.client] Error:', false, error);
// }

// export async function setupGlobalListeners() {
//   try {
//     const cleanup = () => {
//       try {
//         log.info("Cleaning up listeners and idle manager...");
//         idleManager.stop();

//         if (!browser_ext) {
//           if (browser_ext.runtime.onMessage.hasListener(handleOnMessageForExtension)) {
//             browser_ext.runtime.onMessage.removeListener(handleOnMessageForExtension);
//           }
//         }

//         window.removeEventListener('beforeunload', handleUnload);
//       } catch (error) {
//         log.error("Cleanup error:", false, error);
//       }
//     };

//     const handleUnload = (event: Event) => {
//       log.info("App is closing or reloading...");
//       cleanup();
//       if (browser_ext) {
//         browser_ext.runtime.sendMessage({ type: 'lockdown' }).catch(log.error);
//       }
//     };

//     // Initialize stores first
//     await syncStorageToStore();
//     await loadTokens();

//     if (browser_ext) {
//       // Then set up message listeners
//       if (browser_ext.runtime.onMessage.hasListener(handleOnMessageForExtension)) {
//         browser_ext.runtime.onMessage.removeListener(handleOnMessageForExtension);
//       }
//       browser_ext.runtime.onMessage.addListener(handleOnMessageForExtension);
//     }

//     // Finally add window listeners
//     window.addEventListener('beforeunload', handleUnload);

//     return cleanup;
//   } catch (error) {
//     log.error("[hooks.client] Setup listeners error:", false, error);
//     throw error; // Propagate error to init
//   }
// }

// // Export for external use if needed
// export { idleManager };

// // Example usage:
// // In any other component

// // import { idleManager } from '../hooks.client';

// // Example: Temporarily disable idle detection during an important operation

// // async function handleImportantOperation() {
// //   idleManager.stop();
// //   try {
// //     // Do important work
// //   } finally {
// //     idleManager.start();
// //   }
// // }

// // Example: Switch detection mode

// // async function switchToSystemWide() {
// //   await idleManager.setStateWidth('system-wide');
// // }

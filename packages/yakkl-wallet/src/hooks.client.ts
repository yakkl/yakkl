// src/hooks.client.ts
import type { Browser } from 'webextension-polyfill';
import { setContextTypeStore, syncStorageToStore } from '$lib/common/stores';
import { loadTokens } from '$lib/common/stores/tokens';
import { ErrorHandler } from '$lib/plugins/ErrorHandler';
import { log } from '$lib/plugins/Logger';
import { addUIListeners, removeUIListeners } from '$lib/common/listeners/ui/uiListeners';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { uiListenerManager } from '$lib/common/listeners/ui/uiListeners';
import { UIActivityTracker } from '$lib/common/idle/uiActivityTracker';
import messagingService from '$lib/common/messaging';

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
  console.log(`[${CONTEXT_ID}] Logger set to DEBUG mode`);
} else {
  log.setLevel('ERROR', 'CONTAINS', ['ERROR', 'ERROR_TRACE']);
  if (isClient) {
    console.log(`[${CONTEXT_ID}] Logger set to ERROR mode`);
  }
}

if (isClient) {
  console.log(`[${CONTEXT_ID}] init - hooks.client.ts loaded 1:`, window);
  log.debug(`[${CONTEXT_ID}] init - hooks.client.ts loaded 1.5:`, false, window);

  // Check for existing initialization state
  if (!window.EXTENSION_INIT_STATE) {
    window.EXTENSION_INIT_STATE = {
      initialized: false,
      contextId: CONTEXT_ID,
      activityTrackingStarted: false,
      startTime: Date.now()
    };
    console.log(`[${CONTEXT_ID}] Created new EXTENSION_INIT_STATE`);
  } else {
    console.log(`[${CONTEXT_ID}] Found existing EXTENSION_INIT_STATE from ${window.EXTENSION_INIT_STATE.contextId}`);
  }
}

let browser_ext: Browser | null = null;
let initializationAttempted = false;
let activityTracker: UIActivityTracker | null = null;

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

  if (window.location.pathname.includes('sidepanel')) {
    setContextTypeStore('sidepanel');
    return 'sidepanel';
  } else if (window.location.pathname.includes('index.html')) {
    setContextTypeStore('popup-wallet');
    return 'popup-wallet';
  } else if (window.location.pathname.includes('dapp/popups')) {
    setContextTypeStore('popup-dapp');
    return 'popup-dapp';
  } else {
    setContextTypeStore('unknown');
    return 'unknown';
  }
}

export async function init() {
  if (!isClient) return; // Skip initialization on server

  try {
    // Use window state to prevent multiple initializations across contexts
    if (window.EXTENSION_INIT_STATE && window.EXTENSION_INIT_STATE.initialized) {
      console.log(`[${CONTEXT_ID}] Already initialized by ${window.EXTENSION_INIT_STATE.contextId}, skipping`);
      return;
    }

    console.log(`[${CONTEXT_ID}] Initializing extension...`);

    // First get the browser API
    const browserApi = getBrowserExt();

    // Register UI context with global listener manager if not already done
    if (!globalListenerManager.hasContext('ui')) {
      globalListenerManager.registerContext('ui', uiListenerManager);
      console.log(`[${CONTEXT_ID}] Registered UI context with global listener manager`);
    }

    // Initialize stores first (these need to be ready before any UI rendering)
    await syncStorageToStore();
    await loadTokens();
    console.log(`[${CONTEXT_ID}] Initialized stores`);

    // Initialize activity tracker (but don't start it yet)
    const contextType = getContextType();
    activityTracker = UIActivityTracker.initialize(CONTEXT_ID, contextType);
    console.log(`[${CONTEXT_ID}] Initialized activity tracker for ${contextType}`);

    // Set up UI listeners through the manager
    await setupUIListeners();
    console.log(`[${CONTEXT_ID}] Set up UI listeners`);

    // Mark as initialized
    window.EXTENSION_INIT_STATE.initialized = true;
    console.log(`[${CONTEXT_ID}] Initialization complete`);
  } catch (error: any) {
    console.error(`[${CONTEXT_ID}] Initialization error:`, error);
    handleError(error);
  }
}

export function handleError(error: Error) {
  console.error(`[${CONTEXT_ID}] Error:`, error);
  errorHandler.handleError(error);
}

async function setupUIListeners() {
  if (!isClient) return; // Skip on server

  try {
    // Clean up any existing listeners first
    removeUIListeners();

    // Add UI listeners through the manager
    addUIListeners();
    console.log(`[${CONTEXT_ID}] Added UI listeners`);

    // Set up cleanup for page unload
    const cleanup = () => {
      try {
        console.log(`[${CONTEXT_ID}] Cleaning up before unload`);

        // Stop activity tracking if it was started
        if (window.EXTENSION_INIT_STATE.activityTrackingStarted) {
          stopActivityTracking();
        }

        removeUIListeners();
      } catch (error) {
        console.error(`[${CONTEXT_ID}] Cleanup error:`, error);
      }
    };

    // Add unload handler
    try {
      // @ts-ignore
      if (!window.fencedFrameConfig) {
        window.removeEventListener('beforeunload', cleanup);
        window.addEventListener('beforeunload', cleanup);
        console.log(`[${CONTEXT_ID}] Added beforeunload listener`);
      }
    } catch (e) {
      console.error(`[${CONTEXT_ID}] Failed to add unload handler:`, e);
    }

    return cleanup;
  } catch (error) {
    console.error(`[${CONTEXT_ID}] Setup UI listeners error:`, error);
    throw error;
  }
}

/**
 * Start tracking user activity - call this after login is verified
 */
export async function startActivityTracking() {
  if (!isClient) return;

  try {
    // Only start if not already started
    if (typeof window !== 'undefined' &&
        window.EXTENSION_INIT_STATE &&
        !window.EXTENSION_INIT_STATE.activityTrackingStarted) {

      console.log(`[${CONTEXT_ID}] Starting activity tracking`);

      // Make sure tracker is initialized (keep your existing code)
      if (!activityTracker) {
        const contextType = getContextType();
        activityTracker = UIActivityTracker.initialize(CONTEXT_ID, contextType);
      }

      // Start the tracker (keep your existing code)
      activityTracker.startTracking();

      // Use messaging service to notify background
      try {
        // Initialize messaging service if needed
        if (browser_ext) {
          messagingService.initialize(browser_ext);
        }

        // Send login verification without waiting for response
        messagingService.sendMessage('SET_LOGIN_VERIFIED', {
          verified: true,
          contextId: CONTEXT_ID,
          contextType: getContextType()
        }, {
          waitForResponse: false // Don't wait for response
        }).catch((err: any) => {
          // Ignore errors
          log.debug('Failed to notify background of login verification 1:', false, err);
        });
      } catch (err) {
        try {
          // Fallback to original method if messaging service fails
          browser_ext.runtime.sendMessage({
            type: 'SET_LOGIN_VERIFIED',
            verified: true,
            contextId: CONTEXT_ID,
            contextType: getContextType()
          }).catch((error: any) => {
            log.debug('Failed to notify background of login verification 2:', false, error);
          });
        } catch (err) {
          log.debug('Failed to notify background of login verification 3:', false, err);
        }
      }

      // Mark as started (keep your existing code)
      window.EXTENSION_INIT_STATE.activityTrackingStarted = true;
    }
  } catch (error) {
    log.error('Failed to start activity tracking:', false, error);
    // Don't rethrow the error here, just log it
  }
}

/**
 * Stop tracking user activity - call this at logout
 */
export async function stopActivityTracking() {
  if (!isClient || !browser_ext) return;

  try {
    console.log(`[${CONTEXT_ID}] Stopping activity tracking`);

    // Stop the tracker if it exists
    if (activityTracker) {
      activityTracker.stopTracking();
    }

    // Notify background that login is no longer verified
    browser_ext.runtime.sendMessage({
      type: 'SET_LOGIN_VERIFIED',
      verified: false,
      contextId: CONTEXT_ID
    }).catch(error => {
      log.error('Failed to notify background of logout:', false, error);
    });

    // Mark as stopped
    window.EXTENSION_INIT_STATE.activityTrackingStarted = false;
  } catch (error) {
    log.error('Failed to stop activity tracking:', false, error);
  }
}

// Run init early, but only in browser context
if (isClient) {
  // Give a slight delay to ensure all globals are available
  setTimeout(() => {
    console.log(`[${CONTEXT_ID}] Starting delayed initialization`);
    init().catch(err => {
      console.error(`[${CONTEXT_ID}] Failed to initialize:`, err);
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

    if (contextType !== 'sidepanel') { // Sidepanel doesn't need idle status listener
      // Set up idle status listener
      browserExt?.runtime.onMessage.addListener((message: any, _sender: any, _sendResponse: any) => {
        if (message.type === 'IDLE_STATUS_CHANGED') {
        // Handle idle status change
        console.log(`[${CONTEXT_ID}] Idle status changed to ${message.state}`);

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

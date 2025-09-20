import { handleMessage, handlePortConnection } from './handlers/MessageHandler';
import { TransactionMonitorService } from '$lib/services/transactionMonitor.service';
import { BackgroundIntervalService } from '$lib/services/background-interval.service';
import { handleBrowserAPIPortConnection } from './handlers/browser-api-port.handler';
import { createSafeMessageHandler } from '$lib/common/messageChannelValidator';
import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { bookmarkContextMenu } from './extensions/chrome/contextMenu';
import { sessionHandlers } from './handlers/session';
import { backgroundProviderManager } from './services/provider-manager';
import { balancePollingService } from './services/balance-polling.service';

// Initialize background cache services ONLY after authentication
// CRITICAL: Services should NOT run before user is authenticated
async function initializeCacheServices() {
  try {
    // CRITICAL SECURITY: Check if wallet is locked/unauthenticated first
    const settings = await browser.storage.local.get(['yakkl-settings', 'yakkl-locked']);

    // Check if wallet is initialized and unlocked
    const yakklSettings = settings['yakkl-settings'] as any;
    const isInitialized = yakklSettings?.init === true;
    const isLocked = settings['yakkl-locked'] !== false; // Default to locked if not explicitly false

    if (!isInitialized || isLocked) {
      return; // DO NOT START SERVICES IF LOCKED OR NOT INITIALIZED
    }

    // Pre-initialize provider if we have stored data
    // This ensures provider is ready BEFORE any client requests
    await backgroundProviderManager.preInitialize();

    // Initialize and start background intervals
    const backgroundIntervals = BackgroundIntervalService.getInstance();
    await backgroundIntervals.initialize();
    backgroundIntervals.startAll();

    // Start balance polling service
    log.info('[Background] Starting balance polling service');
    await balancePollingService.start();
  } catch (error) {
    log.error('[Background] Failed to initialize cache services:', false, error);
  }
}

// Listen for extension install/update events
browser.runtime.onInstalled.addListener(async (details) => {
  // Initialize cache services on install or update
  if (details.reason === 'install' || details.reason === 'update') {
    await initializeCacheServices();

    // For new installs, set up initial configuration
    if (details.reason === 'install') {
      // Initial setup can be added here if needed
    }
  }
});

// Listen for browser startup (when browser is opened with extension already installed)
browser.runtime.onStartup.addListener(async () => {
  await initializeCacheServices();
});

// Also initialize immediately when background script loads
// This covers the case where the extension is already installed and enabled
initializeCacheServices();

// Initialize background context
browser.runtime.onConnect.addListener((port) => {
  if (port.name === 'YAKKL_BROWSER_API') {
    // Handle browser API port connections with encryption support
    handleBrowserAPIPortConnection(port);
  } else if (port.name === 'yakkl-client' || port.name === 'yakkl-internal') {
    // Handle both legacy 'yakkl-client' and new 'yakkl-internal' port names
    handlePortConnection(port);
  }
});

// Handle one-off messages with safe channel validation
const safeMessageHandler = createSafeMessageHandler(
  async (request, sender) => {
    try {
      // Log ALL incoming messages for debugging
      log.debug('Background: Message received (top-level):', false, {
        type: request?.type,
        hasData: !!request?.data,
        requestKeys: request ? Object.keys(request) : [],
        timestamp: Date.now()
      });

      // Handle special cases first
      if (request.type === 'accountChanged' || request.type === 'chainChanged') {
        try {
          const txMonitor = TransactionMonitorService.getInstance();
          // stop() is synchronous, no await needed
          txMonitor.stop();
          await txMonitor.start();
          return { success: true };
        } catch (error: any) {
          log.error('Background: Failed to restart monitoring:', false, error);
          return { success: false, error: error.message };
        }
      }

    // Special handling for closeAllWindows message (for backwards compatibility)
    if (request.type === 'closeAllWindows') {
      // Use the session handler directly
      const handler = sessionHandlers.get('closeAllWindows');
      if (handler) {
        return handler(request.payload || request);
      }
    }

    // Special handling for STORE_SESSION_HASH to ensure immediate response
    if (request.type === 'STORE_SESSION_HASH') {
      const handler = sessionHandlers.get('STORE_SESSION_HASH');
      if (handler) {
        const response = await handler(request.payload);
        return response;
      }
    }

    const response = await handleMessage(request, sender);
    return response;
    } catch (error) {
      // Catch any unhandled errors to ensure we always return a response
      log.error('Background: Unhandled error in message handler:', false, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestType: request?.type,
        timestamp: Date.now()
      });

      // Always return an error response instead of throwing
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in background handler'
      };
    }
  },
  {
    timeout: 45000, // Increased from 25s to 45s for blockchain operations
    logPrefix: 'Background'
  }
);

// NOTE: Debug listener commented out due to TypeScript constraints
// The browser.runtime.onMessage API requires returning true for async handling
// or undefined for no handling. Our safeMessageHandler below handles all messages.

// Helper function to send Promise-based response
async function sendPromiseResponse(requestId: string, data: any, error?: string) {
  try {
    // Send response back as a new message with the request ID
    await browser.runtime.sendMessage({
      __isResponse: true,
      __requestId: requestId,
      data,
      error
    });
  } catch (err) {
    log.error('🔵 Failed to send Promise response:', false, err);
  }
}

// Handle one-off messages with safe channel validation
// Cast to any to bypass TypeScript's strict type checking for browser extension APIs
browser.runtime.onMessage.addListener(safeMessageHandler as any);

// Initialize transaction monitoring in background context
// This runs independently of UI and persists across sessions
async function initializeBackgroundServices() {
  try {
    // Note: Provider pre-initialization is now done in initializeCacheServices()
    // which runs earlier in the startup sequence

    // Initialize context menu for bookmarking
    try {
      await bookmarkContextMenu.initialize();
    } catch (error) {
      log.error('Background: Failed to initialize context menu:', false, error);
    }

    // Get transaction monitor instance
    const txMonitor = TransactionMonitorService.getInstance();

    // Configure background monitoring settings
    txMonitor.configure({
      pollingInterval: 30000, // 30 seconds
      notificationEnabled: true // Enable notifications
    });

    // Start monitoring - this will run continuously in background
    await txMonitor.start();
  } catch (error) {
    log.error('Background: Failed to initialize background services:', false, error);
  }
}

// Initialize background services when extension starts
initializeBackgroundServices();

// Export for use in background script
export { handleMessage, handlePortConnection };

import { handleMessage, handlePortConnection } from './handlers/MessageHandler';
import { TransactionMonitorService } from '$lib/services/transactionMonitor.service';
import { BackgroundIntervalService } from '$lib/services/background-interval.service';
import { handleBrowserAPIPortConnection } from './handlers/browser-api-port.handler';
import { createSafeMessageHandler } from '$lib/common/messageChannelValidator';
import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { bookmarkContextMenu } from './extensions/chrome/contextMenu';

// Initialize background cache services on extension install/startup
// This ensures cache services run continuously from the moment the extension is installed
async function initializeCacheServices() {
  try {
    log.info('[Background] Initializing background cache services...');
    const backgroundIntervals = BackgroundIntervalService.getInstance();
    await backgroundIntervals.initialize();
    backgroundIntervals.startAll();
    log.info('[Background] Background cache services initialized and running');
  } catch (error) {
    log.error('[Background] Failed to initialize cache services:', error);
  }
}

// Listen for extension install/update events
browser.runtime.onInstalled.addListener(async (details) => {
  log.info('[Background] Extension installed/updated:', details.reason);
  
  // Initialize cache services on install or update
  if (details.reason === 'install' || details.reason === 'update') {
    await initializeCacheServices();
    
    // For new installs, set up initial configuration
    if (details.reason === 'install') {
      log.info('[Background] New installation detected, setting up initial configuration');
      // Initial setup can be added here if needed
    }
  }
});

// Listen for browser startup (when browser is opened with extension already installed)
browser.runtime.onStartup.addListener(async () => {
  log.info('[Background] Browser startup detected, initializing cache services');
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
    // Handle special cases first
    if (request.type === 'accountChanged' || request.type === 'chainChanged') {
      console.log('Background: Account or chain changed, restarting monitoring...');

      try {
        const txMonitor = TransactionMonitorService.getInstance();
        // stop() is synchronous, no await needed
        txMonitor.stop();
        await txMonitor.start();
        return { success: true };
      } catch (error: any) {
        console.error('Background: Failed to restart monitoring:', error);
        return { success: false, error: error.message };
      }
    }

    // Handle session hash storage directly here to ensure proper response
    // if (request.type === 'STORE_SESSION_HASH') {
    //   try {
    //     log.info('[Background] Handling STORE_SESSION_HASH', false, {
    //       hasPayload: !!request?.payload,
    //       payloadType: typeof request?.payload,
    //       payloadLength: request?.payload?.length
    //     });

    //     if (!request?.payload || typeof request.payload !== 'string') {
    //       log.warn('[Background] Invalid payload for STORE_SESSION_HASH', false);
    //       return { success: false, error: 'Invalid payload' };
    //     }

    //     bgMemoryHash = request.payload;
    //     bgSessionToken = generateSessionToken();

    //     // Broadcast token after responding
    //     setTimeout(async () => {
    //       try {
    //         await browser.runtime.sendMessage({
    //           type: 'SESSION_TOKEN_BROADCAST',
    //           token: bgSessionToken!.token,
    //           expiresAt: bgSessionToken!.expiresAt
    //         });
    //       } catch (error) {
    //         log.warn('[Background] Failed to broadcast session token', false, error);
    //       }
    //     }, 0);

    //     const response: StoreHashResponse = {
    //       success: true,
    //       token: bgSessionToken.token,
    //       expiresAt: bgSessionToken.expiresAt
    //     };

    //     log.info('[Background] Returning STORE_SESSION_HASH response', false, response);
    //     return response;
    //   } catch (error) {
    //     log.error('[Background] Error handling STORE_SESSION_HASH', false, error);
    //     return { success: false, error: 'Failed to store session hash' };
    //   }
    // }

    // if (request.type === 'REFRESH_SESSION') {
    //   try {
    //     const providedToken = request?.token as string | undefined;
    //     if (bgSessionToken && providedToken === bgSessionToken.token) {
    //       bgSessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;

    //       // Broadcast updated token expiry after responding
    //       setTimeout(async () => {
    //         try {
    //           await browser.runtime.sendMessage({
    //             type: 'SESSION_TOKEN_BROADCAST',
    //             token: bgSessionToken!.token,
    //             expiresAt: bgSessionToken!.expiresAt
    //           });
    //         } catch (error) {
    //           log.warn('[Background] Failed to broadcast refreshed session token', false, error);
    //         }
    //       }, 0);

    //       return {
    //         success: true,
    //         token: bgSessionToken.token,
    //         expiresAt: bgSessionToken.expiresAt
    //       };
    //     } else {
    //       // Clear on invalid token
    //       bgSessionToken = null;
    //       bgMemoryHash = null;
    //       return { success: false, error: 'Unauthorized' };
    //     }
    //   } catch (error) {
    //     log.error('[Background] Error handling REFRESH_SESSION', false, error);
    //     return { success: false, error: 'Failed to refresh session' };
    //   }
    // }


    // Special handling for closeAllWindows message (for backwards compatibility)
    if (request.type === 'closeAllWindows') {
      console.log('Background: Handling closeAllWindows message');
      // Import the session handler and call it directly
      const { sessionHandlers } = await import('./handlers/session');
      const handler = sessionHandlers.get('closeAllWindows');
      if (handler) {
        return handler(request.payload || request);
      }
    }
    
    // Special handling for STORE_SESSION_HASH to ensure immediate response
    if (request.type === 'STORE_SESSION_HASH') {
      console.log('Background: STORE_SESSION_HASH received, routing directly to handler');
      const { sessionHandlers } = await import('./handlers/session');
      const handler = sessionHandlers.get('STORE_SESSION_HASH');
      if (handler) {
        const response = await handler(request.payload);
        console.log('Background: STORE_SESSION_HASH response:', response);
        return response;
      }
    }
    
    // Handle all other messages through the standard handler
    console.log('Background: Received message:', {
      type: request.type,
      hasPayload: !!request.payload,
      fullRequest: request
    });

    return handleMessage(request, sender);
  },
  {
    timeout: 25000,
    logPrefix: 'Background'
  }
);

browser.runtime.onMessage.addListener(safeMessageHandler as any);

// Initialize transaction monitoring in background context
// This runs independently of UI and persists across sessions
async function initializeBackgroundServices() {
  try {
    console.log('Background: Initializing background services...');

    // Initialize context menu for bookmarking
    try {
      await bookmarkContextMenu.initialize();
      console.log('Background: Context menu service initialized successfully');
    } catch (error) {
      console.error('Background: Failed to initialize context menu:', error);
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

    console.log('Background: Transaction monitoring started successfully');
    console.log('Background: All background services initialized successfully');

  } catch (error) {
    console.error('Background: Failed to initialize background services:', error);
  }
}

// Initialize background services when extension starts
initializeBackgroundServices();

// Export for use in background script
export { handleMessage, handlePortConnection };

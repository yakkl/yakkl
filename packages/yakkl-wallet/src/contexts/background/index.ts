import { handleMessage, handlePortConnection } from './handlers/MessageHandler';
import { TransactionMonitorService } from '$lib/services/transactionMonitor.service';
import { handleBrowserAPIPortConnection } from './handlers/browser-api-port.handler';
import { createSafeMessageHandler } from '$lib/common/messageChannelValidator';
import browser from 'webextension-polyfill';


// Initialize background context
browser.runtime.onConnect.addListener((port) => {
  if (port.name === 'YAKKL_BROWSER_API') {
    // Handle browser API port connections with encryption support
    handleBrowserAPIPortConnection(port);
  } else if (port.name === 'yakkl-client') {
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
    console.log('Background: Initializing transaction monitoring service...');

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

  } catch (error) {
    console.error('Background: Failed to initialize transaction monitoring:', error);
  }
}

// Initialize background services when extension starts
initializeBackgroundServices();

// Export for use in background script
export { handleMessage, handlePortConnection };

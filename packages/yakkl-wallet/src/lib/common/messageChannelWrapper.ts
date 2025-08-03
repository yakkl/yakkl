import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/common/logger-wrapper';

/**
 * Wrapper for message listeners that handles closed message channels gracefully
 * Prevents browser-polyfill.js errors when message channels close before response
 */
export function createSafeMessageListener(
  handler: (
    message: any,
    sender: any,
    sendResponse: (response?: any) => void
  ) => boolean | void | Promise<any>
): (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void {
  return (message: any, sender: any, sendResponse: (response?: any) => void): boolean | void => {
    // Track if the channel is still open
    let channelOpen = true;
    let responseTimeout: NodeJS.Timeout;

    // Wrap sendResponse to check if channel is still open
    const safeSendResponse = (response?: any) => {
      if (!channelOpen) {
        log.warn('Message channel closed before response could be sent', false, {
          messageType: message?.type,
          sender: sender?.id
        });
        return;
      }

      try {
        sendResponse(response);
        clearTimeout(responseTimeout);
      } catch (error) {
        log.warn('Failed to send response - channel may be closed', false, error);
      }
    };

    // Set up timeout to mark channel as closed
    responseTimeout = setTimeout(() => {
      channelOpen = false;
    }, 25000); // 25 second timeout matches background handler

    try {
      const result = handler(message, sender, safeSendResponse);

      // Handle different return types
      if (result === true) {
        // Handler will respond asynchronously
        return true;
      } else if (result instanceof Promise) {
        // Handle async handlers that return promises
        result
          .then((response) => {
            safeSendResponse(response);
          })
          .catch((error) => {
            safeSendResponse({ success: false, error: error.message });
          });
        return true;
      } else {
        // Synchronous handler, clear timeout
        clearTimeout(responseTimeout);
        return result;
      }
    } catch (error) {
      log.warn('Error in message handler', false, error);
      safeSendResponse({ success: false, error: error.message });
      return true;
    }
  };
}

/**
 * Helper to add a safe message listener
 */
export function addSafeMessageListener(
  handler: (
    message: any,
    sender: any,
    sendResponse: (response?: any) => void
  ) => boolean | void | Promise<any>
) {
  if (!browser_ext?.runtime?.onMessage) {
    log.warn('Browser runtime not available for message listener');
    return;
  }

  const safeHandler = createSafeMessageListener(handler);
  // Cast to any to bypass strict typing - the handler is compatible
  browser_ext.runtime.onMessage.addListener(safeHandler as any);

  // Return a function to remove the listener
  return () => {
    browser_ext.runtime.onMessage.removeListener(safeHandler as any);
  };
}

/**
 * Check if a message channel error is due to closed channel
 */
export function isChannelClosedError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  return (
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('message port closed') ||
    errorMessage.includes('Attempting to use a disconnected port') ||
    errorMessage.includes('Extension context invalidated')
  );
}
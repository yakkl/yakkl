// messageChannelValidator.ts - Validates message channels before sending responses
import { log } from '$lib/managers/Logger';
import browser from 'webextension-polyfill';

export type SafeMessageHandler = (
  request: any,
  sender: browser.Runtime.MessageSender,
  sendResponse: (response?: any) => void
) => boolean | void;

/**
 * Wraps a message handler to ensure the channel is still valid before sending responses
 * This prevents "message channel closed" errors when tabs/extensions are closed
 */
export function createSafeMessageHandler(
  handler: (request: any, sender: browser.Runtime.MessageSender) => Promise<any>,
  options: {
    timeout?: number;
    fallbackResponse?: any;
    logPrefix?: string;
  } = {}
): SafeMessageHandler {
  const {
    timeout = 25000,
    fallbackResponse = { success: false, error: 'Message channel closed' },
    logPrefix = 'SafeMessageHandler'
  } = options;

  return (request, sender, sendResponse) => {
    console.log(`[${logPrefix}] Message validator called for:`, request?.type);
    
    let channelClosed = false;
    let responseHandled = false;

    // Create a safe response function that checks if channel is still open
    const safeSendResponse = (response: any) => {
      console.log(`[${logPrefix}] safeSendResponse called with:`, response);
      
      if (channelClosed) {
        log.warn(`[${logPrefix}] Attempted to send response on closed channel:`, false, {
          request: request.type || request.action || 'unknown',
          response
        });
        return;
      }

      if (responseHandled) {
        log.warn(`[${logPrefix}] Response already sent, ignoring duplicate:`, false, {
          request: request.type || request.action || 'unknown'
        });
        return;
      }

      try {
        sendResponse(response);
        responseHandled = true;
      } catch (error) {
        channelClosed = true;
        log.warn(`[${logPrefix}] Failed to send response - channel likely closed:`, false, {
          error: error instanceof Error ? error.message : error,
          request: request.type || request.action || 'unknown'
        });
      }
    };

    // Set up channel validation
    const validateChannel = () => {
      try {
        // Try to access runtime to check if extension context is still valid
        const _ = browser.runtime.id;
        return !channelClosed;
      } catch (error) {
        channelClosed = true;
        return false;
      }
    };

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        channelClosed = true;
        reject(new Error(`Handler timeout after ${timeout}ms`));
      }, timeout);
    });

    // Check if the channel is still valid before starting async work
    if (!validateChannel()) {
      log.warn(`[${logPrefix}] Channel validation failed, but will try to process message anyway`, false, {
        request: request.type || request.action || 'unknown'
      });
      // Don't return early - try to process the message anyway
      // The browser.runtime.id check might be too strict
    }

    // Execute the handler with timeout protection
    console.log(`[${logPrefix}] About to execute handler for:`, request?.type);
    
    Promise.race([
      handler(request, sender),
      timeoutPromise
    ])
      .then(response => {
        console.log(`[${logPrefix}] Handler completed with response:`, response);
        
        if (validateChannel()) {
          console.log(`[${logPrefix}] Channel valid, sending response`);
          safeSendResponse(response);
        } else {
          log.warn(`[${logPrefix}] Channel closed before response could be sent`, false, {
            request: request.type || request.action || 'unknown'
          });
        }
      })
      .catch(error => {
        console.error(`[${logPrefix}] Handler threw error:`, error);
        
        if (validateChannel()) {
          log.warn(`[${logPrefix}] Handler error:`, false, error);
          safeSendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } else {
          log.warn(`[${logPrefix}] Handler error but channel already closed:`, false, error);
        }
      })
      .finally(() => {
        // Ensure we always clean up
        channelClosed = true;
      });

    // Return true to indicate async response
    return true;
  };
}

/**
 * Validates if a message port is still connected
 */
export function isPortConnected(port: browser.Runtime.Port): boolean {
  try {
    // Try to post a test message - if port is disconnected, this will throw
    port.postMessage({ type: '__ping__' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Creates a safe port message handler that validates the port before sending
 */
export function createSafePortHandler(
  port: browser.Runtime.Port,
  handler: (message: any) => Promise<any>,
  options: {
    logPrefix?: string;
  } = {}
): (message: any) => void {
  const { logPrefix = 'SafePortHandler' } = options;

  return async (message: any) => {
    try {
      const response = await handler(message);
      
      if (isPortConnected(port)) {
        port.postMessage(response);
      } else {
        log.warn(`[${logPrefix}] Port disconnected before response could be sent`, false, {
          message: message.type || message.action || 'unknown'
        });
      }
    } catch (error) {
      if (isPortConnected(port)) {
        port.postMessage({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } else {
        log.warn(`[${logPrefix}] Handler error but port already disconnected:`, false, error);
      }
    }
  };
}
import { log } from "$lib/plugins/Logger";
import { isFrameAccessible } from "./frameInspector";

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

const pendingMessages = new Map<string, {
  message: any;
  timestamp: number;
  attempts: number;
}>();

/**
 * Safely get the window origin, handling cases where it might be null or undefined
 * @returns The window origin or null if it cannot be determined
 */
export function getWindowOrigin(): string | null {
  try {
    // Check if window and location exist
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      // If origin is null or empty, try to construct it from protocol and host
      if (!origin) {
        const protocol = window.location.protocol;
        const host = window.location.host;
        if (protocol && host) {
          return `${protocol}//${host}`;
        }
      }
      return origin || null;
    }
    return null;
  } catch (error) {
    log.warn('Error getting window origin', false, error);
    return null;
  }
}

/**
 * Validate if a given origin matches the current window origin
 * @param origin The origin to validate
 * @returns boolean indicating if the origin is valid
 */
export function isValidOrigin(origin: string): boolean {
  try {
    const windowOrigin = getWindowOrigin();
    // If we can't determine the window origin, reject the message
    if (!windowOrigin) return false;
    return origin === windowOrigin;
  } catch (error) {
    log.warn('Error validating origin, defaulting to false', false, error);
    return false;
  }
}

/**
 * Get the target origin for postMessage
 * @returns The target origin for postMessage or null if it cannot be determined
 */
export function getTargetOrigin(): string | null {
  try {
    // Check if window and location exist
    if (typeof window !== 'undefined' && window.location) {
      // log.debug('getTargetOrigin - window.location', false, window.location, window);
      // If we're in a frame with a null origin, reject the message
      if (window.location.origin === 'null') {
        return null;
      }
      // If we can't determine the origin, reject the message
      if (!window.location.origin) {
        return null;
      }
      return window.location.origin;
    }
    return null;
  } catch (error) {
    log.warn('Error getting target origin', false, error);
    return null;
  }
}

// NOTE: This is used in the content script and inpage script only.
// Example: safePostMessage(msg, origin, { targetWindow: iframe.contentWindow });
// Use this format when needing to send a message to a specific iframe (parent or child). Otherwise, use the default format below.
// Note: Cleaning up pending messages is handled in the content script
export function safePostMessage(
  message: any,
  targetOrigin: string | null,
  options?: {
    targetWindow?: Window | null;
    allowRetries?: boolean;
    retryKey?: string;
    context?: 'content' | 'inpage' | 'ports';
  }) {
  try {
    const recipient = options?.targetWindow ?? window;

    // log.debug('safePostMessage - attempting to send message:', false, {
    //   message,
    //   targetOrigin,
    //   options,
    //   windowOrigin: getWindowOrigin(),
    //   isFrameAccessible: isFrameAccessible(recipient),
    //   context: options?.context,
    //   timestamp: new Date().toISOString()
    // });

    // If we have a null origin, this likely means the frame was blocked by CSP
    if (!targetOrigin) {
      const messageKey = `${message.type}-${message.id}`;

      log.warn('Cannot send message - frame may have been blocked by CSP', false, {
        messageType: message.type,
        messageId: message.id,
        timestamp: new Date().toISOString()
      });

      if (options?.context === 'content' && options?.allowRetries && options.retryKey) {
        // For EIP-6963 responses, store for potential retry
        if (message.type === 'YAKKL_RESPONSE:EIP6963') {
          const pendingMessage = pendingMessages.get(messageKey);
          if (!pendingMessage || pendingMessage.attempts < MAX_RETRY_ATTEMPTS) {
            const attempts = (pendingMessage?.attempts || 0) + 1;
            pendingMessages.set(messageKey, {
              message: {
                ...message,
                error: {
                  code: 4900,
                  message: 'Frame blocked by Content Security Policy'
                }
              },
              timestamp: Date.now(),
              attempts
            });

            // Schedule retry if we haven't exceeded max attempts
            if (attempts < MAX_RETRY_ATTEMPTS) {
              setTimeout(() => {
                const stored = pendingMessages.get(messageKey);
                if (stored && Date.now() - stored.timestamp < RETRY_DELAY * MAX_RETRY_ATTEMPTS) {
                  log.debug('Retrying message send:', false, {
                    messageKey,
                    attempt: attempts,
                    timestamp: new Date().toISOString()
                  });
                  safePostMessage(stored.message, getTargetOrigin(), options);
                }
              }, RETRY_DELAY * attempts);
            }
          }
        }
      }
      return;
    }

    // Verify frame is still accessible before sending
    if (!isFrameAccessible(recipient)) {
      log.debug('Frame is no longer accessible, message not sent', false, {
        messageType: message.type,
        messageId: message.id,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Try to send the message
    try {
      recipient.postMessage(message, targetOrigin);

      log.debug('safePostMessage: Message sent successfully:', false, {
        messageType: message.type,
        messageId: message.id,
        message,
        targetOrigin,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      log.error('Error sending message:', false, {
        error,
        messageType: message.type,
        messageId: message.id,
        targetOrigin,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    log.error('Error in safePostMessage:', false, {
      error,
      messageType: message.type,
      messageId: message.id,
      targetOrigin,
      timestamp: new Date().toISOString()
    });
  }
}

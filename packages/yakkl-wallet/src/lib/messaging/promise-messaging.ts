/**
 * Promise-based messaging system with request IDs
 * Guarantees response delivery by managing its own response registry
 */
import browser from 'webextension-polyfill';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

// Registry of pending requests
const pendingRequests = new Map<string, PendingRequest>();

// Generate unique request IDs
let requestCounter = 0;
function generateRequestId(): string {
  return `${Date.now()}_${++requestCounter}_${Math.random().toString(36).substr(2, 9)}`;
}

// Initialize response listener once
let listenerInitialized = false;
function initializeResponseListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  browser.runtime.onMessage.addListener((message: any) => {
    // Check if this is a response message
    if (message && message.__isResponse && message.__requestId) {
      const pending = pendingRequests.get(message.__requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(message.__requestId);
        
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.data);
        }
      }
    }
    // Don't claim to handle the message (return undefined)
  });
}

/**
 * Send a message with guaranteed response using request IDs
 * @param message Message to send
 * @param timeout Timeout in milliseconds (default 30 seconds)
 * @returns Promise that resolves with the response
 */
export async function sendMessageWithPromise(message: {
  type: string;
  data?: any;
}, timeout = 30000): Promise<any> {
  // Initialize listener on first use
  initializeResponseListener();

  const requestId = generateRequestId();

  return new Promise((resolve, reject) => {
    // Store the pending request
    const timeoutHandle = setTimeout(() => {
      pendingRequests.delete(requestId);
      // More informative timeout error
      const timeoutError = new Error(
        `Handler timeout after ${timeout}ms - ${message.type} did not respond. ` +
        `This may indicate the background service is still initializing or the blockchain connection is slow.`
      );
      timeoutError.name = 'TimeoutError';
      reject(timeoutError);
    }, timeout);

    pendingRequests.set(requestId, {
      resolve,
      reject,
      timeout: timeoutHandle
    });

    // Send the message with request ID
    const messageWithId = {
      ...message,
      __requestId: requestId,
      __expectsResponse: true
    };

    console.log('[PromiseMessaging] Sending message with ID:', requestId, messageWithId);

    // Send the message
    browser.runtime.sendMessage(messageWithId).catch(error => {
      // Clean up on send error
      const pending = pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(requestId);
      }
      reject(error);
    });
  });
}

/**
 * Helper for background script to send a response
 * Used in background script to send responses back to client
 */
export function createResponseMessage(requestId: string, data: any, error?: string): any {
  return {
    __isResponse: true,
    __requestId: requestId,
    data,
    error
  };
}
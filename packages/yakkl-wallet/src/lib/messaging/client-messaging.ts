/**
 * Client-side messaging utilities
 * Provides message passing to background service without direct browser API access
 */
import browser from 'webextension-polyfill';

/**
 * Send a message to the background service
 * @param message Message to send
 * @returns Response from background service
 */
export async function sendMessage(message: {
  type: string;
  data?: any;
}): Promise<any> {
  try {
    // Validate message has a type field
    if (!message || !message.type) {
      const error = new Error(`[ClientMessaging] Invalid message: missing 'type' field. Message: ${JSON.stringify(message)}`);
      console.error(error.message);
      throw error;
    }
    
    // Log message being sent for debugging
    console.log('[ClientMessaging] Sending message:', message);
    
    // Send message and wait for response
    const response = await browser.runtime.sendMessage(message);
    
    console.log('[ClientMessaging] Received response:', response);
    return response;
  } catch (error) {
    console.error('[ClientMessaging] Failed to send message:', error);
    // Check if it's a connection error
    if (error.message?.includes('Could not establish connection')) {
      console.error('[ClientMessaging] Extension context not available or background script not responding');
      return null;
    }
    return { success: false, error: error.message };
  }
}

/**
 * Listen for messages from the background service
 * @param handler Message handler function
 * @returns Cleanup function to remove listener
 */
export function onMessage(
  handler: (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void
): () => void {
  // Cast to any to avoid type issues with browser API
  browser.runtime.onMessage.addListener(handler as any);
  return () => browser.runtime.onMessage.removeListener(handler as any);
}

/**
 * Connect to background service with persistent connection
 * @param name Port name
 * @returns Port connection
 */
export function connect(name: string): any {
  return browser.runtime.connect({ name });
}
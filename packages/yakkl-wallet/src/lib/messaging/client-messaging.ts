/**
 * Client-side messaging utilities
 * Provides message passing to background service without direct browser API access
 */

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
    // Use browser runtime if available
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      return await chrome.runtime.sendMessage(message);
    }
    
    // Fallback for non-extension context (e.g., testing)
    console.warn('[ClientMessaging] Not in extension context, returning mock response');
    return { success: false, error: 'Not in extension context' };
  } catch (error) {
    console.error('[ClientMessaging] Failed to send message:', error);
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
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }
  
  // No-op cleanup for non-extension context
  return () => {};
}

/**
 * Connect to background service with persistent connection
 * @param name Port name
 * @returns Port connection
 */
export function connect(name: string): any {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.connect) {
    return chrome.runtime.connect({ name });
  }
  
  // Mock port for non-extension context
  return {
    postMessage: () => {},
    onMessage: { addListener: () => {}, removeListener: () => {} },
    onDisconnect: { addListener: () => {}, removeListener: () => {} },
    disconnect: () => {}
  };
}
/**
 * Port utility functions for safe browser extension port operations
 * 
 * This module provides safe wrappers around browser port operations that properly
 * check runtime.lastError to prevent "Unchecked runtime.lastError" warnings.
 * 
 * The browser requires explicit error checking after certain operations to ensure
 * developers are aware of potential failures. This is especially important for:
 * - Port messaging when pages enter/exit bfcache
 * - Port disconnections
 * - Runtime message sending
 */

import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';

type RuntimePort = Runtime.Port;

/**
 * Safely post a message to a port with proper error checking
 * 
 * @param port - The browser runtime port
 * @param message - The message to send
 * @returns true if message was sent successfully, false otherwise
 */
export function safePortPostMessage(port: RuntimePort | null, message: any): boolean {
  if (!port) {
    return false;
  }

  try {
    port.postMessage(message);
    
    // CRITICAL: Check runtime.lastError immediately after postMessage
    // This prevents "Unchecked runtime.lastError" warnings
    if (browser.runtime.lastError) {
      const error = browser.runtime.lastError;
      
      // Common bfcache error - page was moved to back/forward cache
      if (error.message?.includes('back/forward cache')) {
        // This is expected when user navigates away - not a real error
        console.debug('[port-utils] Page moved to bfcache, message channel closed');
        return false;
      }
      
      // Extension context invalidated (extension reloaded/updated)
      if (error.message?.includes('Extension context invalidated')) {
        console.debug('[port-utils] Extension context invalidated');
        return false;
      }
      
      // Receiving end does not exist (port disconnected)
      if (error.message?.includes('Receiving end does not exist')) {
        console.debug('[port-utils] Port disconnected, receiving end does not exist');
        return false;
      }
      
      // Log other unexpected errors
      console.warn('[port-utils] Runtime error in postMessage:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    // Handle synchronous errors (port already disconnected, etc.)
    if (error instanceof Error) {
      if (error.message.includes('Attempting to use a disconnected port')) {
        console.debug('[port-utils] Port already disconnected');
        return false;
      }
    }
    console.warn('[port-utils] Error posting message:', error);
    return false;
  }
}

/**
 * Safely disconnect a port with proper error checking
 * 
 * @param port - The browser runtime port to disconnect
 * @returns true if disconnected successfully, false otherwise
 */
export function safePortDisconnect(port: RuntimePort | null): boolean {
  if (!port) {
    return true; // Already disconnected
  }

  try {
    port.disconnect();
    
    // CRITICAL: Check runtime.lastError immediately after disconnect
    if (browser.runtime.lastError) {
      const error = browser.runtime.lastError;
      
      // Port already disconnected - this is fine
      if (error.message?.includes('Attempting to use a disconnected port')) {
        console.debug('[port-utils] Port was already disconnected');
        return true;
      }
      
      console.warn('[port-utils] Runtime error in disconnect:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    // Handle synchronous errors
    if (error instanceof Error) {
      if (error.message.includes('Attempting to use a disconnected port')) {
        console.debug('[port-utils] Port already disconnected');
        return true;
      }
    }
    console.warn('[port-utils] Error disconnecting port:', error);
    return false;
  }
}

/**
 * Safely connect to a runtime port with proper error checking
 * 
 * @param connectInfo - Connection information (port name, etc.)
 * @returns The connected port or null if connection failed
 */
export function safeRuntimeConnect(connectInfo?: Runtime.ConnectConnectInfoType): RuntimePort | null {
  try {
    const port = browser.runtime.connect(connectInfo);
    
    // Check for immediate connection errors
    if (browser.runtime.lastError) {
      const error = browser.runtime.lastError;
      console.warn('[port-utils] Runtime error in connect:', error.message);
      return null;
    }
    
    return port;
  } catch (error) {
    console.warn('[port-utils] Error connecting to runtime:', error);
    return null;
  }
}

/**
 * Safely send a runtime message with proper error checking
 * 
 * @param message - The message to send
 * @returns Promise that resolves to the response or null if failed
 */
export async function safeSendMessage(message: any): Promise<any> {
  try {
    const response = await browser.runtime.sendMessage(message);
    
    // Check for errors after sending
    if (browser.runtime.lastError) {
      const error = browser.runtime.lastError;
      
      // Common errors that are expected in certain scenarios
      if (error.message?.includes('Receiving end does not exist')) {
        console.debug('[port-utils] No listener for message');
        return null;
      }
      
      if (error.message?.includes('Extension context invalidated')) {
        console.debug('[port-utils] Extension context invalidated');
        return null;
      }
      
      console.warn('[port-utils] Runtime error in sendMessage:', error.message);
      return null;
    }
    
    return response;
  } catch (error) {
    // Handle promise rejection
    if (error instanceof Error) {
      if (error.message.includes('Receiving end does not exist')) {
        console.debug('[port-utils] No listener for message');
        return null;
      }
      
      if (error.message.includes('Extension context invalidated')) {
        console.debug('[port-utils] Extension context invalidated');
        return null;
      }
    }
    
    console.warn('[port-utils] Error sending message:', error);
    return null;
  }
}

/**
 * Create a port with automatic error handling and reconnection
 */
export class SafePort {
  private port: RuntimePort | null = null;
  private name: string;
  private onMessageCallback?: (message: any) => void;
  private onDisconnectCallback?: () => void;
  private isConnected = false;

  constructor(name: string) {
    this.name = name;
  }

  connect(): boolean {
    this.port = safeRuntimeConnect({ name: this.name });
    
    if (!this.port) {
      return false;
    }

    this.isConnected = true;

    // Set up listeners with error handling
    this.port.onMessage.addListener((message) => {
      // Check for errors when receiving messages
      if (browser.runtime.lastError) {
        console.debug('[SafePort] Error receiving message:', browser.runtime.lastError.message);
        return;
      }
      
      if (this.onMessageCallback) {
        try {
          this.onMessageCallback(message);
        } catch (error) {
          console.warn('[SafePort] Error in message callback:', error);
        }
      }
    });

    this.port.onDisconnect.addListener(() => {
      // Check for disconnect reason
      if (browser.runtime.lastError) {
        console.debug('[SafePort] Disconnect reason:', browser.runtime.lastError.message);
      }
      
      this.isConnected = false;
      this.port = null;
      
      if (this.onDisconnectCallback) {
        try {
          this.onDisconnectCallback();
        } catch (error) {
          console.warn('[SafePort] Error in disconnect callback:', error);
        }
      }
    });

    return true;
  }

  postMessage(message: any): boolean {
    return safePortPostMessage(this.port, message);
  }

  disconnect(): boolean {
    const result = safePortDisconnect(this.port);
    this.isConnected = false;
    this.port = null;
    return result;
  }

  onMessage(callback: (message: any) => void) {
    this.onMessageCallback = callback;
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

/**
 * Best practices for using these utilities:
 * 
 * 1. Always use these safe wrappers instead of direct port operations
 * 2. Check return values to handle failures gracefully
 * 3. Implement reconnection logic for critical connections
 * 4. Handle bfcache scenarios (pageshow/pagehide events)
 * 5. Clean up ports when components unmount
 * 
 * Example usage:
 * ```typescript
 * // Instead of: port.postMessage(data)
 * // Use: 
 * if (!safePortPostMessage(port, data)) {
 *   // Handle failure - maybe reconnect
 * }
 * 
 * // Or use SafePort class:
 * const safePort = new SafePort('my-port');
 * if (safePort.connect()) {
 *   safePort.onMessage((msg) => console.log(msg));
 *   safePort.postMessage({ type: 'hello' });
 * }
 * ```
 */
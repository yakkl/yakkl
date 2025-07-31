/**
 * Safe Port Messaging Utilities
 * 
 * Provides safe wrappers for port.postMessage() that handle disconnected ports gracefully
 * and prevent the "Attempting to use a disconnected port object" error.
 */

import type { Runtime } from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';
import { isChannelClosedError } from './messageChannelWrapper';

// Track port states
const portStates = new Map<string, {
  isConnected: boolean;
  disconnectedAt?: number;
  lastActivity: number;
}>();

/**
 * Check if a port is still connected
 */
export function isPortConnected(port: Runtime.Port): boolean {
  if (!port) return false;
  
  // Get or create port state
  const portId = getPortId(port);
  let state = portStates.get(portId);
  
  if (!state) {
    state = {
      isConnected: true,
      lastActivity: Date.now()
    };
    portStates.set(portId, state);
    
    // Set up disconnect listener for this port
    setupPortStateTracking(port, portId);
  }
  
  return state.isConnected;
}

/**
 * Generate a unique ID for a port
 */
function getPortId(port: Runtime.Port): string {
  // Use port name and sender info to create unique ID
  const senderInfo = port.sender?.tab?.id || port.sender?.url || 'unknown';
  return `${port.name || 'unnamed'}_${senderInfo}_${Date.now()}`;
}

/**
 * Set up state tracking for a port
 */
function setupPortStateTracking(port: Runtime.Port, portId: string): void {
  const state = portStates.get(portId);
  if (!state) return;
  
  // Set up disconnect listener
  port.onDisconnect.addListener(() => {
    const currentState = portStates.get(portId);
    if (currentState) {
      currentState.isConnected = false;
      currentState.disconnectedAt = Date.now();
    }
    
    log.debug('[SafePort] Port disconnected:', false, { portId, portName: port.name });
    
    // Clean up state after a delay
    setTimeout(() => {
      portStates.delete(portId);
    }, 30000); // Clean up after 30 seconds
  });
}

/**
 * Safely send a message through a port with disconnection handling
 */
export function safePortPostMessage(
  port: Runtime.Port,
  message: any,
  options?: {
    retries?: number;
    timeout?: number;
    onError?: (error: any) => void;
    context?: string;
  }
): boolean {
  const { retries = 0, timeout = 1000, onError, context = 'unknown' } = options || {};
  
  if (!port) {
    log.warn('[SafePort] No port provided for message', false, { context, message: message?.type });
    onError?.(new Error('No port provided'));
    return false;
  }
  
  // Check if port is connected
  if (!isPortConnected(port)) {
    const error = new Error(`Port disconnected - cannot send message`);
    log.warn('[SafePort] Attempted to send message to disconnected port:', false, {
      context,
      messageType: message?.type,
      messageId: message?.id,
      portName: port.name
    });
    onError?.(error);
    return false;
  }
  
  try {
    // Update last activity
    const portId = getPortId(port);
    const state = portStates.get(portId);
    if (state) {
      state.lastActivity = Date.now();
    }
    
    // Send the message
    port.postMessage(message);
    
    log.debug('[SafePort] Message sent successfully:', false, {
      context,
      messageType: message?.type,
      messageId: message?.id,
      portName: port.name
    });
    
    return true;
    
  } catch (error) {
    // Check if this is a disconnected port error
    if (isChannelClosedError(error)) {
      // Mark port as disconnected
      const portId = getPortId(port);
      const state = portStates.get(portId);
      if (state) {
        state.isConnected = false;
        state.disconnectedAt = Date.now();
      }
      
      log.warn('[SafePort] Port disconnected during message send:', false, {
        context,
        messageType: message?.type,
        messageId: message?.id,
        portName: port.name,
        error: error instanceof Error ? error.message : error
      });
      
      // Try retry if specified
      if (retries > 0) {
        log.debug('[SafePort] Retrying message send:', false, {
          context,
          messageType: message?.type,
          retriesLeft: retries - 1
        });
        
        setTimeout(() => {
          safePortPostMessage(port, message, {
            ...options,
            retries: retries - 1
          });
        }, timeout);
        return false;
      }
    } else {
      // Other error
      log.error('[SafePort] Error sending port message:', false, {
        context,
        messageType: message?.type,
        messageId: message?.id,
        portName: port.name,
        error: error instanceof Error ? error.message : error
      });
    }
    
    onError?.(error);
    return false;
  }
}

/**
 * Create a safe wrapper around a port for consistent messaging
 */
export class SafePortWrapper {
  private port: Runtime.Port;
  private isDisconnected = false;
  private pendingMessages: Array<{ message: any; resolve: () => void; reject: (error: any) => void }> = [];
  
  constructor(port: Runtime.Port, private context: string = 'unknown') {
    this.port = port;
    
    // Set up disconnect handling
    port.onDisconnect.addListener(() => {
      this.isDisconnected = true;
      
      // Reject all pending messages
      const error = new Error('Port disconnected');
      this.pendingMessages.forEach(({ reject }) => reject(error));
      this.pendingMessages = [];
      
      log.debug('[SafePortWrapper] Port disconnected:', false, {
        context: this.context,
        portName: port.name
      });
    });
  }
  
  /**
   * Send a message safely
   */
  async postMessage(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDisconnected) {
        reject(new Error('Port is disconnected'));
        return;
      }
      
      const success = safePortPostMessage(this.port, message, {
        context: this.context,
        onError: reject
      });
      
      if (success) {
        resolve();
      } else if (!this.isDisconnected) {
        // Queue for retry if port is still connected
        this.pendingMessages.push({ message, resolve, reject });
      }
    });
  }
  
  /**
   * Check if the port is connected
   */
  get connected(): boolean {
    return !this.isDisconnected && isPortConnected(this.port);
  }
  
  /**
   * Get the underlying port (use with caution)
   */
  get rawPort(): Runtime.Port {
    return this.port;
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    this.isDisconnected = true;
    this.pendingMessages = [];
  }
}

/**
 * Broadcast a message to multiple ports safely
 */
export function safeBroadcastToports(
  ports: Runtime.Port[],
  message: any,
  options?: {
    context?: string;
    continueOnError?: boolean;
  }
): { sent: number; failed: number; errors: Array<{ port: Runtime.Port; error: any }> } {
  const { context = 'broadcast', continueOnError = true } = options || {};
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as Array<{ port: Runtime.Port; error: any }>
  };
  
  for (const port of ports) {
    const success = safePortPostMessage(port, message, {
      context,
      onError: (error) => {
        results.errors.push({ port, error });
      }
    });
    
    if (success) {
      results.sent++;
    } else {
      results.failed++;
      if (!continueOnError) {
        break;
      }
    }
  }
  
  log.debug('[SafePort] Broadcast results:', false, {
    context,
    totalPorts: ports.length,
    sent: results.sent,
    failed: results.failed,
    messageType: message?.type
  });
  
  return results;
}

/**
 * Clean up disconnected port states periodically
 */
export function cleanupDisconnectedPorts(): void {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  
  let cleaned = 0;
  for (const [portId, state] of portStates.entries()) {
    if (!state.isConnected && state.disconnectedAt) {
      if (now - state.disconnectedAt > CLEANUP_THRESHOLD) {
        portStates.delete(portId);
        cleaned++;
      }
    } else if (now - state.lastActivity > CLEANUP_THRESHOLD) {
      // Clean up very old states
      portStates.delete(portId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    log.debug('[SafePort] Cleaned up disconnected port states:', false, { cleaned });
  }
}

// Set up periodic cleanup
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupDisconnectedPorts, 5 * 60 * 1000); // Clean up every 5 minutes
}
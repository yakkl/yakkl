/**
 * Background Browser API Port Handler
 * 
 * Handles secure port connections for browser API requests
 * with access to encryption/decryption via in-memory digest
 */

import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { handleBrowserAPIMessage } from './browser-api.handler';
import { log } from '$lib/managers/Logger';
import { safePortPostMessage } from '$lib/common/safePortMessaging';

interface PortMessage {
  id: string;
  request?: {
    id: string;
    type: string;
    payload?: any;
    timestamp: number;
  };
  response?: {
    success: boolean;
    data?: any;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  };
}

// Store active port connections
const activePorts = new Map<string, Runtime.Port>();

// Access to in-memory digest (set elsewhere in background)
declare global {
  var __yakklDigest: string | null;
}

/**
 * Handle incoming port connections
 */
export function handleBrowserAPIPortConnection(port: Runtime.Port) {
  if (port.name !== 'YAKKL_BROWSER_API') {
    return;
  }
  
  const portId = `port_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  activePorts.set(portId, port);
  
  log.info('[BrowserAPIPort] New port connection established:', false, { portId, sender: port.sender });
  
  // Handle messages from this port
  port.onMessage.addListener(async (message: PortMessage) => {
    if (!message.id || !message.request) {
      log.warn('[BrowserAPIPort] Invalid message format:', false, message);
      return;
    }
    
    try {
      let result: any;
      
      // Handle special encryption/decryption requests
      switch (message.request.type) {
        case 'YAKKL_DECRYPT':
          result = await handleDecrypt(message.request.payload);
          break;
          
        case 'YAKKL_ENCRYPT':
          result = await handleEncrypt(message.request.payload);
          break;
          
        case 'YAKKL_VERIFY_DIGEST':
          result = await handleVerifyDigest();
          break;
          
        default:
          // Handle standard browser API requests
          result = await handleBrowserAPIMessage({
            id: message.request.id,
            type: message.request.type as any, // Cast to BrowserAPIMessageType
            payload: message.request.payload || {},
            timestamp: message.request.timestamp
          });
          break;
      }
      
      // Send response back through port safely
      safePortPostMessage(port, {
        id: message.id,
        response: {
          success: true,
          data: result
        }
      } as PortMessage, {
        context: 'BrowserAPIPort-success',
        onError: (error) => {
          log.warn('[BrowserAPIPort] Failed to send success response:', false, { 
            messageId: message.id, 
            error: error instanceof Error ? error.message : error 
          });
        }
      });
      
    } catch (error) {
      log.error('[BrowserAPIPort] Error handling message:', false, error);
      
      // Send error response safely
      safePortPostMessage(port, {
        id: message.id,
        response: {
          success: false,
          error: {
            code: 'HANDLER_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: error
          }
        }
      } as PortMessage, {
        context: 'BrowserAPIPort-error',
        onError: (sendError) => {
          log.warn('[BrowserAPIPort] Failed to send error response:', false, { 
            messageId: message.id, 
            originalError: error instanceof Error ? error.message : error,
            sendError: sendError instanceof Error ? sendError.message : sendError
          });
        }
      });
    }
  });
  
  // Handle port disconnection
  port.onDisconnect.addListener(() => {
    log.info('[BrowserAPIPort] Port disconnected:', false, { portId });
    activePorts.delete(portId);
  });
}

/**
 * Handle decryption request using in-memory digest
 */
async function handleDecrypt(payload: any): Promise<any> {
  const { encryptedData } = payload;
  
  if (!globalThis.__yakklDigest) {
    throw new Error('No digest available for decryption');
  }
  
  if (!encryptedData) {
    throw new Error('No encrypted data provided');
  }
  
  try {
    // Import your decryption function
    const { decryptData } = await import('$lib/common/encryption');
    const decrypted = await decryptData(encryptedData, globalThis.__yakklDigest);
    
    log.debug('[BrowserAPIPort] Data decrypted successfully');
    return decrypted;
    
  } catch (error) {
    log.error('[BrowserAPIPort] Decryption failed:', false, error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Handle encryption request using in-memory digest
 */
async function handleEncrypt(payload: any): Promise<any> {
  const { data } = payload;
  
  if (!globalThis.__yakklDigest) {
    throw new Error('No digest available for encryption');
  }
  
  if (!data) {
    throw new Error('No data provided for encryption');
  }
  
  try {
    // Import your encryption function
    const { encryptData } = await import('$lib/common/encryption');
    const encrypted = await encryptData(data, globalThis.__yakklDigest);
    
    log.debug('[BrowserAPIPort] Data encrypted successfully');
    return encrypted; // Returns EncryptedData object with data, iv, salt
    
  } catch (error) {
    log.error('[BrowserAPIPort] Encryption failed:', false, error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Verify if digest is available without exposing it
 */
async function handleVerifyDigest(): Promise<boolean> {
  return !!globalThis.__yakklDigest;
}

/**
 * Set the digest in memory (called from elsewhere in background)
 */
export function setDigestInMemory(digest: string | null) {
  globalThis.__yakklDigest = digest;
  log.info('[BrowserAPIPort] Digest updated in memory:', false, { hasDigest: !!digest });
}

/**
 * Clear digest from memory (on logout/lock)
 */
export function clearDigestFromMemory() {
  globalThis.__yakklDigest = null;
  log.info('[BrowserAPIPort] Digest cleared from memory');
}
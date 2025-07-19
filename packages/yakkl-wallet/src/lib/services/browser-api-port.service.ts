/**
 * Browser API Port Service
 * 
 * Enhanced version using persistent port connections for secure communication
 * with automatic reconnection and retry logic.
 */

import type { Runtime } from 'webextension-polyfill';
import { 
  BrowserAPIMessageType,
  type BrowserAPIRequest,
  type BrowserAPIResponse,
  type BrowserAPIError
} from '$lib/types/browser-api-messages';
import { log } from '$lib/managers/Logger';

interface PortMessage {
  id: string;
  request?: BrowserAPIRequest;
  response?: BrowserAPIResponse;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: number;
  retries: number;
}

class BrowserAPIPortService {
  private static instance: BrowserAPIPortService;
  private port: Runtime.Port | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestId = 0;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 1000; // Start with 1 second
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private isConnecting = false;
  
  private constructor() {
    console.log('[BrowserAPIPort] Service initialized');
    this.connect();
  }
  
  static getInstance(): BrowserAPIPortService {
    if (!BrowserAPIPortService.instance) {
      BrowserAPIPortService.instance = new BrowserAPIPortService();
    }
    return BrowserAPIPortService.instance;
  }
  
  /**
   * Establish port connection with automatic retry
   */
  private async connect(): Promise<boolean> {
    if (this.isConnecting || this.port) {
      return !!this.port;
    }
    
    this.isConnecting = true;
    
    try {
      // Get browser API - this will need to be injected or imported carefully
      const browser = (window as any).browser || (window as any).chrome;
      if (!browser?.runtime?.connect) {
        throw new Error('Browser runtime API not available');
      }
      
      this.port = browser.runtime.connect({ name: 'YAKKL_BROWSER_API' });
      
      this.port.onMessage.addListener(this.handlePortMessage.bind(this));
      this.port.onDisconnect.addListener(this.handlePortDisconnect.bind(this));
      
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      
      log.info('[BrowserAPIPort] Port connected successfully');
      return true;
      
    } catch (error) {
      this.isConnecting = false;
      log.error('[BrowserAPIPort] Failed to connect:', false, error);
      
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        const delay = this.RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;
        
        log.info(`[BrowserAPIPort] Retrying connection in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
      }
      
      return false;
    }
  }
  
  /**
   * Handle incoming port messages
   */
  private handlePortMessage(message: PortMessage) {
    if (!message.id || !message.response) {
      return;
    }
    
    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      log.warn('[BrowserAPIPort] Received response for unknown request:', false, message.id);
      return;
    }
    
    // Clear timeout
    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);
    
    // Resolve or reject based on response
    if (message.response.success) {
      pending.resolve(message.response.data);
    } else {
      pending.reject(new Error(message.response.error?.message || 'Unknown error'));
    }
  }
  
  /**
   * Handle port disconnection with auto-reconnect
   */
  private handlePortDisconnect() {
    log.warn('[BrowserAPIPort] Port disconnected');
    
    this.port = null;
    
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Port disconnected'));
    }
    this.pendingRequests.clear();
    
    // Attempt to reconnect
    this.connect();
  }
  
  /**
   * Send request through port with retry logic
   */
  private async sendPortRequest<T>(
    type: BrowserAPIMessageType,
    payload?: any,
    retries = 0
  ): Promise<T> {
    // Ensure port is connected
    if (!this.port) {
      const connected = await this.connect();
      if (!connected) {
        throw new Error('Failed to establish port connection');
      }
    }
    
    const id = this.generateRequestId();
    const request: BrowserAPIRequest = {
      id,
      type,
      payload,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        
        // Retry if we haven't exceeded max retries
        if (retries < this.MAX_RETRIES) {
          log.warn(`[BrowserAPIPort] Request ${id} timed out, retrying...`);
          this.sendPortRequest<T>(type, payload, retries + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`Request timed out after ${this.MAX_RETRIES} retries`));
        }
      }, this.REQUEST_TIMEOUT);
      
      // Store pending request
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeout as any,
        retries
      });
      
      // Send request
      try {
        this.port!.postMessage({ id, request } as PortMessage);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        
        // Port might be disconnected, try to reconnect and retry
        if (retries < this.MAX_RETRIES) {
          this.port = null;
          this.sendPortRequest<T>(type, payload, retries + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(error);
        }
      }
    });
  }
  
  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `browser-api-port-${Date.now()}-${++this.requestId}`;
  }
  
  // ===============================
  // Public API Methods
  // ===============================
  
  /**
   * Send encrypted data to background for decryption
   */
  async decrypt(encryptedData: any): Promise<any> {
    return this.sendPortRequest(BrowserAPIMessageType.YAKKL_DECRYPT, { encryptedData });
  }
  
  /**
   * Send data to background for encryption
   */
  async encrypt(data: any): Promise<any> {
    return this.sendPortRequest(BrowserAPIMessageType.YAKKL_ENCRYPT, { data });
  }
  
  /**
   * Check if digest is valid (without exposing it)
   */
  async verifyDigest(): Promise<boolean> {
    return this.sendPortRequest(BrowserAPIMessageType.YAKKL_VERIFY_DIGEST);
  }
  
  // All the existing browser API methods can use sendPortRequest instead...
  
  /**
   * Storage API
   */
  async storageGet(keys?: string | string[] | Record<string, any> | null): Promise<Record<string, any>> {
    return this.sendPortRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_GET,
      { keys }
    );
  }
  
  async storageSet(items: Record<string, any>): Promise<void> {
    return this.sendPortRequest(
      BrowserAPIMessageType.BROWSER_API_STORAGE_SET,
      { items }
    );
  }
  
  // ... rest of the API methods using sendPortRequest
}

// Export singleton instance
export const browserAPIPort = BrowserAPIPortService.getInstance();

// Also export the class for type access
export { BrowserAPIPortService };
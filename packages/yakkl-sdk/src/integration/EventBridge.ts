/**
 * EventBridge - Cross-frame communication and event management
 */

import { EventEmitter } from 'eventemitter3';

export interface BridgeMessage {
  id: string;
  type: string;
  source: string;
  target: string;
  data: any;
  timestamp: number;
}

export interface BridgeEvents {
  'message': (message: BridgeMessage) => void;
  'request': (message: BridgeMessage) => void;
  'response': (message: BridgeMessage) => void;
  'error': (error: Error) => void;
}

export class EventBridge extends EventEmitter<BridgeEvents> {
  private instanceId: string;
  private allowedOrigins: string[];
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private requestTimeout = 30000; // 30 seconds

  constructor(options: {
    instanceId?: string;
    allowedOrigins?: string[];
    requestTimeout?: number;
  } = {}) {
    super();
    
    this.instanceId = options.instanceId || this.generateId();
    this.allowedOrigins = options.allowedOrigins || ['*'];
    this.requestTimeout = options.requestTimeout || 30000;
    
    this.setupMessageListener();
  }

  /**
   * Send a message to a target
   */
  send(target: string, type: string, data: any = {}): void {
    const message: BridgeMessage = {
      id: this.generateId(),
      type,
      source: this.instanceId,
      target,
      data,
      timestamp: Date.now()
    };

    this.postMessage(message);
  }

  /**
   * Send a request and wait for response
   */
  async request(target: string, type: string, data: any = {}): Promise<any> {
    const message: BridgeMessage = {
      id: this.generateId(),
      type,
      source: this.instanceId,
      target,
      data,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout: ${type}`));
      }, this.requestTimeout);

      // Store pending request
      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout
      });

      // Send message
      this.postMessage(message);
    });
  }

  /**
   * Respond to a request
   */
  respond(originalMessage: BridgeMessage, data: any): void {
    const response: BridgeMessage = {
      id: this.generateId(),
      type: `${originalMessage.type}:response`,
      source: this.instanceId,
      target: originalMessage.source,
      data: {
        requestId: originalMessage.id,
        ...data
      },
      timestamp: Date.now()
    };

    this.postMessage(response);
  }

  /**
   * Register a handler for a specific message type
   */
  onMessage(type: string, handler: (data: any, message: BridgeMessage) => void): void {
    this.on('message', (message) => {
      if (message.type === type) {
        handler(message.data, message);
      }
    });
  }

  /**
   * Register a handler for a specific request type
   */
  onRequest(type: string, handler: (data: any, message: BridgeMessage) => Promise<any> | any): void {
    this.on('request', async (message) => {
      if (message.type === type) {
        try {
          const result = await handler(message.data, message);
          this.respond(message, { success: true, result });
        } catch (error) {
          this.respond(message, { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    });
  }

  /**
   * Set allowed origins for security
   */
  setAllowedOrigins(origins: string[]): void {
    this.allowedOrigins = origins;
  }

  /**
   * Connect to a specific window/frame
   */
  connectToWindow(targetWindow: Window, targetOrigin: string = '*'): void {
    this.postMessage = (message: BridgeMessage) => {
      targetWindow.postMessage(message, targetOrigin);
    };
  }

  /**
   * Connect to parent window (for iframes)
   */
  connectToParent(): void {
    if (window.parent && window.parent !== window) {
      this.connectToWindow(window.parent);
    }
  }

  /**
   * Connect to opener window (for popups)
   */
  connectToOpener(): void {
    if (window.opener) {
      this.connectToWindow(window.opener);
    }
  }

  /**
   * Broadcast to all connected windows
   */
  broadcast(type: string, data: any = {}): void {
    const message: BridgeMessage = {
      id: this.generateId(),
      type,
      source: this.instanceId,
      target: '*',
      data,
      timestamp: Date.now()
    };

    // Send to parent
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }

    // Send to opener
    if (window.opener) {
      window.opener.postMessage(message, '*');
    }
  }

  /**
   * Create a secure channel between two instances
   */
  createSecureChannel(target: string, sharedSecret?: string): SecureChannel {
    return new SecureChannel(this, target, sharedSecret);
  }

  /**
   * Destroy the bridge and clean up
   */
  destroy(): void {
    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Bridge destroyed'));
    }
    this.pendingRequests.clear();

    // Remove event listeners
    this.removeAllListeners();

    // Remove message listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
    }
  }

  /**
   * Private methods
   */
  private messageHandler = (event: MessageEvent) => {
    // Check origin security
    if (this.allowedOrigins.length > 0 && 
        !this.allowedOrigins.includes('*') && 
        !this.allowedOrigins.includes(event.origin)) {
      return;
    }

    const message = event.data as BridgeMessage;
    
    // Validate message format
    if (!this.isValidMessage(message)) {
      return;
    }

    // Skip messages not for this instance (unless broadcast)
    if (message.target !== this.instanceId && message.target !== '*') {
      return;
    }

    // Handle response messages
    if (message.type.endsWith(':response')) {
      this.handleResponse(message);
      return;
    }

    // Emit appropriate events
    this.emit('message', message);
    
    // Check if this is a request (expecting response)
    if (message.data && typeof message.data === 'object' && !message.type.endsWith(':response')) {
      this.emit('request', message);
    }
  };

  private setupMessageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.messageHandler);
    }
  }

  private handleResponse(message: BridgeMessage): void {
    const requestId = message.data?.requestId;
    if (!requestId || !this.pendingRequests.has(requestId)) {
      return;
    }

    const request = this.pendingRequests.get(requestId)!;
    this.pendingRequests.delete(requestId);
    
    clearTimeout(request.timeout);

    if (message.data.success) {
      request.resolve(message.data.result);
    } else {
      request.reject(new Error(message.data.error || 'Request failed'));
    }
  }

  private isValidMessage(message: any): message is BridgeMessage {
    return message &&
           typeof message === 'object' &&
           typeof message.id === 'string' &&
           typeof message.type === 'string' &&
           typeof message.source === 'string' &&
           typeof message.target === 'string' &&
           typeof message.timestamp === 'number';
  }

  private postMessage(message: BridgeMessage): void {
    if (typeof window !== 'undefined') {
      window.postMessage(message, '*');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

/**
 * SecureChannel - Encrypted communication channel
 */
export class SecureChannel {
  private bridge: EventBridge;
  private target: string;
  private secret: string;

  constructor(bridge: EventBridge, target: string, sharedSecret?: string) {
    this.bridge = bridge;
    this.target = target;
    this.secret = sharedSecret || this.generateSecret();
  }

  /**
   * Send encrypted message
   */
  async send(type: string, data: any): Promise<void> {
    const encryptedData = await this.encrypt(data);
    this.bridge.send(this.target, `secure:${type}`, {
      encrypted: true,
      data: encryptedData
    });
  }

  /**
   * Send encrypted request
   */
  async request(type: string, data: any): Promise<any> {
    const encryptedData = await this.encrypt(data);
    const response = await this.bridge.request(this.target, `secure:${type}`, {
      encrypted: true,
      data: encryptedData
    });
    
    if (response.encrypted) {
      return await this.decrypt(response.data);
    }
    
    return response;
  }

  /**
   * Listen for encrypted messages
   */
  onMessage(type: string, handler: (data: any) => void): void {
    this.bridge.onMessage(`secure:${type}`, async (messageData) => {
      if (messageData.encrypted) {
        const decryptedData = await this.decrypt(messageData.data);
        handler(decryptedData);
      }
    });
  }

  private async encrypt(data: any): Promise<string> {
    // Simple XOR encryption for demo - use proper encryption in production
    const json = JSON.stringify(data);
    const encrypted = Array.from(json).map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ this.secret.charCodeAt(i % this.secret.length))
    ).join('');
    
    return btoa(encrypted);
  }

  private async decrypt(encryptedData: string): Promise<any> {
    const encrypted = atob(encryptedData);
    const decrypted = Array.from(encrypted).map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ this.secret.charCodeAt(i % this.secret.length))
    ).join('');
    
    return JSON.parse(decrypted);
  }

  private generateSecret(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
}

/**
 * Create an event bridge instance
 */
export function createEventBridge(options?: {
  instanceId?: string;
  allowedOrigins?: string[];
  requestTimeout?: number;
}): EventBridge {
  return new EventBridge(options);
}
// content.ts - Complete unified port implementation with safe browser API usage
import { ensureProcessPolyfill } from '$lib/common/process';
ensureProcessPolyfill();

import { Duplex } from 'readable-stream';
import { WALLET_SECURITY_CONFIG, YAKKL_DAPP } from '$lib/common/constants';
import type { SecurityLevel } from '$lib/permissions/types';
import { SecurityLevel as SecurityLevelEnum } from '$lib/permissions/types';
import browser, { type Runtime } from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';
import { isExtensionContextValid } from '$lib/common';
import {
  isValidOrigin,
  getTargetOrigin,
  safePostMessage as safePostMessageOrigin,
  getCurrentOrigin,
  isSandboxedContext,
  debugOriginInfo,
  safePostMessage
} from '$lib/common/origin';
// import {
//   isExtensionContextValid,
//   safeConnect,
//   safeSendMessage,
//   initSafeBrowserAPI,
//   safePostMessage as safePostMessageAPI
// } from '$lib/common/safe-browser-api';

// Chrome types for compatibility
declare namespace chrome {
  export namespace runtime {
    interface Port {
      name: string;
      onMessage: {
        addListener: (callback: (message: any) => void) => void;
      };
      onDisconnect: {
        addListener: (callback: () => void) => void;
      };
      postMessage: (message: any) => void;
      disconnect: () => void;
    }
    function connect(connectInfo?: { name: string }): Port;
  }
}

// Type definitions
type RuntimePort = Runtime.Port;

interface QueuedMessage {
  message: any;
  timestamp: number;
  retries: number;
}

interface PendingRequest {
  id: string;
  message: any;
  timestamp: number;
  attempts: number;
}

// Safe postMessage function to handle origin issues with context validation
function safeWindowPostMessage(message: any, context = 'content'): boolean {
  try {
    // First check if extension context is valid
    if (!isExtensionContextValid()) {
      log.warn(`[${context}] Extension context invalid, skipping postMessage`);
      return false;
    }

    return safePostMessage(message, undefined, {
      context,
      allowRetries: true,
      retryKey: `${message.type}-${message.id || Date.now()}`
    });
  } catch (error) {
    log.warn(`[${context}] Critical error in postMessage:`, false, {
      error: error instanceof Error ? error.message : error,
      messageType: message.type,
      messageId: message.id,
      debugInfo: debugOriginInfo()
    });
    return false;
  }
}

// PortDuplexStream class for bidirectional communication
class PortDuplexStream extends Duplex {
  private port: RuntimePort;
  private isDestroyed = false;

  constructor(port: RuntimePort) {
    super({ objectMode: true });
    this.port = port;

    // Ensure the port forwards messages to this stream
    this.port.onMessage.addListener((message: any) => {
      this._onMessage(message);
    });

    // Handle disconnection
    this.port.onDisconnect.addListener(() => {
      this.destroy();
    });
  }

  _read() {
    // No-op - we push data when we receive it
  }

  _write(message: any, _encoding: string, callback: () => void) {
    try {
      log.debug('PortDuplexStream - content: Writing to port', false, message);
      this.port.postMessage(message);
      callback();
    } catch (error) {
      log.warn('Failed to write to port', false, error);
      callback();
    }
  }

  _onMessage(message: any) {
    try {
      log.debug('PortDuplexStream - content: Received message from background:', false, message);
      // Push the message to the stream
      this.push(message);
    } catch (error) {
      log.warn('Error in _onMessage', false, error);
    }
  }

  _destroy(err: Error | null, callback: (error: Error | null) => void) {
    try {
      log.debug('PortDuplexStream - content: Destroying port', false);
      this.isDestroyed = true;
      this.port.disconnect();
      callback(err);
    } catch (error: unknown) {
      log.warn('Error in _destroy', false, error);
      if (error instanceof Error) {
        callback(error);
      } else {
        callback(new Error('Failed to destroy port'));
      }
    }
  }
}

// Main ContentScriptManager class
class ContentScriptManager {
  private port: RuntimePort | null = null;
  private contentStream: PortDuplexStream | null = null;
  private isConnected: boolean = false;
  private isInitializing: boolean = false;
  private pendingRequests = new Map<string, PendingRequest>();
  private processedMessages = new Set<string>();
  private messageQueue: QueuedMessage[] = [];
  private reconnectAttempts = 0;
  private healthCheckInterval: number | undefined;

  // Security configuration
  private securityLevel: SecurityLevel = SecurityLevelEnum.MEDIUM;
  private injectIframes: boolean = true;

  // Constants
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly INITIAL_RECONNECT_DELAY = 1000;
  private readonly MESSAGE_TIMEOUT = 30000;
  private readonly HEALTH_CHECK_INTERVAL = 60000;

  constructor() {
    this.initialize();
    this.setupPageLifecycleHandlers();
    this.startHealthCheck();
  }

  // Initialize the content script connection with safe browser API
  private async initialize(): Promise<void> {
    // Prevent multiple simultaneous initialization attempts
    if (this.isInitializing || this.isConnected) {
      return;
    }

    this.isInitializing = true;

    try {
      // Check if extension context is valid
      if (!isExtensionContextValid()) {
        throw new Error('Extension context invalid - extension may have been reloaded');
      }

      log.debug('Initializing content script connection...', false);

      // Create a unified port for all communication using safe API
      this.port = browser.runtime.connect({ name: YAKKL_DAPP });

      if (!this.port) {
        throw new Error('Failed to create connection port - extension context may be invalid');
      }

      // Wrap it with PortDuplexStream for easier handling
      this.contentStream = new PortDuplexStream(this.port);

      // Set up all message handlers
      this.setupMessageHandlers();

      // Handle disconnection
      this.port.onDisconnect.addListener(() => {
        this.handleDisconnection();
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Process any queued messages
      this.processMessageQueue();

      log.debug('Content script connection initialized successfully', false);
    } catch (error) {
      log.warn('Failed to initialize content script:', false, error);
      this.scheduleReconnection();
    } finally {
      this.isInitializing = false;
    }
  }

  // Set up page lifecycle event handlers
  private setupPageLifecycleHandlers() {
    // Handle bfcache restoration
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        log.debug('Page restored from bfcache, checking connection...', false);
        this.handleBfcacheRestore();
      }
    });

    // Handle page hide (entering bfcache)
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) {
        log.debug('Page entering bfcache, preparing for suspension...', false);
        this.prepareForBfcache();
      }
    });

    // Handle page unload
    try {
      // Check if we're in a fenced frame
      // @ts-ignore
      if (!window.fencedFrameConfig) {
        window.addEventListener('beforeunload', () => {
          log.debug('Page unloading, cleaning up...', false);
          this.cleanup();
        });
      }
    } catch (e: any) {
      if (e.message.includes('fenced frames')) {
        log.warn('Skipping unload in fenced frame context');
        return;
      } else {
        log.warn(`Failed to add unload handler:`, e);
      }
    }
  }

  // Handle restoration from bfcache
  private async handleBfcacheRestore() {
    try {
      // Test if existing connection is still valid
      if (this.port && this.isConnected) {
        const isValid = await this.testConnection();
        if (isValid) {
          log.debug('Existing connection still valid after bfcache restore', false);
          return;
        }
      }

      // Connection is invalid, re-establish it
      log.debug('Connection invalid after bfcache restore, reconnecting...', false);
      this.isConnected = false;
      this.port = null;
      this.contentStream = null;

      // Reinitialize the connection
      await this.initialize();

      // Notify the inpage script that connection is restored
      this.notifyConnectionStateChange('restored');
    } catch (error) {
      log.warn('Failed to restore connection after bfcache:', false, error);
      this.scheduleReconnection();
    }
  }

  // Prepare for entering bfcache
  private prepareForBfcache() {
    // Store critical state if needed
    if (this.pendingRequests.size > 0) {
      const pendingData = Array.from(this.pendingRequests.entries());
      try {
        sessionStorage.setItem('yakkl-pending-requests', JSON.stringify(pendingData));
      } catch (e) {
        log.warn('Could not save pending requests to session storage', false, e);
      }
    }

    // Mark connection as potentially invalid
    this.isConnected = false;
  }

  // Set up message handlers
  private setupMessageHandlers() {
    // Handle messages from inpage script
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case 'YAKKL_TEST_REQUEST':
            // Respond to test messages from inpage script
            safeWindowPostMessage({
              type: 'YAKKL_TEST_RESPONSE',
              id: event.data.id
            }, 'test-response');
            break;

          case 'YAKKL_PING':
            // Respond to ping messages
            safeWindowPostMessage({
              type: 'YAKKL_PONG',
              id: event.data.id
            }, 'ping-response');
            break;

          default:
            this.handleInpageMessage(event);
        }
      }
    });

    // Set up stream data handler only once
    if (this.contentStream) {
      this.contentStream.on('data', (data: any) => {
        log.debug('ContentScriptManager: Received data from stream:', false, data);
        this.handleBackgroundMessage(data);
      });

      // Handle stream errors
      this.contentStream.on('error', (error: any) => {
        log.warn('Stream error:', false, error);
      });
    }

    // Handle runtime messages
    browser.runtime.onMessage.addListener((message: unknown, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): any => {
      this.handleRuntimeMessage(message, sender, sendResponse);
      return false;
    });
  }

  // Handle messages from the inpage script
  private handleInpageMessage(event: MessageEvent) {
    // Enhanced origin validation with null origin support
    const eventOrigin = event.origin;

    // Allow null origins for sandboxed contexts
    if (eventOrigin !== 'null' && !isValidOrigin(eventOrigin)) {
      log.debug('Invalid origin for webpage message', false, {
        origin: eventOrigin,
        currentOrigin: getCurrentOrigin(),
        isSandboxed: isSandboxedContext(),
        timestamp: new Date().toISOString()
      });
      return;
    }

    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }

    // Skip responses
    if (message.type === 'YAKKL_RESPONSE:EIP6963' || message.type === 'YAKKL_RESPONSE:EIP1193') {
      return;
    }

    // Handle requests
    if (message.type === 'YAKKL_REQUEST:EIP6963' || message.type === 'YAKKL_REQUEST:EIP1193') {
      log.debug('Received request from inpage:', false, {
        id: message.id,
        method: message.method,
        type: message.type,
        origin: eventOrigin,
        currentOrigin: getCurrentOrigin(),
        extensionContextValid: isExtensionContextValid(),
        timestamp: new Date().toISOString()
      });

      // Check extension context before processing
      if (!isExtensionContextValid()) {
        log.warn('Extension context invalid, cannot process request:', false, {
          id: message.id,
          method: message.method
        });
        this.sendErrorResponse(message.id, message.method, 'Extension context invalid');
        return;
      }

      // Queue or send immediately
      if (!this.isConnected) {
        this.queueMessage(message);
        this.scheduleReconnection();
      } else {
        this.forwardToBackground(message);
      }
    }
  }

  // Handle messages from the background script
  private handleBackgroundMessage(data: any) {
    try {
      // Log for debugging
      log.debug('Content script received message from background:', false, {
        type: data.type,
        id: data.id,
        method: data.method,
        timestamp: new Date().toISOString()
      });

      // Skip duplicate messages
      if (data.id && this.processedMessages.has(data.id)) {
        log.debug('Skipping duplicate message from background:', false, { id: data.id });
        return;
      }

      if (data.id) {
        this.processedMessages.add(data.id);

        // Cleanup old processed messages periodically
        if (this.processedMessages.size > 1000) {
          const oldestMessages = Array.from(this.processedMessages).slice(0, 100);
          oldestMessages.forEach(id => this.processedMessages.delete(id));
        }
      }

      // Handle different message types
      if (data.type === 'YAKKL_RESPONSE:EIP6963' || data.type === 'YAKKL_RESPONSE:EIP1193') {
        this.handleProviderResponse(data);
      } else if (data.type === 'YAKKL_EVENT:EIP6963' || data.type === 'YAKKL_EVENT:EIP1193') {
        this.handleProviderEvent(data);
      } else if (data.type === 'CONNECTION_TEST_RESPONSE') {
        // Connection test response handled by testConnection promise
        log.debug('Received connection test response', false, { id: data.id });
      } else {
        log.debug('Unknown message type from background:', false, data);
      }
    } catch (error) {
      log.warn('Error handling background message:', false, error);
    }
  }

  // Handle runtime messages (security updates, etc.)
  private handleRuntimeMessage(message: unknown, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): any {
    const typedMessage = message as any;

    // Handle security configuration updates
    if (typedMessage.type === 'YAKKL_SECURITY_CONFIG_UPDATE') {
      this.securityLevel = typedMessage.securityLevel;
      this.injectIframes = typedMessage.injectIframes;
      log.debug('Security configuration updated:', false, {
        securityLevel: this.securityLevel,
        injectIframes: this.injectIframes
      });
    }

    // Handle EIP-6963 events
    if (typedMessage.type === 'YAKKL_EVENT:EIP6963') {
      this.handleProviderEvent(typedMessage);
    }

    return false;
  }

  // Forward request to background
  private forwardToBackground(message: any) {
    if (!this.contentStream) {
      log.warn('No content stream available', false);
      this.sendErrorResponse(message.id, message.method, 'Not connected');
      return;
    }

    // Store as pending request
    this.pendingRequests.set(message.id, {
      id: message.id,
      message,
      timestamp: Date.now(),
      attempts: 1
    });

    // Add the origin to the message being forwarded
    const messageWithOrigin = {
      ...message,
      source: 'content',
      timestamp: Date.now(),
      // Include the window origin (handle null case)
      origin: window.location.origin === 'null' ? 'null' : window.location.origin
    };

    // Forward to background
    this.contentStream.write(messageWithOrigin);

    // Set timeout for pending request
    setTimeout(() => {
      if (this.pendingRequests.has(message.id)) {
        this.pendingRequests.delete(message.id);
        this.sendErrorResponse(message.id, message.method, 'Request timeout');
      }
    }, this.MESSAGE_TIMEOUT);
  }

  // Handle provider responses
  private handleProviderResponse(response: any) {
    // Remove from pending requests
    const pendingRequest = this.pendingRequests.get(response.id);
    this.pendingRequests.delete(response.id);

    // Format response
    const formattedResponse = {
      type: response.type || 'YAKKL_RESPONSE:EIP6963',
      id: response.id,
      jsonrpc: '2.0',
      method: response.method,
      ...(response.error ? { error: response.error } : { result: response.result })
    };

    log.debug('Forwarding response to inpage:', false, {
      id: formattedResponse.id,
      method: formattedResponse.method,
      hasError: !!response.error,
      timestamp: new Date().toISOString()
    });

    // Forward to inpage script with safe postMessage
    safeWindowPostMessage(formattedResponse, 'provider-response');
  }

  // Handle provider events
  private handleProviderEvent(event: any) {
    log.debug('Forwarding event to inpage:', false, event);

    // Use the safer postMessage method with null origin handling
    try {
      const targetOrigin = getTargetOrigin();

      // Try safePostMessage first (if it handles null origins properly)
      if (targetOrigin !== '*') {
        safePostMessage(event, targetOrigin, {
          context: 'content',
          allowRetries: true,
          retryKey: `event-${event.event}-${Date.now()}`
        });
      } else {
        // Fallback to our safe method for null origins
        safeWindowPostMessage(event, 'provider-event');
      }
    } catch (error) {
      log.warn('Failed to forward event, trying fallback:', false, error);
      safeWindowPostMessage(event, 'provider-event');
    }
  }

  // Queue messages when disconnected
  private queueMessage(message: any) {
    this.messageQueue.push({
      message,
      timestamp: Date.now(),
      retries: 0
    });

    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  // Process queued messages
  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const queued = this.messageQueue.shift()!;

      // Skip old messages
      if (Date.now() - queued.timestamp > this.MESSAGE_TIMEOUT) {
        continue;
      }

      this.forwardToBackground(queued.message);
    }
  }

  // Test connection validity
  private async testConnection(): Promise<boolean> {
    if (!this.contentStream) return false;

    try {
      const testId = `test-${Date.now()}`;

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 1000);

        // Send test message
        this.contentStream!.write({
          type: 'CONNECTION_TEST',
          id: testId
        });

        // Listen for response
        const testHandler = (data: any) => {
          if (data.type === 'CONNECTION_TEST_RESPONSE' && data.id === testId) {
            clearTimeout(timeout);
            this.contentStream?.removeListener('data', testHandler);
            resolve(true);
          }
        };

        this.contentStream!.on('data', testHandler);
      });
    } catch (error) {
      return false;
    }
  }

  // Handle disconnection
  private handleDisconnection() {
    log.debug('Port disconnected', false, {
      timestamp: new Date().toISOString()
    });

    this.isConnected = false;
    this.port = null;
    this.contentStream = null;

    // Notify inpage script
    this.notifyConnectionStateChange('lost');

    // Clear pending requests
    this.pendingRequests.forEach((request) => {
      this.sendErrorResponse(request.id, request.message.method, 'Connection lost');
    });
    this.pendingRequests.clear();

    // Don't immediately reconnect - wait for user action or bfcache
  }

  // Schedule reconnection with exponential backoff and context validation
  private scheduleReconnection() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      log.warn('Max reconnection attempts reached', false);
      return;
    }

    const delay = this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(async () => {
      // Check if extension context is still valid before attempting reconnection
      if (!isExtensionContextValid()) {
        log.warn('Extension context invalid during reconnection, skipping attempt', false);
        // Don't increment attempts for context issues - wait for context to be restored
        this.reconnectAttempts--;

        // Schedule another check after a longer delay
        setTimeout(() => {
          if (!this.isConnected) {
            this.scheduleReconnection();
          }
        }, 5000); // Check again in 5 seconds
        return;
      }

      if (!this.isConnected) {
        log.debug(`Reconnection attempt ${this.reconnectAttempts}`, false);
        await this.initialize();
      }
    }, delay);
  }

  // Start periodic health check with extension context validation
  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = window.setInterval(async () => {
      try {
        // First check if extension context is valid
        if (!isExtensionContextValid()) {
          log.warn('Extension context invalid during health check', false);

          // Mark as disconnected but don't try to reconnect immediately
          this.isConnected = false;

          // Schedule a context check for later
          setTimeout(() => {
            if (isExtensionContextValid() && !this.isConnected) {
              log.info('Extension context restored, attempting reconnection', false);
              this.reconnectAttempts = 0; // Reset attempts since this was a context issue
              this.initialize();
            }
          }, 2000);

          return;
        }

        if (!this.isConnected || !this.contentStream) {
          log.debug('Connection lost, attempting to restore...', false);
          this.reconnectAttempts = 0;
          await this.initialize();
        }
      } catch (error) {
        log.warn('Error in health check:', false, error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  // Notify inpage script of connection state changes
  private notifyConnectionStateChange(state: 'lost' | 'restored') {
    log.debug('Notifying inpage script of connection state change:', false, {
      state,
      currentOrigin: window.location.origin
    });

    safeWindowPostMessage({
      type: `YAKKL_CONNECTION_${state.toUpperCase()}`,
      timestamp: Date.now()
    }, 'connection-state');
  }

  // Send error response to inpage script
  private sendErrorResponse(id: string, method: string, message: string) {
    const errorResponse = {
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      method,
      error: {
        code: 4900,
        message
      }
    };

    // Try safePostMessage first, fallback to safe method
    try {
      const targetOrigin = getTargetOrigin();
      if (targetOrigin !== '*') {
        safePostMessage(errorResponse, targetOrigin, {
          context: 'content',
          allowRetries: true,
          retryKey: `error-${id}`
        });
      } else {
        safeWindowPostMessage(errorResponse, 'error-response');
      }
    } catch (error) {
      log.warn('Failed to send error response, using fallback:', false, error);
      safeWindowPostMessage(errorResponse, 'error-response');
    }
  }

  // Clean up resources
  private cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.port) {
      this.port.disconnect();
    }

    this.port = null;
    this.contentStream = null;
    this.isConnected = false;
    this.pendingRequests.clear();
    this.processedMessages.clear();
    this.messageQueue = [];
  }

  // Handle script injection into iframes
  public injectIntoFrames() {
    // Main page injection
    if (document.contentType === "text/html") {
      this.injectScript(window);
    }

    // Set up iframe observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLIFrameElement) {
            node.addEventListener('load', () => {
              try {
                const frame = node.contentWindow;
                if (frame && this.shouldInjectIntoFrame(frame)) {
                  this.injectScript(frame);
                }
              } catch (error) {
                log.debug('Error handling iframe:', false, error);
              }
            });
          }
        });
      });
    });

    // Observe DOM changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Clean up observer on page unload
    try {
      // @ts-ignore
      if (!window.fencedFrameConfig) {
        window.addEventListener('beforeunload', () => {
          observer.disconnect();
        });
      }
    } catch (e: any) {
      if (e.message.includes('fenced frames')) {
        log.warn('Skipping unload in fenced frame context');
      } else {
        log.warn(`Failed to add unload handler:`, e);
      }
    }
  }

  // Check if should inject into frame based on security settings
  private shouldInjectIntoFrame(frame: Window): boolean {
    try {
      if (!frame || !this.injectIframes) {
        return false;
      }

      // Check for null origin
      if (frame.location.origin === 'null') {
        // Allow injection into null origins for certain contexts (data URLs, etc.)
        log.debug('Frame has null origin, allowing injection based on security level', false);
        return this.securityLevel !== SecurityLevelEnum.HIGH;
      }

      // Check security level
      switch (this.securityLevel) {
        case SecurityLevelEnum.HIGH:
          return false;

        case SecurityLevelEnum.MEDIUM:
          const frameOrigin = frame.location.origin;
          const isTrustedDomain = WALLET_SECURITY_CONFIG.TRUSTED_DOMAINS.some(
            domain => frameOrigin.includes(domain)
          );
          return isTrustedDomain;

        case SecurityLevelEnum.STANDARD:
          return true;

        default:
          return true;
      }
    } catch (error) {
      log.debug('Error checking frame injection:', false, error);
      return false;
    }
  }

  // Inject script into a window
  private injectScript(targetWindow: Window) {
    try {
      const container = targetWindow.document.head || targetWindow.document.documentElement;
      const script = targetWindow.document.createElement("script");
      script.setAttribute("async", "false");
      script.src = browser.runtime.getURL("/ext/inpage.js");
      script.id = 'yakkl-provider';
      script.onload = () => {
        log.debug('Inpage script loaded', false, {
          origin: targetWindow.location.origin
        });
        script.remove();
      };
      container.prepend(script);
    } catch (error) {
      log.debug('Error injecting script:', false, error);
    }
  }
}

// Initialize content script with enhanced safety
function initializeContentScript() {
  try {
    log.debug('Content script starting...', false);

    // Initialize safe browser API first
    // initSafeBrowserAPI();

    // Check initial extension context
    if (!isExtensionContextValid()) {
      log.warn('Extension context invalid at startup, will retry when valid', false);

      // Set up a check to initialize when context becomes valid
      const contextCheckInterval = setInterval(() => {
        if (isExtensionContextValid()) {
          clearInterval(contextCheckInterval);
          log.info('Extension context restored, initializing content script', false);

          // Create the content script manager
          const contentManager = new ContentScriptManager();

          // Inject scripts into frames
          contentManager.injectIntoFrames();

          log.debug('Content script initialized after context restoration', false);
        }
      }, 1000);

      // Clear the interval after 30 seconds if context never becomes valid
      setTimeout(() => {
        clearInterval(contextCheckInterval);
      }, 30000);

      return;
    }

    // Create the content script manager
    const contentManager = new ContentScriptManager();

    // Inject scripts into frames
    contentManager.injectIntoFrames();

    log.debug('Content script initialized', false);
  } catch (error) {
    log.warn('Failed to initialize content script:', false, error);
  }
}

// Start the content script
initializeContentScript();















// // content.ts - Complete unified port implementation with null origin fix
// import { ensureProcessPolyfill } from '$lib/common/process';
// ensureProcessPolyfill();

// import { Duplex } from 'readable-stream';
// import { WALLET_SECURITY_CONFIG, YAKKL_DAPP } from '$lib/common/constants';
// import type { SecurityLevel } from '$lib/permissions/types';
// import { SecurityLevel as SecurityLevelEnum } from '$lib/permissions/types';
// import browser, { type Runtime } from 'webextension-polyfill';
// import { log } from '$lib/managers/Logger';
// import { isValidOrigin, getTargetOrigin, safePostMessage } from '$lib/common/origin';

// // Chrome types for compatibility
// declare namespace chrome {
//   export namespace runtime {
//     interface Port {
//       name: string;
//       onMessage: {
//         addListener: (callback: (message: any) => void) => void;
//       };
//       onDisconnect: {
//         addListener: (callback: () => void) => void;
//       };
//       postMessage: (message: any) => void;
//       disconnect: () => void;
//     }
//     function connect(connectInfo?: { name: string }): Port;
//   }
// }

// // Type definitions
// type RuntimePort = Runtime.Port;

// interface QueuedMessage {
//   message: any;
//   timestamp: number;
//   retries: number;
// }

// interface PendingRequest {
//   id: string;
//   message: any;
//   timestamp: number;
//   attempts: number;
// }

// // Helper function to get safe target origin
// function getSafeTargetOrigin(): string {
//   try {
//     const currentOrigin = window.location.origin;

//     // Handle null origin case
//     if (currentOrigin === 'null') {
//       log.debug('Window has null origin, using wildcard for postMessage', false);
//       return '*';
//     }

//     // Try to get target origin from the origin utility
//     const targetOrigin = getTargetOrigin();

//     // If target origin is null or doesn't match current, use wildcard
//     if (!targetOrigin || targetOrigin === 'null' || currentOrigin === 'null') {
//       return '*';
//     }

//     return targetOrigin;
//   } catch (error) {
//     log.debug('Error getting target origin, falling back to wildcard', false, error);
//     return '*';
//   }
// }

// // Safe postMessage wrapper with null origin handling
// function safeWindowPostMessage(message: any, context = 'content'): void {
//   try {
//     const targetOrigin = getSafeTargetOrigin();

//     log.debug(`${context}: Posting message with origin`, false, {
//       targetOrigin,
//       currentOrigin: window.location.origin,
//       messageType: message.type,
//       messageId: message.id
//     });

//     window.postMessage(message, targetOrigin);
//   } catch (error) {
//     log.warn(`Failed to post message in ${context}:`, false, {
//       error: error instanceof Error ? error.message : error,
//       message: message.type,
//       id: message.id,
//       currentOrigin: window.location.origin
//     });

//     // Fallback: try with wildcard if specific origin failed
//     if (error instanceof Error && error.message.includes('does not match')) {
//       try {
//         log.debug('Retrying with wildcard origin', false);
//         window.postMessage(message, '*');
//       } catch (fallbackError) {
//         log.warn('Fallback postMessage also failed:', false, fallbackError);
//       }
//     }
//   }
// }

// // PortDuplexStream class for bidirectional communication
// class PortDuplexStream extends Duplex {
//   private port: RuntimePort;
//   private isDestroyed = false;

//   constructor(port: RuntimePort) {
//     super({ objectMode: true });
//     this.port = port;

//     // Ensure the port forwards messages to this stream
//     this.port.onMessage.addListener((message: any) => {
//       this._onMessage(message);
//     });

//     // Handle disconnection
//     this.port.onDisconnect.addListener(() => {
//       this.destroy();
//     });
//   }

//   _read() {
//     // No-op - we push data when we receive it
//   }

//   _write(message: any, _encoding: string, callback: () => void) {
//     try {
//       log.debug('PortDuplexStream - content: Writing to port', false, message);
//       this.port.postMessage(message);
//       callback();
//     } catch (error) {
//       log.warn('Failed to write to port', false, error);
//       callback();
//     }
//   }

//   _onMessage(message: any) {
//     try {
//       log.debug('PortDuplexStream - content: Received message from background:', false, message);
//       // Push the message to the stream
//       this.push(message);
//     } catch (error) {
//       log.warn('Error in _onMessage', false, error);
//     }
//   }

//   _destroy(err: Error | null, callback: (error: Error | null) => void) {
//     try {
//       log.debug('PortDuplexStream - content: Destroying port', false);
//       this.isDestroyed = true;
//       this.port.disconnect();
//       callback(err);
//     } catch (error: unknown) {
//       log.warn('Error in _destroy', false, error);
//       if (error instanceof Error) {
//         callback(error);
//       } else {
//         callback(new Error('Failed to destroy port'));
//       }
//     }
//   }
// }

// // Main ContentScriptManager class
// class ContentScriptManager {
//   private port: RuntimePort | null = null;
//   private contentStream: PortDuplexStream | null = null;
//   private isConnected: boolean = false;
//   private isInitializing: boolean = false;
//   private pendingRequests = new Map<string, PendingRequest>();
//   private processedMessages = new Set<string>();
//   private messageQueue: QueuedMessage[] = [];
//   private reconnectAttempts = 0;
//   private healthCheckInterval: number | undefined;

//   // Security configuration
//   private securityLevel: SecurityLevel = SecurityLevelEnum.MEDIUM;
//   private injectIframes: boolean = true;

//   // Constants
//   private readonly MAX_RECONNECT_ATTEMPTS = 5;
//   private readonly INITIAL_RECONNECT_DELAY = 1000;
//   private readonly MESSAGE_TIMEOUT = 30000;
//   private readonly HEALTH_CHECK_INTERVAL = 60000;

//   constructor() {
//     this.initialize();
//     this.setupPageLifecycleHandlers();
//     this.startHealthCheck();
//   }

//   // Initialize the content script connection
//   private async initialize(): Promise<void> {
//     // Prevent multiple simultaneous initialization attempts
//     if (this.isInitializing || this.isConnected) {
//       return;
//     }

//     this.isInitializing = true;

//     try {
//       // Check if extension context is valid
//       if (!browser?.runtime?.id) {
//         throw new Error('Extension context invalid');
//       }

//       log.debug('Initializing content script connection...', false);

//       // Create a unified port for all communication
//       this.port = browser.runtime.connect({ name: YAKKL_DAPP });

//       // Wrap it with PortDuplexStream for easier handling
//       this.contentStream = new PortDuplexStream(this.port);

//       // Set up all message handlers
//       this.setupMessageHandlers();

//       // Handle disconnection
//       this.port.onDisconnect.addListener(() => {
//         this.handleDisconnection();
//       });

//       this.isConnected = true;
//       this.reconnectAttempts = 0;

//       // Process any queued messages
//       this.processMessageQueue();

//       log.debug('Content script connection initialized successfully', false);
//     } catch (error) {
//       log.warn('Failed to initialize content script:', false, error);
//       this.scheduleReconnection();
//     } finally {
//       this.isInitializing = false;
//     }
//   }

//   // Set up page lifecycle event handlers
//   private setupPageLifecycleHandlers() {
//     // Handle bfcache restoration
//     window.addEventListener('pageshow', (event) => {
//       if (event.persisted) {
//         log.debug('Page restored from bfcache, checking connection...', false);
//         this.handleBfcacheRestore();
//       }
//     });

//     // Handle page hide (entering bfcache)
//     window.addEventListener('pagehide', (event) => {
//       if (event.persisted) {
//         log.debug('Page entering bfcache, preparing for suspension...', false);
//         this.prepareForBfcache();
//       }
//     });

//     // Handle page unload
//     try {
//       // Check if we're in a fenced frame
//       // @ts-ignore
//       if (!window.fencedFrameConfig) {
//         window.addEventListener('beforeunload', () => {
//           log.debug('Page unloading, cleaning up...', false);
//           this.cleanup();
//         });
//       }
//     } catch (e: any) {
//       if (e.message.includes('fenced frames')) {
//         log.warn('Skipping unload in fenced frame context');
//         return;
//       } else {
//         log.warn(`Failed to add unload handler:`, e);
//       }
//     }
//   }

//   // Handle restoration from bfcache
//   private async handleBfcacheRestore() {
//     try {
//       // Test if existing connection is still valid
//       if (this.port && this.isConnected) {
//         const isValid = await this.testConnection();
//         if (isValid) {
//           log.debug('Existing connection still valid after bfcache restore', false);
//           return;
//         }
//       }

//       // Connection is invalid, re-establish it
//       log.debug('Connection invalid after bfcache restore, reconnecting...', false);
//       this.isConnected = false;
//       this.port = null;
//       this.contentStream = null;

//       // Reinitialize the connection
//       await this.initialize();

//       // Notify the inpage script that connection is restored
//       this.notifyConnectionStateChange('restored');
//     } catch (error) {
//       log.warn('Failed to restore connection after bfcache:', false, error);
//       this.scheduleReconnection();
//     }
//   }

//   // Prepare for entering bfcache
//   private prepareForBfcache() {
//     // Store critical state if needed
//     if (this.pendingRequests.size > 0) {
//       const pendingData = Array.from(this.pendingRequests.entries());
//       try {
//         sessionStorage.setItem('yakkl-pending-requests', JSON.stringify(pendingData));
//       } catch (e) {
//         log.warn('Could not save pending requests to session storage', false, e);
//       }
//     }

//     // Mark connection as potentially invalid
//     this.isConnected = false;
//   }

//   // Set up message handlers
//   private setupMessageHandlers() {
//     // Handle messages from inpage script
//     window.addEventListener('message', (event) => {
//       if (event.data && event.data.type) {
//         switch (event.data.type) {
//           case 'YAKKL_TEST_REQUEST':
//             // Respond to test messages from inpage script
//             safeWindowPostMessage({
//               type: 'YAKKL_TEST_RESPONSE',
//               id: event.data.id
//             }, 'test-response');
//             break;

//           case 'YAKKL_PING':
//             // Respond to ping messages
//             safeWindowPostMessage({
//               type: 'YAKKL_PONG',
//               id: event.data.id
//             }, 'ping-response');
//             break;

//           default:
//             this.handleInpageMessage(event);
//         }
//       }
//     });

//     // Set up stream data handler only once
//     if (this.contentStream) {
//       this.contentStream.on('data', (data: any) => {
//         log.debug('ContentScriptManager: Received data from stream:', false, data);
//         this.handleBackgroundMessage(data);
//       });

//       // Handle stream errors
//       this.contentStream.on('error', (error: any) => {
//         log.warn('Stream error:', false, error);
//       });
//     }

//     // Handle runtime messages
//     browser.runtime.onMessage.addListener((message: unknown, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): any => {
//       this.handleRuntimeMessage(message, sender, sendResponse);
//       return false;
//     });
//   }

//   // Handle messages from the inpage script
//   private handleInpageMessage(event: MessageEvent) {
//     // Validate origin - allow null origins in certain contexts
//     const eventOrigin = event.origin;
//     if (eventOrigin !== 'null' && !isValidOrigin(eventOrigin)) {
//       log.debug('Invalid origin for webpage message', false, {
//         origin: eventOrigin,
//         timestamp: new Date().toISOString()
//       });
//       return;
//     }

//     const message = event.data;
//     if (!message || typeof message !== 'object') {
//       return;
//     }

//     // Skip responses
//     if (message.type === 'YAKKL_RESPONSE:EIP6963' || message.type === 'YAKKL_RESPONSE:EIP1193') {
//       return;
//     }

//     // Handle requests
//     if (message.type === 'YAKKL_REQUEST:EIP6963' || message.type === 'YAKKL_REQUEST:EIP1193') {
//       log.debug('Received request from inpage:', false, {
//         id: message.id,
//         method: message.method,
//         type: message.type,
//         origin: eventOrigin,
//         timestamp: new Date().toISOString()
//       });

//       // Queue or send immediately
//       if (!this.isConnected) {
//         this.queueMessage(message);
//         this.scheduleReconnection();
//       } else {
//         this.forwardToBackground(message);
//       }
//     }
//   }

//   // Handle messages from the background script
//   private handleBackgroundMessage(data: any) {
//     try {
//       // Log for debugging
//       log.debug('Content script received message from background:', false, {
//         type: data.type,
//         id: data.id,
//         method: data.method,
//         timestamp: new Date().toISOString()
//       });

//       // Skip duplicate messages
//       if (data.id && this.processedMessages.has(data.id)) {
//         log.debug('Skipping duplicate message from background:', false, { id: data.id });
//         return;
//       }

//       if (data.id) {
//         this.processedMessages.add(data.id);

//         // Cleanup old processed messages periodically
//         if (this.processedMessages.size > 1000) {
//           const oldestMessages = Array.from(this.processedMessages).slice(0, 100);
//           oldestMessages.forEach(id => this.processedMessages.delete(id));
//         }
//       }

//       // Handle different message types
//       if (data.type === 'YAKKL_RESPONSE:EIP6963' || data.type === 'YAKKL_RESPONSE:EIP1193') {
//         this.handleProviderResponse(data);
//       } else if (data.type === 'YAKKL_EVENT:EIP6963' || data.type === 'YAKKL_EVENT:EIP1193') {
//         this.handleProviderEvent(data);
//       } else if (data.type === 'CONNECTION_TEST_RESPONSE') {
//         // Connection test response handled by testConnection promise
//         log.debug('Received connection test response', false, { id: data.id });
//       } else {
//         log.debug('Unknown message type from background:', false, data);
//       }
//     } catch (error) {
//       log.warn('Error handling background message:', false, error);
//     }
//   }

//   // Handle runtime messages (security updates, etc.)
//   private handleRuntimeMessage(message: unknown, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): any {
//     const typedMessage = message as any;

//     // Handle security configuration updates
//     if (typedMessage.type === 'YAKKL_SECURITY_CONFIG_UPDATE') {
//       this.securityLevel = typedMessage.securityLevel;
//       this.injectIframes = typedMessage.injectIframes;
//       log.debug('Security configuration updated:', false, {
//         securityLevel: this.securityLevel,
//         injectIframes: this.injectIframes
//       });
//     }

//     // Handle EIP-6963 events
//     if (typedMessage.type === 'YAKKL_EVENT:EIP6963') {
//       this.handleProviderEvent(typedMessage);
//     }

//     return false;
//   }

//   // Forward request to background
//   private forwardToBackground(message: any) {
//     if (!this.contentStream) {
//       log.warn('No content stream available', false);
//       this.sendErrorResponse(message.id, message.method, 'Not connected');
//       return;
//     }

//     // Store as pending request
//     this.pendingRequests.set(message.id, {
//       id: message.id,
//       message,
//       timestamp: Date.now(),
//       attempts: 1
//     });

//     // Add the origin to the message being forwarded
//     const messageWithOrigin = {
//       ...message,
//       source: 'content',
//       timestamp: Date.now(),
//       // Include the window origin (handle null case)
//       origin: window.location.origin === 'null' ? 'null' : window.location.origin
//     };

//     // Forward to background
//     this.contentStream.write(messageWithOrigin);

//     // Set timeout for pending request
//     setTimeout(() => {
//       if (this.pendingRequests.has(message.id)) {
//         this.pendingRequests.delete(message.id);
//         this.sendErrorResponse(message.id, message.method, 'Request timeout');
//       }
//     }, this.MESSAGE_TIMEOUT);
//   }

//   // Handle provider responses
//   private handleProviderResponse(response: any) {
//     // Remove from pending requests
//     const pendingRequest = this.pendingRequests.get(response.id);
//     this.pendingRequests.delete(response.id);

//     // Format response
//     const formattedResponse = {
//       type: response.type || 'YAKKL_RESPONSE:EIP6963',
//       id: response.id,
//       jsonrpc: '2.0',
//       method: response.method,
//       ...(response.error ? { error: response.error } : { result: response.result })
//     };

//     log.debug('Forwarding response to inpage:', false, {
//       id: formattedResponse.id,
//       method: formattedResponse.method,
//       hasError: !!response.error,
//       timestamp: new Date().toISOString()
//     });

//     // Forward to inpage script with safe postMessage
//     safeWindowPostMessage(formattedResponse, 'provider-response');
//   }

//   // Handle provider events
//   private handleProviderEvent(event: any) {
//     log.debug('Forwarding event to inpage:', false, event);

//     // Use the safer postMessage method with null origin handling
//     try {
//       const targetOrigin = getSafeTargetOrigin();

//       // Try safePostMessage first (if it handles null origins properly)
//       if (targetOrigin !== '*') {
//         safePostMessage(event, targetOrigin, {
//           context: 'content',
//           allowRetries: true,
//           retryKey: `event-${event.event}-${Date.now()}`
//         });
//       } else {
//         // Fallback to our safe method for null origins
//         safeWindowPostMessage(event, 'provider-event');
//       }
//     } catch (error) {
//       log.warn('Failed to forward event, trying fallback:', false, error);
//       safeWindowPostMessage(event, 'provider-event');
//     }
//   }

//   // Queue messages when disconnected
//   private queueMessage(message: any) {
//     this.messageQueue.push({
//       message,
//       timestamp: Date.now(),
//       retries: 0
//     });

//     // Limit queue size
//     if (this.messageQueue.length > 100) {
//       this.messageQueue.shift();
//     }
//   }

//   // Process queued messages
//   private processMessageQueue() {
//     while (this.messageQueue.length > 0 && this.isConnected) {
//       const queued = this.messageQueue.shift()!;

//       // Skip old messages
//       if (Date.now() - queued.timestamp > this.MESSAGE_TIMEOUT) {
//         continue;
//       }

//       this.forwardToBackground(queued.message);
//     }
//   }

//   // Test connection validity
//   private async testConnection(): Promise<boolean> {
//     if (!this.contentStream) return false;

//     try {
//       const testId = `test-${Date.now()}`;

//       return new Promise((resolve) => {
//         const timeout = setTimeout(() => {
//           resolve(false);
//         }, 1000);

//         // Send test message
//         this.contentStream!.write({
//           type: 'CONNECTION_TEST',
//           id: testId
//         });

//         // Listen for response
//         const testHandler = (data: any) => {
//           if (data.type === 'CONNECTION_TEST_RESPONSE' && data.id === testId) {
//             clearTimeout(timeout);
//             this.contentStream?.removeListener('data', testHandler);
//             resolve(true);
//           }
//         };

//         this.contentStream!.on('data', testHandler);
//       });
//     } catch (error) {
//       return false;
//     }
//   }

//   // Handle disconnection
//   private handleDisconnection() {
//     log.debug('Port disconnected', false, {
//       timestamp: new Date().toISOString()
//     });

//     this.isConnected = false;
//     this.port = null;
//     this.contentStream = null;

//     // Notify inpage script
//     this.notifyConnectionStateChange('lost');

//     // Clear pending requests
//     this.pendingRequests.forEach((request) => {
//       this.sendErrorResponse(request.id, request.message.method, 'Connection lost');
//     });
//     this.pendingRequests.clear();

//     // Don't immediately reconnect - wait for user action or bfcache
//   }

//   // Schedule reconnection with exponential backoff
//   private scheduleReconnection() {
//     if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
//       log.warn('Max reconnection attempts reached', false);
//       return;
//     }

//     const delay = this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
//     this.reconnectAttempts++;

//     setTimeout(async () => {
//       // Check if extension context is still valid
//       if (!browser?.runtime?.id) {
//         log.warn('Extension context invalid, skipping reconnection', false);
//         return;
//       }

//       if (!this.isConnected) {
//         log.debug(`Reconnection attempt ${this.reconnectAttempts}`, false);
//         await this.initialize();
//       }
//     }, delay);
//   }

//   // Start periodic health check
//   private startHealthCheck() {
//     if (this.healthCheckInterval) {
//       clearInterval(this.healthCheckInterval);
//     }

//     this.healthCheckInterval = window.setInterval(async () => {
//       try {
//         if (!browser?.runtime?.id) {
//           log.warn('Extension context invalid during health check', false);
//           return;
//         }

//         if (!this.isConnected || !this.contentStream) {
//           log.debug('Connection lost, attempting to restore...', false);
//           this.reconnectAttempts = 0;
//           await this.initialize();
//         }
//       } catch (error) {
//         log.warn('Error in health check:', false, error);
//       }
//     }, this.HEALTH_CHECK_INTERVAL);
//   }

//   // Notify inpage script of connection state changes
//   private notifyConnectionStateChange(state: 'lost' | 'restored') {
//     log.debug('Notifying inpage script of connection state change:', false, {
//       state,
//       currentOrigin: window.location.origin
//     });

//     safeWindowPostMessage({
//       type: `YAKKL_CONNECTION_${state.toUpperCase()}`,
//       timestamp: Date.now()
//     }, 'connection-state');
//   }

//   // Send error response to inpage script
//   private sendErrorResponse(id: string, method: string, message: string) {
//     const errorResponse = {
//       type: 'YAKKL_RESPONSE:EIP6963',
//       id,
//       method,
//       error: {
//         code: 4900,
//         message
//       }
//     };

//     // Try safePostMessage first, fallback to safe method
//     try {
//       const targetOrigin = getSafeTargetOrigin();
//       if (targetOrigin !== '*') {
//         safePostMessage(errorResponse, targetOrigin, {
//           context: 'content',
//           allowRetries: true,
//           retryKey: `error-${id}`
//         });
//       } else {
//         safeWindowPostMessage(errorResponse, 'error-response');
//       }
//     } catch (error) {
//       log.warn('Failed to send error response, using fallback:', false, error);
//       safeWindowPostMessage(errorResponse, 'error-response');
//     }
//   }

//   // Clean up resources
//   private cleanup() {
//     if (this.healthCheckInterval) {
//       clearInterval(this.healthCheckInterval);
//     }

//     if (this.port) {
//       this.port.disconnect();
//     }

//     this.port = null;
//     this.contentStream = null;
//     this.isConnected = false;
//     this.pendingRequests.clear();
//     this.processedMessages.clear();
//     this.messageQueue = [];
//   }

//   // Handle script injection into iframes
//   public injectIntoFrames() {
//     // Main page injection
//     if (document.contentType === "text/html") {
//       this.injectScript(window);
//     }

//     // Set up iframe observer
//     const observer = new MutationObserver((mutations) => {
//       mutations.forEach((mutation) => {
//         mutation.addedNodes.forEach((node) => {
//           if (node instanceof HTMLIFrameElement) {
//             node.addEventListener('load', () => {
//               try {
//                 const frame = node.contentWindow;
//                 if (frame && this.shouldInjectIntoFrame(frame)) {
//                   this.injectScript(frame);
//                 }
//               } catch (error) {
//                 log.debug('Error handling iframe:', false, error);
//               }
//             });
//           }
//         });
//       });
//     });

//     // Observe DOM changes
//     observer.observe(document.documentElement, {
//       childList: true,
//       subtree: true
//     });

//     // Clean up observer on page unload
//     try {
//       // @ts-ignore
//       if (!window.fencedFrameConfig) {
//         window.addEventListener('beforeunload', () => {
//           observer.disconnect();
//         });
//       }
//     } catch (e: any) {
//       if (e.message.includes('fenced frames')) {
//         log.warn('Skipping unload in fenced frame context');
//       } else {
//         log.warn(`Failed to add unload handler:`, e);
//       }
//     }
//   }

//   // Check if should inject into frame based on security settings
//   private shouldInjectIntoFrame(frame: Window): boolean {
//     try {
//       if (!frame || !this.injectIframes) {
//         return false;
//       }

//       // Check for null origin
//       if (frame.location.origin === 'null') {
//         // Allow injection into null origins for certain contexts (data URLs, etc.)
//         log.debug('Frame has null origin, allowing injection based on security level', false);
//         return this.securityLevel !== SecurityLevelEnum.HIGH;
//       }

//       // Check security level
//       switch (this.securityLevel) {
//         case SecurityLevelEnum.HIGH:
//           return false;

//         case SecurityLevelEnum.MEDIUM:
//           const frameOrigin = frame.location.origin;
//           const isTrustedDomain = WALLET_SECURITY_CONFIG.TRUSTED_DOMAINS.some(
//             domain => frameOrigin.includes(domain)
//           );
//           return isTrustedDomain;

//         case SecurityLevelEnum.STANDARD:
//           return true;

//         default:
//           return true;
//       }
//     } catch (error) {
//       log.debug('Error checking frame injection:', false, error);
//       return false;
//     }
//   }

//   // Inject script into a window
//   private injectScript(targetWindow: Window) {
//     try {
//       const container = targetWindow.document.head || targetWindow.document.documentElement;
//       const script = targetWindow.document.createElement("script");
//       script.setAttribute("async", "false");
//       script.src = browser.runtime.getURL("/ext/inpage.js");
//       script.id = 'yakkl-provider';
//       script.onload = () => {
//         log.debug('Inpage script loaded', false, {
//           origin: targetWindow.location.origin
//         });
//         script.remove();
//       };
//       container.prepend(script);
//     } catch (error) {
//       log.debug('Error injecting script:', false, error);
//     }
//   }
// }

// // Initialize content script
// function initializeContentScript() {
//   try {
//     log.debug('Content script starting...', false);

//     // Create the content script manager
//     const contentManager = new ContentScriptManager();

//     // Inject scripts into frames
//     contentManager.injectIntoFrames();

//     log.debug('Content script initialized', false);
//   } catch (error) {
//     log.warn('Failed to initialize content script:', false, error);
//   }
// }

// // Start the content script
// initializeContentScript();












// // content.ts - Complete unified port implementation
// import { ensureProcessPolyfill } from '$lib/common/process';
// ensureProcessPolyfill();

// import { Duplex } from 'readable-stream';
// import { WALLET_SECURITY_CONFIG, YAKKL_DAPP } from '$lib/common/constants';
// import type { SecurityLevel } from '$lib/permissions/types';
// import { SecurityLevel as SecurityLevelEnum } from '$lib/permissions/types';
// import browser, { type Runtime } from 'webextension-polyfill';
// import { log } from '$lib/managers/Logger';
// import { isValidOrigin, getTargetOrigin, safePostMessage } from '$lib/common/origin';

// // Chrome types for compatibility
// declare namespace chrome {
//   export namespace runtime {
//     interface Port {
//       name: string;
//       onMessage: {
//         addListener: (callback: (message: any) => void) => void;
//       };
//       onDisconnect: {
//         addListener: (callback: () => void) => void;
//       };
//       postMessage: (message: any) => void;
//       disconnect: () => void;
//     }
//     function connect(connectInfo?: { name: string }): Port;
//   }
// }

// // Type definitions
// type RuntimePort = Runtime.Port;

// interface QueuedMessage {
//   message: any;
//   timestamp: number;
//   retries: number;
// }

// interface PendingRequest {
//   id: string;
//   message: any;
//   timestamp: number;
//   attempts: number;
// }

// // PortDuplexStream class for bidirectional communication
// class PortDuplexStream extends Duplex {
//   private port: RuntimePort;
//   private isDestroyed = false;

//   constructor(port: RuntimePort) {
//     super({ objectMode: true });
//     this.port = port;

//     // Ensure the port forwards messages to this stream
//     this.port.onMessage.addListener((message: any) => {
//       this._onMessage(message);
//     });

//     // Handle disconnection
//     this.port.onDisconnect.addListener(() => {
//       this.destroy();
//     });
//   }

//   _read() {
//     // No-op - we push data when we receive it
//   }

//   _write(message: any, _encoding: string, callback: () => void) {
//     try {
//       log.debug('PortDuplexStream - content: Writing to port', false, message);
//       this.port.postMessage(message);
//       callback();
//     } catch (error) {
//       log.warn('Failed to write to port', false, error);
//       callback();
//     }
//   }

//   _onMessage(message: any) {
//     try {
//       log.debug('PortDuplexStream - content: Received message from background:', false, message);
//       // Push the message to the stream
//       this.push(message);
//     } catch (error) {
//       log.warn('Error in _onMessage', false, error);
//     }
//   }

//   _destroy(err: Error | null, callback: (error: Error | null) => void) {
//     try {
//       log.debug('PortDuplexStream - content: Destroying port', false);
//       this.isDestroyed = true;
//       this.port.disconnect();
//       callback(err);
//     } catch (error: unknown) {
//       log.warn('Error in _destroy', false, error);
//       if (error instanceof Error) {
//         callback(error);
//       } else {
//         callback(new Error('Failed to destroy port'));
//       }
//     }
//   }
// }

// // Main ContentScriptManager class
// class ContentScriptManager {
//   private port: RuntimePort | null = null;
//   private contentStream: PortDuplexStream | null = null;
//   private isConnected: boolean = false;
//   private isInitializing: boolean = false;
//   private pendingRequests = new Map<string, PendingRequest>();
//   private processedMessages = new Set<string>();
//   private messageQueue: QueuedMessage[] = [];
//   private reconnectAttempts = 0;
//   private healthCheckInterval: number | undefined;

//   // Security configuration
//   private securityLevel: SecurityLevel = SecurityLevelEnum.MEDIUM;
//   private injectIframes: boolean = true;

//   // Constants
//   private readonly MAX_RECONNECT_ATTEMPTS = 5;
//   private readonly INITIAL_RECONNECT_DELAY = 1000;
//   private readonly MESSAGE_TIMEOUT = 30000;
//   private readonly HEALTH_CHECK_INTERVAL = 60000;

//   constructor() {
//     this.initialize();
//     this.setupPageLifecycleHandlers();
//     this.startHealthCheck();
//   }

//   // Initialize the content script connection
//   private async initialize(): Promise<void> {
//     // Prevent multiple simultaneous initialization attempts
//     if (this.isInitializing || this.isConnected) {
//       return;
//     }

//     this.isInitializing = true;

//     try {
//       // Check if extension context is valid
//       if (!browser?.runtime?.id) {
//         throw new Error('Extension context invalid');
//       }

//       log.debug('Initializing content script connection...', false);

//       // Create a unified port for all communication
//       this.port = browser.runtime.connect({ name: YAKKL_DAPP });

//       // Wrap it with PortDuplexStream for easier handling
//       this.contentStream = new PortDuplexStream(this.port);

//       // Set up all message handlers
//       this.setupMessageHandlers();

//       // Handle disconnection
//       this.port.onDisconnect.addListener(() => {
//         this.handleDisconnection();
//       });

//       this.isConnected = true;
//       this.reconnectAttempts = 0;

//       // Process any queued messages
//       this.processMessageQueue();

//       log.debug('Content script connection initialized successfully', false);
//     } catch (error) {
//       log.warn('Failed to initialize content script:', false, error);
//       this.scheduleReconnection();
//     } finally {
//       this.isInitializing = false;
//     }
//   }

//   // Set up page lifecycle event handlers
//   private setupPageLifecycleHandlers() {
//     // Handle bfcache restoration
//     window.addEventListener('pageshow', (event) => {
//       if (event.persisted) {
//         log.debug('Page restored from bfcache, checking connection...', false);
//         this.handleBfcacheRestore();
//       }
//     });

//     // Handle page hide (entering bfcache)
//     window.addEventListener('pagehide', (event) => {
//       if (event.persisted) {
//         log.debug('Page entering bfcache, preparing for suspension...', false);
//         this.prepareForBfcache();
//       }
//     });

//     // Handle page unload
//     try {
//       // Check if we're in a fenced frame
//       // @ts-ignore
//       if (!window.fencedFrameConfig) {
//         window.addEventListener('beforeunload', () => {
//           log.debug('Page unloading, cleaning up...', false);
//           this.cleanup();
//         });
//       }
//     } catch (e: any) {
//       if (e.message.includes('fenced frames')) {
//         log.warn('Skipping unload in fenced frame context');
//         return;
//       } else {
//         log.warn(`Failed to add unload handler:`, e);
//       }
//     }
//   }

//   // Handle restoration from bfcache
//   private async handleBfcacheRestore() {
//     try {
//       // Test if existing connection is still valid
//       if (this.port && this.isConnected) {
//         const isValid = await this.testConnection();
//         if (isValid) {
//           log.debug('Existing connection still valid after bfcache restore', false);
//           return;
//         }
//       }

//       // Connection is invalid, re-establish it
//       log.debug('Connection invalid after bfcache restore, reconnecting...', false);
//       this.isConnected = false;
//       this.port = null;
//       this.contentStream = null;

//       // Reinitialize the connection
//       await this.initialize();

//       // Notify the inpage script that connection is restored
//       this.notifyConnectionStateChange('restored');
//     } catch (error) {
//       log.warn('Failed to restore connection after bfcache:', false, error);
//       this.scheduleReconnection();
//     }
//   }

//   // Prepare for entering bfcache
//   private prepareForBfcache() {
//     // Store critical state if needed
//     if (this.pendingRequests.size > 0) {
//       const pendingData = Array.from(this.pendingRequests.entries());
//       try {
//         sessionStorage.setItem('yakkl-pending-requests', JSON.stringify(pendingData));
//       } catch (e) {
//         log.warn('Could not save pending requests to session storage', false, e);
//       }
//     }

//     // Mark connection as potentially invalid
//     this.isConnected = false;
//   }

//   // Set up message handlers
//   private setupMessageHandlers() {
//     // Handle messages from inpage script
//     window.addEventListener('message', (event) => {
//       if (event.data && event.data.type) {
//         switch (event.data.type) {
//           case 'YAKKL_TEST_REQUEST':
//             // Respond to test messages from inpage script
//             window.postMessage({
//               type: 'YAKKL_TEST_RESPONSE',
//               id: event.data.id
//             }, '*');
//             break;

//           case 'YAKKL_PING':
//             // Respond to ping messages
//             window.postMessage({
//               type: 'YAKKL_PONG',
//               id: event.data.id
//             }, '*');
//             break;

//           default:
//             this.handleInpageMessage(event);
//         }
//       }
//     });

//     // Set up stream data handler only once
//     if (this.contentStream) {
//       this.contentStream.on('data', (data: any) => {
//         log.debug('ContentScriptManager: Received data from stream:', false, data);
//         this.handleBackgroundMessage(data);
//       });

//       // Handle stream errors
//       this.contentStream.on('error', (error: any) => {
//         log.warn('Stream error:', false, error);
//       });
//     }

//     // Handle runtime messages
//     browser.runtime.onMessage.addListener((message: unknown, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): any => {
//       this.handleRuntimeMessage(message, sender, sendResponse);
//       return false;
//     });
//   }

//   // Handle messages from the inpage script
//   private handleInpageMessage(event: MessageEvent) {
//     // Validate origin
//     if (!isValidOrigin(event.origin)) {
//       log.debug('Invalid origin for webpage message', false, {
//         origin: event.origin,
//         timestamp: new Date().toISOString()
//       });
//       return;
//     }

//     const message = event.data;
//     if (!message || typeof message !== 'object') {
//       return;
//     }

//     // Skip responses
//     if (message.type === 'YAKKL_RESPONSE:EIP6963' || message.type === 'YAKKL_RESPONSE:EIP1193') {
//       return;
//     }

//     // Handle requests
//     if (message.type === 'YAKKL_REQUEST:EIP6963' || message.type === 'YAKKL_REQUEST:EIP1193') {
//       log.debug('Received request from inpage:', false, {
//         id: message.id,
//         method: message.method,
//         type: message.type,
//         timestamp: new Date().toISOString()
//       });

//       // Queue or send immediately
//       if (!this.isConnected) {
//         this.queueMessage(message);
//         this.scheduleReconnection();
//       } else {
//         this.forwardToBackground(message);
//       }
//     }
//   }

//   // Handle messages from the background script
//   private handleBackgroundMessage(data: any) {
//     try {
//       // Log for debugging
//       log.debug('Content script received message from background:', false, {
//         type: data.type,
//         id: data.id,
//         method: data.method,
//         timestamp: new Date().toISOString()
//       });

//       // Skip duplicate messages
//       if (data.id && this.processedMessages.has(data.id)) {
//         log.debug('Skipping duplicate message from background:', false, { id: data.id });
//         return;
//       }

//       if (data.id) {
//         this.processedMessages.add(data.id);

//         // Cleanup old processed messages periodically
//         if (this.processedMessages.size > 1000) {
//           const oldestMessages = Array.from(this.processedMessages).slice(0, 100);
//           oldestMessages.forEach(id => this.processedMessages.delete(id));
//         }
//       }

//       // Handle different message types
//       if (data.type === 'YAKKL_RESPONSE:EIP6963' || data.type === 'YAKKL_RESPONSE:EIP1193') {
//         this.handleProviderResponse(data);
//       } else if (data.type === 'YAKKL_EVENT:EIP6963' || data.type === 'YAKKL_EVENT:EIP1193') {
//         this.handleProviderEvent(data);
//       } else if (data.type === 'CONNECTION_TEST_RESPONSE') {
//         // Connection test response handled by testConnection promise
//         log.debug('Received connection test response', false, { id: data.id });
//       } else {
//         log.debug('Unknown message type from background:', false, data);
//       }
//     } catch (error) {
//       log.warn('Error handling background message:', false, error);
//     }
//   }

//   // Handle runtime messages (security updates, etc.)
//   private handleRuntimeMessage(message: unknown, sender: Runtime.MessageSender, sendResponse: (response?: any) => void): any {
//     const typedMessage = message as any;

//     // Handle security configuration updates
//     if (typedMessage.type === 'YAKKL_SECURITY_CONFIG_UPDATE') {
//       this.securityLevel = typedMessage.securityLevel;
//       this.injectIframes = typedMessage.injectIframes;
//       log.debug('Security configuration updated:', false, {
//         securityLevel: this.securityLevel,
//         injectIframes: this.injectIframes
//       });
//     }

//     // Handle EIP-6963 events
//     if (typedMessage.type === 'YAKKL_EVENT:EIP6963') {
//       this.handleProviderEvent(typedMessage);
//     }

//     return false;
//   }

//   // Forward request to background
//   private forwardToBackground(message: any) {
//     if (!this.contentStream) {
//       log.warn('No content stream available', false);
//       this.sendErrorResponse(message.id, message.method, 'Not connected');
//       return;
//     }

//     // Store as pending request
//     this.pendingRequests.set(message.id, {
//       id: message.id,
//       message,
//       timestamp: Date.now(),
//       attempts: 1
//     });

//     // Add the origin to the message being forwarded
//     const messageWithOrigin = {
//       ...message,
//       source: 'content',
//       timestamp: Date.now(),
//       // Include the window origin
//       origin: window.location.origin
//     };

//     // Forward to background
//     this.contentStream.write(messageWithOrigin);

//     // Set timeout for pending request
//     setTimeout(() => {
//       if (this.pendingRequests.has(message.id)) {
//         this.pendingRequests.delete(message.id);
//         this.sendErrorResponse(message.id, message.method, 'Request timeout');
//       }
//     }, this.MESSAGE_TIMEOUT);
//   }

//   // Handle provider responses
//   private handleProviderResponse(response: any) {
//     // Remove from pending requests
//     const pendingRequest = this.pendingRequests.get(response.id);
//     this.pendingRequests.delete(response.id);

//     // Format response
//     const formattedResponse = {
//       type: response.type || 'YAKKL_RESPONSE:EIP6963',
//       id: response.id,
//       jsonrpc: '2.0',
//       method: response.method,
//       ...(response.error ? { error: response.error } : { result: response.result })
//     };

//     log.debug('Forwarding response to inpage:', false, {
//       id: formattedResponse.id,
//       method: formattedResponse.method,
//       hasError: !!response.error,
//       timestamp: new Date().toISOString()
//     });

//     // Forward to inpage script with retries
//     const maxRetries = 3;
//     let retries = 0;

//     const sendResponse = () => {
//       try {
//         window.postMessage(formattedResponse, getTargetOrigin());
//         log.debug('Successfully sent response to inpage', false, { id: formattedResponse.id });
//       } catch (error) {
//         if (retries < maxRetries) {
//           retries++;
//           log.warn(`Retry ${retries} sending response to inpage`, false, { id: formattedResponse.id });
//           setTimeout(sendResponse, 100 * retries);
//         } else {
//           log.warn('Failed to send response to inpage after retries', false, {
//             id: formattedResponse.id,
//             error
//           });
//         }
//       }
//     };

//     sendResponse();
//   }

//   // Handle provider events
//   private handleProviderEvent(event: any) {
//     log.debug('Forwarding event to inpage:', false, event);

//     // Forward to inpage script
//     safePostMessage(event, getTargetOrigin(), {
//       context: 'content',
//       allowRetries: true,
//       retryKey: `event-${event.event}-${Date.now()}`
//     });
//   }

//   // Queue messages when disconnected
//   private queueMessage(message: any) {
//     this.messageQueue.push({
//       message,
//       timestamp: Date.now(),
//       retries: 0
//     });

//     // Limit queue size
//     if (this.messageQueue.length > 100) {
//       this.messageQueue.shift();
//     }
//   }

//   // Process queued messages
//   private processMessageQueue() {
//     while (this.messageQueue.length > 0 && this.isConnected) {
//       const queued = this.messageQueue.shift()!;

//       // Skip old messages
//       if (Date.now() - queued.timestamp > this.MESSAGE_TIMEOUT) {
//         continue;
//       }

//       this.forwardToBackground(queued.message);
//     }
//   }

//   // Test connection validity
//   private async testConnection(): Promise<boolean> {
//     if (!this.contentStream) return false;

//     try {
//       const testId = `test-${Date.now()}`;

//       return new Promise((resolve) => {
//         const timeout = setTimeout(() => {
//           resolve(false);
//         }, 1000);

//         // Send test message
//         this.contentStream!.write({
//           type: 'CONNECTION_TEST',
//           id: testId
//         });

//         // Listen for response
//         const testHandler = (data: any) => {
//           if (data.type === 'CONNECTION_TEST_RESPONSE' && data.id === testId) {
//             clearTimeout(timeout);
//             this.contentStream?.removeListener('data', testHandler);
//             resolve(true);
//           }
//         };

//         this.contentStream!.on('data', testHandler);
//       });
//     } catch (error) {
//       return false;
//     }
//   }

//   // Handle disconnection
//   private handleDisconnection() {
//     log.debug('Port disconnected', false, {
//       timestamp: new Date().toISOString()
//     });

//     this.isConnected = false;
//     this.port = null;
//     this.contentStream = null;

//     // Notify inpage script
//     this.notifyConnectionStateChange('lost');

//     // Clear pending requests
//     this.pendingRequests.forEach((request) => {
//       this.sendErrorResponse(request.id, request.message.method, 'Connection lost');
//     });
//     this.pendingRequests.clear();

//     // Don't immediately reconnect - wait for user action or bfcache
//   }

//   // Schedule reconnection with exponential backoff
//   private scheduleReconnection() {
//     if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
//       log.warn('Max reconnection attempts reached', false);
//       return;
//     }

//     const delay = this.INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
//     this.reconnectAttempts++;

//     setTimeout(async () => {
//       // Check if extension context is still valid
//       if (!browser?.runtime?.id) {
//         log.warn('Extension context invalid, skipping reconnection', false);
//         return;
//       }

//       if (!this.isConnected) {
//         log.debug(`Reconnection attempt ${this.reconnectAttempts}`, false);
//         await this.initialize();
//       }
//     }, delay);
//   }

//   // Start periodic health check
//   private startHealthCheck() {
//     if (this.healthCheckInterval) {
//       clearInterval(this.healthCheckInterval);
//     }

//     this.healthCheckInterval = window.setInterval(async () => {
//       try {
//         if (!browser?.runtime?.id) {
//           log.warn('Extension context invalid during health check', false);
//           return;
//         }

//         if (!this.isConnected || !this.contentStream) {
//           log.debug('Connection lost, attempting to restore...', false);
//           this.reconnectAttempts = 0;
//           await this.initialize();
//         }
//       } catch (error) {
//         log.warn('Error in health check:', false, error);
//       }
//     }, this.HEALTH_CHECK_INTERVAL);
//   }

//   // Notify inpage script of connection state changes
//   private notifyConnectionStateChange(state: 'lost' | 'restored') {
//     const origin = getTargetOrigin();
//     log.debug('Notifying inpage script of connection state change:', false, {
//       state,
//       origin
//     });
//     if (!origin) {
//       log.warn('No origin to notify', false);
//       return;
//     }
//     window.postMessage({
//       type: `YAKKL_CONNECTION_${state.toUpperCase()}`,
//       timestamp: Date.now()
//     }, origin);
//   }

//   // Send error response to inpage script
//   private sendErrorResponse(id: string, method: string, message: string) {
//     safePostMessage({
//       type: 'YAKKL_RESPONSE:EIP6963',
//       id,
//       method,
//       error: {
//         code: 4900,
//         message
//       }
//     }, getTargetOrigin(), {
//       context: 'content',
//       allowRetries: true,
//       retryKey: `error-${id}`
//     });
//   }

//   // Clean up resources
//   private cleanup() {
//     if (this.healthCheckInterval) {
//       clearInterval(this.healthCheckInterval);
//     }

//     if (this.port) {
//       this.port.disconnect();
//     }

//     this.port = null;
//     this.contentStream = null;
//     this.isConnected = false;
//     this.pendingRequests.clear();
//     this.processedMessages.clear();
//     this.messageQueue = [];
//   }

//   // Handle script injection into iframes
//   public injectIntoFrames() {
//     // Main page injection
//     if (document.contentType === "text/html") {
//       this.injectScript(window);
//     }

//     // Set up iframe observer
//     const observer = new MutationObserver((mutations) => {
//       mutations.forEach((mutation) => {
//         mutation.addedNodes.forEach((node) => {
//           if (node instanceof HTMLIFrameElement) {
//             node.addEventListener('load', () => {
//               try {
//                 const frame = node.contentWindow;
//                 if (frame && this.shouldInjectIntoFrame(frame)) {
//                   this.injectScript(frame);
//                 }
//               } catch (error) {
//                 log.debug('Error handling iframe:', false, error);
//               }
//             });
//           }
//         });
//       });
//     });

//     // Observe DOM changes
//     observer.observe(document.documentElement, {
//       childList: true,
//       subtree: true
//     });

//     // Clean up observer on page unload
//     try {
//       // @ts-ignore
//       if (!window.fencedFrameConfig) {
//         window.addEventListener('beforeunload', () => {
//           observer.disconnect();
//         });
//       }
//     } catch (e: any) {
//       if (e.message.includes('fenced frames')) {
//         log.warn('Skipping unload in fenced frame context');
//       } else {
//         log.warn(`Failed to add unload handler:`, e);
//       }
//     }
//   }

//   // Check if should inject into frame based on security settings
//   private shouldInjectIntoFrame(frame: Window): boolean {
//     try {
//       if (!frame || !this.injectIframes) {
//         return false;
//       }

//       // Check for null origin
//       if (frame.location.origin === 'null') {
//         return false;
//       }

//       // Check security level
//       switch (this.securityLevel) {
//         case SecurityLevelEnum.HIGH:
//           return false;

//         case SecurityLevelEnum.MEDIUM:
//           const frameOrigin = frame.location.origin;
//           const isTrustedDomain = WALLET_SECURITY_CONFIG.TRUSTED_DOMAINS.some(
//             domain => frameOrigin.includes(domain)
//           );
//           return isTrustedDomain;

//         case SecurityLevelEnum.STANDARD:
//           return true;

//         default:
//           return true;
//       }
//     } catch (error) {
//       log.debug('Error checking frame injection:', false, error);
//       return false;
//     }
//   }

//   // Inject script into a window
//   private injectScript(targetWindow: Window) {
//     try {
//       const container = targetWindow.document.head || targetWindow.document.documentElement;
//       const script = targetWindow.document.createElement("script");
//       script.setAttribute("async", "false");
//       script.src = browser.runtime.getURL("/ext/inpage.js");
//       script.id = 'yakkl-provider';
//       script.onload = () => {
//         log.debug('Inpage script loaded', false, {
//           origin: targetWindow.location.origin
//         });
//         script.remove();
//       };
//       container.prepend(script);
//     } catch (error) {
//       log.debug('Error injecting script:', false, error);
//     }
//   }
// }

// // Initialize content script
// function initializeContentScript() {
//   try {
//     log.debug('Content script starting...', false);

//     // Create the content script manager
//     const contentManager = new ContentScriptManager();

//     // Inject scripts into frames
//     contentManager.injectIntoFrames();

//     log.debug('Content script initialized', false);
//   } catch (error) {
//     log.warn('Failed to initialize content script:', false, error);
//   }
// }

// // Start the content script
// initializeContentScript();

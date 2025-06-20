// src/lib/common/messaging.ts
import { browser as isBrowser } from '$app/environment';
import { log } from '$lib/common/logger-wrapper';
import type { Browser, Runtime } from 'webextension-polyfill';
import { protectedContexts } from './globals';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';

// Helper function to check if context needs idle protection
function contextNeedsIdleProtection(contextType: string): boolean {
  return protectedContexts.includes(contextType);
}

/**
 * A utility for reliable and efficient communication with the extension's background script
 */
class ExtensionMessaging {
  private static instance: ExtensionMessaging;
  private messageQueue: Map<string, any[]> = new Map();
  private processedResponses = new Map<string, { timestamp: number, result: any }>();
  private isProcessing: boolean = false;
  private retryCount: Map<string, number> = new Map();
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 500; // ms
  private browserApi: Browser | null = null;
  private contextId: string = '';
  private pendingRequests = new Map<string, {
    resolve: (result: any) => void,
    reject: (error: any) => void,
    timestamp: number
  }>();
  private timerManager = UnifiedTimerManager.getInstance();

  // Add a list of message types that don't need responses
  private readonly FIRE_AND_FORGET_MESSAGES = [
    'clientReady',
    'ui_context_initialized',
    'ui_context_activity',
    'ui_context_closing',
    'SET_LOGIN_VERIFIED',
    'USER_ACTIVITY',
    'CLEAR_ALL_ENHANCED_ALERTS',  // Add this to prevent feedback loops
    'CLEAR_NOTIFICATION',
    'CLEAR_NOTIFICATION_ENHANCED',
    'IDLE_STATUS_CHANGED',
    'LOCKDOWN_WARNING_ENHANCED',
    'SECURITY_ALERT_ENHANCED',
    'PLAY_URGENT_SOUND'
  ];

  /**
   * Get the singleton instance
   */
  public static getInstance(): ExtensionMessaging {
    if (!ExtensionMessaging.instance) {
      ExtensionMessaging.instance = new ExtensionMessaging();
    }
    return ExtensionMessaging.instance;
  }

  /**
   * Initialize the messaging system
   * @param browserExtensionApi The browser extension API object from webextension-polyfill
   */
  public initialize(browserExtensionApi: Browser): void {
    if (!isBrowser) return; // Skip on server

    this.browserApi = browserExtensionApi;
    this.contextId = this.getContextId();
    log.debug('[Messaging - initialize] Extension messaging initialized');

    // Start processing any queued messages
    this.processQueue();

    // Set up message listener for responses
    if (this.browserApi && this.browserApi.runtime) {
      this.browserApi.runtime.onMessage.addListener(this.handleIncomingMessage.bind(this));
    }

    // Start cleanup interval using UnifiedTimerManager
    this.timerManager.addInterval('messaging-cleanup', () => this.cleanup(), 60000);
    this.timerManager.startInterval('messaging-cleanup');
  }

  /**
   * Send a cleanup message that won't trigger response loops
   */
  public async sendCleanupMessage(
    type: string,
    data: any = {},
    source: string = 'unknown'
  ): Promise<void> {
    if (!isBrowser || !this.browserApi) return;

    // These messages should never wait for responses and should be rate-limited
    const message = {
      type,
      ...data,
      messageId: `cleanup-${source}-${Date.now()}`,
      timestamp: Date.now(),
      contextId: this.contextId,
      source: source,
      isCleanup: true // Flag to identify cleanup messages
    };

    try {
      // Send directly without waiting for response and with error suppression
      this.browserApi.runtime.sendMessage(message).catch(error => {
        log.debug(`[Messaging - sendCleanupMessage] Cleanup message ${type} send failed (this is normal):`, false, error);
      });
    } catch (error) {
      log.debug(`[Messaging - sendCleanupMessage] Cleanup message ${type} send error (this is normal):`, false, error);
    }
  }

  /**
   * Handle incoming messages, primarily to resolve pending promises
   */
  private handleIncomingMessage(
    message: any,
    sender: Runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): true {
    // Skip messages that don't have a response identifier
    if (!message || !message.responseId) return true;

    const { responseId, result, error } = message;

    // Check if we have a pending request for this response
    const pendingRequest = this.pendingRequests.get(responseId);
    if (pendingRequest) {
      if (error) {
        pendingRequest.reject(error);
      } else {
        pendingRequest.resolve(result);
      }

      // Remove from pending requests
      this.pendingRequests.delete(responseId);

      // Cache the response for deduplication
      this.processedResponses.set(responseId, {
        timestamp: Date.now(),
        result: error || result
      });
    }
    return true;
  }

  /**
   * Send a message to the background script
   * @param type Message type
   * @param data Message data
   * @param options Message options
   * @returns Promise resolving to the response
   */
  public async sendMessage(
    type: string,
    data: any = {},
    options: {
      priority?: 'high' | 'normal' | 'low',
      retryOnFail?: boolean,
      contextId?: string,
      deduplicate?: boolean,
      responseTimeout?: number,
      waitForResponse?: boolean
    } = {}
  ): Promise<any> {
    if (!isBrowser) {
      // Return a resolved promise when running on server
      return Promise.resolve(null);
    }

    const {
      priority = 'normal',
      retryOnFail = true,
      contextId = this.contextId,
      deduplicate = true,
      responseTimeout = 30000, // 30 second default timeout
      // If message type is in fire-and-forget list, don't wait for response
      waitForResponse = !this.FIRE_AND_FORGET_MESSAGES.includes(type)
    } = options;

    // Generate a unique ID for this message
    const messageId = `${type}:${contextId}:${Date.now().toString(36)}`;

    // If deduplication is enabled and we've recently processed this exact message type+data
    if (deduplicate) {
      const exactMessageKey = `${type}:${JSON.stringify(data)}`;
      const recentResponse = this.processedResponses.get(exactMessageKey);

      if (recentResponse && Date.now() - recentResponse.timestamp < 5000) {
        log.debug('[Messaging - sendMessage] Using cached response for identical message:', false, { type });
        return Promise.resolve(recentResponse.result);
      }
    }

    // Check if browserApi is available
    if (!this.browserApi) {
      log.warn('[Messaging - sendMessage] Browser extension API not available. Call initialize() first.');
      return Promise.reject(new Error('Browser extension API not available. Call initialize() first.'));
    }

    // Prepare the message
    const message = {
      type,
      ...data,
      messageId,
      timestamp: Date.now(),
      contextId,
    };

    // For fire-and-forget messages, just send and resolve immediately
    if (!waitForResponse) {
      try {
        // Send directly without waiting for response
        this.browserApi.runtime.sendMessage(message).catch(error => {
          log.debug(`[Messaging - sendMessage] Error sending fire-and-forget message ${type}:`, false, error);
        });

        // Return resolved promise immediately
        return Promise.resolve({ success: true, noResponseRequired: true });
      } catch (error) {
        log.debug(`[Messaging - sendMessage] Error sending fire-and-forget message ${type}:`, false, error);
        return Promise.resolve({ success: true, noResponseRequired: true, sendFailed: true });
      }
    }

    // For messages requiring response, use the queue system
    return new Promise((resolve, reject) => {
      // Add to pending requests
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(messageId)) {
          this.pendingRequests.delete(messageId);
          reject(new Error(`Message ${type} timed out after ${responseTimeout}ms`));
        }
      }, responseTimeout);

      // Add to queue
      const queueKey = priority;
      if (!this.messageQueue.has(queueKey)) {
        this.messageQueue.set(queueKey, []);
      }

      this.messageQueue.get(queueKey)!.push({
        message,
        retryOnFail,
        retryCount: 0,
        timeoutId
      });

      // Start processing the queue if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the message queue in priority order
   */
  private async processQueue(): Promise<void> {
    if (!isBrowser || this.isProcessing || !this.browserApi) return;

    this.isProcessing = true;

    // Process high priority messages first, then normal, then low
    const priorities = ['high', 'normal', 'low'];

    try {
      for (const priority of priorities) {
        const queue = this.messageQueue.get(priority) || [];

        // Process all messages in this queue
        while (queue.length > 0) {
          const item = queue.shift()!;

          try {
            // Send the message
            await this.browserApi.runtime.sendMessage(item.message).catch((error: any) => {
              log.debug('[Messaging - processQueue] Error sending message:', false, error);

              // If we should retry and haven't exceeded the retry limit
              if (item.retryOnFail && item.retryCount < this.MAX_RETRIES) {
                // Increment retry count and add back to queue
                item.retryCount++;
                queue.push(item);

                log.debug('[Messaging - processQueue] Retrying message:', false, {
                  type: item.message.type,
                  attempt: item.retryCount
                });
              } else {
                // Reject the promise
                const pendingRequest = this.pendingRequests.get(item.message.messageId);
                if (pendingRequest) {
                  pendingRequest.reject(error);
                  this.pendingRequests.delete(item.message.messageId);
                  clearTimeout(item.timeoutId);
                }
              }
            });
          } catch (error: any) {
            // If we should retry and haven't exceeded the retry limit
            if (item.retryOnFail && item.retryCount < this.MAX_RETRIES) {
              // Increment retry count and add back to queue
              item.retryCount++;
              queue.push(item);

              // Add a small delay before next attempt
              await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
            } else {
              // Log the error and reject the promise
              log.warn(`[Messaging - processQueue] Failed to send message (${item.message.type}) after ${item.retryCount} retries:`, error);
              const pendingRequest = this.pendingRequests.get(item.message.messageId);
              if (pendingRequest) {
                pendingRequest.reject(error);
                this.pendingRequests.delete(item.message.messageId);
                clearTimeout(item.timeoutId);
              }
            }
          }

          // Add a small delay between messages
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    } finally {
      this.isProcessing = false;

      // If there are still messages in the queue, continue processing
      for (const queue of this.messageQueue.values()) {
        if (queue.length > 0) {
          setTimeout(() => this.processQueue(), 0);
          break;
        }
      }
    }
  }

  /**
   * Clean up stale pending requests and responses
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean up stale pending requests (older than 1 minute)
    for (const [messageId, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > 60000) {
        request.reject(new Error('Request timed out'));
        this.pendingRequests.delete(messageId);
      }
    }

    // Clean up old processed responses (older than 5 minutes)
    for (const [messageId, response] of this.processedResponses.entries()) {
      if (now - response.timestamp > 300000) {
        this.processedResponses.delete(messageId);
      }
    }
  }

  /**
   * Generate or retrieve a context ID for this UI instance
   */
  private getContextId(): string {
    // if (!isBrowser) return 'server';

    // // Check for an existing context ID in window storage
    // if (typeof window !== 'undefined' &&
    //     window.EXTENSION_INIT_STATE &&
    //     window.EXTENSION_INIT_STATE.contextId) {
    //   return window.EXTENSION_INIT_STATE.contextId;
    // }

    // // Generate a new context ID
    // const contextId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    // // Store it in window storage if available
    // if (typeof window !== 'undefined') {
    //   if (!window.EXTENSION_INIT_STATE) {
    //     window.EXTENSION_INIT_STATE = {
    //       initialized: false,
    //       contextId: contextId,
    //       activityTrackingStarted: false,
    //       startTime: Date.now()
    //     };
    //   } else {
    //     window.EXTENSION_INIT_STATE.contextId = contextId;
    //   }
    // }

    // return contextId;
    return this.contextId;
  }

  /**
   * Check if the messaging service has been initialized
   * @returns true if initialized, false otherwise
   */
  public isInitialized(): boolean {
    return this.browserApi !== null;
  }

  /**
   * Manually trigger user activity detection (for testing)
   */
  public triggerActivityDetection(): void {
    if (!isBrowser || typeof window === 'undefined') return;

    const handler = (window as any).__yakklActivityHandler;
    if (handler) {
      log.info('[Messaging - triggerActivityDetection] Manually triggering activity detection');
      handler();
    } else {
      log.warn('[Messaging - triggerActivityDetection] Activity handler not found - activity tracking may not be set up');
    }
  }

  /**
   * Send a UI context initialization message to the background script
   */
  public async registerUiContext(contextType: string): Promise<void> {
    if (!isBrowser || !this.browserApi) return;

    const contextId = this.contextId;

    await this.sendMessage('ui_context_initialized', {
      contextId,
      contextType,
      timestamp: Date.now()
    }, {
      priority: 'high',
      retryOnFail: true,
      deduplicate: false
    });

    // Set up unload handler
    if (typeof window !== 'undefined') {
      try {
        window.addEventListener('beforeunload', () => {
          // Send synchronously to ensure it gets through before page unloads
          if (this.browserApi && this.browserApi.runtime) {
            try {
              this.browserApi.runtime.sendMessage({
                type: 'ui_context_closing',
                contextId
              });
            } catch (error) {
              // Can't do much about errors during unload
            }
          }
        });
      } catch (error) {
        console.warn(`[${contextId}] Failed to add unload handler:`, error);
      }
    }

    log.debug(`[Messaging - registerUiContext] UI context registered: ${contextId} (${contextType})`);
  }

  /**
   * Send user activity update to keep context active (only for protected contexts)
   */
  public async sendActivityUpdate(): Promise<void> {
    if (!isBrowser || !this.browserApi) return;

    const contextType = this.getContextType();

    // Only send activity updates for protected contexts
    if (!contextNeedsIdleProtection(contextType)) {
      return;
    }

    try {
      await this.sendMessage('ui_context_activity', {
        contextId: this.contextId,
        contextType: contextType,
        timestamp: Date.now()
      }, {
        priority: 'high', // Make activity updates high priority
        retryOnFail: true,  // Retry if failed
        deduplicate: false  // Don't deduplicate activity messages
      });

      log.debug('[Messaging - sendActivityUpdate] Activity update sent successfully');
    } catch (error) {
      log.warn('[Messaging - sendActivityUpdate] Failed to send activity update:', false, error);
    }
  }

  /**
   * Notify the background script that login is verified or not (only for protected contexts)
   */
  public async setLoginVerified(verified: boolean, contextType?: string): Promise<void> {
    if (!isBrowser || !this.browserApi) {
      log.warn(`[Messaging - setLoginVerified] ❌ CANNOT SET LOGIN VERIFIED:`, false, {
        isBrowser,
        hasBrowserApi: !!this.browserApi,
        verified,
        contextType
      });
      return;
    }

    const actualContextType = contextType || this.getContextType();

    log.info(`[Messaging - setLoginVerified] 🔐 LOGIN VERIFICATION REQUEST:`, false, {
      verified,
      providedContextType: contextType,
      actualContextType,
      contextId: this.contextId,
      isProtectedContext: contextNeedsIdleProtection(actualContextType),
      protectedContexts
    });

    // Only send login verification for protected contexts
    if (!contextNeedsIdleProtection(actualContextType)) {
      log.warn(`[Messaging - setLoginVerified] ❌ SKIPPING - not a protected context:`, false, {
        contextType: actualContextType,
        protectedContexts,
        reason: 'Context type not in protected contexts list'
      });
      return;
    }

    const messageData = {
      verified,
      contextId: this.contextId,
      contextType: actualContextType
    };

    log.info(`[Messaging - setLoginVerified] 📤 SENDING SET_LOGIN_VERIFIED message:`, false, messageData);

    try {
      await this.sendMessage('SET_LOGIN_VERIFIED', messageData, {
        priority: 'high',
        retryOnFail: true,
        deduplicate: false
      });

      log.info(`[Messaging - setLoginVerified] ✅ SET_LOGIN_VERIFIED sent successfully:`, false, {
        verified,
        contextId: this.contextId,
        contextType: actualContextType
      });
    } catch (error) {
      log.error(`[Messaging - setLoginVerified] ❌ ERROR sending SET_LOGIN_VERIFIED:`, false, {
        error,
        messageData,
        contextId: this.contextId
      });
      throw error;
    }

    log.info(`[Messaging - setLoginVerified] 🎉 Login ${verified ? 'verified' : 'unverified'} for protected context: ${this.contextId}`);
  }

  /**
   * Determine the context type based on the current URL
   */
  private getContextType(): string {
    try {
      if (!isBrowser || typeof window === 'undefined') return 'unknown';

      const pathname = window.location.pathname;
      const href = window.location.href;

      if (pathname.includes('sidepanel') || href.includes('sidepanel')) {
        return 'sidepanel';
      } else if (pathname.includes('index.html') || href.includes('index.html') || pathname === '/' || pathname === '') {
        return 'popup-wallet';
      } else if (pathname.includes('dapp/popups') || href.includes('dapp/popups')) {
        return 'popup-dapp';
      } else if (pathname.includes('options') || href.includes('options')) {
        return 'options';
      } else {
          return 'popup-wallet'; // Default to popup-wallet for main extension
      }
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Set up activity tracking for this context (only for protected contexts)
   */
  public setupActivityTracking(): void {
    if (!isBrowser || typeof window === 'undefined') return;

      const contextType = this.getContextType();

      // Only set up activity tracking for protected contexts
      if (!contextNeedsIdleProtection(contextType)) {
        log.info(`[Messaging - setupActivityTracking] Skipping activity tracking setup for non-protected context: ${contextType}`);
        return;
      }

      // Check if already set up to prevent duplicate listeners
      if ((window as any).__yakklActivityTrackingSetup) {
        log.info('[Messaging - setupActivityTracking] Activity tracking already set up, skipping duplicate setup');
        return;
      }

      log.info(`[Messaging - setupActivityTracking] Setting up activity tracking for protected context: ${contextType}`);

      // Track user activity
      const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'focus', 'click'];

      // Throttled activity tracker
      let lastActivity = Date.now();
      const ACTIVITY_THROTTLE = 2000; // Send at most every 2 seconds (reduced from 5 seconds)

      const activityHandler = () => {
        const now = Date.now();
        if (now - lastActivity > ACTIVITY_THROTTLE) {
          lastActivity = now;

          log.debug('[Messaging - setupActivityTracking] User activity detected, sending activity update');

          // Send activity update immediately
          this.sendActivityUpdate().catch((error) => {
            log.debug('[Messaging - setupActivityTracking] Failed to send activity update:', false, error);
          });
        }
      };

      // Set up listeners with passive option for better performance
      activityEvents.forEach(event => {
        window.addEventListener(event, activityHandler, {
          passive: true,
          capture: false
        });
      });

      // Mark as set up
      (window as any).__yakklActivityTrackingSetup = true;
      (window as any).__yakklActivityHandler = activityHandler;
      (window as any).__yakklActivityEvents = activityEvents;

      // Clean up on page unload
      window.addEventListener('beforeunload', () => {
        activityEvents.forEach(event => {
          window.removeEventListener(event, activityHandler);
        });
        (window as any).__yakklActivityTrackingSetup = false;
      });

    log.info('[Messaging - setupActivityTracking] Activity tracking set up successfully for protected context:', false, {
      contextId: this.contextId,
      contextType: contextType,
      eventsTracked: activityEvents.length
    });
  }

}

// Export a singleton instance
export const messagingService = ExtensionMessaging.getInstance();

// Helper functions for common message patterns

/**
 * Initialize the messaging service with the browser extension API
 * @param browserExtensionApi The browser extension API from webextension-polyfill
 */
export function initializeMessaging(browserExtensionApi: Browser): void {
  if (!isBrowser) return;
  messagingService.initialize(browserExtensionApi);
}

/**
 * Send client ready message to background script
 */
export async function sendClientReady(): Promise<void> {
  if (!isBrowser) return;

  await messagingService.sendMessage('clientReady', {}, {
    priority: 'high',
    retryOnFail: true,
    deduplicate: true
  });
}

/**
 * Determine the most appropriate context type based on URL
 */
function determineBestContextType(): string {
  try {
    if (typeof window === 'undefined') return 'unknown';

    const pathname = window.location.pathname;
    const href = window.location.href;

    if (pathname.includes('sidepanel') || href.includes('sidepanel')) {
      return 'sidepanel';
    } else if (pathname.includes('index.html') || href.includes('index.html') || pathname === '/' || pathname === '') {
      return 'popup-wallet';
    } else if (pathname.includes('dapp/popups') || href.includes('dapp/popups')) {
      return 'popup-dapp';
    } else if (pathname.includes('options') || href.includes('options')) {
      return 'options';
    } else {
      return 'popup-wallet'; // Default to popup-wallet for main extension
    }
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Initialize a UI context and start activity tracking
 * @param browserExtensionApi The browser extension API from webextension-polyfill
 * @param contextType Optional context type override
 */
export async function initializeUiContext(
  browserExtensionApi: Browser,
  contextType?: string
): Promise<void> {
  if (!isBrowser) return;

  // Initialize messaging service
  messagingService.initialize(browserExtensionApi);

  // Register this UI context
  const actualContextType = contextType || determineBestContextType();
  await messagingService.registerUiContext(actualContextType);

  // Only set up activity tracking for protected contexts
  if (contextNeedsIdleProtection(actualContextType)) {
    log.info(`[Messaging - initializeUiContext] Setting up activity tracking for protected context: ${actualContextType}`);
    messagingService.setupActivityTracking();
  } else {
    log.info(`[Messaging - initializeUiContext] Skipping activity tracking for non-protected context: ${actualContextType}`);
  }
}

/**
 * Start activity tracking after successful login (only for protected contexts)
 */
export async function startActivityTracking(contextType?: string): Promise<void> {
  if (!isBrowser) return;

  const actualContextType = contextType || determineBestContextType();

  log.info(`[Messaging - startActivityTracking] 🚀 STARTING ACTIVITY TRACKING:`, false, {
    providedContextType: contextType,
    actualContextType,
    isProtectedContext: contextNeedsIdleProtection(actualContextType),
    expectedProtectedTypes: protectedContexts,
    isBrowser: isBrowser,
    messagingServiceExists: !!messagingService
  });

  // Only start activity tracking for protected contexts
  if (!contextNeedsIdleProtection(actualContextType)) {
    log.warn(`[Messaging - startActivityTracking] ❌ SKIPPING - not a protected context:`, false, {
      contextType: actualContextType,
      protectedContexts,
      reason: 'Context type not in protected contexts list'
    });
    return;
  }

  log.info(`[Messaging - startActivityTracking] 🔐 Setting login verified for protected context: ${actualContextType}`);

  try {
    // Verify the login - this should trigger idle detection
    await messagingService.setLoginVerified(true, actualContextType);
    log.info(`[Messaging - startActivityTracking] ✅ Login verification message sent successfully`);
  } catch (error) {
    log.error(`[Messaging - startActivityTracking] ❌ ERROR sending login verification:`, false, error);
    throw error;
  }

  try {
    // Ensure activity tracking is set up - should have been called in +layout.svelte at route level
    messagingService.setupActivityTracking();
    log.info(`[Messaging - startActivityTracking] ✅ Activity tracking setup completed`);
  } catch (error) {
    log.error(`[Messaging - startActivityTracking] ❌ ERROR setting up activity tracking:`, false, error);
  }

  log.info(`[Messaging - startActivityTracking] 🎉 ACTIVITY TRACKING STARTED for protected context: ${actualContextType}`);
}

/**
 * Stop activity tracking (e.g., at logout) (only for protected contexts)
 */
export async function stopActivityTracking(): Promise<void> {
  if (!isBrowser) return;

  const contextType = determineBestContextType();

  // Only stop activity tracking for protected contexts
  if (!contextNeedsIdleProtection(contextType)) {
    log.info(`[Messaging - stopActivityTracking] Skipping activity tracking stop for non-protected context: ${contextType}`);
    return;
  }

  await messagingService.setLoginVerified(false);

  log.info(`[Messaging - stopActivityTracking] Activity tracking stopped for protected context: ${contextType}`);
}

/**
 * Get the context ID for this client instance
 */
export function getContextId(): string {
  if (typeof window !== 'undefined' &&
      window.EXTENSION_INIT_STATE &&
      window.EXTENSION_INIT_STATE.contextId) {
    return window.EXTENSION_INIT_STATE.contextId;
  }
  return '';
}

/**
 * Apply this messaging utility to a global error handler
 * @param handler The error handler function or class
 */
export function hookErrorHandler(handler: any): void {
  if (!isBrowser || typeof handler.handleError !== 'function') {
    return;
  }

  // Store original method
  const originalHandleError = handler.handleError;

  // Override with our version
  handler.handleError = function(error: any) {
    try {
      // Send error to background with context info
      messagingService.sendMessage('error_report', {
        error: {
          message: error?.message || String(error),
          stack: error?.stack,
          name: error?.name
        },
        location: typeof window !== 'undefined' ? window.location.href : 'unknown',
        timestamp: Date.now()
      }, {
        priority: 'high',
        retryOnFail: true
      }).catch(() => {
        // Silently fail - don't want errors in error handler
      });
    } catch (e) {
      // Ignore errors in our error handler
    }

    // Call original handler
    return originalHandleError.call(handler, error);
  };
}

export default messagingService;

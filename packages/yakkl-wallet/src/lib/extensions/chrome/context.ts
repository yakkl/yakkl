import { log } from "$lib/common/logger-wrapper";
import browser from "webextension-polyfill";
import type { Runtime } from 'webextension-polyfill';
import {
  TIMER_IDLE_THRESHOLD,
  TIMER_IDLE_LOCK_DELAY,
  TIMER_IDLE_CHECK_INTERVAL
} from '$lib/common';
import { NotificationService } from '$lib/common/notifications';

// Define the context info type
export interface ContextInfo {
  id: string;
  type: 'sidepanel' | 'popup-wallet' | 'popup-dapp' | 'options' | 'devtools' | 'unknown' | string;
  windowId?: number;
  tabId?: number;
  url?: string;
  createdAt: number;
  lastActive: number;
}

// Track active UI contexts
const activeContexts = new Map<string, ContextInfo>();

// Message deduplication to prevent flooding
const processedMessages = new Map<string, number>();
const MESSAGE_DEDUP_THRESHOLD = 500; // ms between identical messages

// Idle management state
let isLockdownInitiated: boolean = false;
let isLoginVerified: boolean = false;
let previousState: IdleState = 'active';
let lastActivity: number = Date.now();
let stateChangeListener: ((state: IdleState) => void) | null = null;
let activityCheckTimer: number | null = null;
let idleThreshold: number = 30 * 1000; //TIMER_IDLE_THRESHOLD;
let idleLockDelay: number = 30 * 1000; //TIMER_IDLE_LOCK_DELAY;

type IdleState = 'active' | 'idle' | 'locked';

/**
 * Initialize the context and idle tracker module
 */
export function initContextTracker() {
  // Set up message listener for context messages
  browser.runtime.onMessage.addListener(handleContextMessage);
  // Listen for window removal to clean up
  browser.windows.onRemoved.addListener(handleWindowRemoved);
  // Set up alarm listener for lockdown
  // browser.alarms.onAlarm.addListener((alarm) => {
  //   if (alarm.name === "yakkl-lock-alarm") {
  //     executeLockdown();
  //   } else if (alarm.name === "yakkl-lock-notification") {
  //     NotificationService.sendLockdownWarning(idleLockDelay);
  //   }
  // });

  log.info('[ContextTracker] Initialized with idle threshold:', false, {
    threshold: idleThreshold / 1000,
    lockDelay: idleLockDelay / 1000
  });

  // Start cleanup interval for processed messages
  setInterval(cleanupProcessedMessages, 60000); // Clean every minute
}

/**
 * Clean up old message tracking entries
 */
function cleanupProcessedMessages() {
  const now = Date.now();
  const cutoffTime = now - 60000; // Remove entries older than 1 minute

  // Remove old entries
  for (const [messageId, timestamp] of processedMessages.entries()) {
    if (timestamp < cutoffTime) {
      processedMessages.delete(messageId);
    }
  }

  // Ensure the map doesn't grow too large
  if (processedMessages.size > 1000) {
    // Keep only the most recent 800 messages
    const entriesToDelete = processedMessages.size - 800;
    const entries = Array.from(processedMessages.entries())
      .sort((a, b) => a[1] - b[1]) // Sort by timestamp (oldest first)
      .slice(0, entriesToDelete)
      .map(entry => entry[0]);

    for (const messageId of entries) {
      processedMessages.delete(messageId);
    }
  }
}

/**
 * Check if a message is a duplicate to prevent handling flood
 */
function isDuplicateMessage(message: any): boolean {
  // Skip deduplication for certain message types
  if (message.type === 'USER_ACTIVITY' || message.type === 'ui_context_activity') {
    return false; // Always process activity messages
  }

  // Create a hash based on message type and id
  const messageId = `${message.type}:${message.id || ''}:${message.contextId || ''}`;
  const now = Date.now();

  // Check if we've seen this message recently
  const lastSeen = processedMessages.get(messageId);
  if (lastSeen && now - lastSeen < MESSAGE_DEDUP_THRESHOLD) {
    return true; // Duplicate message
  }

  // Track this message
  processedMessages.set(messageId, now);
  return false;
}

/**
 * Handle messages related to contexts and idle management
 */
function handleContextMessage(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
): true | undefined {
  // Extract wrapped message if needed
  const actualMessage = message.message || message;

  // Validate message format
  if (!actualMessage || typeof actualMessage !== 'object') {
    // Not our message, allow other listeners to process it
    return undefined;
  }

  // Check for duplicate messages to prevent handling flood
  if (isDuplicateMessage(actualMessage)) {
    log.debug('[ContextTracker] Dropping duplicate message:', false, {
      type: actualMessage.type
    });
    sendResponse({ success: false, error: 'Duplicate message' });
    return true;
  }

  // Handle context initialization messages
  if (actualMessage.type === 'ui_context_initialized') {
    // Immediately respond
    sendResponse({ success: true });
    // Then register context (async)
    registerContext(actualMessage, sender, () => {});
    return true;
  }

  // Handle context activity (user is active in a particular context)
  if (actualMessage.type === 'ui_context_activity' || actualMessage.type === 'USER_ACTIVITY') {
    // Immediately respond
    sendResponse({ success: true });
    // Then update activity (async)
    updateContextActivity(actualMessage, () => {});
    return true;
  }

  // Handle context closing
  if (actualMessage.type === 'ui_context_closing') {
    // Immediately respond
    sendResponse({ success: true });
    // Then remove context (async)
    removeContext(actualMessage, () => {});
    return true;
  }

  // Handle login verification
  if (actualMessage.type === 'SET_LOGIN_VERIFIED') {
    // Immediately respond
    sendResponse({ success: true });
    // Then set login verification (async)
    setLoginVerified(actualMessage.verified, actualMessage.contextId);
    return true;
  }

  // Handle IDLE_MANAGER_START (compatibility with existing code)
  if (actualMessage.type === 'IDLE_MANAGER_START') {
    const context = activeContexts.get(actualMessage.contextId);
    log.info(`[Background] - IDLE_MANAGER_START received from ${actualMessage.contextId || 'unknown'}`);
    if (context && context.type === 'popup-wallet') {
      log.info(`[Background] - IDLE_MANAGER_START received from ${context}`);
      // Immediately respond
      sendResponse({ success: false, message: 'Idle manager not supported in popup wallet' });
      return true;
    }

    log.info(`[Background] Starting idle manager from ${actualMessage.contextId || 'unknown'}`);
    // Immediately respond
    sendResponse({ success: true, message: 'Idle manager started' });
    // Then set login verification (async)
    setLoginVerified(true);
    return true;
  }

  // Handle status request (for debugging)
  if (actualMessage.type === 'GET_IDLE_STATUS') {
    sendResponse(getIdleStatus());
    return true;
  }

  // Handle clientReady message (commonly causes "Unknown message type" warnings)
  if (actualMessage.type === 'clientReady') {
    // Client is ready, just acknowledge receipt
    sendResponse({ success: true, clientReady: true });
    return true;
  }

  // Not our message, return undefined to allow other listeners to process it
  return undefined;
}

/**
 * Handle window removal events
 */
function handleWindowRemoved(windowId: number) {
  // Find and remove any contexts associated with this window
  for (const [contextId, contextInfo] of activeContexts.entries()) {
    if (contextInfo.windowId === windowId) {
      activeContexts.delete(contextId);
      log.info(`[ContextTracker] Context ${contextId} removed due to window close`);

      // Notify other contexts
      broadcastToOtherContexts('context_removed', {
        id: contextId,
        type: contextInfo.type
      }, contextId);
    }
  }
}

/**
 * Register a new UI context
 */
function registerContext(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
) {
  const contextInfo: ContextInfo = {
    id: message.contextId,
    type: message.contextType,
    windowId: sender.tab?.windowId,
    tabId: sender.tab?.id,
    url: sender.url,
    createdAt: message.timestamp || Date.now(),
    lastActive: Date.now()
  };

  // Store the context info
  activeContexts.set(message.contextId, contextInfo);

  log.info(`[ContextTracker] UI Context initialized: ${message.contextType}`, false, contextInfo);

  // Respond to confirm receipt
  sendResponse({ success: true });

  // Broadcast to other contexts
  broadcastToOtherContexts('context_added', {
    id: message.contextId,
    type: message.contextType
  }, message.contextId);
}

/**
 * Update a context's activity timestamp
 */
function updateContextActivity(
  message: any,
  sendResponse: (response?: any) => void
) {
  const contextId = message.contextId;
  const now = Date.now();

  // Update context activity
  if (activeContexts.has(contextId)) {
    const context = activeContexts.get(contextId)!;
    context.lastActive = now;
    activeContexts.set(contextId, context);
  } else {
    // If context not found, register it
    const contextType = message.contextType || 'unknown';
    activeContexts.set(contextId, {
      id: contextId,
      type: contextType,
      createdAt: now,
      lastActive: now
    });
  }

  // Update global last activity timestamp
  lastActivity = now;

  // If we were inactive and now detected activity
  if (previousState !== 'active') {
    handleStateChanged('active');
  }

  // Clear any pending lockdown
  if (isLockdownInitiated) {
    cancelPendingLockdown();
  }

  sendResponse({ success: true });
}

/**
 * Remove a context
 */
function removeContext(
  message: any,
  sendResponse: (response?: any) => void
) {
  const contextId = message.contextId;
  if (activeContexts.has(contextId)) {
    const removedContext = activeContexts.get(contextId)!;
    activeContexts.delete(contextId);

    log.info(`[ContextTracker] UI Context closed: ${removedContext.type}`, false, removedContext);

    // Notify other contexts
    broadcastToOtherContexts('context_removed', {
      id: contextId,
      type: removedContext.type
    }, contextId);

    sendResponse({ success: true });
  } else {
    sendResponse({ success: false, error: 'Context not found' });
  }
}

/**
 * Helper to broadcast a message to all contexts except the sender
 */
export function broadcastToOtherContexts(
  type: string,
  data: any,
  excludeContextId?: string
) {
  for (const [contextId, contextInfo] of activeContexts.entries()) {
    if (contextId !== excludeContextId) {
      try {
        // If we have a tab ID, use it for more targeted messaging
        if (contextInfo.tabId) {
          browser.tabs.sendMessage(contextInfo.tabId, {
            type,
            data,
            fromContextId: excludeContextId,
            timestamp: Date.now()
          }).catch(err => {
            log.debug(`[ContextTracker] Failed to send message to context ${contextId}:`, false, err);
          });
        }
      } catch (err) {
        log.error(`[ContextTracker] Error broadcasting to context ${contextId}:`, false, err);
      }
    }
  }
}

/**
 * Set login verification status
 */
export function setLoginVerified(verified: boolean, contextId?: string): void {
  log.info(`[IdleManager] Setting login verified: ${verified}`, false, { contextId });
  isLoginVerified = verified;

  if (verified) {
    startIdleDetection();
    broadcastIdleStatus('active');
  } else {
    stopIdleDetection();
  }
}

/**
 * Start idle detection
 */
function startIdleDetection(): void {
  if (!isLoginVerified) {
    log.info('[IdleManager] Not starting - login not verified');
    return;
  }

  log.info('[IdleManager] Starting idle detection');

  // Set up system idle detection
  browser.idle.setDetectionInterval(Math.floor(idleThreshold / 1000)); // Convert to seconds

  // Add state change listener
  if (!stateChangeListener) {
    stateChangeListener = (state: IdleState) => {
      handleStateChanged(state);
    };
    browser.idle.onStateChanged.addListener(stateChangeListener);
  }

  // Start activity check timer
  if (!activityCheckTimer) {
    activityCheckTimer = window.setInterval(
      checkInactivity,
      TIMER_IDLE_CHECK_INTERVAL
    );
  }

  // Set initial state
  checkCurrentState().then(state => {
    log.info(`[IdleManager] Initial state: ${state}`);
  });
}

/**
 * Stop idle detection
 */
function stopIdleDetection(): void {
  log.info('[IdleManager] Stopping idle detection');

  // Remove state change listener
  if (stateChangeListener) {
    browser.idle.onStateChanged.removeListener(stateChangeListener);
    stateChangeListener = null;
  }

  // Clear activity check timer
  if (activityCheckTimer) {
    clearInterval(activityCheckTimer);
    activityCheckTimer = null;
  }

  // Cancel any pending lockdown
  cancelPendingLockdown();
}

/**
 * Check if we've been inactive based on both system idle and our own tracking
 */
async function checkInactivity(): Promise<void> {
  if (!isLoginVerified) return;

  const now = Date.now();
  const timeSinceLastActivity = now - lastActivity;

  // If we've passed the idle threshold and not already initiated lockdown
  if (timeSinceLastActivity >= idleThreshold && !isLockdownInitiated) {
    // Double-check system idle state
    const systemState = await checkCurrentState();

    // Only proceed if system also reports idle
    if (systemState !== 'active') {
      log.info(`[IdleManager] Idle threshold reached: ${timeSinceLastActivity}ms`);
      handleStateChanged('idle');
    }
  }
}

/**
 * Check current system idle state
 */
async function checkCurrentState(): Promise<IdleState> {
  if (!isLoginVerified) return 'active';

  try {
    const state = await browser.idle.queryState(Math.floor(idleThreshold / 1000));
    return state as IdleState;
  } catch (error) {
    log.error('[IdleManager] Error querying idle state:', false, error);
    return 'active'; // Default to active on error
  }
}

/**
 * Handle state changes
 */
async function handleStateChanged(state: IdleState): Promise<void> {
  if (!isLoginVerified) return;
  if (state === previousState) return;

  log.info(`[IdleManager] State changing from ${previousState} to ${state}`);
  previousState = state;

  // Broadcast state to all UI contexts
  broadcastIdleStatus(state);

  try {
    switch (state) {
      case 'active':
        cancelPendingLockdown();
        await browser.runtime.sendMessage({type: 'startPricingChecks'}).catch(err => {
          log.debug('[IdleManager] Error sending startPricingChecks message:', false, err);
        });
        break;

      case 'idle':
      case 'locked':
        if (!isLockdownInitiated) {
          isLockdownInitiated = true;

          if (idleLockDelay <= 0) {
            // Immediate lockdown
            log.info(`[IdleManager] ${state} detected, initiating immediate lockdown`);
            await executeLockdown();
          } else {
            // Delayed lockdown
            log.info(`[IdleManager] ${state} detected, lockdown will occur in ${idleLockDelay/1000} seconds`);
            await startLockdownSequence();
          }
        }
        break;
    }
  } catch (error) {
    log.error('[IdleManager] Error handling state change:', false, error);
    isLockdownInitiated = false;
    previousState = 'active';
  }
}

/**
 * Start the lockdown sequence with notification and timer
 */
async function startLockdownSequence(): Promise<void> {
  try {
    // Stop price checks
    // await browser.runtime.sendMessage({type: 'stopPricingChecks'}).catch(err => {
    //   log.debug('[IdleManager] Error sending stopPricingChecks message:', false, err);
    // });

    // Show lockdown warning using the enhanced notification service
    // This handles both browser notification and UI message
    // await NotificationService.sendLockdownWarning(idleLockDelay);

    browser.runtime.sendMessage({type: 'lockdownImminent', delayMs: idleLockDelay}).then(result => {console.log('lockdown-warning result', result)}).catch(err => {
      log.error('[IdleManager] Error sending lockdown warning:', false, err);
    });

    // Set lockdown alarm
    browser.alarms.create("yakkl-lock-alarm", {
      when: Date.now() + idleLockDelay
    });

    log.info(`[IdleManager] Alarm set for lockdown in ${idleLockDelay / 1000} seconds`);
  } catch (error) {
    log.error('[IdleManager] Error starting lockdown sequence:', false, error);
  }
}

/**
 * Cancel a pending lockdown
 */
function cancelPendingLockdown(): void {
  if (!isLockdownInitiated) return;

  log.info('[IdleManager] Canceling pending lockdown');

  // Clear flag
  isLockdownInitiated = false;

  // Clear alarm
  browser.alarms.clear("yakkl-lock-alarm").catch(error => {
    log.error('[IdleManager] Error clearing lock alarm:', false, error);
  });

  // Clear notification
  import('$lib/common/notifications').then(({ NotificationService }) => {
    NotificationService.clear('lockdown-warning').catch(error => {
      log.debug('[IdleManager] Error clearing notification:', false, error);
    });
  }).catch(error => {
    log.debug('[IdleManager] Error importing NotificationService:', false, error);
  });
}

/**
 * Execute the actual lockdown
 */
async function executeLockdown(): Promise<void> {
  log.info('[IdleManager] Executing lockdown');

  try {
    // Stop price checks
    // await browser.runtime.sendMessage({type: 'stopPricingChecks'}).catch(err => {
    //   log.debug('[IdleManager] Error sending stopPricingChecks message:', false, err);
    // });

    // // Show locked notification
    // await NotificationService.sendWalletLocked();

    // Perform lockdown
    await browser.runtime.sendMessage({type: 'lockdown'}).catch(err => {
      log.error('[IdleManager] Error sending lockdown message:', false, err);
    });

    // Reset state
    isLockdownInitiated = false;
  } catch (error) {
    log.error('[IdleManager] Error executing lockdown:', false, error);
    isLockdownInitiated = false;
  }
}

/**
 * Broadcast idle status to all UI contexts
 */
function broadcastIdleStatus(state: IdleState): void {
  // Send using runtime messaging to reach all contexts
  browser.runtime.sendMessage({
    type: 'IDLE_STATUS_CHANGED',
    state,
    timestamp: Date.now()
  }).catch(error => {
    // This will often fail if no listeners, which is normal
    log.debug('[IdleManager] Broadcasting idle status:', false, { state });
  });

  // Also send directly to each known context with a tab ID
  for (const context of activeContexts.values()) {
    if (context.tabId) {
      browser.tabs.sendMessage(context.tabId, {
        type: 'IDLE_STATUS_CHANGED',
        state,
        timestamp: Date.now()
      }).catch(() => {
        // Silently fail - tab might have been closed
      });
    }
  }
}

/**
 * Get a list of active contexts
 */
export function getActiveContexts() {
  return Array.from(activeContexts.entries()).map(([id, info]) => ({
    id,
    type: info.type,
    url: info.url,
    createdAt: new Date(info.createdAt).toISOString(),
    lastActive: new Date(info.lastActive).toISOString(),
    age: Math.floor((Date.now() - info.createdAt) / 1000) + 's'
  }));
}

/**
 * Check if a context exists
 */
export function hasContext(contextId: string): boolean {
  return activeContexts.has(contextId);
}

/**
 * Get context info
 */
export function getContextInfo(contextId: string): ContextInfo | undefined {
  return activeContexts.get(contextId);
}

/**
 * Get contexts by type
 */
export function getContextsByType(contextType: string): ContextInfo[] {
  return Array.from(activeContexts.values())
    .filter(context => context.type === contextType);
}

/**
 * Get the number of active contexts
 */
export function getActiveContextCount(): number {
  return activeContexts.size;
}

/**
 * Get current idle status (for debugging)
 */
export function getIdleStatus(): any {
  return {
    isLockdownInitiated,
    isLoginVerified,
    previousState,
    threshold: idleThreshold,
    lockDelay: idleLockDelay,
    lastActivity,
    timeSinceLastActivity: Date.now() - lastActivity,
    activeContextsCount: activeContexts.size,
    processedMessagesCount: processedMessages.size,
    activeContexts: Array.from(activeContexts.entries()).map(([id, info]) => ({
      id,
      type: info.type,
      lastActivity: new Date(info.lastActive).toISOString(),
      idleFor: Math.round((Date.now() - info.lastActive) / 1000) + 's'
    }))
  };
}

/**
 * Clear all tracked contexts (for debugging)
 */
export function clearAllContexts(): void {
  activeContexts.clear();
  log.info('[ContextTracker] All contexts cleared');
}

// Create a dedicated debugging namespace
const contextDebugAPI = {
  getActiveContexts,
  getContextsByType,
  getActiveContextCount,
  clearAllContexts,
  hasContext,
  getIdleStatus,
  processedMessagesCount: () => processedMessages.size,
  clearProcessedMessages: () => processedMessages.clear()
};

// Expose for debugging in browser console
if (typeof globalThis !== 'undefined') {
  (globalThis as any).YAKKLContexts = contextDebugAPI;
  log.info('[ContextTracker] Debug API available via YAKKLContexts global object');
}

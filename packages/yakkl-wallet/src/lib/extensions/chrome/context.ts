import { log } from "$lib/common/logger-wrapper";
import browser from "webextension-polyfill";
import type { Runtime } from 'webextension-polyfill';
import {
  TIMER_IDLE_THRESHOLD,
  TIMER_IDLE_LOCK_DELAY,
  TIMER_IDLE_CHECK_INTERVAL
} from '$lib/common';
import { NotificationService } from '$lib/common/notifications';
import { protectedContexts } from '$lib/common/globals';

// Helper function to check if context needs idle protection
function needsIdleProtection(contextType: string): boolean {
  return protectedContexts.includes(contextType);
}

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
let idleThreshold: number = TIMER_IDLE_THRESHOLD;
let idleLockDelay: number = TIMER_IDLE_LOCK_DELAY;

// Add debounce tracking
let lastStateChange = 0;
const STATE_CHANGE_DEBOUNCE = 5000; // 5 seconds minimum between state changes

type IdleState = 'active' | 'idle' | 'locked';

/**
 * Initialize the context and idle tracker module
 */
export function initContextTracker() {
  // Set up message listener for context messages
  browser.runtime.onMessage.addListener(handleContextMessage);
  // Listen for window removal to clean up
  if (browser.windows) {
    browser.windows.onRemoved.addListener(handleWindowRemoved);
  }

  // IMPORTANT: Set up alarm listener for lockdown
  browser.alarms.onAlarm.addListener((alarm) => {
    log.info('[IdleManager] Alarm received:', false, alarm);
    if (alarm.name === "yakkl-lock-alarm") {
      log.info('[IdleManager] Executing lockdown from alarm');
      executeLockdown();
    } else if (alarm.name === "yakkl-lock-notification") {
      log.info('[IdleManager] Sending lockdown warning from alarm');
      NotificationService.sendLockdownWarning(idleLockDelay);
    }
  });

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

  // For cleanup messages, use stricter deduplication with shorter window
  if (message.type === 'CLEAR_ALL_ENHANCED_ALERTS') {
    const messageId = `${message.type}:${message.source || 'unknown'}`;
    const now = Date.now();
    const lastSeen = processedMessages.get(messageId);

    // Use a shorter window for cleanup messages to reduce spam but allow periodic cleanup
    if (lastSeen && now - lastSeen < 1000) { // 1 second window for cleanup messages
      return true; // Duplicate message
    }

    // Track this message
    processedMessages.set(messageId, now);
    return false;
  }

  // Create a hash based on message type and id for other messages
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
    // Reduce logging level for cleanup messages since they're expected to be frequent
    if (actualMessage.type === 'CLEAR_ALL_ENHANCED_ALERTS') {
      // Only log at debug level for cleanup messages to reduce spam
      log.debug('[ContextTracker] Dropping duplicate cleanup message:', false, {
        type: actualMessage.type,
        source: actualMessage.source
      });
    } else {
      // Log other duplicate messages at debug level too
      log.debug('[ContextTracker] Dropping duplicate message:', false, {
        type: actualMessage.type
      });
    }
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
    log.info('[ContextTracker - handleContextMessage] SET_LOGIN_VERIFIED received:', false, actualMessage);
    // Immediately respond
    sendResponse({ success: true });
    // Then set login verification (async)
    setLoginVerified(actualMessage.verified, actualMessage.contextId);
    return true;
  }

  // Handle IDLE_MANAGER_START (compatibility with existing code)
  if (actualMessage.type === 'IDLE_MANAGER_START') {
    const context = activeContexts.get(actualMessage.contextId);
    log.info(`[ContextTracker - handleContextMessage] IDLE_MANAGER_START received from ${actualMessage.contextId || 'unknown'}`);
    if (context && context.type === 'popup-wallet') {
      log.info(`[ContextTracker - handleContextMessage] IDLE_MANAGER_START received from ${context}`);
      // Immediately respond
      sendResponse({ success: false, message: 'Idle manager not supported in popup wallet' });
      return true;
    }

    log.info(`[ContextTracker - handleContextMessage] Starting idle manager from ${actualMessage.contextId || 'unknown'}`);
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
  // Improve context type detection
  let contextType = message.contextType;

  // If context type is unknown but we have URL info, try to detect it
  if (contextType === 'unknown' && sender.url) {
    if (sender.url.includes('sidepanel')) {
      contextType = 'sidepanel';
    } else if (sender.url.includes('index.html') || sender.url.endsWith('/')) {
      contextType = 'popup-wallet';
    } else if (sender.url.includes('dapp/popups')) {
      contextType = 'popup-dapp';
    } else if (sender.url.includes('options')) {
      contextType = 'options';
    } else {
      // Default assumption for extension popup
      contextType = 'popup-wallet';
    }
    log.info(`[ContextTracker] Corrected context type from 'unknown' to '${contextType}' based on URL: ${sender.url}`);
  }

  const contextInfo: ContextInfo = {
    id: message.contextId,
    type: contextType,
    windowId: sender.tab?.windowId,
    tabId: sender.tab?.id,
    url: sender.url,
    createdAt: message.timestamp || Date.now(),
    lastActive: Date.now()
  };

  // Store the context info
  activeContexts.set(message.contextId, contextInfo);

  log.info(`[ContextTracker] UI Context initialized: ${contextType}`, false, contextInfo);

  // Respond to confirm receipt
  sendResponse({ success: true });

  // Broadcast to other contexts
  broadcastToOtherContexts('context_added', {
    id: message.contextId,
    type: contextType
  }, message.contextId);
}

/**
 * Update a context's activity timestamp
 */
async function updateContextActivity(
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

  // Only update global activity for protected contexts
  const context = activeContexts.get(contextId);
  if (context && needsIdleProtection(context.type)) {
    // Update global last activity timestamp
    lastActivity = now;

    // Always clear enhanced alerts and reset state on any activity
    if (isLockdownInitiated) {
      log.info('[ContextTracker - updateContextActivity] User activity detected, clearing lockdown state');

      // Clear any pending lockdown FIRST
      cancelPendingLockdown();

      // Use the enhanced clearing method from NotificationService
      import('$lib/common/notifications').then(({ NotificationService }) => {
        NotificationService.clearAllAlertsEnhanced().catch((error) => {
          log.warn('[ContextTracker - updateContextActivity] Error during enhanced alert clearing:', false, error);
        });
      }).catch(() => {});

      // Clear any alarms
      browser.alarms.clear("yakkl-lock-alarm").catch(() => {});
      browser.alarms.clear("yakkl-lock-notification").catch(() => {});

      // Reset badge and icon - this should be handled by NotificationService, but ensure it's cleared
      if (browser.action) {
        browser.action.setBadgeText({ text: '' }).catch(() => {});
        browser.action.setIcon({
          path: {
            16: '/images/logoBullFav16x16.png',
            32: '/images/logoBullFav32x32.png',
            48: '/images/logoBullFav48x48.png',
            96: '/images/logoBullFav96x96.png',
            128: '/images/logoBullFav128x128.png'
          }
        }).catch(() => {});
      }

      // Send enhanced clear message to UI contexts
      for (const [_, contextInfo] of activeContexts.entries()) {
        if (contextInfo.tabId && contextInfo.id) {
          browser.tabs.sendMessage(contextInfo.tabId, {
            type: 'CLEAR_ALL_ENHANCED_ALERTS',
            timestamp: now,
            source: 'user_activity',
            targetContextTypes: [contextInfo.type]
          }).catch(() => {});
        }
      }

      // After clearing lockdown state
      if (isLoginVerified) {
        startIdleDetection();
      }

      // Reset state
      isLockdownInitiated = false;
      previousState = 'active';

      log.info('[ContextTracker - updateContextActivity] Lockdown state cleared due to user activity');
    }

    // If we were inactive and now detected activity
    if (previousState !== 'active') {
      handleStateChanged('active');
    }
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

    // Check if we still have any protected contexts
    const hasProtectedContexts = Array.from(activeContexts.values())
      .some(context => needsIdleProtection(context.type));

    // If no more protected contexts, stop idle detection
    if (!hasProtectedContexts) {
      log.info('[ContextTracker] No more protected contexts, stopping idle detection');
      stopIdleDetection();
      isLoginVerified = false; // Reset login verification
    }

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
        log.warn(`[ContextTracker] Error broadcasting to context ${contextId}:`, false, err);
      }
    }
  }
}

/**
 * Helper to broadcast a message to protected contexts only
 */
export function broadcastToProtectedContexts(
  type: string,
  data: any,
  excludeContextId?: string
) {
  for (const [contextId, contextInfo] of activeContexts.entries()) {
    if (contextId !== excludeContextId && needsIdleProtection(contextInfo.type)) {
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
        log.warn(`[ContextTracker] Error broadcasting to context ${contextId}:`, false, err);
      }
    }
  }
}

/**
 * Set login verification status
 */
export function setLoginVerified(verified: boolean, contextId?: string): void {
  log.info(`[ContextTracker - setLoginVerified] Setting login verified: ${verified}`, false, { contextId });

  // Only set login verified if we have at least one protected context
  const hasProtectedContext = Array.from(activeContexts.values())
    .some(context => needsIdleProtection(context.type));

  if (!hasProtectedContext && verified) {
    log.info('[ContextTracker - setLoginVerified] No protected contexts found, not starting idle detection');
    return;
  }

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
    log.info('[ContextTracker - startIdleDetection] Not starting - login not verified');
    return;
  }

  // Set up system idle detection
  browser.idle.setDetectionInterval(Math.floor(idleThreshold / 1000)); // Convert to seconds

  log.info('[ContextTracker - startIdleDetection] Starting idle detection', false, Math.floor(idleThreshold / 1000));

  // Add state change listener
  if (!stateChangeListener) {
    stateChangeListener = (state: IdleState) => {
      handleStateChanged(state);
    };
    browser.idle.onStateChanged.addListener(stateChangeListener);
  }

  // Start activity check timer
  if (!activityCheckTimer && typeof window !== 'undefined') {
    activityCheckTimer = window.setInterval(
      checkInactivity,
      TIMER_IDLE_CHECK_INTERVAL
    );
  }

  // Set initial state
  checkCurrentState().then(state => {
    log.info(`[ContextTracker - startIdleDetection] Initial state: ${state}`);
  });
}

/**
 * Stop idle detection
 */
function stopIdleDetection(): void {
  log.info('[ContextTracker - stopIdleDetection] Stopping idle detection');

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

  // Reset state
  isLockdownInitiated = false;
  previousState = 'active';
  lastActivity = Date.now();

  // Clear any alarms
  browser.alarms.clear("yakkl-lock-alarm").catch(() => {});
  browser.alarms.clear("yakkl-lock-notification").catch(() => {});

  // Clear any notifications
  import('$lib/common/notifications').then(({ NotificationService }) => {
    NotificationService.clearAllAlertsEnhanced().catch(() => {});
  }).catch(() => {});
}

/**
 * Check if we've been inactive based on both system idle and our own tracking
 */
async function checkInactivity(): Promise<void> {
  if (!isLoginVerified) return;

  const now = Date.now();
  const timeSinceLastActivity = now - lastActivity;
  const timeSinceLastStateChange = now - lastStateChange;

  // Don't check if we're within the debounce period
  if (timeSinceLastStateChange < STATE_CHANGE_DEBOUNCE) {
    return;
  }

  // If we've passed the idle threshold and not already initiated lockdown
  if (timeSinceLastActivity >= idleThreshold && !isLockdownInitiated) {
    // Double-check system idle state
    const systemState = await checkCurrentState();

    // Only proceed if system also reports idle and we're not in the debounce period
    if (systemState !== 'active' && timeSinceLastStateChange >= STATE_CHANGE_DEBOUNCE) {
      log.info(`[ContextTracker - checkInactivity] Idle threshold reached: ${timeSinceLastActivity}ms`);
      lastStateChange = now;
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
    log.info('[ContextTracker - checkCurrentState] Current system idle state:', false, state);
    return state as IdleState;
  } catch (error) {
    log.warn('[ContextTracker - checkCurrentState] Error querying idle state:', false, error);
    return 'active'; // Default to active on error
  }
}

/**
 * Handle state changes
 */
async function handleStateChanged(state: IdleState): Promise<void> {
  if (!isLoginVerified) return;
  if (state === previousState) return;

  const now = Date.now();
  const timeSinceLastStateChange = now - lastStateChange;

  // Don't allow rapid state changes
  if (timeSinceLastStateChange < STATE_CHANGE_DEBOUNCE) {
    log.debug('[ContextTracker - handleStateChanged] Skipping state change - too soon since last change:', false, {
      timeSinceLastChange: timeSinceLastStateChange,
      debouncePeriod: STATE_CHANGE_DEBOUNCE
    });
    return;
  }

  // Check if we have any protected contexts before proceeding
  const hasProtectedContexts = Array.from(activeContexts.values())
    .some(context => needsIdleProtection(context.type));

  if (!hasProtectedContexts) {
    log.info('[ContextTracker - handleStateChanged] No protected contexts found, stopping idle detection');
    stopIdleDetection();
    return;
  }

  log.info(`[ContextTracker - handleStateChanged] State changing from ${previousState} to ${state}`);
  previousState = state;
  lastStateChange = now;

  // Broadcast state to all UI contexts
  broadcastIdleStatus(state);

  try {
    switch (state) {
      case 'active':
        // Clear any pending lockdown first
        cancelPendingLockdown();

        // Reset the last activity timestamp to prevent immediate idle detection
        lastActivity = now;

        // Clear any alarms
        await browser.alarms.clear("yakkl-lock-alarm").catch(() => {});
        await browser.alarms.clear("yakkl-lock-notification").catch(() => {});

        // Clear any notifications
        await import('$lib/common/notifications').then(({ NotificationService }) => {
          return NotificationService.clearAllAlertsEnhanced();
        }).catch(() => {});

        // Reset badge and icon
        if (browser.action) {
          await browser.action.setBadgeText({ text: '' }).catch(() => {});
          await browser.action.setIcon({
            path: {
              16: '/images/logoBullFav16x16.png',
              32: '/images/logoBullFav32x32.png',
              48: '/images/logoBullFav48x48.png',
              96: '/images/logoBullFav96x96.png',
              128: '/images/logoBullFav128x128.png'
            }
          }).catch(() => {});
        }

        // ONLY send ONE cleanup message to UI contexts and ONLY for active state
        // This breaks the feedback loop by limiting when UI cleanup messages are sent
        for (const [_, contextInfo] of activeContexts.entries()) {
          if (contextInfo.tabId && contextInfo.id) {
            await browser.tabs.sendMessage(contextInfo.tabId, {
              type: 'CLEAR_ALL_ENHANCED_ALERTS',
              timestamp: now,
              source: 'state_change_active',
              targetContextTypes: [contextInfo.type]
            }).catch(() => {});
          }
        }

        // IMPORTANT: Restart idle detection
        if (isLoginVerified) {
          startIdleDetection();
        }

        // Reset state variables
        isLockdownInitiated = false;
        previousState = 'active';

        // Start pricing checks after cleanup
        await browser.runtime.sendMessage({type: 'startPricingChecks'}).catch(err => {
          log.debug('[ContextTracker - handleStateChanged] Error sending startPricingChecks message:', false, err);
        });
        break;

      case 'idle':
      case 'locked':
        // Only proceed if we haven't already initiated lockdown
        if (!isLockdownInitiated) {
          // Double check if we're still idle
          const currentState = await checkCurrentState();
          if (currentState !== 'active') {
            isLockdownInitiated = true;

            if (idleLockDelay <= 0) {
              // Immediate lockdown
              log.info(`[ContextTracker - handleStateChanged] ${state} detected, initiating immediate lockdown`);
              await executeLockdown();
            } else {
              // Delayed lockdown
              log.info(`[ContextTracker - handleStateChanged] ${state} detected, lockdown will occur in ${idleLockDelay/1000} seconds`);
              await startLockdownSequence();
            }
          } else {
            log.info('[ContextTracker - handleStateChanged] State changed to active during idle check, canceling lockdown');
            handleStateChanged('active');
          }
        }
        break;
    }
  } catch (error) {
    log.warn('[ContextTracker - handleStateChanged] Error handling state change:', false, error);
    isLockdownInitiated = false;
    previousState = 'active';
  }
}

/**
 * Start the lockdown sequence with notification and timer
 */
async function startLockdownSequence(): Promise<void> {
  try {
    // Check if we have any protected contexts before proceeding
    const protectedContextsLocal = Array.from(activeContexts.values())
      .filter(context => needsIdleProtection(context.type));

    if (protectedContextsLocal.length === 0) {
      log.info('[ContextTracker - startLockdownSequence] No protected contexts found, skipping lockdown sequence');
      return;
    }

    log.info(`[ContextTracker - startLockdownSequence] Starting lockdown sequence for ${protectedContextsLocal.length} protected context(s)`);

    // Calculate remaining time for accurate notification
    const remainingTime = Math.max(0, idleLockDelay);
    const remainingSeconds = Math.ceil(remainingTime / 1000);

    // Send lockdown warning to all tabs first (more reliable than runtime messaging)
    for (const context of protectedContextsLocal) {
      if (context.tabId && context.id) {
        try {
          await browser.tabs.sendMessage(context.tabId, {
            type: 'lockdownImminent',
            delayMs: remainingTime,
            remainingSeconds,
            enhanced: true, // Always use enhanced version
            targetContextTypes: protectedContexts,
            timestamp: Date.now()
          });
          log.info(`[ContextTracker - startLockdownSequence] Sent lockdownImminent to context ${context.id} (${context.type})`);
        } catch (err) {
          log.warn(`[ContextTracker - startLockdownSequence] Failed to send lockdownImminent to context ${context.id}:`, false, err);
        }
      } else {
        log.info(`[ContextTracker - startLockdownSequence] Context ${context.id} (${context.type}) has no tabId or id, skipping`);
      }
    }

    // Set lockdown alarm
    browser.alarms.create("yakkl-lock-alarm", {
      when: Date.now() + remainingTime
    });

    log.info(`[ContextTracker - startLockdownSequence] Alarm set for lockdown in ${remainingSeconds} seconds`);
  } catch (error) {
    log.warn('[ContextTracker - startLockdownSequence] Error starting lockdown sequence:', false, error);
  }
}

/**
 * Cancel a pending lockdown with enhanced cleanup (NO UI MESSAGES)
 */
function cancelPendingLockdown(): void {
  if (!isLockdownInitiated) return;

  log.info('[ContextTracker - cancelPendingLockdown] Canceling pending lockdown with enhanced cleanup');

  // Clear flag FIRST to prevent race conditions
  isLockdownInitiated = false;

  // Clear alarm
  browser.alarms.clear("yakkl-lock-alarm").catch(error => {
    log.warn('[ContextTracker - cancelPendingLockdown] Error clearing lock alarm:', false, error);
  });

  // Clear notification alarm
  browser.alarms.clear("yakkl-lock-notification").catch(error => {
    log.warn('[ContextTracker - cancelPendingLockdown] Error clearing notification alarm:', false, error);
  });

  // Use NotificationService enhanced clearing
  import('$lib/common/notifications').then(({ NotificationService }) => {
    NotificationService.clearAllAlertsEnhanced().catch(error => {
      log.warn('[ContextTracker - cancelPendingLockdown] Error clearing enhanced notifications:', false, error);
    });
  }).catch(error => {
    log.warn('[ContextTracker - cancelPendingLockdown] Error importing NotificationService:', false, error);
  });

  // Reset badge and icon as backup (NotificationService should handle this, but ensure it's done)
  if (browser.action) {
    browser.action.setBadgeText({ text: '' }).catch(() => {});
    browser.action.setIcon({
      path: {
        16: '/images/logoBullFav16x16.png',
        32: '/images/logoBullFav32x32.png',
        48: '/images/logoBullFav48x48.png',
        96: '/images/logoBullFav96x96.png',
        128: '/images/logoBullFav128x128.png'
      }
    }).catch(() => {});
  }

  // Send enhanced clear message to UI contexts
  for (const [_, contextInfo] of activeContexts.entries()) {
    if (contextInfo.tabId) {
      browser.tabs.sendMessage(contextInfo.tabId, {
        type: 'CLEAR_ALL_ENHANCED_ALERTS',
        timestamp: Date.now(),
        source: 'cancel_lockdown'
      }).catch(() => {});
    }
  }

  // Reset state
  previousState = 'active';

  log.info('[ContextTracker - cancelPendingLockdown] Pending lockdown canceled and cleanup completed');
}

/**
 * Execute the actual lockdown
 */
async function executeLockdown(): Promise<void> {
  log.info('[ContextTracker - executeLockdown] Executing lockdown');

  try {
    // Check if we have any protected contexts before proceeding
    const protectedContextsLocal = Array.from(activeContexts.values())
      .filter(context => needsIdleProtection(context.type));

    if (protectedContextsLocal.length === 0) {
      log.info('[ContextTracker - executeLockdown] No protected contexts found, skipping lockdown');
      isLockdownInitiated = false;
      return;
    }

    log.info(`[ContextTracker - executeLockdown] Executing lockdown for ${protectedContextsLocal.length} protected context(s)`);

    // Send lockdown to all protected tabs
    for (const context of protectedContextsLocal) {
      if (context.tabId) {
        try {
          await browser.tabs.sendMessage(context.tabId, {
            type: 'lockdown',
            targetContextTypes: protectedContexts,
            timestamp: Date.now()
          });
          log.info(`[ContextTracker - executeLockdown] Sent lockdown to context ${context.id} (${context.type})`);
        } catch (err) {
          log.warn(`[ContextTracker - executeLockdown] Failed to send lockdown to context ${context.id}:`, false, err);
        }
      }
    }

    // Also try runtime messaging as fallback
    // await browser.runtime.sendMessage({
    //   type: 'lockdown',
    //   targetContextTypes: protectedContexts,
    //   timestamp: Date.now()
    // }).catch(err => {
    //   log.warn('[IdleManager] Runtime lockdown failed (this is normal if no listeners):', false, err);
    // });

    // Reset state
    isLockdownInitiated = false;
  } catch (error) {
    log.warn('[ContextTracker - executeLockdown] Error executing lockdown:', false, error);
    isLockdownInitiated = false;
  }
}

/**
 * Broadcast idle status to protected contexts only
 */
function broadcastIdleStatus(state: IdleState): void {
  // Get protected contexts
  const protectedContextsLocal = Array.from(activeContexts.values())
    .filter(context => needsIdleProtection(context.type));

  if (protectedContextsLocal.length === 0) {
    log.debug('[ContextTracker - broadcastIdleStatus] No protected contexts to broadcast to');
    return;
  }

  log.info(`[ContextTracker - broadcastIdleStatus] Broadcasting idle status '${state}' to ${protectedContextsLocal.length} protected context(s)`);

  // Send directly to each known protected context with a tab ID
  for (const context of protectedContextsLocal) {
    if (context.tabId && context.id) {
      browser.tabs.sendMessage(context.tabId, {
        type: 'IDLE_STATUS_CHANGED',
        state,
        timestamp: Date.now(),
        targetContextTypes: protectedContexts
      }).catch(() => {
        // Silently fail - tab might have been closed
      });
    } else {
      log.info(`[ContextTracker - broadcastIdleStatus] Context ${context.id} (${context.type}) has no tabId or id, skipping`);
    }
  }

  // Also send using runtime messaging as fallback
  // browser.runtime.sendMessage({
  //   type: 'IDLE_STATUS_CHANGED',
  //   state,
  //   timestamp: Date.now(),
  //   targetContextTypes: protectedContexts
  // }).catch(error => {
  //   // This will often fail if no listeners, which is normal
  //   log.debug('[IdleManager] Broadcasting idle status via runtime:', false, { state });
  // });
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
 * Get the number of protected contexts
 */
export function getProtectedContextCount(): number {
  return Array.from(activeContexts.values())
    .filter(context => needsIdleProtection(context.type)).length;
}

/**
 * Get current idle status (for debugging)
 */
export function getIdleStatus(): any {
  const protectedContextsLocal = Array.from(activeContexts.entries())
    .filter(([_, info]) => needsIdleProtection(info.type))
    .map(([id, info]) => ({
      id,
      type: info.type,
      lastActivity: new Date(info.lastActive).toISOString(),
      idleFor: Math.round((Date.now() - info.lastActive) / 1000) + 's'
    }));

  return {
    isLockdownInitiated,
    isLoginVerified,
    previousState,
    threshold: idleThreshold,
    lockDelay: idleLockDelay,
    lastActivity,
    timeSinceLastActivity: Date.now() - lastActivity,
    activeContextsCount: activeContexts.size,
    protectedContextsCount: protectedContextsLocal.length,
    processedMessagesCount: processedMessages.size,
    activeContexts: Array.from(activeContexts.entries()).map(([id, info]) => ({
      id,
      type: info.type,
      isProtected: needsIdleProtection(info.type),
      lastActivity: new Date(info.lastActive).toISOString(),
      idleFor: Math.round((Date.now() - info.lastActive) / 1000) + 's'
    })),
    protectedContexts: protectedContextsLocal
  };
}

/**
 * Clear all tracked contexts (for debugging)
 */
export function clearAllContexts(): void {
  activeContexts.clear();
  log.info('[ContextTracker - clearAllContexts] All contexts cleared');
}

// Create a dedicated debugging namespace
const contextDebugAPI = {
  getActiveContexts,
  getContextsByType,
  getActiveContextCount,
  getProtectedContextCount,
  clearAllContexts,
  hasContext,
  getIdleStatus,
  processedMessagesCount: () => processedMessages.size,
  clearProcessedMessages: () => processedMessages.clear()
};

// Expose for debugging in browser console
if (typeof globalThis !== 'undefined') {
  (globalThis as any).YAKKLBackgroundDebug = {
    getIdleStatus,
    getActiveContexts,
    getProtectedContextCount,
    hasLockdownInitiated: () => isLockdownInitiated,
    getLastActivity: () => ({
      timestamp: lastActivity,
      timeSinceLastActivity: Date.now() - lastActivity,
      timeInSeconds: Math.round((Date.now() - lastActivity) / 1000)
    }),
    getCurrentState: checkCurrentState,
    triggerStateChange: (state: IdleState) => {
      log.info(`[Debug] Manually triggering state change to: ${state}`);
      handleStateChanged(state);
    },
    clearLockdown: () => {
      log.info('[Debug] Manually clearing lockdown state');
      isLockdownInitiated = false;
      cancelPendingLockdown();
      handleStateChanged('active');
    }
  };

  log.info('[ContextTracker - initContextTracker] Background debug helper available via YAKKLBackgroundDebug global object');
}

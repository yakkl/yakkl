import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
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

// Message deduplication - simplified and more robust
const recentMessages = new Map<string, number>();
const MESSAGE_DEDUP_WINDOW = 1000; // 1 second window
const MAX_RECENT_MESSAGES = 500; // Limit memory usage

// Idle management state
let isLockdownInitiated: boolean = false;
let isLoginVerified: boolean = false;
let previousState: IdleState = 'active';
let lastActivity: number = Date.now();
let stateChangeListener: ((state: IdleState) => void) | null = null;
let activityCheckTimer: number | null = null;
let idleThreshold: number = TIMER_IDLE_THRESHOLD;
let idleLockDelay: number = TIMER_IDLE_LOCK_DELAY;

// Add state management locks to prevent race conditions
let isProcessingStateChange = false;
let isCleaningUp = false;
let pendingCleanupPromise: Promise<void> | null = null;

// Add debounce tracking with better logic
let lastStateChangeTime = 0;
const STATE_CHANGE_DEBOUNCE = 3000; // Reduced from 5s to 3s
const CLEANUP_THROTTLE = 2000; // Throttle cleanup operations

type IdleState = 'active' | 'idle' | 'locked';

/**
 * Initialize the context and idle tracker module
 */
export function initContextTracker() {
	try {
		// Set up message listener for context messages
		browser.runtime.onMessage.addListener(handleContextMessage);

		// Listen for window removal to clean up
		if (browser.windows && browser.windows.onRemoved) {
			browser.windows.onRemoved.addListener(handleWindowRemoved);
		}

		// Set up alarm listener for lockdown and keepalive
		if (browser.alarms && browser.alarms.onAlarm) {
			browser.alarms.onAlarm.addListener((alarm) => {
				log.info('[IdleManager] Alarm received:', false, alarm);
				if (alarm.name === 'yakkl-lock-alarm') {
					log.info('[IdleManager] Executing lockdown from alarm');
					executeLockdown().catch((error) => {
						log.error('[IdleManager] Error executing lockdown from alarm:', false, error);
					});
				} else if (alarm.name === 'yakkl-lock-notification') {
					log.info('[IdleManager] Sending lockdown warning from alarm');
					NotificationService.sendLockdownWarning(idleLockDelay);
				} else if (alarm.name === 'yakkl-keepalive') {
					// Keepalive alarm - just log to keep service worker active
					log.debug('[ContextTracker] ⏰ Keepalive alarm - checking idle state');

					// If we have protected contexts and login is verified, check inactivity
					if (isLoginVerified) {
						checkInactivity().catch((error) => {
							log.error('[ContextTracker] Error in keepalive activity check:', false, error);
						});
					}
				}
			});
		}

		log.info('[ContextTracker] 🚀 INITIALIZED with idle threshold:', false, {
			threshold: idleThreshold / 1000,
			lockDelay: idleLockDelay / 1000,
			browserIdleSupported: !!(browser.idle && browser.idle.setDetectionInterval),
			alarmSupported: !!(browser.alarms && browser.alarms.onAlarm),
			notificationSupported: !!browser.notifications
		});

		// Start cleanup interval for processed messages
		setInterval(cleanupRecentMessages, 30000); // Clean every 30 seconds

		// Initialize debugging API
		initializeDebugAPI();
	} catch (error) {
		log.error('[ContextTracker] Failed to initialize:', false, error);
	}
}

/**
 * Clean up old message tracking entries - simplified and more efficient
 */
function cleanupRecentMessages() {
	try {
		const now = Date.now();
		const cutoffTime = now - MESSAGE_DEDUP_WINDOW * 2; // Keep extra buffer

		// Remove old entries
		for (const [messageId, timestamp] of recentMessages.entries()) {
			if (timestamp < cutoffTime) {
				recentMessages.delete(messageId);
			}
		}

		// Ensure the map doesn't grow too large
		if (recentMessages.size > MAX_RECENT_MESSAGES) {
			// Keep only the most recent messages
			const entries = Array.from(recentMessages.entries())
				.sort((a, b) => b[1] - a[1]) // Sort by timestamp (newest first)
				.slice(0, MAX_RECENT_MESSAGES);

			recentMessages.clear();
			entries.forEach(([id, timestamp]) => {
				recentMessages.set(id, timestamp);
			});
		}
	} catch (error) {
		log.warn('[ContextTracker] Error during cleanup:', false, error);
	}
}

/**
 * Check if a message is a duplicate - simplified logic
 */
function isDuplicateMessage(message: any): boolean {
	try {
		// Always allow activity messages
		if (message.type === 'USER_ACTIVITY' || message.type === 'ui_context_activity') {
			return false;
		}

		// Create a simple message ID
		const messageId = `${message.type}:${message.contextId || 'global'}`;
		const now = Date.now();

		// Check if we've seen this message recently
		const lastSeen = recentMessages.get(messageId);
		if (lastSeen && now - lastSeen < MESSAGE_DEDUP_WINDOW) {
			return true; // Duplicate message
		}

		// Track this message
		recentMessages.set(messageId, now);
		return false;
	} catch (error) {
		log.warn('[ContextTracker] Error checking duplicate message:', false, error);
		return false; // If we can't check, allow the message through
	}
}

/**
 * Handle messages related to contexts and idle management
 */
function handleContextMessage(
	message: any,
	sender: Runtime.MessageSender,
	sendResponse: (response?: any) => void
): true | undefined {
	try {
		// Extract wrapped message if needed
		const actualMessage = message.message || message;

		// Validate message format
		if (!actualMessage || typeof actualMessage !== 'object') {
			return undefined;
		}

		// Check for duplicate messages to prevent handling flood
		if (isDuplicateMessage(actualMessage)) {
			if (actualMessage.type !== 'CLEAR_ALL_ENHANCED_ALERTS') {
				log.debug('[ContextTracker] Dropping duplicate message:', false, {
					type: actualMessage.type
				});
			}
			sendResponse({ success: false, error: 'Duplicate message' });
			return true;
		}

		// Handle context initialization messages
		if (actualMessage.type === 'ui_context_initialized') {
			sendResponse({ success: true });
			setTimeout(() => registerContext(actualMessage, sender), 0);
			return true;
		}

		// Handle context activity
		if (actualMessage.type === 'ui_context_activity' || actualMessage.type === 'USER_ACTIVITY') {
			sendResponse({ success: true });
			setTimeout(() => updateContextActivity(actualMessage), 0);
			return true;
		}

		// Handle context closing
		if (actualMessage.type === 'ui_context_closing') {
			sendResponse({ success: true });
			setTimeout(() => removeContext(actualMessage), 0);
			return true;
		}

		// Handle login verification
		if (actualMessage.type === 'SET_LOGIN_VERIFIED') {
			log.info('[ContextTracker] SET_LOGIN_VERIFIED received:', false, actualMessage);
			sendResponse({ success: true });
			setTimeout(() => setLoginVerified(actualMessage.verified, actualMessage.contextId), 0);
			return true;
		}

		// Handle IDLE_MANAGER_START
		if (actualMessage.type === 'IDLE_MANAGER_START') {
			const context = activeContexts.get(actualMessage.contextId);
			if (context && context.type === 'popup-wallet') {
				sendResponse({ success: false, message: 'Idle manager not supported in popup wallet' });
				return true;
			}

			log.info(
				`[ContextTracker] Starting idle manager from ${actualMessage.contextId || 'unknown'}`
			);
			sendResponse({ success: true, message: 'Idle manager started' });
			setTimeout(() => setLoginVerified(true), 0);
			return true;
		}

		// Handle status request
		if (actualMessage.type === 'GET_IDLE_STATUS') {
			sendResponse(getIdleStatus());
			return true;
		}

		// Handle clientReady message
		if (actualMessage.type === 'clientReady') {
			sendResponse({ success: true, clientReady: true });
			return true;
		}

		// Not our message
		return undefined;
	} catch (error) {
		log.error('[ContextTracker] Error handling context message:', false, error);
		try {
			sendResponse({ success: false, error: 'Internal error' });
		} catch (responseError) {
			log.error('[ContextTracker] Error sending error response:', false, responseError);
		}
		return true;
	}
}

/**
 * Handle window removal events
 */
function handleWindowRemoved(windowId: number) {
	try {
		// Find and remove any contexts associated with this window
		for (const [contextId, contextInfo] of activeContexts.entries()) {
			if (contextInfo.windowId === windowId) {
				activeContexts.delete(contextId);
				log.info(`[ContextTracker] Context ${contextId} removed due to window close`);

				// Notify other contexts (async, non-blocking)
				setTimeout(() => {
					broadcastToOtherContexts(
						'context_removed',
						{
							id: contextId,
							type: contextInfo.type
						},
						contextId
					);
				}, 0);
			}
		}
	} catch (error) {
		log.error('[ContextTracker] Error handling window removal:', false, error);
	}
}

/**
 * Register a new UI context
 */
function registerContext(message: any, sender: Runtime.MessageSender) {
	try {
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
				contextType = 'popup-wallet';
			}
			log.info(
				`[ContextTracker] Corrected context type from 'unknown' to '${contextType}' based on URL: ${sender.url}`
			);
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

		// Broadcast to other contexts (async, non-blocking)
		setTimeout(() => {
			broadcastToOtherContexts(
				'context_added',
				{
					id: message.contextId,
					type: contextType
				},
				message.contextId
			);
		}, 0);
	} catch (error) {
		log.error('[ContextTracker] Error registering context:', false, error);
	}
}

/**
 * Update a context's activity timestamp
 */
async function updateContextActivity(message: any) {
	try {
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

			// Clear lockdown state if needed
			if (isLockdownInitiated) {
				log.info('[ContextTracker] User activity detected, clearing lockdown state');
				await clearLockdownState();
			}

			// If we were inactive and now detected activity
			if (previousState !== 'active') {
				handleStateChanged('active').catch((error) => {
					log.error('[ContextTracker] Error handling state change to active:', false, error);
				});
			}
		}
	} catch (error) {
		log.error('[ContextTracker] Error updating context activity:', false, error);
	}
}

/**
 * Clear lockdown state with proper error handling
 */
async function clearLockdownState(): Promise<void> {
	if (isCleaningUp) {
		// If already cleaning up, wait for it to complete
		if (pendingCleanupPromise) {
			await pendingCleanupPromise;
		}
		return;
	}

	isCleaningUp = true;
	const now = Date.now();

	try {
		pendingCleanupPromise = (async () => {
			// Clear any pending lockdown FIRST
			cancelPendingLockdown();

			// Clear alarms
			try {
				if (browser.alarms) {
					await Promise.all([
						browser.alarms.clear('yakkl-lock-alarm'),
						browser.alarms.clear('yakkl-lock-notification'),
						browser.alarms.clear('yakkl-keepalive')
					]);
				}
			} catch (error) {
				log.warn('[ContextTracker] Error clearing alarms:', false, error);
			}

			// Clear notifications using enhanced method
			try {
				await NotificationService.clearAllAlertsEnhanced();
			} catch (error) {
				log.warn('[ContextTracker] Error clearing notifications:', false, error);
			}

			// Reset badge and icon
			try {
				if (browser.action) {
					await Promise.all([
						browser.action.setBadgeText({ text: '' }),
						browser.action.setIcon({
							path: {
								16: '/images/logoBullFav16x16.png',
								32: '/images/logoBullFav32x32.png',
								48: '/images/logoBullFav48x48.png',
								96: '/images/logoBullFav96x96.png',
								128: '/images/logoBullFav128x128.png'
							}
						})
					]);
				}
			} catch (error) {
				log.warn('[ContextTracker] Error resetting badge/icon:', false, error);
			}

			// Send clear message to UI contexts (throttled)
			const shouldSendClearMessage =
				now - (clearLockdownState as any).lastClearTime > CLEANUP_THROTTLE;
			if (shouldSendClearMessage) {
				(clearLockdownState as any).lastClearTime = now;

				const clearPromises = [];
				for (const [_, contextInfo] of activeContexts.entries()) {
					if (contextInfo.tabId && contextInfo.id) {
						clearPromises.push(
							browser.tabs
								.sendMessage(contextInfo.tabId, {
									type: 'CLEAR_ALL_ENHANCED_ALERTS',
									timestamp: now,
									source: 'user_activity',
									targetContextTypes: [contextInfo.type]
								})
								.catch(() => {}) // Ignore errors
						);
					}
				}
				await Promise.allSettled(clearPromises);
			}

			// Restart idle detection if login is verified
			if (isLoginVerified) {
				startIdleDetection();
			}

			// Reset state
			isLockdownInitiated = false;
			previousState = 'active';

			// Start pricing checks
			try {
				await browser.runtime.sendMessage({ type: 'startPricingChecks' });
			} catch (error) {
				log.debug('[ContextTracker] Error sending startPricingChecks message:', false, error);
			}

			log.info('[ContextTracker] Lockdown state cleared successfully');
		})();

		await pendingCleanupPromise;
	} finally {
		isCleaningUp = false;
		pendingCleanupPromise = null;
	}
}

// Initialize the lastClearTime property
(clearLockdownState as any).lastClearTime = 0;

/**
 * Remove a context
 */
function removeContext(message: any) {
	try {
		const contextId = message.contextId;
		if (activeContexts.has(contextId)) {
			const removedContext = activeContexts.get(contextId)!;
			activeContexts.delete(contextId);

			log.info(`[ContextTracker] UI Context closed: ${removedContext.type}`, false, removedContext);

			// Check if we still have any protected contexts
			const hasProtectedContexts = Array.from(activeContexts.values()).some((context) =>
				needsIdleProtection(context.type)
			);

			// If no more protected contexts, stop idle detection
			if (!hasProtectedContexts) {
				log.info('[ContextTracker] No more protected contexts, stopping idle detection');
				stopIdleDetection();
				isLoginVerified = false; // Reset login verification
			}

			// Notify other contexts (async, non-blocking)
			setTimeout(() => {
				broadcastToOtherContexts(
					'context_removed',
					{
						id: contextId,
						type: removedContext.type
					},
					contextId
				);
			}, 0);
		}
	} catch (error) {
		log.error('[ContextTracker] Error removing context:', false, error);
	}
}

/**
 * Helper to broadcast a message to all contexts except the sender
 */
export function broadcastToOtherContexts(type: string, data: any, excludeContextId?: string) {
	try {
		const broadcastPromises = [];

		for (const [contextId, contextInfo] of activeContexts.entries()) {
			if (contextId !== excludeContextId) {
				// If we have a tab ID, use it for more targeted messaging
				if (contextInfo.tabId) {
					broadcastPromises.push(
						browser.tabs
							.sendMessage(contextInfo.tabId, {
								type,
								data,
								fromContextId: excludeContextId,
								timestamp: Date.now()
							})
							.catch((err) => {
								log.debug(
									`[ContextTracker] Failed to send message to context ${contextId}:`,
									false,
									err
								);
							})
					);
				}
			}
		}

		// Execute all broadcasts concurrently but don't wait for them
		Promise.allSettled(broadcastPromises).catch(() => {});
	} catch (error) {
		log.warn('[ContextTracker] Error broadcasting to other contexts:', false, error);
	}
}

/**
 * Helper to broadcast a message to protected contexts only
 */
export function broadcastToProtectedContexts(type: string, data: any, excludeContextId?: string) {
	try {
		const broadcastPromises = [];

		for (const [contextId, contextInfo] of activeContexts.entries()) {
			if (contextId !== excludeContextId && needsIdleProtection(contextInfo.type)) {
				if (contextInfo.tabId) {
					broadcastPromises.push(
						browser.tabs
							.sendMessage(contextInfo.tabId, {
								type,
								data,
								fromContextId: excludeContextId,
								timestamp: Date.now()
							})
							.catch((err) => {
								log.debug(
									`[ContextTracker] Failed to send message to context ${contextId}:`,
									false,
									err
								);
							})
					);
				}
			}
		}

		// Execute all broadcasts concurrently but don't wait for them
		Promise.allSettled(broadcastPromises).catch(() => {});
	} catch (error) {
		log.warn('[ContextTracker] Error broadcasting to protected contexts:', false, error);
	}
}

/**
 * Set login verification status
 */
export function setLoginVerified(verified: boolean, contextId?: string): void {
	try {
		log.info(`[ContextTracker] 🔐 LOGIN VERIFICATION REQUEST:`, false, {
			verified,
			contextId,
			currentLoginState: isLoginVerified,
			totalContexts: activeContexts.size,
			activeContextTypes: Array.from(activeContexts.values()).map((ctx) => ctx.type)
		});

		// Only set login verified if we have at least one protected context
		const protectedContexts = Array.from(activeContexts.values()).filter((context) =>
			needsIdleProtection(context.type)
		);
		const hasProtectedContext = protectedContexts.length > 0;

		log.info(`[ContextTracker] 🛡️ PROTECTED CONTEXTS ANALYSIS:`, false, {
			hasProtectedContext,
			protectedCount: protectedContexts.length,
			protectedTypes: protectedContexts.map((ctx) => ctx.type),
			allContexts: Array.from(activeContexts.values()).map((ctx) => ({
				id: ctx.id,
				type: ctx.type
			}))
		});

		if (!hasProtectedContext && verified) {
			log.warn('[ContextTracker] ❌ NO PROTECTED CONTEXTS - not starting idle detection:', false, {
				reason: 'No popup-wallet or popup-dapp contexts found',
				allContextTypes: Array.from(activeContexts.values()).map((ctx) => ctx.type),
				expectedProtectedTypes: ['popup-wallet', 'popup-dapp']
			});
			return;
		}

		const wasVerified = isLoginVerified;
		isLoginVerified = verified;

		log.info(`[ContextTracker] 🔄 LOGIN STATE CHANGED:`, false, {
			from: wasVerified,
			to: verified,
			willStartIdle: verified && hasProtectedContext,
			willStopIdle: !verified && wasVerified
		});

		if (verified) {
			log.info('[ContextTracker] 🚀 STARTING idle detection due to login verification');
			startIdleDetection();
			broadcastIdleStatus('active');
		} else {
			log.info('[ContextTracker] 🛑 STOPPING idle detection due to login unverification');
			stopIdleDetection();
		}
	} catch (error) {
		log.error('[ContextTracker] ❌ CRITICAL ERROR setting login verified:', false, error);
	}
}

/**
 * Start idle detection
 */
function startIdleDetection(): void {
	try {
		log.info('[ContextTracker] 🎯 ATTEMPTING to start idle detection');

		if (!isLoginVerified) {
			log.warn('[ContextTracker] ❌ NOT STARTING - login not verified:', false, {
				isLoginVerified,
				activeContextsCount: activeContexts.size,
				protectedContextsPresent: Array.from(activeContexts.values()).filter((ctx) =>
					['popup-wallet', 'popup-dapp'].includes(ctx.type)
				).length
			});
			return;
		}

		log.info('[ContextTracker] ✅ Login verified, proceeding with idle detection setup');

		// Set up system idle detection
		if (browser.idle && browser.idle.setDetectionInterval) {
			const detectionInterval = Math.floor(idleThreshold / 1000);
			browser.idle.setDetectionInterval(detectionInterval);
			log.info('[ContextTracker] ✅ Browser idle detection interval set:', false, {
				intervalSeconds: detectionInterval,
				idleThreshold: idleThreshold
			});
		} else {
			log.error('[ContextTracker] ❌ Browser idle API not available:', false, {
				hasIdleAPI: !!browser.idle,
				hasSetInterval: !!(browser.idle && browser.idle.setDetectionInterval),
				hasOnStateChanged: !!(browser.idle && browser.idle.onStateChanged)
			});
		}

		// Add state change listener
		if (!stateChangeListener && browser.idle && browser.idle.onStateChanged) {
			stateChangeListener = (state: IdleState) => {
				log.info('[ContextTracker] 🔄 IDLE STATE CHANGED:', false, {
					newState: state,
					timestamp: new Date().toISOString(),
					lastActivity: new Date(lastActivity).toISOString()
				});
				handleStateChanged(state).catch((error) => {
					log.error('[ContextTracker] ❌ Error in state change listener:', false, error);
				});
			};
			browser.idle.onStateChanged.addListener(stateChangeListener);
			log.info('[ContextTracker] ✅ Idle state change listener added');
		} else if (stateChangeListener) {
			log.info('[ContextTracker] ℹ️ State change listener already exists');
		} else {
			log.error('[ContextTracker] ❌ Cannot add state change listener - browser API not available');
		}

		// Start activity check timer
		if (!activityCheckTimer && typeof setInterval !== 'undefined') {
			activityCheckTimer = setInterval(() => {
				log.debug('[ContextTracker] 🔍 Running periodic activity check');
				checkInactivity().catch((error) => {
					log.error('[ContextTracker] ❌ Error in activity check:', false, error);
				});
			}, TIMER_IDLE_CHECK_INTERVAL) as any;
			log.info('[ContextTracker] ✅ Activity check timer started:', false, {
				intervalMs: TIMER_IDLE_CHECK_INTERVAL
			});
		} else if (activityCheckTimer) {
			log.info('[ContextTracker] ℹ️ Activity check timer already running');
		}

		// Set up keepalive alarm to prevent service worker from going dormant
		if (browser.alarms) {
			// Create a recurring alarm every 15 seconds to keep service worker active
			// This matches our idle check interval
			browser.alarms.create('yakkl-keepalive', {
				periodInMinutes: 0.25 // 15 seconds
			});
			log.info('[ContextTracker] ✅ Keepalive alarm created (every 15 seconds)');
		}

		// Set initial state
		checkCurrentState()
			.then((state) => {
				log.info(`[ContextTracker] 📊 Initial idle state: ${state}`);
			})
			.catch((error) => {
				log.error('[ContextTracker] ❌ Error checking initial state:', false, error);
			});

		log.info('[ContextTracker] 🎉 IDLE DETECTION SETUP COMPLETE');
	} catch (error) {
		log.error('[ContextTracker] ❌ CRITICAL ERROR starting idle detection:', false, error);
	}
}

/**
 * Stop idle detection
 */
function stopIdleDetection(): void {
	try {
		log.info('[ContextTracker] Stopping idle detection');

		// Remove state change listener
		if (stateChangeListener && browser.idle && browser.idle.onStateChanged) {
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
		if (browser.alarms) {
			Promise.allSettled([
				browser.alarms.clear('yakkl-lock-alarm'),
				browser.alarms.clear('yakkl-lock-notification'),
				browser.alarms.clear('yakkl-keepalive')
			]).catch(() => {});
		}

		// Clear any notifications
		NotificationService.clearAllAlertsEnhanced().catch(() => {});
	} catch (error) {
		log.error('[ContextTracker] Error stopping idle detection:', false, error);
	}
}

/**
 * Check if we've been inactive based on both system idle and our own tracking
 */
async function checkInactivity(): Promise<void> {
	if (!isLoginVerified || isProcessingStateChange) return;

	try {
		const now = Date.now();
		const timeSinceLastActivity = now - lastActivity;
		const timeSinceLastStateChange = now - lastStateChangeTime;

		// Don't check if we're within the debounce period
		if (timeSinceLastStateChange < STATE_CHANGE_DEBOUNCE) {
			return;
		}

		// First, query the browser idle state directly
		const currentIdleState = await checkCurrentState();

		// If browser reports idle/locked, handle it immediately
		if (currentIdleState !== 'active' && !isLockdownInitiated) {
			log.info(`[ContextTracker] Browser reports ${currentIdleState} state - handling immediately`);
			await handleStateChanged(currentIdleState);
			return;
		}

		// If we've passed the idle threshold and not already initiated lockdown
		if (timeSinceLastActivity >= idleThreshold && !isLockdownInitiated) {
			log.info(`[ContextTracker] Idle threshold reached: ${timeSinceLastActivity}ms`);
			await handleStateChanged('idle');
		}
	} catch (error) {
		log.error('[ContextTracker] Error checking inactivity:', false, error);
	}
}

/**
 * Check current system idle state
 */
async function checkCurrentState(): Promise<IdleState> {
	if (!isLoginVerified) return 'active';

	try {
		if (browser.idle && browser.idle.queryState) {
			const querySeconds = Math.floor(idleThreshold / 1000);
			const state = await browser.idle.queryState(querySeconds);

			// Log state queries periodically for debugging
			const now = Date.now();
			if (!checkCurrentState.lastLogTime || now - checkCurrentState.lastLogTime > 10000) {
				log.debug('[ContextTracker] Idle state query:', false, {
					state,
					querySeconds,
					timeSinceLastActivity: now - lastActivity
				});
				checkCurrentState.lastLogTime = now;
			}

			return state as IdleState;
		}
		return 'active';
	} catch (error) {
		log.warn('[ContextTracker] Error querying idle state:', false, error);
		return 'active'; // Default to active on error
	}
}

// Add property to track last log time
checkCurrentState.lastLogTime = 0;

/**
 * Handle state changes with improved race condition prevention
 */
async function handleStateChanged(state: IdleState): Promise<void> {
	if (!isLoginVerified || isProcessingStateChange) return;
	if (state === previousState) return;

	const now = Date.now();
	const timeSinceLastStateChange = now - lastStateChangeTime;

	// Don't allow rapid state changes
	if (timeSinceLastStateChange < STATE_CHANGE_DEBOUNCE) {
		log.debug('[ContextTracker] Skipping state change - too soon since last change:', false, {
			timeSinceLastChange: timeSinceLastStateChange,
			debouncePeriod: STATE_CHANGE_DEBOUNCE
		});
		return;
	}

	// Check if we have any protected contexts before proceeding
	const hasProtectedContexts = Array.from(activeContexts.values()).some((context) =>
		needsIdleProtection(context.type)
	);

	if (!hasProtectedContexts) {
		log.info('[ContextTracker] No protected contexts found, stopping idle detection');
		stopIdleDetection();
		return;
	}

	// Set the processing flag to prevent race conditions
	isProcessingStateChange = true;

	try {
		log.info(`[ContextTracker] State changing from ${previousState} to ${state}`);
		previousState = state;
		lastStateChangeTime = now;

		// Broadcast state to all UI contexts
		broadcastIdleStatus(state);

		switch (state) {
			case 'active':
				await handleActiveState(now);
				break;

			case 'idle':
			case 'locked':
				await handleIdleLockState(state, now);
				break;
		}
	} catch (error) {
		log.error('[ContextTracker] Error handling state change:', false, error);
		// Reset state on error
		isLockdownInitiated = false;
		previousState = 'active';
	} finally {
		isProcessingStateChange = false;
	}
}

/**
 * Handle active state
 */
async function handleActiveState(now: number): Promise<void> {
	try {
		// Clear any pending lockdown first
		cancelPendingLockdown();

		// Reset the last activity timestamp to prevent immediate idle detection
		lastActivity = now;

		// Clear notifications and reset UI
		await clearLockdownState();

		// IMPORTANT: Restart idle detection
		if (isLoginVerified) {
			startIdleDetection();
		}

		// Start pricing checks after cleanup
		try {
			await browser.runtime.sendMessage({ type: 'startPricingChecks' });
		} catch (error) {
			log.debug('[ContextTracker] Error sending startPricingChecks message:', false, error);
		}
	} catch (error) {
		log.error('[ContextTracker] Error handling active state:', false, error);
	}
}

/**
 * Handle idle/locked state
 */
async function handleIdleLockState(state: IdleState, now: number): Promise<void> {
	try {
		// Only proceed if we haven't already initiated lockdown
		if (!isLockdownInitiated) {
			// Double check if we're still idle
			const currentState = await checkCurrentState();
			if (currentState !== 'active') {
				isLockdownInitiated = true;

				if (idleLockDelay <= 0) {
					// Immediate lockdown
					log.info(`[ContextTracker] ${state} detected, initiating immediate lockdown`);
					await executeLockdown();
				} else {
					// Delayed lockdown
					log.info(
						`[ContextTracker] ${state} detected, lockdown will occur in ${idleLockDelay / 1000} seconds`
					);
					await startLockdownSequence();
				}
			} else {
				log.info('[ContextTracker] State changed to active during idle check, canceling lockdown');
				await handleStateChanged('active');
			}
		}
	} catch (error) {
		log.error('[ContextTracker] Error handling idle/lock state:', false, error);
		isLockdownInitiated = false;
	}
}

/**
 * Start the lockdown sequence with notification and timer
 */
async function startLockdownSequence(): Promise<void> {
	try {
		// Check if we have any protected contexts before proceeding
		const protectedContextsLocal = Array.from(activeContexts.values()).filter((context) =>
			needsIdleProtection(context.type)
		);

		if (protectedContextsLocal.length === 0) {
			log.info('[ContextTracker] No protected contexts found, skipping lockdown sequence');
			return;
		}

		log.info(
			`[ContextTracker] Starting lockdown sequence for ${protectedContextsLocal.length} protected context(s)`
		);

		// Calculate remaining time for accurate notification
		const remainingTime = Math.max(0, idleLockDelay);
		const remainingSeconds = Math.ceil(remainingTime / 1000);

		// Send lockdown warning to all tabs first
		const messagePromises = [];
		for (const context of protectedContextsLocal) {
			if (context.tabId && context.id) {
				messagePromises.push(
					browser.tabs
						.sendMessage(context.tabId, {
							type: 'lockdownImminent',
							delayMs: remainingTime,
							remainingSeconds,
							enhanced: true,
							targetContextTypes: protectedContexts,
							timestamp: Date.now()
						})
						.catch((err) => {
							log.warn(
								`[ContextTracker] Failed to send lockdownImminent to context ${context.id}:`,
								false,
								err
							);
						})
				);
			}
		}

		// Send all messages concurrently
		await Promise.allSettled(messagePromises);

		// Set lockdown alarm
		if (browser.alarms) {
			await browser.alarms.create('yakkl-lock-alarm', {
				when: Date.now() + remainingTime
			});
		}

		log.info(`[ContextTracker] Alarm set for lockdown in ${remainingSeconds} seconds`);
	} catch (error) {
		log.error('[ContextTracker] Error starting lockdown sequence:', false, error);
	}
}

/**
 * Cancel a pending lockdown
 */
function cancelPendingLockdown(): void {
	if (!isLockdownInitiated) return;

	try {
		log.info('[ContextTracker] Canceling pending lockdown');

		// Clear flag FIRST to prevent race conditions
		isLockdownInitiated = false;

		// Clear alarms
		if (browser.alarms) {
			Promise.allSettled([
				browser.alarms.clear('yakkl-lock-alarm'),
				browser.alarms.clear('yakkl-lock-notification')
			]).catch(() => {});
		}

		// Reset state
		previousState = 'active';

		log.info('[ContextTracker] Pending lockdown canceled');
	} catch (error) {
		log.error('[ContextTracker] Error canceling pending lockdown:', false, error);
	}
}

/**
 * Execute the actual lockdown
 */
async function executeLockdown(): Promise<void> {
	try {
		log.info('[ContextTracker] Executing lockdown');

		// Check if we have any protected contexts before proceeding
		const protectedContextsLocal = Array.from(activeContexts.values()).filter((context) =>
			needsIdleProtection(context.type)
		);

		if (protectedContextsLocal.length === 0) {
			log.info('[ContextTracker] No protected contexts found, skipping lockdown');
			isLockdownInitiated = false;
			return;
		}

		log.info(
			`[ContextTracker] Executing lockdown for ${protectedContextsLocal.length} protected context(s)`
		);

		// Send lockdown to all protected tabs
		const lockdownPromises = [];
		for (const context of protectedContextsLocal) {
			if (context.tabId) {
				lockdownPromises.push(
					browser.tabs
						.sendMessage(context.tabId, {
							type: 'lockdown',
							targetContextTypes: protectedContexts,
							timestamp: Date.now()
						})
						.catch((err) => {
							log.warn(
								`[ContextTracker] Failed to send lockdown to context ${context.id}:`,
								false,
								err
							);
						})
				);
			}
		}

		// Send all lockdown messages concurrently
		await Promise.allSettled(lockdownPromises);

		// Reset state
		isLockdownInitiated = false;
	} catch (error) {
		log.error('[ContextTracker] Error executing lockdown:', false, error);
		isLockdownInitiated = false;
	}
}

/**
 * Broadcast idle status to protected contexts only
 */
function broadcastIdleStatus(state: IdleState): void {
	try {
		// Get protected contexts
		const protectedContextsLocal = Array.from(activeContexts.values()).filter((context) =>
			needsIdleProtection(context.type)
		);

		if (protectedContextsLocal.length === 0) {
			log.debug('[ContextTracker] No protected contexts to broadcast to');
			return;
		}

		log.info(
			`[ContextTracker] Broadcasting idle status '${state}' to ${protectedContextsLocal.length} protected context(s)`
		);

		// Send directly to each known protected context with a tab ID
		const broadcastPromises = [];
		for (const context of protectedContextsLocal) {
			if (context.tabId && context.id) {
				broadcastPromises.push(
					browser.tabs
						.sendMessage(context.tabId, {
							type: 'IDLE_STATUS_CHANGED',
							state,
							timestamp: Date.now(),
							targetContextTypes: protectedContexts
						})
						.catch(() => {
							// Silently fail - tab might have been closed
						})
				);
			}
		}

		// Execute all broadcasts concurrently but don't wait for them
		Promise.allSettled(broadcastPromises).catch(() => {});
	} catch (error) {
		log.error('[ContextTracker] Error broadcasting idle status:', false, error);
	}
}

/**
 * Get a list of active contexts
 */
export function getActiveContexts() {
	try {
		return Array.from(activeContexts.entries()).map(([id, info]) => ({
			id,
			type: info.type,
			url: info.url,
			createdAt: new Date(info.createdAt).toISOString(),
			lastActive: new Date(info.lastActive).toISOString(),
			age: Math.floor((Date.now() - info.createdAt) / 1000) + 's'
		}));
	} catch (error) {
		log.error('[ContextTracker] Error getting active contexts:', false, error);
		return [];
	}
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
	try {
		return Array.from(activeContexts.values()).filter((context) => context.type === contextType);
	} catch (error) {
		log.error('[ContextTracker] Error getting contexts by type:', false, error);
		return [];
	}
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
	try {
		return Array.from(activeContexts.values()).filter((context) =>
			needsIdleProtection(context.type)
		).length;
	} catch (error) {
		log.error('[ContextTracker] Error getting protected context count:', false, error);
		return 0;
	}
}

/**
 * Get current idle status (for debugging)
 */
export function getIdleStatus(): any {
	try {
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
			recentMessagesCount: recentMessages.size,
			isProcessingStateChange,
			isCleaningUp,
			lastStateChangeTime,
			activeContexts: Array.from(activeContexts.entries()).map(([id, info]) => ({
				id,
				type: info.type,
				isProtected: needsIdleProtection(info.type),
				lastActivity: new Date(info.lastActive).toISOString(),
				idleFor: Math.round((Date.now() - info.lastActive) / 1000) + 's'
			})),
			protectedContexts: protectedContextsLocal
		};
	} catch (error) {
		log.error('[ContextTracker] Error getting idle status:', false, error);
		return {
			error: 'Failed to get idle status',
			timestamp: new Date().toISOString()
		};
	}
}

/**
 * Clear all tracked contexts (for debugging)
 */
export function clearAllContexts(): void {
	try {
		activeContexts.clear();
		recentMessages.clear();
		log.info('[ContextTracker] All contexts cleared');
	} catch (error) {
		log.error('[ContextTracker] Error clearing all contexts:', false, error);
	}
}

/**
 * Initialize debugging API
 */
function initializeDebugAPI(): void {
	try {
		// Expose for debugging in browser console
		if (typeof globalThis !== 'undefined') {
			(globalThis as any).YAKKLBackgroundDebug = {
				// Existing debugging functions
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
					handleStateChanged(state).catch((error) => {
						log.error('[Debug] Error in manual state change:', false, error);
					});
				},
				clearLockdown: () => {
					log.info('[Debug] Manually clearing lockdown state');
					isLockdownInitiated = false;
					cancelPendingLockdown();
					handleStateChanged('active').catch((error) => {
						log.error('[Debug] Error in manual clear lockdown:', false, error);
					});
				},
				clearAllContexts,
				recentMessagesCount: () => recentMessages.size,
				clearRecentMessages: () => recentMessages.clear(),

				// NEW: Enhanced idle detection debugging functions
				getDetailedIdleStatus: () => ({
					isLoginVerified,
					isLockdownInitiated,
					previousState,
					lastActivity,
					timeSinceLastActivity: Date.now() - lastActivity,
					idleThreshold,
					idleLockDelay,
					hasStateChangeListener: !!stateChangeListener,
					hasActivityCheckTimer: !!activityCheckTimer,
					browserIdleAPI: {
						available: !!(browser.idle && browser.idle.setDetectionInterval),
						hasOnStateChanged: !!(browser.idle && browser.idle.onStateChanged),
						hasQueryState: !!(browser.idle && browser.idle.queryState)
					},
					activeContexts: Array.from(activeContexts.values()).map((ctx) => ({
						id: ctx.id,
						type: ctx.type,
						isProtected: needsIdleProtection(ctx.type),
						lastActive: ctx.lastActive,
						timeSinceActive: Date.now() - ctx.lastActive
					}))
				}),

				// NEW: Manual idle detection testing
				manuallySetLoginVerified: (verified: boolean) => {
					log.info(`[Debug] 🔧 Manually setting login verified to: ${verified}`);
					setLoginVerified(verified, 'debug-manual');
				},

				manuallyStartIdleDetection: () => {
					log.info('[Debug] 🔧 Manually starting idle detection');
					startIdleDetection();
				},

				manuallyStopIdleDetection: () => {
					log.info('[Debug] 🔧 Manually stopping idle detection');
					stopIdleDetection();
				},

				// NEW: Test idle flow end-to-end
				testIdleFlow: async () => {
					log.info('[Debug] 🧪 TESTING COMPLETE IDLE FLOW');

					// 1. Check initial state
					const initialStatus = getIdleStatus();
					log.info('[Debug] 📊 Initial status:', false, initialStatus);

					// 2. Verify browser APIs
					const browserAPIs = {
						hasIdle: !!browser.idle,
						hasSetInterval: !!(browser.idle && browser.idle.setDetectionInterval),
						hasOnStateChanged: !!(browser.idle && browser.idle.onStateChanged),
						hasQueryState: !!(browser.idle && browser.idle.queryState)
					};
					log.info('[Debug] 🔍 Browser APIs:', false, browserAPIs);

					// 3. Test state query
					if (browser.idle && browser.idle.queryState) {
						const currentState = await browser.idle.queryState(Math.floor(idleThreshold / 1000));
						log.info('[Debug] 📊 Current browser idle state:', false, currentState);
					}

					// 4. Check contexts
					const contexts = Array.from(activeContexts.values());
					log.info('[Debug] 🎯 Active contexts:', false, contexts);

					// 5. Check protected contexts
					const protectedContexts = contexts.filter((ctx) => needsIdleProtection(ctx.type));
					log.info('[Debug] 🛡️ Protected contexts:', false, protectedContexts);

					return {
						initialStatus,
						browserAPIs,
						contexts,
						protectedContexts,
						recommendation:
							protectedContexts.length > 0 && browserAPIs.hasIdle
								? 'All components available for idle detection'
								: 'Missing components - see logs for details'
					};
				},

				// NEW: Simulate user activity
				simulateActivity: () => {
					log.info('[Debug] 🔧 Simulating user activity');
					lastActivity = Date.now();

					// Broadcast to all protected contexts
					const protectedContexts = Array.from(activeContexts.values()).filter((ctx) =>
						needsIdleProtection(ctx.type)
					);

					protectedContexts.forEach((ctx) => {
						if (ctx.tabId) {
							browser.tabs
								.sendMessage(ctx.tabId, {
									type: 'USER_ACTIVITY',
									timestamp: Date.now(),
									contextId: ctx.id,
									source: 'debug-simulation'
								})
								.catch(() => {}); // Ignore errors
						}
					});
				},

				// NEW: Force idle detection interval
				forceSetIdleInterval: (seconds: number) => {
					if (browser.idle && browser.idle.setDetectionInterval) {
						browser.idle.setDetectionInterval(seconds);
						log.info(`[Debug] 🔧 Forced idle detection interval to ${seconds} seconds`);
					} else {
						log.error('[Debug] ❌ Browser idle API not available');
					}
				},

				// NEW: Test the new idle warning notification system
				testIdleWarningNotification: (delaySeconds: number = 15) => {
					log.info(`[Debug] 🧪 Testing idle warning notification for ${delaySeconds} seconds`);

					// Send enhanced lockdown warning to UI contexts
					const protectedContexts = Array.from(activeContexts.values()).filter((ctx) =>
						needsIdleProtection(ctx.type)
					);

					protectedContexts.forEach((ctx) => {
						if (ctx.tabId) {
							browser.tabs
								.sendMessage(ctx.tabId, {
									type: 'LOCKDOWN_WARNING_ENHANCED',
									message: `Test idle warning notification - wallet will lock in ${delaySeconds} seconds`,
									timestamp: Date.now(),
									delayMs: delaySeconds * 1000,
									delaySeconds: delaySeconds,
									notificationId: `test-lockdown-warning-${Date.now()}`,
									windowFocused: false
								})
								.catch(() => {}); // Ignore errors
						}
					});
				}
			};

			log.info(
				'[ContextTracker] 🧰 Enhanced debug API available via YAKKLBackgroundDebug global object'
			);
			log.info(
				'[ContextTracker] 💡 Try: YAKKLBackgroundDebug.testIdleFlow() or YAKKLBackgroundDebug.getDetailedIdleStatus()'
			);
			log.info(
				'[ContextTracker] 🎯 NEW: YAKKLBackgroundDebug.testIdleWarningNotification(15) - Test new visual notification system!'
			);
		}
	} catch (error) {
		log.warn('[ContextTracker] Failed to initialize debug API:', false, error);
	}
}

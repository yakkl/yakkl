import { ListenerManager } from '$lib/managers/ListenerManager';
import { browser_ext, isBrowserEnv } from '$lib/common/environment'; // UI context only
import type { Runtime } from 'webextension-polyfill'; // Correct Type Import
import { startCheckPrices, stopCheckPrices } from '$lib/tokens/prices';
import { handleLockDown } from '$lib/common/handlers';
import { globalListenerManager } from '$lib/managers/GlobalListenerManager';
import { log } from '$lib/common/logger-wrapper';
import { NotificationService } from '$lib/common/notifications';
import { activeTabUIStore } from '$lib/common/stores';
import { addWindowListeners, removeWindowListeners } from './windowListeners';
import { safeLogout } from '$lib/common/safeNavigate';
import { protectedContexts } from '$lib/common/globals';
import { playBeep } from '$lib/common/sound';

export const uiListenerManager = new ListenerManager('ui');

// Register uiListenerManager globally
globalListenerManager.registerContext('ui', uiListenerManager);

// Track cleanup state to prevent race conditions
let isClearing = false;
let clearingPromise: Promise<void> | null = null;

// Get current context type
function getCurrentContextType(): string {
	try {
		if (typeof window === 'undefined') return 'unknown';

		const pathname = window.location.pathname;
		const href = window.location.href;

		if (pathname.includes('sidepanel') || href.includes('sidepanel')) {
			return 'sidepanel';
		} else if (
			pathname.includes('index.html') ||
			href.includes('index.html') ||
			pathname === '/' ||
			pathname === ''
		) {
			return 'popup-wallet';
		} else if (pathname.includes('dapp/popups') || href.includes('dapp/popups')) {
			return 'popup-dapp';
		} else {
			return 'popup-wallet'; // Default to popup-wallet for main extension
		}
	} catch (error) {
		return 'unknown';
	}
}

// Check if current context needs idle protection
function currentContextNeedsIdleProtection(): boolean {
	const contextType = getCurrentContextType();

	// If context is unknown but we're in an extension popup, assume it needs protection
	if (contextType === 'unknown' && typeof window !== 'undefined') {
		const href = window.location.href;
		if (
			href.includes('chrome-extension://') &&
			(href.includes('index.html') || href.endsWith('/'))
		) {
			return true; // Assume it's a popup-wallet
		}
	}

	return protectedContexts.includes(contextType);
}

// Check if message is targeted to this context type - be more permissive
function isMessageTargeted(message: any): boolean {
	// If no target context types specified, message is for all contexts
	if (!message.targetContextTypes || !Array.isArray(message.targetContextTypes)) {
		return true;
	}

	const currentContextType = getCurrentContextType();

	// If current context is unknown but we're in a popup, assume it's popup-wallet
	const effectiveContextType =
		currentContextType === 'unknown' ? 'popup-wallet' : currentContextType;

	log.debug(`[uiListeners] Message targeting check:`, false, {
		messageTargets: message.targetContextTypes,
		currentContext: currentContextType,
		effectiveContext: effectiveContextType,
		isTargeted: message.targetContextTypes.includes(effectiveContextType)
	});

	return message.targetContextTypes.includes(effectiveContextType);
}

/**
 * Centralized cleanup function to avoid race conditions
 */
async function performEnhancedCleanup(source: string = 'unknown'): Promise<void> {
	// Prevent multiple simultaneous cleanup operations
	if (isClearing) {
		log.info(`[uiListeners] Already clearing alerts from ${source}, waiting for completion`);
		if (clearingPromise) {
			await clearingPromise;
		}
		return;
	}

	isClearing = true;
	clearingPromise = _performCleanup(source);

	try {
		await clearingPromise;
	} finally {
		isClearing = false;
		clearingPromise = null;
	}
}

/**
 * Internal cleanup implementation
 */
async function _performCleanup(source: string): Promise<void> {
	try {
		log.info(`[uiListeners] Starting enhanced cleanup from: ${source}`);

		// 1. Clear badge and reset icon FIRST (most visible to user)
		if (browser_ext?.action) {
			try {
				await browser_ext.action.setBadgeText({ text: '' });
				await browser_ext.action.setIcon({
					path: {
						16: '/images/logoBullFav16x16.png',
						32: '/images/logoBullFav32x32.png',
						48: '/images/logoBullFav48x48.png',
						96: '/images/logoBullFav96x96.png',
						128: '/images/logoBullFav128x128.png'
					}
				});
				log.info('[uiListeners] Badge and icon cleared');
			} catch (error) {
				log.warn('[uiListeners] Error clearing badge/icon:', false, error);
			}
		}

		// 2. Clear any browser notifications
		if (browser_ext?.notifications) {
			try {
				const notifications = await browser_ext.notifications.getAll();
				log.info(`[uiListeners] Found ${Object.keys(notifications).length} notifications to clear`);

				const clearPromises = Object.keys(notifications).map((id) =>
					browser_ext.notifications.clear(id).catch(() => {})
				);
				await Promise.all(clearPromises);
				log.info('[uiListeners] Browser notifications cleared');
			} catch (error) {
				log.warn('[uiListeners] Error clearing notifications:', false, error);
			}
		}

		// 3. Stop any playing sounds and close audio contexts
		if (typeof window !== 'undefined') {
			try {
				// Close any audio contexts we might have created
				const audioContext = (window as any).__yakklAudioContext;
				if (audioContext && audioContext.state !== 'closed') {
					await audioContext.close();
					(window as any).__yakklAudioContext = null;
					log.info('[uiListeners] Audio context closed');
				}

				// Clear any stored audio elements
				const audioElements = document.querySelectorAll('audio[data-yakkl-sound]');
				audioElements.forEach((audio) => {
					(audio as HTMLAudioElement).pause();
					audio.remove();
				});

				if (audioElements.length > 0) {
					log.info(`[uiListeners] Cleared ${audioElements.length} audio elements`);
				}
			} catch (e) {
				log.warn('Audio cleanup error (may be normal):', false, e);
			}
		}

		// 4. Clear in-app security warning
		if (typeof window !== 'undefined') {
			try {
				const { hideSecurityWarning } = await import('$lib/common/stores/securityWarning');
				hideSecurityWarning();
				log.info('[uiListeners] In-app security warning cleared');
			} catch (e) {
				log.warn('Error clearing security warning:', false, e);
			}
		}

		// 5. Clear title flash and restore original title
		if (typeof window !== 'undefined') {
			try {
				// Clear any title flash intervals
				if ((window as any).__yakklTitleFlashInterval) {
					clearInterval((window as any).__yakklTitleFlashInterval);
					(window as any).__yakklTitleFlashInterval = null;
					log.info('[uiListeners] Title flash interval cleared');
				}

				// Restore original title if it was changed
				if ((window as any).__yakklOriginalTitle) {
					document.title = (window as any).__yakklOriginalTitle;
					(window as any).__yakklOriginalTitle = null;
					log.info('[uiListeners] Original title restored');
				} else if (document.title.includes('🚨 URGENT')) {
					// Fallback title restoration
					document.title = document.title.replace(/🚨 URGENT[^!]*!/g, '').trim() || 'YAKKL Wallet';
					log.info('[uiListeners] Title cleaned up (fallback)');
				}
			} catch (e) {
				log.warn('Title cleanup error:', false, e);
			}
		}

		// 6. Clear any countdown timers and intervals
		if (typeof window !== 'undefined') {
			try {
				// Clear countdown interval
				if ((window as any).__yakklCountdownInterval) {
					clearInterval((window as any).__yakklCountdownInterval);
					(window as any).__yakklCountdownInterval = null;
					log.info('[uiListeners] Countdown interval cleared');
				}

				// Clear any other YAKKL-specific intervals
				if ((window as any).__yakklIntervals) {
					const intervals = (window as any).__yakklIntervals as number[];
					intervals.forEach((id) => clearInterval(id));
					(window as any).__yakklIntervals = [];
					log.info(`[uiListeners] Cleared ${intervals.length} stored intervals`);
				}
			} catch (e) {
				log.warn('Interval cleanup error:', false, e);
			}
		}

		// 7. Clear any pending alarms
		if (browser_ext?.alarms) {
			try {
				await Promise.all([
					browser_ext.alarms.clear('yakkl-lock-alarm').catch(() => {}),
					browser_ext.alarms.clear('yakkl-lock-notification').catch(() => {})
				]);
				log.info('[uiListeners] Alarms cleared');
			} catch (error) {
				log.debug('Alarm clearing error:', false, error);
			}
		}

		// 8. Use NotificationService centralized cleanup
		try {
			await NotificationService.clearAllAlertsEnhanced();
			log.info('[uiListeners] NotificationService cleanup completed');
		} catch (error) {
			log.warn('[uiListeners] NotificationService cleanup error:', false, error);
		}

		log.info(`[uiListeners] Enhanced cleanup completed successfully from: ${source}`);
	} catch (error) {
		log.warn(`[uiListeners] Enhanced cleanup failed from ${source}:`, false, error);
		throw error;
	}
}

export async function handleOnActiveTabUIChanged(
	message: any,
	sender: Runtime.MessageSender,
	sendResponse: (response?: any) => void
): Promise<any> {
	try {
		if (!browser_ext) return undefined;
		switch (message.type) {
			case 'setActiveTab': {
				try {
					activeTabUIStore.set(message.activeTab);
					sendResponse({ success: true });
				} catch (error) {
					log.warn('Error on active tab change:', true, error);
					sendResponse({ success: false, error: error });
				}
				return true; // Indicate asynchronous response
			}
			default: {
				return false; // Let other listeners handle it
			}
		}
	} catch (error: any) {
		log.warn('Error handling setActiveTab message:', true, error);
		if (isBrowserEnv())
			sendResponse({ success: false, error: error?.message || 'Unknown error occurred.' });
		return true; // Indicate asynchronous response
	}
}

export async function handleOnMessageForExtension(
	message: any,
	sender: Runtime.MessageSender,
	sendResponse: (response?: any) => void
): Promise<any> {
	try {
		if (!browser_ext) return undefined;

		// Enhanced logging for ALL messages
		log.info('[uiListeners] Received message:', false, {
			type: message.type,
			currentContext: getCurrentContextType(),
			needsProtection: currentContextNeedsIdleProtection(),
			isTargeted: isMessageTargeted(message),
			messageData: message
		});

		switch (message.type) {
			case 'lockdown': {
				log.info('[uiListeners] Processing LOCKDOWN message', false, {
					context: getCurrentContextType(),
					needsProtection: currentContextNeedsIdleProtection(),
					isTargeted: isMessageTargeted(message)
				});

				// Only handle lockdown if this context needs protection AND message is targeted to us
				if (!currentContextNeedsIdleProtection()) {
					log.info(
						'[uiListeners] Ignoring lockdown - context does not need idle protection:',
						false,
						getCurrentContextType()
					);
					return false; // Let other listeners handle it if any
				}

				if (!isMessageTargeted(message)) {
					log.info(
						'[uiListeners] Ignoring lockdown - not targeted to this context type:',
						false,
						getCurrentContextType()
					);
					return false;
				}

				log.info(
					'[uiListeners] EXECUTING lockdown for protected context:',
					false,
					getCurrentContextType()
				);

				try {
					// Execute all preliminary operations
					await Promise.all([
						browser_ext.runtime.sendMessage({ type: 'stopPricingChecks' }).catch(() => {}),
						handleLockDown()
					]);

					// Use ENHANCED security alert for lockdown
					await NotificationService.sendSecurityAlertEnhanced(
						'YAKKL Wallet locked due to inactivity. \nTo prevent unauthorized transactions, your wallet has been locked and logged out.',
						{ contextMessage: 'Click extension icon to relaunch' }
					);

					// Send the response before logout
					sendResponse({ success: true, message: 'Lockdown initiated.' });

					// Delay logout slightly to ensure response is sent
					setTimeout(() => safeLogout(), 50);

					// Return true to indicate we're using the sendResponse callback
					return true;
				} catch (error: any) {
					log.warn('Lockdown failed:', false, error);
					sendResponse({ success: false, error: error.message || 'Lockdown failed' });
					return true;
				}
			}

			case 'lockdownImminent': {
				log.info('[uiListeners] Processing LOCKDOWN IMMINENT message', false, {
					context: getCurrentContextType(),
					needsProtection: currentContextNeedsIdleProtection(),
					isTargeted: isMessageTargeted(message),
					enhanced: message.enhanced,
					delayMs: message?.delayMs
				});

				// Only handle lockdown warning if this context needs protection AND message is targeted to us
				if (!currentContextNeedsIdleProtection()) {
					log.info(
						'[uiListeners] Ignoring lockdownImminent - context does not need idle protection:',
						false,
						getCurrentContextType()
					);
					return false; // Let other listeners handle it if any
				}

				if (!isMessageTargeted(message)) {
					log.info(
						'[uiListeners] Ignoring lockdownImminent - not targeted to this context type:',
						false,
						getCurrentContextType()
					);
					return false;
				}

				log.info(
					'[uiListeners] EXECUTING lockdownImminent for protected context:',
					false,
					getCurrentContextType()
				);

				try {
					// Check if this is an enhanced lockdown warning request
					if (message.enhanced) {
						log.info('[uiListeners] Using ENHANCED lockdown warning with full attention features');

						// Use the enhanced version with icon changes, badge countdown, focus, etc.
						await NotificationService.sendLockdownWarningEnhanced(message?.delayMs || 30000, {
							contextMessage: 'Use YAKKL before timeout to stop lockdown'
						});
					} else {
						log.info('[uiListeners] Using standard lockdown warning');

						// Use the original version
						await NotificationService.sendLockdownWarning(message?.delayMs || 30000, {
							contextMessage: 'Use YAKKL before timeout to stop lockdown'
						});
					}

					log.info('[uiListeners] NotificationService.sendLockdownWarning completed');
					sendResponse({ success: true, message: 'Imminent lockdown notification sent.' });
					return true;
				} catch (error: any) {
					log.warn('[uiListeners] Lockdown imminent failed:', false, error);
					sendResponse({ success: false, error: error.message || 'Lockdown imminent failed' });
					return true;
				}
			}

			case 'LOCKDOWN_WARNING_ENHANCED': {
				log.info('[uiListeners] Processing ENHANCED LOCKDOWN WARNING message', false, {
					context: getCurrentContextType(),
					delayMs: message.delayMs,
					windowFocused: message.windowFocused
				});

				if (!currentContextNeedsIdleProtection()) {
					log.info(
						'[uiListeners] Ignoring enhanced lockdown warning - context does not need protection'
					);
					return false;
				}

				try {
					// 1. Focus window and get attention
					if (typeof window !== 'undefined') {
						window.focus();

						// Flash document title for attention
						const originalTitle = document.title;
						let flashCount = 0;
						const flashInterval = setInterval(() => {
							document.title =
								flashCount % 2 === 0 ? '🚨 URGENT - YAKKL Security Alert!' : originalTitle;
							flashCount++;

							if (flashCount >= 10) {
								// Flash 5 times
								clearInterval(flashInterval);
								document.title = originalTitle;
							}
						}, 500);

						// Store for cleanup
						(window as any).__yakklTitleFlashInterval = flashInterval;
						(window as any).__yakklOriginalTitle = originalTitle;
					}

					// 2. Show enhanced in-app security warning
					if (typeof window !== 'undefined') {
						const { showSecurityWarning } = await import('$lib/common/stores/securityWarning');
						showSecurityWarning(message.delaySeconds || Math.ceil(message.delayMs / 1000), () => {
							log.info('[uiListeners] Enhanced security warning completed');
						});
					}

					log.info('[uiListeners] Enhanced lockdown warning processed');
					sendResponse({ success: true, message: 'Enhanced lockdown warning displayed.' });
					return true;
				} catch (error: any) {
					log.warn('[uiListeners] Enhanced lockdown warning failed:', false, error);
					sendResponse({ success: false, error: error.message });
					return true;
				}
			}

			case 'SECURITY_ALERT_ENHANCED': {
				log.info('[uiListeners] Processing ENHANCED SECURITY ALERT message');

				if (!currentContextNeedsIdleProtection()) {
					return false;
				}

				try {
					// Focus window
					if (typeof window !== 'undefined') {
						window.focus();
					}

					// Show enhanced security alert using existing method
					await NotificationService.sendSecurityAlert(message.message, message.options, message.id);

					log.info('[uiListeners] Enhanced security alert processed');
					sendResponse({ success: true });
					return true;
				} catch (error: any) {
					log.warn('[uiListeners] Enhanced security alert failed:', false, error);
					sendResponse({ success: false, error: error.message });
					return true;
				}
			}

			case 'PLAY_URGENT_SOUND': {
				try {
					if (typeof window !== 'undefined' && window.AudioContext) {
						playBeep(800, 0.2, 0.3);
					}
					sendResponse({ success: true });
					return true;
				} catch (error: any) {
					sendResponse({ success: false, error: error.message });
					return true;
				}
			}

			case 'CLEAR_ALL_ENHANCED_ALERTS': {
				log.info('[uiListeners] Received CLEAR_ALL_ENHANCED_ALERTS message', false, {
					context: getCurrentContextType(),
					source: message.source,
					timestamp: message.timestamp
				});

				try {
					// Use centralized cleanup to avoid race conditions
					await performEnhancedCleanup(`message_${message.source || 'unknown'}`);

					log.info('[uiListeners] All enhanced alerts cleared successfully');
					sendResponse({ success: true });
					return true;
				} catch (error: any) {
					log.warn('[uiListeners] Failed to clear enhanced alerts:', false, error);
					sendResponse({ success: false, error: error.message });
					return true;
				}
			}

			case 'CLEAR_NOTIFICATION': {
				log.info('[uiListeners] Handling CLEAR_NOTIFICATION:', false, message.notificationId);

				try {
					// Clear the specific notification
					if (browser_ext.notifications && message.notificationId) {
						await browser_ext.notifications.clear(message.notificationId);
					}

					// May not be needed - but clear badge just in case
					if (browser_ext.action) {
						await browser_ext.action.setBadgeText({ text: '' });
						await browser_ext.action.setIcon({
							path: {
								16: '/images/logoBullFav16x16.png',
								32: '/images/logoBullFav32x32.png',
								48: '/images/logoBullFav48x48.png',
								96: '/images/logoBullFav96x96.png',
								128: '/images/logoBullFav128x128.png'
							}
						});
					}

					sendResponse({ success: true, message: 'Notification cleared from UI' });
				} catch (error: any) {
					log.warn('[uiListeners] Error clearing notification:', false, error);
					sendResponse({ success: false, error: error.message });
				}
				return true;
			}

			case 'CLEAR_NOTIFICATION_ENHANCED': {
				log.info('[uiListeners] Clearing enhanced notification:', false, message.notificationId);

				try {
					// Clear the specific notification
					if (browser_ext.notifications && message.notificationId) {
						await browser_ext.notifications.clear(message.notificationId);
					}

					// If it's a lockdown warning, clear enhanced features
					if (message.notificationId.includes('lockdown-warning')) {
						await performEnhancedCleanup('enhanced_notification_clear');
					}

					log.info('[uiListeners] Enhanced notification cleared');
					sendResponse({ success: true });
					return true;
				} catch (error: any) {
					log.warn('[uiListeners] Failed to clear enhanced notification:', false, error);
					sendResponse({ success: false, error: error.message });
					return true;
				}
			}

			case 'focusWindow': {
				log.info('[uiListeners] Processing FOCUS WINDOW message');

				try {
					// Try to focus the current window
					if (typeof window !== 'undefined') {
						window.focus();

						// If the window is minimized or hidden, try to bring it to front
						if (document.hidden || document.visibilityState === 'hidden') {
							// Request user attention
							if ('requestIdleCallback' in window) {
								requestIdleCallback(() => {
									window.focus();
								});
							}

							// Try to use the Page Visibility API to detect when visible
							const handleVisibilityChange = () => {
								if (!document.hidden) {
									window.focus();
									document.removeEventListener('visibilitychange', handleVisibilityChange);
								}
							};
							document.addEventListener('visibilitychange', handleVisibilityChange);

							// Clean up listener after 30 seconds
							setTimeout(() => {
								document.removeEventListener('visibilitychange', handleVisibilityChange);
							}, 30000);
						}

						// Flash the document title to get attention
						const originalTitle = document.title;
						let flashCount = 0;
						const flashInterval = setInterval(() => {
							document.title =
								flashCount % 2 === 0 ? '🚨 URGENT - YAKKL Security Alert!' : originalTitle;
							flashCount++;

							if (flashCount >= 10) {
								// Flash 5 times
								clearInterval(flashInterval);
								document.title = originalTitle;
							}
						}, 500);

						// Store for cleanup
						(window as any).__yakklTitleFlashInterval = flashInterval;
						(window as any).__yakklOriginalTitle = originalTitle;

						log.info('✅ [uiListeners] Window focus and attention requested');
					}

					sendResponse({ success: true, message: 'Window focus requested.' });
					return true;
				} catch (error: any) {
					log.warn('[uiListeners] Focus window failed:', false, error);
					sendResponse({ success: false, error: error.message || 'Focus window failed' });
					return true;
				}
			}

			case 'clearAllAlerts': {
				log.info('[uiListeners] Processing CLEAR ALL ALERTS message');

				try {
					// Use centralized cleanup
					await performEnhancedCleanup('clearAllAlerts_message');

					log.info('[uiListeners] All alerts cleared');
					sendResponse({ success: true, message: 'All alerts cleared.' });
					return true;
				} catch (error: any) {
					log.warn('[uiListeners] Clear alerts failed:', false, error);
					sendResponse({ success: false, error: error.message || 'Clear alerts failed' });
					return true;
				}
			}

			case 'IDLE_STATUS_CHANGED': {
				log.info('[uiListeners] Processing IDLE STATUS CHANGED message', false, {
					state: message.state,
					context: getCurrentContextType(),
					needsProtection: currentContextNeedsIdleProtection(),
					isTargeted: isMessageTargeted(message),
					isClearing: isClearing
				});

				// Only handle idle status changes for protected contexts
				if (!currentContextNeedsIdleProtection()) {
					log.debug(
						'[uiListeners] Ignoring idle status change - context does not need idle protection:',
						false,
						getCurrentContextType()
					);
					return false;
				}

				if (!isMessageTargeted(message)) {
					log.debug(
						'[uiListeners] Ignoring idle status change - not targeted to this context type:',
						false,
						getCurrentContextType()
					);
					return false;
				}

				// Handle idle status change for protected contexts
				log.info(
					`[uiListeners] PROCESSING idle status changed to ${message.state} for protected context ${getCurrentContextType()}`
				);

				// If becoming active, clear all enhanced alerts
				if (message.state === 'active') {
					log.info('[uiListeners] Active state detected, performing centralized cleanup');

					try {
						// Use centralized cleanup to avoid race conditions
						await performEnhancedCleanup('idle_status_active');
						log.info('[uiListeners] Centralized cleanup completed for active state');
					} catch (error) {
						log.warn('[uiListeners] Failed to perform centralized cleanup:', false, error);
					}
				}

				// Dispatch event for UI components
				if (typeof window !== 'undefined') {
					log.info('[uiListeners] Dispatching yakklIdleStateChanged event');
					window.dispatchEvent(
						new CustomEvent('yakklIdleStateChanged', {
							detail: {
								state: message.state,
								timestamp: message.timestamp
							}
						})
					);
				}

				return false; // Allow other listeners to process this message
			}

			default: {
				log.debug(`[uiListeners] Unhandled message type: ${message.type}`);
				return false; // Let other listeners handle it
			}
		}
	} catch (e: any) {
		log.warn('[uiListeners] Error handling message:', false, e);
		if (isBrowserEnv())
			sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
		return true; // Indicate asynchronous response
	}
}

// Message handler for pricing checks
export function handleOnMessageForPricing(
	message: any,
	sender: Runtime.MessageSender,
	sendResponse: (response?: any) => void
): boolean | any {
	if (!browser_ext) return false;

	try {
		switch (message.type) {
			case 'startPricingChecks': {
				startCheckPrices();
				sendResponse({ success: true, message: 'Price checks initiated.' });
				return true;
			}
			case 'stopPricingChecks': {
				stopCheckPrices();
				sendResponse({ success: true, message: 'Stop price checks initiated.' });
				return true;
			}
			default: {
				return false; // Let other listeners handle it
			}
		}
	} catch (e: any) {
		log.warn('Error handling message:', e);
		if (isBrowserEnv())
			sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
		return true; // Indicate asynchronous response
	}
}

export function addUIListeners() {
	if (!browser_ext) return;

	log.info('[uiListeners] Adding UI listeners for context:', false, getCurrentContextType());

	uiListenerManager.add(browser_ext.runtime.onMessage, handleOnActiveTabUIChanged);
	uiListenerManager.add(browser_ext.runtime.onMessage, handleOnMessageForExtension);
	uiListenerManager.add(browser_ext.runtime.onMessage, handleOnMessageForPricing);

	addWindowListeners();
}

export function removeUIListeners() {
	if (!browser_ext) return;
	log.info('[uiListeners] Removing UI listeners');
	uiListenerManager.removeAll();
	removeWindowListeners();
}

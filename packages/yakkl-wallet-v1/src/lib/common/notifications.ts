import type {
	BasicNotificationOptions,
	CreateNotificationOptions,
	ImageNotificationOptions,
	ListNotificationOptions,
	NotificationOptions,
	ProgressNotificationOptions
} from './types';
import { startLockIconTimer, stopLockIconTimer } from '$lib/extensions/chrome/iconTimer';
import { browser_ext } from './environment';
import { log } from '$lib/common/logger-wrapper';
import type { Notifications } from 'webextension-polyfill';
import { setBadgeText } from '$lib/utilities';

const DEFAULT_ICON = '/images/logoBullLock48x48.png';

// List of notification IDs that have been used
// Helpful for tracking and cleaning up notifications
const activeNotifications = new Set<string>();

// Flexible notification service class
export class NotificationService {
	private static readonly DEFAULT_ID = 'yakkl-notification';
	private static readonly DEFAULT_ICON = '/images/logoBullLock48x48.png';
	private static clearTimeout: number | null = null;

	// Enhanced features tracking
	private static _badgeCountdownInterval: number | null = null;
	private static _urgentSoundContext: AudioContext | null = null;
	private static _isClearing: boolean = false;
	private static _clearingPromise: Promise<void> | null = null;

	// Notifications that should be shown in-app and as browser notifications
	private static readonly IMPORTANT_NOTIFICATIONS = [
		'security-alert',
		'lockdown-warning',
		'wallet-locked'
	];

	private static async createNotification(
		options: NotificationOptions,
		id?: string
	): Promise<string | null> {
		if (!browser_ext) return null;

		try {
			const notificationId = id || this.DEFAULT_ID;
			const notificationOptions: CreateNotificationOptions = {
				...options,
				iconUrl: browser_ext.runtime.getURL(this.DEFAULT_ICON),
				// Force specific settings for important notifications
				...(this.IMPORTANT_NOTIFICATIONS.some((prefix) => notificationId.startsWith(prefix))
					? {
							requireInteraction: true,
							priority: 2,
							silent: false,
							eventTime: Date.now() // Set event time to now for better visibility
						}
					: {})
			};

			log.info('createNotification - notificationOptions:', false, notificationOptions);

			// Create the notification
			await browser_ext.notifications.create(notificationId, notificationOptions);

			// Track this notification
			activeNotifications.add(notificationId);

			// For important notifications, also send a message to UI contexts
			if (this.IMPORTANT_NOTIFICATIONS.some((prefix) => notificationId.startsWith(prefix))) {
				this.broadcastNotificationToUI(notificationId, notificationOptions);
			}

			return notificationId;
		} catch (error) {
			log.warn('Error creating notification:', false, error);
			return null;
		}
	}

	/**
	 * Broadcast important notifications to UI contexts
	 * This ensures they're visible even when the browser doesn't show the notification
	 */
	private static broadcastNotificationToUI(id: string, options: CreateNotificationOptions): void {
		if (!browser_ext) return;

		try {
			browser_ext.runtime
				.sendMessage({
					type: 'IMPORTANT_NOTIFICATION',
					notificationId: id,
					title: options.title,
					message: options.message,
					options: {
						requireInteraction: options.requireInteraction,
						priority: options.priority,
						silent: options.silent
					},
					timestamp: Date.now()
				})
				.catch((error) => {
					log.debug('Error broadcasting notification to UI:', false, error);
					// Don't throw - this is just a backup notification channel
				});
		} catch (error) {
			// Ignore errors - this is just a backup notification channel
		}
	}

	/**
	 * Clear a notification by ID
	 * @param id The notification ID to clear
	 * @returns Promise that resolves when the notification is cleared
	 */
	static async clear(id: string = this.DEFAULT_ID): Promise<boolean> {
		if (!browser_ext) return false;

		try {
			await browser_ext.notifications.clear(id);
			activeNotifications.delete(id);

			// Also clear from UI contexts
			try {
				browser_ext.runtime
					.sendMessage({
						type: 'CLEAR_NOTIFICATION',
						notificationId: id,
						timestamp: Date.now()
					})
					.catch(() => {
						// Ignore errors
					});
			} catch (e) {
				// Ignore errors
			}

			return true;
		} catch (error) {
			log.warn('Error clearing notification:', false, { id, error });
			return false;
		}
	}

	/**
	 * Clear all active notifications
	 */
	static async clearAll(): Promise<void> {
		if (!browser_ext) return;

		const notifications = [...activeNotifications];
		for (const id of notifications) {
			await this.clear(id);
		}
	}

	/**
	 * Send a basic notification
	 */
	static async sendBasic(
		title: string,
		message: string,
		options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {},
		id?: string
	): Promise<string | null> {
		log.info('sendBasic - title:', false, title);

		return await this.createNotification(
			{
				type: 'basic',
				title,
				message,
				...options
			} as BasicNotificationOptions,
			id
		);
	}

	/**
	 * Send a list notification
	 */
	static async sendList(
		title: string,
		message: string,
		items: Array<{ title: string; message: string }>,
		options: Partial<Omit<ListNotificationOptions, 'type' | 'title' | 'message' | 'items'>> = {},
		id?: string
	): Promise<string | null> {
		return await this.createNotification(
			{
				type: 'list',
				title,
				message,
				items,
				...options
			} as ListNotificationOptions,
			id
		);
	}

	/**
	 * Send an image notification
	 */
	static async sendImage(
		title: string,
		message: string,
		imageUrl: string,
		options: Partial<
			Omit<ImageNotificationOptions, 'type' | 'title' | 'message' | 'imageUrl'>
		> = {},
		id?: string
	): Promise<string | null> {
		return await this.createNotification(
			{
				type: 'image',
				title,
				message,
				imageUrl,
				...options
			} as ImageNotificationOptions,
			id
		);
	}

	/**
	 * Send a progress notification
	 */
	static async sendProgress(
		title: string,
		message: string,
		progress: number,
		options: Partial<
			Omit<ProgressNotificationOptions, 'type' | 'title' | 'message' | 'progress'>
		> = {},
		id?: string
	): Promise<string | null> {
		return await this.createNotification(
			{
				type: 'progress',
				title,
				message,
				progress: Math.max(0, Math.min(100, progress)),
				...options
			} as ProgressNotificationOptions,
			id
		);
	}

	/**
	 * Send a security alert with enhanced visibility
	 */
	static async sendSecurityAlert(
		message: string,
		options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {},
		id?: string
	): Promise<string | null> {
		log.info('sendSecurityAlert - message:', false, message);

		const notificationId = id || `security-alert-${Date.now()}`;

		// Ensure specific options for security alerts
		const enhancedOptions = {
			requireInteraction: true, // Keep notification visible until user interacts
			priority: 2 as const, // High priority
			silent: false, // Play sound
			iconUrl: browser_ext?.runtime.getURL('/images/logoBullLock48x48.png'),
			type: 'basic',
			...options,
			// Critical options that help visibility:
			eventTime: Date.now() // Set event time to now
		};

		try {
			// First try creating a notification through our standard method
			const result = await this.sendBasic(
				'🔒 Security Alert',
				message,
				enhancedOptions,
				notificationId
			);

			// Double ensure that the UI gets notified about this important message
			// This helps with visibility when the browser notification might be suppressed
			if (
				browser_ext &&
				this.IMPORTANT_NOTIFICATIONS.some((prefix) => notificationId.startsWith(prefix))
			) {
				try {
					browser_ext.runtime
						.sendMessage({
							type: 'SECURITY_ALERT',
							message: message,
							options: enhancedOptions,
							id: notificationId,
							timestamp: Date.now()
						})
						.catch(() => {
							// Ignore errors, this is just a backup
						});
				} catch (e) {
					// Ignore errors in the backup notification method
				}
			}

			return result;
		} catch (error) {
			log.warn('Failed to send security alert notification:', false, error);
			return null;
		}
	}

	/**
	 * Send an imminent lockdown warning notification
	 * @param delayMs Time in ms until lockdown occurs
	 */
	static async sendLockdownWarning(
		delayMs: number = 30000,
		options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {}
	): Promise<string | null> {
		const message = `YAKKL will be locked soon due to inactivity. You have ${Math.round(delayMs / 1000)} seconds remaining.`;

		// Create a unique ID for this lockdown warning
		const notificationId = `lockdown-warning-${Date.now()}`;

		// Send notification
		const result = await this.sendSecurityAlert(
			message,
			{
				contextMessage: 'Use YAKKL to prevent automatic lockdown',
				requireInteraction: true,
				priority: 2,
				...options
			},
			notificationId
		);

		// Also send a special lockdown warning message that the UI can display prominently
		if (browser_ext) {
			try {
				browser_ext.runtime
					.sendMessage({
						type: 'LOCKDOWN_WARNING',
						message: message,
						timestamp: Date.now(),
						delayMs: delayMs
					})
					.catch((e) => {
						// Ignore errors
						log.debug('Error sending lockdown warning message:', false, e);
					});
			} catch (e) {
				// Ignore errors
				log.debug('Error sending lockdown warning message:', false, e);
			}
		}

		return result;
	}

	/**
	 * Send a wallet locked notification
	 */
	static async sendWalletLocked(
		options: Partial<Omit<BasicNotificationOptions, 'type' | 'title' | 'message'>> = {}
	): Promise<string | null> {
		return await this.sendSecurityAlert(
			'Your YAKKL wallet has been locked due to inactivity.',
			{
				requireInteraction: false, // Don't need interaction for this one
				priority: 2,
				...options
			},
			'wallet-locked'
		);
	}

	/**
	 * Enhanced window focus method - brings popup to front and gets attention
	 */
	private static async focusPopupWindowEnhanced(): Promise<boolean> {
		try {
			if (!browser_ext?.windows) return false;

			// Get all windows
			const windows = await browser_ext.windows.getAll({ windowTypes: ['popup'] });

			// Find our extension popup window
			const extensionWindow = windows.find(
				(window) =>
					window.type === 'popup' &&
					window.tabs?.some((tab) => tab.url?.includes(browser_ext.runtime.id))
			);

			if (extensionWindow?.id) {
				// Bring window to front and focus it
				await browser_ext.windows.update(extensionWindow.id, {
					focused: true,
					drawAttention: true
				});

				log.info('[NotificationService] Popup window focused and attention drawn');
				return true;
			} else {
				log.debug('[NotificationService] Extension popup window not found');
				return false;
			}
		} catch (error) {
			log.warn('[NotificationService] Failed to focus popup window:', false, error);
			return false;
		}
	}

	/**
	 * Enhanced badge management - sets urgent state with countdown
	 */
	private static async setUrgentBadgeEnhanced(badgeText: string = '⚠️'): Promise<void> {
		try {
			if (!browser_ext?.action) return;

			// Set badge with warning
			await browser_ext.action.setBadgeText({ text: badgeText });
			await browser_ext.action.setBadgeBackgroundColor({ color: '#ff0000' });

			// Try to change icon to indicate urgency (if urgent icons exist)
			try {
				await browser_ext.action.setIcon({
					path: {
						16: '/images/logoUrgentBullUnlock16x16.png',
						32: '/images/logoUrgentBullUnlock32x32.png',
						48: '/images/logoUrgentBullUnlock48x48.png',
						96: '/images/logoUrgentBullUnlock96x96.png',
						128: '/images/logoUrgentBullUnlock128x128.png'
					}
				});
			} catch (iconError) {
				// Fallback to default icon if urgent icons don't exist
				log.debug('[NotificationService] Urgent icons not found, using default');
			}

			log.info('[NotificationService] Enhanced urgent badge state set');
		} catch (error) {
			log.warn('[NotificationService] Failed to set enhanced urgent badge:', false, error);
		}
	}

	/**
	 * Enhanced badge countdown - shows remaining time with proper cleanup
	 */
	private static startBadgeCountdownEnhanced(seconds: number): void {
		// Clear any existing countdown first
		this.clearBadgeCountdown();

		let timeLeft = seconds;

		if (typeof window !== 'undefined') {
			this._badgeCountdownInterval = window.setInterval(async () => {
				timeLeft--;

				if (timeLeft <= 0) {
					this.clearBadgeCountdown();
					await this.clearUrgentBadgeEnhanced();
					return;
				}

				// Update badge with remaining time
				if (browser_ext?.action) {
					try {
						await browser_ext.action.setBadgeText({ text: timeLeft.toString() });

						// Change badge color as time gets more urgent
						if (timeLeft <= 5) {
							await browser_ext.action.setBadgeBackgroundColor({ color: '#ff0000' }); // Red
						} else if (timeLeft <= 10) {
							await browser_ext.action.setBadgeBackgroundColor({ color: '#ff8800' }); // Orange
						} else {
							await browser_ext.action.setBadgeBackgroundColor({ color: '#ffaa00' }); // Yellow
						}
					} catch (error) {
						log.debug('Badge update failed:', false, error);
					}
				}
			}, 1000);

			log.info('[NotificationService] Badge countdown started:', false, {
				seconds,
				intervalId: this._badgeCountdownInterval
			});
		}
	}

	/**
	 * Clear badge countdown interval
	 */
	private static clearBadgeCountdown(): void {
		if (this._badgeCountdownInterval) {
			clearInterval(this._badgeCountdownInterval);
			this._badgeCountdownInterval = null;
			setBadgeText('');
			log.info('[NotificationService] Badge countdown interval cleared');
		}
	}

	/**
	 * Clear enhanced urgent badge state
	 */
	private static async clearUrgentBadgeEnhanced(): Promise<void> {
		try {
			if (!browser_ext?.action) return;

			// Clear badge countdown first
			this.clearBadgeCountdown();

			// Clear badge
			await browser_ext.action.setBadgeText({ text: '' });

			// Restore normal icon
			await browser_ext.action.setIcon({
				path: {
					16: '/images/logoBullFav16x16.png',
					32: '/images/logoBullFav32x32.png',
					48: '/images/logoBullFav48x48.png',
					96: '/images/logoBullFav96x96.png',
					128: '/images/logoBullFav128x128.png'
				}
			});

			log.info('[NotificationService] Enhanced urgent badge state cleared');
		} catch (error) {
			log.warn('[NotificationService] Failed to clear enhanced urgent badge:', false, error);
		}
	}

	/**
	 * Enhanced sound alert system with proper cleanup
	 */
	private static async playUrgentSoundEnhanced(): Promise<void> {
		try {
			// Send message to UI contexts to play sound once
			if (browser_ext?.runtime) {
				browser_ext.runtime
					.sendMessage({
						type: 'PLAY_URGENT_SOUND',
						timestamp: Date.now()
					})
					.catch((error) => {
						log.debug('Error sending sound request to UI:', false, error);
					});
			}

			log.info('[NotificationService] Enhanced urgent sound request sent');
		} catch (error) {
			log.warn('[NotificationService] Failed to play enhanced urgent sound:', false, error);
		}
	}

	/**
	 * Enhanced periodic reminders for hidden popups
	 */
	// private static showPeriodicRemindersEnhanced(totalSeconds: number): void {
	//   const intervals = [
	//     Math.floor(totalSeconds * 0.75), // 75% of time remaining
	//     Math.floor(totalSeconds * 0.5),  // 50% of time remaining
	//     Math.floor(totalSeconds * 0.25), // 25% of time remaining
	//     5 // Final 5 second warning
	//   ];

	//   intervals.forEach((triggerTime, index) => {
	//     if (triggerTime > 0 && triggerTime < totalSeconds) {
	//       setTimeout(async () => {
	//         // Check if popup is still hidden
	//         const windowFocused = await this.focusPopupWindowEnhanced();

	//         if (!windowFocused && browser_ext?.notifications) {
	//           const timeLeft = triggerTime;
	//           const notificationId = `lockdown-reminder-enhanced-${index}`;

	//           // Create proper notification options
	//           const reminderOptions: CreateNotificationOptions = {
	//             type: 'basic',
	//             title: '⚠️ YAKKL URGENT REMINDER',
	//             message: `Only ${timeLeft} seconds left! Click to prevent wallet lockdown!`,
	//             priority: 2,
	//             requireInteraction: true,
	//             silent: false,
	//             eventTime: Date.now(),
	//             iconUrl: browser_ext.runtime.getURL(this.DEFAULT_ICON)
	//           };

	//           await browser_ext.notifications.create(notificationId, reminderOptions);

	//           // Add to tracking
	//           activeNotifications.add(notificationId);

	//           // Play sound again for urgent reminders
	//           if (timeLeft <= 10) {
	//             this.playUrgentSoundEnhanced();
	//           }
	//         }
	//       }, (totalSeconds - triggerTime) * 1000);
	//     }
	//   });
	// }

	/**
	 * ENHANCED VERSION: Send an imminent lockdown warning with full attention features
	 * @param delayMs Time in ms until lockdown occurs
	 * @param options Additional notification options
	 */
	static async sendLockdownWarningEnhanced(
		delayMs: number = 30000,
		options: Partial<BasicNotificationOptions> = {}
	): Promise<string | null> {
		try {
			const delaySeconds = Math.ceil(delayMs / 1000);

			log.info(
				'[NotificationService] sendLockdownWarningEnhanced called with full attention features',
				false,
				{ delayMs, delaySeconds, options }
			);

			// 1. Set urgent visual state on extension icon with countdown
			await this.setUrgentBadgeEnhanced(`${delaySeconds}`);

			// 2. Try to focus the popup window
			const windowFocused = await this.focusPopupWindowEnhanced();

			// 3. Create enhanced browser notification
			const message = `YAKKL will be locked in ${delaySeconds} seconds due to inactivity. Click extension or this notification to stay active!`;
			const notificationId = `lockdown-warning-enhanced-${Date.now()}`;

			let result: string | null = null;
			if (browser_ext?.notifications) {
				try {
					// Create the base notification options
					const baseNotificationOptions: BasicNotificationOptions = {
						type: 'basic',
						title: '🚨 YAKKL SECURITY ALERT',
						message: message,
						priority: 2,
						requireInteraction: true,
						silent: false,
						eventTime: Date.now(),
						...options
					};

					// Create the full notification options with icon
					const fullNotificationOptions: CreateNotificationOptions = {
						...baseNotificationOptions,
						iconUrl: browser_ext.runtime.getURL(this.DEFAULT_ICON)
					};

					await browser_ext.notifications.create(notificationId, fullNotificationOptions);

					activeNotifications.add(notificationId);
					result = notificationId;
					log.info('[NotificationService] Enhanced browser notification created');
				} catch (err) {
					log.warn(
						'[NotificationService] Failed to create enhanced browser notification:',
						false,
						err
					);
				}
			}

			// 4. Play urgent sound
			await this.playUrgentSoundEnhanced();

			// 5. Send enhanced message to UI contexts for in-app warning
			if (browser_ext?.runtime) {
				try {
					browser_ext.runtime
						.sendMessage({
							type: 'LOCKDOWN_WARNING_ENHANCED',
							message: message,
							timestamp: Date.now(),
							delayMs: delayMs,
							delaySeconds: delaySeconds,
							notificationId: notificationId,
							windowFocused: windowFocused
						})
						.catch((error) => {
							log.warn('Error sending enhanced lockdown warning to UI:', false, error);
						});
				} catch (e) {
					log.warn('Error sending enhanced lockdown warning to UI:', false, e);
				}
			}

			// 6. Show periodic reminders if window isn't focused
			// if (!windowFocused) {
			//   this.showPeriodicRemindersEnhanced(delaySeconds);
			// }

			// 7. Start badge countdown
			this.startBadgeCountdownEnhanced(delaySeconds);

			return result;
		} catch (error) {
			log.warn('[NotificationService] Error in sendLockdownWarningEnhanced:', false, error);
			throw error;
		}
	}

	/**
	 * ENHANCED VERSION: Send a security alert with full attention features
	 */
	static async sendSecurityAlertEnhanced(
		message: string,
		options: Partial<BasicNotificationOptions> = {},
		id?: string
	): Promise<string | null> {
		log.info('[NotificationService] sendSecurityAlertEnhanced called:', false, message);

		const notificationId = id || `security-alert-enhanced-${Date.now()}`;

		try {
			// 1. Focus popup window
			await this.focusPopupWindowEnhanced();

			// 2. Set urgent badge
			await this.setUrgentBadgeEnhanced('🚨');

			// 3. Play urgent sound
			await this.playUrgentSoundEnhanced();

			// 4. Create enhanced notification using existing method with enhanced options
			const enhancedOptions: Partial<BasicNotificationOptions> = {
				requireInteraction: true,
				priority: 2,
				silent: false,
				eventTime: Date.now(),
				...options
			};

			const result = await this.sendSecurityAlert(message, enhancedOptions, notificationId);

			// 5. Send enhanced message to UI contexts
			if (browser_ext?.runtime) {
				try {
					browser_ext.runtime
						.sendMessage({
							type: 'SECURITY_ALERT_ENHANCED',
							message: message,
							options: options,
							id: notificationId,
							timestamp: Date.now()
						})
						.catch(() => {
							// Ignore errors, this is just a backup
						});
				} catch (e) {
					// Ignore errors
				}
			}

			return result;
		} catch (error) {
			log.warn('[NotificationService] Failed to send enhanced security alert:', false, error);
			return null;
		}
	}

	/**
	 * Clear all enhanced alerts with proper synchronization and debouncing
	 */
	static async clearAllAlertsEnhanced(): Promise<void> {
		// Prevent multiple simultaneous clearing operations
		if (this._isClearing) {
			log.info('[NotificationService] Already clearing alerts, waiting for completion');
			if (this._clearingPromise) {
				await this._clearingPromise;
			}
			return;
		}

		this._isClearing = true;
		this._clearingPromise = this._performClearAllAlertsEnhanced();

		try {
			await this._clearingPromise;
		} finally {
			this._isClearing = false;
			this._clearingPromise = null;
		}
	}

	/**
	 * Internal method to perform the actual clearing
	 */
	private static async _performClearAllAlertsEnhanced(): Promise<void> {
		try {
			log.info('[NotificationService] Starting comprehensive alert clearing');

			// 1. Clear badge countdown interval FIRST
			this.clearBadgeCountdown();

			// 2. Clear all active notifications tracking
			this.clearAll();

			// 3. Clear urgent sound context EARLY (good placement!)
			if (this._urgentSoundContext) {
				try {
					await this._urgentSoundContext.close();
					this._urgentSoundContext = null;
					log.info('[NotificationService] Audio context closed');
				} catch (error) {
					log.debug('Audio context close error (may be normal):', false, error);
				}
			}

			// 4. Clear all browser notifications (UNCOMMENTED - needed to stop notifications!)
			if (browser_ext?.notifications) {
				try {
					const notifications = await browser_ext.notifications.getAll();
					log.info(
						`[NotificationService] Found ${Object.keys(notifications).length} notifications to clear`
					);

					const clearPromises = Object.keys(notifications).map((id) =>
						browser_ext.notifications.clear(id).catch(() => {})
					);
					await Promise.all(clearPromises);

					// Clear our tracking (redundant with clearAll() but ensures it's done)
					activeNotifications.clear();
					log.info('[NotificationService] All browser notifications cleared');
				} catch (error) {
					log.warn('[NotificationService] Error clearing browser notifications:', false, error);
				}
			}

			// 5. Clear badge and reset icon
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
					log.info('[NotificationService] Badge and icon cleared');
				} catch (error) {
					log.warn('[NotificationService] Error clearing badge/icon:', false, error);
				}
			}

			// 6. Clear any pending alarms
			if (browser_ext?.alarms) {
				try {
					await Promise.all([
						browser_ext.alarms.clear('yakkl-lock-alarm').catch(() => {}),
						browser_ext.alarms.clear('yakkl-lock-notification').catch(() => {})
					]);
					log.info('[NotificationService] Alarms cleared');
				} catch (error) {
					log.warn('[NotificationService] Error clearing alarms:', false, error);
				}
			}

			// NOTE: Removed UI messaging section to prevent feedback loops
			// UI contexts will be cleared via IDLE_STATUS_CHANGED messages

			log.info(
				'[NotificationService] All enhanced alerts cleared successfully (no UI messages sent)'
			);
		} catch (error) {
			log.warn('[NotificationService] Failed to clear enhanced alerts:', false, error);
			throw error;
		}
	}

	/**
	 * Clear alerts from UI context only (no background messages)
	 */
	static async clearAlertsUIOnly(): Promise<void> {
		try {
			log.info('[NotificationService] Clearing UI-only alerts');

			if (typeof window !== 'undefined') {
				// Close audio context
				const audioContext = (window as any).__yakklAudioContext;
				if (audioContext && audioContext.state !== 'closed') {
					await audioContext.close();
					(window as any).__yakklAudioContext = null;
					log.info('[NotificationService] Audio context closed');
				}

				// Clear title flash
				if ((window as any).__yakklTitleFlashInterval) {
					clearInterval((window as any).__yakklTitleFlashInterval);
					(window as any).__yakklTitleFlashInterval = null;
				}

				if ((window as any).__yakklOriginalTitle) {
					document.title = (window as any).__yakklOriginalTitle;
					(window as any).__yakklOriginalTitle = null;
				}

				// Clear countdown timers
				if ((window as any).__yakklCountdownInterval) {
					clearInterval((window as any).__yakklCountdownInterval);
					(window as any).__yakklCountdownInterval = null;
				}

				// Clear in-app security warning
				try {
					const { hideSecurityWarning } = await import('$lib/common/stores/securityWarning');
					hideSecurityWarning();
				} catch (e) {
					log.debug('Error hiding security warning:', false, e);
				}
			}

			log.info('[NotificationService] UI-only alerts cleared');
		} catch (error) {
			log.warn('[NotificationService] Failed to clear UI-only alerts:', false, error);
		}
	}

	/**
	 * Enhanced clear method that also clears enhanced features
	 */
	static async clearEnhanced(id: string = this.DEFAULT_ID): Promise<boolean> {
		try {
			// Clear the standard notification
			const result = await this.clear(id);

			// If this is a lockdown warning, also clear enhanced features
			if (id.includes('lockdown-warning')) {
				await this.clearUrgentBadgeEnhanced();

				// Clear any reminder notifications
				for (let i = 0; i < 4; i++) {
					await this.clear(`lockdown-reminder-enhanced-${i}`);
				}
			}

			// Send enhanced clear message to UI
			if (browser_ext?.runtime) {
				try {
					browser_ext.runtime
						.sendMessage({
							type: 'CLEAR_NOTIFICATION_ENHANCED',
							notificationId: id,
							timestamp: Date.now()
						})
						.catch(() => {
							// Ignore errors
						});
				} catch (e) {
					// Ignore errors
				}
			}

			return result;
		} catch (error) {
			log.warn('Error in enhanced clear:', false, { id, error });
			return false;
		}
	}

	/**
	 * Test method for enhanced features
	 */
	static async testEnhancedFeatures(): Promise<void> {
		log.info('[NotificationService] Testing enhanced features...');

		try {
			// Test window focus
			await this.focusPopupWindowEnhanced();

			// Test badge
			await this.setUrgentBadgeEnhanced('TEST');

			// Test sound
			await this.playUrgentSoundEnhanced();

			// Test enhanced lockdown warning for 15 seconds
			await this.sendLockdownWarningEnhanced(15000, {
				contextMessage: 'This is a test of enhanced features'
			});

			log.info('[NotificationService] Enhanced features test completed');
		} catch (error) {
			log.warn('[NotificationService] Enhanced features test failed:', false, error);
		}
	}
}

// Functions to send notifications to the browser extension

/**
 * Sends a ping notification to the runtime.
 */
export async function sendNotificationPing() {
	try {
		if (!browser_ext) return;

		const response = await browser_ext.runtime.sendMessage({
			type: 'ping'
		});

		if (isResponseWithSuccess(response)) {
			log.info('Ping response status:', false, response);
		} else {
			log.warn('Unexpected response structure:', false, response);
		}
	} catch (error) {
		log.warn('No Pong response:', false, error);
	}
}

/**
 * Sends a notification with a given title and message text.
 * @param {string} title - Notification title.
 * @param {string} messageText - Notification message.
 */
export async function sendNotificationMessage(title: string, messageText: string) {
	try {
		if (!browser_ext) return;

		log.info('sendNotificationMessage - title:', false, title);
		log.info('sendNotificationMessage - messageText:', false, messageText);

		const id = await browser_ext.notifications.create('yakkl-notification', {
			type: 'basic',
			iconUrl: browser_ext.runtime.getURL('/images/logoBullLock48x48.png'),
			title: title || 'Notification',
			message: messageText || 'Default message.'
		});

		return id;
	} catch (error) {
		log.warn('Error sending notification message:', false, error);
		return null;
	}
}

/**
 * Sends a request to start the lock icon timer.
 */
export async function sendNotificationStartLockIconTimer() {
	try {
		if (!browser_ext) return;

		log.info('sendNotificationStartLockIconTimer - starting lock icon timer:', false);

		startLockIconTimer();
	} catch (error) {
		log.warn('Error starting lock icon timer:', false, error);
	}
}

/**
 * Sends a request to stop the lock icon timer.
 */
export async function sendNotificationStopLockIconTimer() {
	try {
		if (!browser_ext) return;
		stopLockIconTimer();
	} catch (error) {
		log.warn('Error stopping lock icon timer:', false, error);
	}
}

/**
 * Helper function to check if a response indicates success.
 * @param {unknown} response - The response object.
 * @returns {boolean} True if the response contains a `success` property set to true.
 */
function isResponseWithSuccess(response: unknown): boolean {
	return (
		typeof response === 'object' &&
		response !== null &&
		'success' in response &&
		(response as any).success === true
	);
}

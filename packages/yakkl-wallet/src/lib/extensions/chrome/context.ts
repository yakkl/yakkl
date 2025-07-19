import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
import {
	TIMER_IDLE_THRESHOLD,
	TIMER_IDLE_LOCK_DELAY,
	TIMER_IDLE_CHECK_INTERVAL
} from '$lib/common/constants';
import { lockWallet } from '$lib/common/lockWallet';
import { NotificationService } from '$lib/common/notifications';

// Context management for browser extension
export class ExtensionContext {
	private static instance: ExtensionContext;
	private idleTimer: number | null = null;
	private lockTimer: number | null = null;
	private isIdle = false;
	private warningShown = false;
	private countdownInterval: number | null = null;
	private remainingSeconds = 60;

	static getInstance(): ExtensionContext {
		if (!ExtensionContext.instance) {
			ExtensionContext.instance = new ExtensionContext();
		}
		return ExtensionContext.instance;
	}

	private constructor() {
		this.initializeIdleDetection();
	}

	private async initializeIdleDetection() {
		try {
			// Set up Chrome idle detection with configured threshold
			const idleThresholdSeconds = Math.floor(TIMER_IDLE_THRESHOLD / 1000);
			browser.idle.setDetectionInterval(idleThresholdSeconds);

			// Add user interaction listeners to cancel any pending lockdown
			this.setupUserInteractionListeners();

			// Listen for idle state changes
			browser.idle.onStateChanged.addListener((newState: browser.Idle.IdleState) => {
				log.debug('Idle state changed:', false, { newState });

				if (newState === 'idle') {
					this.handleIdleState();
				} else if (newState === 'active') {
					this.handleActiveState();
				}
			});

			// Delay initial idle check to avoid immediate warning on startup
			setTimeout(() => {
				this.startPeriodicCheck();
			}, 5000); // Wait 5 seconds before starting checks

			log.info('Idle detection initialized', false, {
				threshold: idleThresholdSeconds,
				lockDelay: TIMER_IDLE_LOCK_DELAY / 1000
			});
		} catch (error) {
			log.error('Failed to initialize idle detection', false, error);
		}
	}

	private startPeriodicCheck() {
		// Clear any existing interval
		if (this.idleTimer) {
			clearInterval(this.idleTimer);
		}

		// Check idle state periodically
		this.idleTimer = window.setInterval(async () => {
			try {
				const state = await browser.idle.queryState(Math.floor(TIMER_IDLE_THRESHOLD / 1000));

				if (state === 'idle' && !this.isIdle) {
					this.handleIdleState();
				} else if (state === 'active' && this.isIdle) {
					this.handleActiveState();
				}
			} catch (error) {
				log.error('Error checking idle state', false, error);
			}
		}, TIMER_IDLE_CHECK_INTERVAL);
	}

	private handleIdleState() {
		if (this.isIdle) return;

		this.isIdle = true;
		log.info('User is idle, starting lock countdown', false);

		// Show warning and start countdown
		this.showLockdownWarning();

		// Start the lock timer
		this.lockTimer = window.setTimeout(() => {
			this.lockWalletDueToIdle();
		}, TIMER_IDLE_LOCK_DELAY);
	}

	private handleActiveState() {
		if (!this.isIdle) return;

		this.isIdle = false;
		this.warningShown = false;

		// Clear timers and notifications
		if (this.lockTimer) {
			clearTimeout(this.lockTimer);
			this.lockTimer = null;
		}

		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}

		// Clear badge and notification
		browser.action.setBadgeText({ text: '' });

		// Clear any browser notifications
		browser.notifications.clear('idle-warning').catch(() => {});

		// Notify UI components that user is active
		browser.runtime.sendMessage({ 
			type: 'IDLE_STATE_CHANGED', 
			state: 'active' 
		}).catch(() => {});

		log.info('User is active again, cancelling lock', false);
	}

	private setupUserInteractionListeners() {
		// These listeners will help detect user activity even when browser idle API doesn't
		if (typeof window !== 'undefined') {
			const handleUserActivity = () => {
				if (this.isIdle) {
					this.handleActiveState();
				}
			};

			// Listen for various user interactions
			window.addEventListener('mousedown', handleUserActivity);
			window.addEventListener('keydown', handleUserActivity);
			window.addEventListener('touchstart', handleUserActivity);
			window.addEventListener('wheel', handleUserActivity);
		}
	}

	private async showLockdownWarning() {
		try {
			// Start countdown
			this.remainingSeconds = Math.floor(TIMER_IDLE_LOCK_DELAY / 1000);
			this.warningShown = true;

			// Show browser notification with consistent ID
			await browser.notifications.create('idle-warning', {
				type: 'basic',
				iconUrl: browser.runtime.getURL('/images/logoBullLock48x48.png'),
				title: 'YAKKL Wallet - Idle Warning',
				message: `Wallet will lock in ${this.remainingSeconds} seconds due to inactivity`,
				priority: 2
			} as any); // Cast to any to handle browser differences

			// Play warning sound
			await NotificationService.getInstance().playNotificationSound('warning');

			// Update badge with countdown
			this.countdownInterval = window.setInterval(() => {
				this.remainingSeconds--;

				if (this.remainingSeconds > 0) {
					browser.action.setBadgeText({ text: this.remainingSeconds.toString() });
					browser.action.setBadgeBackgroundColor({ color: '#ff6b6b' });
				} else {
					if (this.countdownInterval) {
						clearInterval(this.countdownInterval);
						this.countdownInterval = null;
					}
				}
			}, 1000);

		} catch (error) {
			log.error('Failed to show lockdown warning', false, error);
		}
	}

	private async lockWalletDueToIdle() {
		try {
			log.info('Locking wallet due to idle timeout', false);

			// Clear badge
			await browser.action.setBadgeText({ text: '' });

			// Play lockdown sound
			await NotificationService.getInstance().playNotificationSound('lockdown');

			// Show locked notification
			await NotificationService.getInstance().showNotification({
				title: 'YAKKL Wallet Locked',
				message: 'Your wallet has been locked due to inactivity',
				priority: 1
			});

			// Lock the wallet
			await lockWallet('idle-timeout');

			// Reset state
			this.isIdle = false;
			this.warningShown = false;

		} catch (error) {
			log.error('Failed to lock wallet due to idle', false, error);
		}
	}

	cleanup() {
		if (this.idleTimer) {
			clearInterval(this.idleTimer);
			this.idleTimer = null;
		}

		if (this.lockTimer) {
			clearTimeout(this.lockTimer);
			this.lockTimer = null;
		}

		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}
	}
}

// Initialize on module load only in background context
// This prevents idle detection from running in UI contexts
let extensionContext: ExtensionContext | null = null;

// Only initialize in background context
if (typeof window === 'undefined' || (browser && browser.extension?.getBackgroundPage)) {
	// We're in background context or service worker
	extensionContext = ExtensionContext.getInstance();
}

export { extensionContext };

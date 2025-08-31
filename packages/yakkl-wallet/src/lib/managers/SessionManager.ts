/**
 * Session Manager for YAKKL Wallet
 * Handles session lifecycle, timeouts, and JWT token management
 * Browser extension context-aware implementation
 */

import { browserSvelte, browser_ext } from '$lib/common/environment';
import { log } from '$lib/common/logger-wrapper';
import { jwtManager, type JWTPayload } from '$lib/utilities/jwt';

export interface SessionState {
	isActive: boolean;
	userId: string | null;
	username: string | null;
	profileId: string | null;
	planLevel: string | null;
	sessionId: string | null;
	lastActivity: number;
	expiresAt: number;
	jwtToken: string | null;
	warningShown: boolean;
}

export interface SessionConfig {
	timeoutMinutes: number;
	warningMinutes: number;
	maxInactivityMinutes: number;
	autoExtendOnActivity: boolean;
	jwtExpirationMinutes: number;
}

const DEFAULT_CONFIG: SessionConfig = {
	timeoutMinutes: 30,
	warningMinutes: 2,
	maxInactivityMinutes: 60,
	autoExtendOnActivity: true,
	jwtExpirationMinutes: 60
};

export class SessionManager {
	private static instance: SessionManager | null = null;
	private config: SessionConfig = DEFAULT_CONFIG;
	private sessionState: SessionState | null = null;
	private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
	private warningTimer: ReturnType<typeof setTimeout> | null = null;
	private activityListenersAdded = false;

	// Event callbacks
	private onSessionWarning: ((timeRemaining: number) => void) | null = null;
	private onSessionExpired: (() => void) | null = null;
	private onSessionExtended: (() => void) | null = null;

	private constructor() {
		this.initializeFromStorage();
	}

	static getInstance(): SessionManager {
		if (!SessionManager.instance) {
			SessionManager.instance = new SessionManager();
		}
		return SessionManager.instance;
	}

	/**
	 * Start a new session
	 */
	async startSession(
		userId: string,
		username: string,
		profileId: string,
		planLevel: string = 'explorer_member'
	): Promise<string> {
		try {
      if (!browser_ext) return '';

			// Generate JWT token
			const jwtToken = await jwtManager.generateToken(
				userId,
				username,
				profileId,
				planLevel,
				this.config.jwtExpirationMinutes
			);

			const now = Date.now();
			const sessionId = this.generateSessionId();

			this.sessionState = {
				isActive: true,
				userId,
				username,
				profileId,
				planLevel,
				sessionId,
				lastActivity: now,
				expiresAt: now + this.config.timeoutMinutes * 60 * 1000,
				jwtToken,
				warningShown: false
			};

			await this.saveSessionState();
			this.startActivityTracking();
			this.scheduleWarning();

			log.debug('Session started', false, {
				userId,
				username,
				sessionId,
				expiresAt: new Date(this.sessionState.expiresAt)
			});

			// Notify background script if in extension
			if (browserSvelte && browser_ext) {
				this.notifyBackgroundScript('SESSION_STARTED', {
					sessionId,
					expiresAt: this.sessionState.expiresAt
				});

							// Also notify about login success to start JWT validation (non-blocking)
			// Fire and forget - don't wait for response to avoid slowing down login
			if (typeof window !== 'undefined' && browser_ext.runtime) {
				browser_ext.runtime.sendMessage({
					type: 'USER_LOGIN_SUCCESS',
					sessionId,
					hasJWT: !!jwtToken,
					jwtToken: jwtToken, // Include the actual JWT token
					userId,
					username,
					profileId,
					planLevel
				}).then(() => {
					log.debug('SessionManager: Background notified about login success with JWT');
				}).catch((error) => {
					// Silently fail - don't block login if background notification fails
					log.debug('SessionManager: Background notification failed (non-critical):', false, error);
				});
			}
			}

			return jwtToken;
		} catch (error) {
			log.error('Failed to start session:', false, error);
			throw new Error('Session start failed');
		}
	}

	/**
	 * Extend current session
	 */
	async extendSession(additionalMinutes: number = 30): Promise<void> {
		if (!this.sessionState || !this.sessionState.isActive) {
			throw new Error('No active session to extend');
		}

		try {
      if (!browser_ext) return;

			const now = Date.now();
			const newExpiresAt = now + additionalMinutes * 60 * 1000;

			// Refresh JWT token if needed
			if (this.sessionState.jwtToken) {
				const refreshedToken = await jwtManager.refreshTokenIfNeeded(
					this.sessionState.jwtToken,
					10 // Refresh if expires within 10 minutes
				);

				if (refreshedToken && refreshedToken !== this.sessionState.jwtToken) {
					this.sessionState.jwtToken = refreshedToken;
					log.debug('JWT token refreshed during session extension', false);
				}
			}

			this.sessionState.lastActivity = now;
			this.sessionState.expiresAt = newExpiresAt;
			this.sessionState.warningShown = false;

			await this.saveSessionState();
			this.clearTimers();
			this.scheduleWarning();

			log.debug('Session extended', false, {
				sessionId: this.sessionState.sessionId,
				additionalMinutes,
				newExpiresAt: new Date(newExpiresAt)
			});

			if (this.onSessionExtended) {
				this.onSessionExtended();
			}

			// Notify background script
			if (browserSvelte && browser_ext) {
				this.notifyBackgroundScript('SESSION_EXTENDED', {
					sessionId: this.sessionState.sessionId,
					expiresAt: newExpiresAt
				});
			}
		} catch (error) {
			log.error('Failed to extend session:', false, error);
			throw new Error('Session extension failed');
		}
	}

	/**
	 * End current session
	 */
	async endSession(): Promise<void> {
		if (this.sessionState) {
			log.debug('Ending session', false, {
				sessionId: this.sessionState.sessionId
			});

			// Notify background script before clearing state
			if (browserSvelte && browser_ext) {
				this.notifyBackgroundScript('SESSION_ENDED', {
					sessionId: this.sessionState.sessionId
				});
			}
		}

		this.sessionState = null;
		this.clearTimers();
		this.removeActivityListeners();

		try {
			await this.clearSessionStorage();
		} catch (error) {
			log.warn('Failed to clear session storage:', false, error);
		}

		if (this.onSessionExpired) {
			this.onSessionExpired();
		}
	}

	/**
	 * Get current session state
	 */
	getSessionState(): SessionState | null {
		return this.sessionState ? { ...this.sessionState } : null;
	}

	/**
	 * Get current JWT token
	 */
	getCurrentJWTToken(): string | null {
		return this.sessionState?.jwtToken || null;
	}

	/**
	 * Check if session is active and valid
	 */
	isSessionActive(): boolean {
		if (!this.sessionState || !this.sessionState.isActive) {
			return false;
		}

		const now = Date.now();
		if (now >= this.sessionState.expiresAt) {
			this.endSession();
			return false;
		}

		return true;
	}

	/**
	 * Update activity timestamp
	 */
	updateActivity(): void {
		if (!this.sessionState || !this.sessionState.isActive) return;

		const now = Date.now();
		this.sessionState.lastActivity = now;

		// Auto-extend session if configured and close to expiration
		if (this.config.autoExtendOnActivity) {
			const timeUntilExpiry = this.sessionState.expiresAt - now;
			const warningThreshold = this.config.warningMinutes * 60 * 1000;

			if (timeUntilExpiry <= warningThreshold && !this.sessionState.warningShown) {
				this.extendSession(this.config.timeoutMinutes);
			}
		}

		this.saveSessionState(); // Save updated activity time
	}

	/**
	 * Set event callbacks
	 */
	setCallbacks(callbacks: {
		onWarning?: (timeRemaining: number) => void;
		onExpired?: () => void;
		onExtended?: () => void;
	}): void {
		this.onSessionWarning = callbacks.onWarning || null;
		this.onSessionExpired = callbacks.onExpired || null;
		this.onSessionExtended = callbacks.onExtended || null;
	}

	/**
	 * Update session configuration
	 */
	updateConfig(newConfig: Partial<SessionConfig>): void {
		this.config = { ...this.config, ...newConfig };
		log.debug('Session config updated', false, this.config);
	}

	/**
	 * Initialize session from storage
	 */
	private async initializeFromStorage(): Promise<void> {
		if (!browserSvelte) return;

		try {
			const stored = await this.loadSessionState();
			if (stored && stored.isActive) {
				const now = Date.now();

				// Check if session is still valid
				if (now < stored.expiresAt) {
					this.sessionState = stored;
					this.startActivityTracking();

					// Check if the restored session is about to expire
					const timeRemaining = stored.expiresAt - now;
					const warningThreshold = this.config.warningMinutes * 60 * 1000;

					if (timeRemaining <= warningThreshold) {
						// Session is about to expire - auto-extend it instead of showing warning immediately
						log.debug('Restored session near expiry, auto-extending', false, {
							sessionId: stored.sessionId,
							timeRemaining: Math.round(timeRemaining / 1000)
						});

						// Clear the warningShown flag to allow extension
						this.sessionState.warningShown = false;

						// Auto-extend the session
						try {
							await this.extendSession(this.config.timeoutMinutes);
							log.info('Auto-extended restored session that was near expiry');
						} catch (error) {
							log.error('Failed to auto-extend restored session:', false, error);
							// If extension fails, schedule the warning as normal
							this.scheduleWarning();
						}
					} else {
						// Session has enough time remaining, schedule warning normally
						this.scheduleWarning();
					}

					log.debug('Session restored from storage', false, {
						sessionId: stored.sessionId,
						timeRemaining: Math.round((stored.expiresAt - now) / 1000)
					});
				} else {
					// Session expired, clean up
					await this.clearSessionStorage();
					log.debug('Expired session cleared from storage', false);
				}
			}
		} catch (error) {
			log.warn('Failed to initialize session from storage:', false, error);
		}
	}

	/**
	 * Schedule session warning
	 */
	private scheduleWarning(): void {
		if (!this.sessionState) return;

		const now = Date.now();
		const timeUntilWarning =
			this.sessionState.expiresAt - now - this.config.warningMinutes * 60 * 1000;

		if (timeUntilWarning > 0) {
			this.warningTimer = setTimeout(() => {
				this.showSessionWarning();
			}, timeUntilWarning);
		} else {
			// Should show warning immediately
			this.showSessionWarning();
		}
	}

	/**
	 * Show session warning
	 */
	private showSessionWarning(): void {
		if (!this.sessionState || this.sessionState.warningShown) return;

		this.sessionState.warningShown = true;

		const now = Date.now();
		const timeRemaining = Math.max(0, Math.round((this.sessionState.expiresAt - now) / 1000));

		log.debug('Showing session warning', false, { timeRemaining });

		if (this.onSessionWarning) {
			this.onSessionWarning(timeRemaining);
		}

		// Schedule automatic logout
		this.timeoutTimer = setTimeout(() => {
			this.endSession();
		}, timeRemaining * 1000);
	}

	/**
	 * Start activity tracking
	 */
	private startActivityTracking(): void {
		if (!browserSvelte || typeof document === 'undefined' || this.activityListenersAdded) return;

		const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
		const handleActivity = () => this.updateActivity();

		events.forEach((event) => {
			document.addEventListener(event, handleActivity, { passive: true });
		});

		this.activityListenersAdded = true;
		log.debug('Activity tracking started', false);
	}

	/**
	 * Remove activity listeners
	 */
	private removeActivityListeners(): void {
		if (!browserSvelte || typeof document === 'undefined' || !this.activityListenersAdded) return;

		const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
		const handleActivity = () => this.updateActivity();

		events.forEach((event) => {
			document.removeEventListener(event, handleActivity);
		});

		this.activityListenersAdded = false;
		log.debug('Activity tracking stopped', false);
	}

	/**
	 * Clear all timers
	 */
	private clearTimers(): void {
		if (this.timeoutTimer) {
			clearTimeout(this.timeoutTimer);
			this.timeoutTimer = null;
		}
		if (this.warningTimer) {
			clearTimeout(this.warningTimer);
			this.warningTimer = null;
		}
	}

	/**
	 * Generate unique session ID
	 */
	private generateSessionId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2);
		return `session-${timestamp}-${random}`;
	}

	/**
	 * Save session state to storage
	 */
	private async saveSessionState(): Promise<void> {
		if (!browserSvelte || !this.sessionState || !browser_ext) return;

		try {
			if (browser_ext) {
				await browser_ext.storage.local.set({
					yakklSession: this.sessionState
				});
			} else {
				localStorage.setItem('yakklSession', JSON.stringify(this.sessionState));
			}
		} catch (error) {
			log.warn('Failed to save session state:', false, error);
		}
	}

	/**
	 * Load session state from storage
	 */
	private async loadSessionState(): Promise<SessionState | null> {
		if (!browserSvelte || !browser_ext) return null;

		try {
			if (browser_ext) {
				const result = await browser_ext.storage.local.get(['yakklSession']);
				return (result.yakklSession as SessionState) || null;
			} else {
				const stored = localStorage.getItem('yakklSession');
				return stored ? JSON.parse(stored) : null;
			}
		} catch (error) {
			log.warn('Failed to load session state:', false, error);
			return null;
		}
	}

	/**
	 * Clear session storage
	 */
	private async clearSessionStorage(): Promise<void> {
		if (!browserSvelte || !browser_ext) return;

		try {
			if (browser_ext) {
				await browser_ext.storage.local.remove(['yakklSession']);
			} else {
				localStorage.removeItem('yakklSession');
			}
		} catch (error) {
			log.warn('Failed to clear session storage:', false, error);
		}
	}

	/**
	 * Notify background script of session events
	 */
	private notifyBackgroundScript(type: string, data: any): void {
		if (!browserSvelte || !browser_ext) return;

		try {
			if (!browser_ext) return;

			browser_ext.runtime.sendMessage({
				type: `SESSION_${type}`,
				data
			}).catch(error => {
				// Expected during startup before background is ready
				log.debug('Background script not ready for session notification:', false, error);
			});
		} catch (error) {
			log.warn('Failed to notify background script:', false, error);
		}
	}
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { verify } from '$lib/common/security';
import { getYakklSettings, getMiscStore, setMiscStore } from '$lib/common/stores';
import type { Profile } from '$lib/common/interfaces';
import { log } from '$lib/common/logger-wrapper';
import { sessionManager, type SessionState } from '$lib/managers/SessionManager';
import { jwtManager } from '$lib/utilities/jwt';
import { auditAuthEvent, checkAuthRateLimit, clearAuthRateLimit, validateAuthentication } from '$lib/common/authValidation';
import { SessionVerificationService } from '$lib/services/session-verification.service';
import { setLocks } from '$lib/common/locks';
import { browser_ext } from '$lib/common/environment';

interface AuthState {
	isAuthenticated: boolean;
	isRegistered: boolean;
	profile: Profile | null;
	lastActivity: number;
	sessionTimeout: number; // in minutes
	isInitializing: boolean;
	sessionState: SessionState | null;
	jwtToken: string | null;
	showSessionWarning: boolean;
	sessionTimeRemaining: number; // seconds until session expires
}

const defaultAuthState: AuthState = {
	isAuthenticated: false,
	isRegistered: false,
	profile: null,
	lastActivity: Date.now(),
	sessionTimeout: 30, // 30 minutes default
	isInitializing: false,
	sessionState: null,
	jwtToken: null,
	showSessionWarning: false,
	sessionTimeRemaining: 0
};

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>(defaultAuthState);

	let activityListenersAdded = false;
	let sessionCheckInterval: NodeJS.Timeout | null = null;

	// Setup session management callbacks
	function setupSessionCallbacks() {
		sessionManager.setCallbacks({
			onWarning: (timeRemaining: number) => {
				update((state) => ({
					...state,
					showSessionWarning: true,
					sessionTimeRemaining: timeRemaining
				}));
				log.debug('Session warning triggered', false, { timeRemaining });
			},
			onExpired: async () => {
				// Import audit function
				await auditAuthEvent('session_expired', { reason: 'session_manager_timeout' });

				update((state) => ({
					...state,
					isAuthenticated: false,
					sessionState: null,
					jwtToken: null,
					showSessionWarning: false,
					profile: null
				}));
				setMiscStore('');
				log.debug('Session expired', false);
			},
			onExtended: () => {
				const newSessionState = sessionManager.getSessionState();
				update((state) => ({
					...state,
					sessionState: newSessionState,
					jwtToken: newSessionState?.jwtToken || null,
					showSessionWarning: false,
					lastActivity: Date.now()
				}));
				log.debug('Session extended', false);
			}
		});
	}

	// Start periodic session validation
	function startSessionValidation() {
		// Clear any existing interval
		if (sessionCheckInterval) {
			clearInterval(sessionCheckInterval);
		}

		// Check session every 30 seconds
		sessionCheckInterval = setInterval(async () => {
			const state = get(authStore);
			if (state.isAuthenticated) {
				const isValid = await authStore.checkSession();
				if (!isValid) {
					log.info('Session validation failed during periodic check', false);
				}
			}
		}, 30000);
	}

	// Stop periodic session validation
	function stopSessionValidation() {
		if (sessionCheckInterval) {
			clearInterval(sessionCheckInterval);
			sessionCheckInterval = null;
		}
	}

	// Activity tracker - only add listeners once
	function addActivityListeners() {
		if (browser && !activityListenersAdded) {
			const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

			const updateActivity = () => {
				update((state) => ({ ...state, lastActivity: Date.now() }));
			};

			events.forEach((event) => {
				document.addEventListener(event, updateActivity, { passive: true });
			});

			activityListenersAdded = true;
		}
	}

	return {
		subscribe,

		async initialize() {
			try {
				update((state) => ({ ...state, isInitializing: true }));

				// Import validation module
				const validation = await validateAuthentication();

				const settings = await getYakklSettings();
				const isRegistered = !!(settings?.init && settings?.legal?.termsAgreed);

				// Use comprehensive validation for authentication status
				const isAuthenticated = validation.isValid;

				// If validation passed, try to load profile
				let profile: Profile | null = null;
				if (isAuthenticated && validation.profile) {
					profile = validation.profile;
				}

				update((state) => ({
					...state,
					isRegistered,
					isAuthenticated,
					profile,
					lastActivity: Date.now(),
					isInitializing: false
				}));

				// Add activity listeners after initialization
				addActivityListeners();

				// Setup session management callbacks
				setupSessionCallbacks();

				// Check for existing session from validation
				if (validation.hasValidSession) {
					const sessionState = sessionManager.getSessionState();
					if (sessionState) {
						update((state) => ({
							...state,
							sessionState,
							jwtToken: sessionState.jwtToken
						}));
					}
				}

				// Start session validation if authenticated
				// Commented out to prevent immediate validation on page load
				// Validation will start after grace period via background service
				// if (isAuthenticated) {
				// 	startSessionValidation();
				// }

				log.debug('Auth store initialized', false, {
					isRegistered,
					isAuthenticated,
					validationReason: validation.reason,
					hasValidSession: validation.hasValidSession,
					hasValidJWT: validation.hasValidJWT
				});
			} catch (error) {
				log.error('Error initializing auth store:', false, error);
				update((state) => ({
					...state,
					isInitializing: false,
					isAuthenticated: false,
					isRegistered: false
				}));
			}
		},

		async login(username: string, password: string): Promise<Profile> {
			try {
				// Format the username properly (removing .nfs.id if already present, then adding it)
				const normalizedUsername = username.toLowerCase().trim().replace('.nfs.id', '');

				// Check rate limiting
				if (!checkAuthRateLimit(normalizedUsername)) {
					await auditAuthEvent('validation_failed', { reason: 'rate_limit_exceeded', username: normalizedUsername });
					throw new Error('Too many login attempts. Please try again later.');
				}

				const loginString = normalizedUsername + '.nfs.id' + password;

				// Call the existing verify function - this is the core authentication
				const profile = await verify(loginString);

				if (!profile) {
					await auditAuthEvent('validation_failed', { reason: 'invalid_credentials', username: normalizedUsername });
					throw new Error('Invalid credentials or profile not found');
				}

				// Get the digest that was set during verification
				const digest = getMiscStore();
				if (!digest) {
					await auditAuthEvent('validation_failed', { reason: 'no_digest_after_verify', username: normalizedUsername });
					throw new Error('Authentication succeeded but failed to retrieve security digest');
				}

				// Perform post-login validation to ensure everything is properly set up
				const validation = await validateAuthentication();

				if (!validation.isValid) {
					await auditAuthEvent('validation_failed', {
						reason: 'post_login_validation_failed',
						validationReason: validation.reason,
						username: normalizedUsername
					});
					throw new Error('Authentication validation failed: ' + validation.reason);
				}

				// Get user's plan level for JWT
				const settings = await getYakklSettings();
				const planLevel = settings?.plan?.type || 'explorer_member';

				// Start session with JWT token generation
				const jwtToken = await sessionManager.startSession(
					profile.id || profile.username,
					profile.username,
					profile.id || profile.username,
					planLevel
				);

				const sessionState = sessionManager.getSessionState();

				update((state) => ({
					...state,
					isAuthenticated: true,
					profile,
					lastActivity: Date.now(),
					sessionState,
					jwtToken
				}));

				log.info('Auth store updated after login', false, {
					isAuthenticated: true,
					hasProfile: !!profile,
					hasSessionState: !!sessionState,
					hasJwtToken: !!jwtToken,
					username: profile.username
				});

				// Clear rate limiting on successful login
				clearAuthRateLimit(normalizedUsername);

				// Start periodic session validation
				startSessionValidation();

				// Audit successful login
				await auditAuthEvent('login', {
					username: normalizedUsername,
					sessionId: sessionState?.sessionId,
					hasJWT: !!jwtToken
				});

				// Notify background script about login to start idle detection
				try {
					const sessionService = SessionVerificationService.getInstance();
					await sessionService.verifyLogin(true);
					log.debug('Idle detection started after login');
				} catch (error) {
					log.warn('Failed to start idle detection:', false, error);
					// Don't fail login if idle detection fails
				}

				// Notify background script about successful login (non-blocking)
				// Fire and forget - don't wait for response to avoid slowing down login
				if (typeof window !== 'undefined' && browser_ext.runtime) {
					browser_ext.runtime.sendMessage({
						type: 'USER_LOGIN_SUCCESS',
						sessionId: sessionState?.sessionId,
						hasJWT: !!jwtToken,
						jwtToken: jwtToken, // Include the actual JWT token for background storage
						userId: profile.id || profile.username,
						username: profile.username,
						profileId: profile.id || profile.username,
						planLevel
					}).then(() => {
						log.debug('Background notified about successful login');
					}).catch((error) => {
						// Silently fail - don't block login if background notification fails
						log.debug('Background notification failed (non-critical):', false, error);
					});
				}

				log.debug('User logged in successfully', false, {
					username: normalizedUsername,
					sessionId: sessionState?.sessionId
				});
				return profile;
			} catch (error) {
				log.error('Login failed:', false, error);
				throw error;
			}
		},

		async logout() {
			try {
				// Get current state for audit
				const currentState = get(authStore);
				const username = currentState.profile?.username;

				// Stop periodic session validation
				stopSessionValidation();

				// End session
				await sessionManager.endSession();

				// Import setLocks to set isLocked flag
				await setLocks(true);

				// Notify background script about logout to stop idle detection and clear JWT
				try {
					const sessionService = SessionVerificationService.getInstance();
					await sessionService.verifyLogin(false);
					log.debug('Idle detection stopped after logout');
					
					// Clear JWT from background memory
					if (typeof window !== 'undefined' && browser_ext.runtime) {
						browser_ext.runtime.sendMessage({
							type: 'CLEAR_JWT_TOKEN'
						}).catch((error) => {
							log.debug('Failed to clear JWT in background (non-critical):', false, error);
						});
					}
				} catch (error) {
					log.warn('Failed to stop idle detection:', false, error);
					// Don't fail logout if idle detection fails
				}

				setMiscStore('');
				update((state) => ({
					...state,
					isAuthenticated: false,
					profile: null,
					lastActivity: Date.now(),
					sessionState: null,
					jwtToken: null,
					showSessionWarning: false
				}));

				// Audit logout event
				await auditAuthEvent('logout', {
					username,
					initiatedBy: 'user'
				});

				log.debug('User logged out', false);
			} catch (error) {
				log.error('Error during logout:', false, error);
			}
		},

		async checkSession(): Promise<boolean> {
			try {
				const state = get(authStore);
				const now = Date.now();
				const timeoutMs = state.sessionTimeout * 60 * 1000;

				// If not authenticated, return false immediately
				if (!state.isAuthenticated) {
					return false;
				}

				// Check for inactivity timeout
				if (now - state.lastActivity > timeoutMs) {
					await auditAuthEvent('session_expired', {
						reason: 'inactivity_timeout',
						lastActivity: state.lastActivity,
						timeout: state.sessionTimeout
					});

					log.warn('Session expired due to inactivity', false);
					await this.logout();
					return false;
				}

				// Perform comprehensive validation check
				const validation = await validateAuthentication();

				if (!validation.isValid) {
					await auditAuthEvent('session_expired', {
						reason: 'validation_failed',
						validationReason: validation.reason
					});

					log.warn('Session invalid due to failed validation', false, validation.reason);
					await this.logout();
					return false;
				}

				// Check JWT expiry if available
				if (state.jwtToken && !get(hasValidJWT)) {
					await auditAuthEvent('session_expired', {
						reason: 'jwt_expired'
					});

					log.warn('Session expired due to JWT expiry', false);
					await this.logout();
					return false;
				}

				return true;
			} catch (error) {
				log.error('Error checking session:', false, error);
				return false;
			}
		},

		updateLastActivity() {
			update((state) => ({ ...state, lastActivity: Date.now() }));
		},

		setSessionTimeout(minutes: number) {
			update((state) => ({ ...state, sessionTimeout: minutes }));
		},

		// Helper method to refresh registration status
		async refreshRegistrationStatus() {
			try {
				const settings = await getYakklSettings();
				const isRegistered = !!(settings?.init && settings?.legal?.termsAgreed);

				update((state) => ({ ...state, isRegistered }));
				return isRegistered;
			} catch (error) {
				log.error('Error refreshing registration status:', false, error);
				return false;
			}
		},

		// Session management methods
		async extendSession(additionalMinutes: number = 30): Promise<void> {
			try {
				await sessionManager.extendSession(additionalMinutes);

				const sessionState = sessionManager.getSessionState();
				update((state) => ({
					...state,
					sessionState,
					jwtToken: sessionState?.jwtToken || null,
					showSessionWarning: false,
					lastActivity: Date.now()
				}));
			} catch (error) {
				log.error('Failed to extend session:', false, error);
				throw error;
			}
		},

		dismissSessionWarning() {
			update((state) => ({
				...state,
				showSessionWarning: false
			}));
		},

		getCurrentJWTToken(): string | null {
			const state = get(authStore);
			return state.jwtToken;
		},

		getSessionTimeRemaining(): number {
			const state = get(authStore);
			if (!state.sessionState) return 0;

			const now = Date.now();
			return Math.max(0, Math.round((state.sessionState.expiresAt - now) / 1000));
		}
	};
}

export const authStore = createAuthStore();

// Derived stores for convenient access
export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);
export const isRegistered = derived(authStore, ($auth) => $auth.isRegistered);
export const authProfile = derived(authStore, ($auth) => $auth.profile);
export const lastActivity = derived(authStore, ($auth) => $auth.lastActivity);
export const isAuthInitializing = derived(authStore, ($auth) => $auth.isInitializing);

// Session management derived stores
export const sessionState = derived(authStore, ($auth) => $auth.sessionState);
export const jwtToken = derived(authStore, ($auth) => $auth.jwtToken);
export const showSessionWarning = derived(authStore, ($auth) => $auth.showSessionWarning);
export const sessionTimeRemaining = derived(authStore, ($auth) => $auth.sessionTimeRemaining);
export const hasValidJWT = derived(authStore, ($auth) => {
	if (!$auth.jwtToken) return false;

	try {
		const decoded = jwtManager.decodeToken($auth.jwtToken);
		if (!decoded) return false;

		const now = Math.floor(Date.now() / 1000);
		return decoded.payload.exp > now;
	} catch {
		return false;
	}
});

// Helper function to get current auth state
export function getAuthState() {
	return get(authStore);
}

// Auto-initialize on import if in browser
if (browser) {
	authStore.initialize().catch((error) => {
		log.error('Failed to auto-initialize auth store:', false, error);
	});
}

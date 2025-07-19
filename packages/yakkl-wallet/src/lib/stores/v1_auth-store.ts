import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { verify } from '$lib/common/security';
import { getSettings, getMiscStore, setMiscStore } from '$lib/common/stores';
import type { Profile } from '$lib/common/interfaces';
import { log } from '$lib/common/logger-wrapper';
import { sessionManager, type SessionState } from '$lib/managers/SessionManager';
import { jwtManager } from '$lib/utilities/jwt';

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
			onExpired: () => {
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

				const settings = await getSettings();
				const miscStore = getMiscStore();

				const isRegistered = !!(settings?.init && settings?.legal?.termsAgreed);
				const isAuthenticated = !!(miscStore && miscStore.length > 0);

				update((state) => ({
					...state,
					isRegistered,
					isAuthenticated,
					lastActivity: Date.now(),
					isInitializing: false
				}));

				// Add activity listeners after initialization
				addActivityListeners();

				// Setup session management callbacks
				setupSessionCallbacks();

				// Check for existing session
				const sessionState = sessionManager.getSessionState();
				if (sessionState && sessionManager.isSessionActive()) {
					update((state) => ({
						...state,
						sessionState,
						jwtToken: sessionState.jwtToken,
						isAuthenticated: true
					}));
				}

				log.debug('Auth store initialized', false, { isRegistered, isAuthenticated });
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
				const loginString = normalizedUsername + '.nfs.id' + password;

				// Call the existing verify function - this is the core authentication
				const profile = await verify(loginString);

				if (!profile) {
					throw new Error('Invalid credentials or profile not found');
				}

				// Get the digest that was set during verification
				const digest = getMiscStore();
				if (!digest) {
					throw new Error('Authentication succeeded but failed to retrieve security digest');
				}

				// Get user's plan level for JWT
				const settings = await getSettings();
				const planLevel = settings?.plan?.type || 'basic';

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
				// End session
				await sessionManager.endSession();

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
				log.debug('User logged out', false);
			} catch (error) {
				log.error('Error during logout:', false, error);
			}
		},

		checkSession(): boolean {
			try {
				const state = get(authStore);
				const now = Date.now();
				const timeoutMs = state.sessionTimeout * 60 * 1000;

				if (state.isAuthenticated && now - state.lastActivity > timeoutMs) {
					log.warn('Session expired due to inactivity', false);
					this.logout();
					return false;
				}
				return state.isAuthenticated;
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
				const settings = await getSettings();
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

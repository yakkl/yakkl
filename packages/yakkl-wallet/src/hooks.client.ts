// src/hooks.client.ts
import { getYakklSettings, setContextTypeStore } from '$lib/common/stores';
import { loadTokens } from '$lib/common/stores/tokens';
import { ErrorHandler } from '$lib/managers/ErrorHandler';
import { log } from '$lib/managers/Logger';
import { addUIListeners, removeUIListeners } from '$lib/common/listeners/ui/uiListeners';
import { globalListenerManager } from '$lib/managers/GlobalListenerManager';
import { uiListenerManager } from '$lib/common/listeners/ui/uiListeners';
import { protectedContexts } from '$lib/common/globals';
import { initializeGlobalErrorHandlers } from '$lib/common/globalErrorHandler';
import { browser_ext } from '$lib/common/environment';
import { initializeMessaging, initializeUiContext } from '$lib/common/messaging';

// Helper function to check if context needs idle protection
function contextNeedsIdleProtection(contextType: string): boolean {
	return protectedContexts.includes(contextType);
}

// Store the browser reference globally for SvelleKit to use
declare global {
	interface Window {
		EXTENSION_INIT_STATE: {
			initialized: boolean;
			contextId: string;
			activityTrackingStarted: boolean;
			startTime: number;
		};
	}
}

// Create a unique context ID for this execution instance
const CONTEXT_ID =
	typeof Date !== 'undefined'
        ? Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
		: 'server';

// Early check for window existence
const isClient = typeof window !== 'undefined';

// Configure logger EARLY before any logging happens
if (isClient && typeof process !== 'undefined' && process.env && process.env.DEV_MODE) {
	log.setLevel('DEBUG', 'CONTAINS', [
		'DEBUG',
		'DEBUG_TRACE',
		'INFO',
		'INFO_TRACE',
		'WARN',
		'ERROR',
		'ERROR_TRACE',
		'TRACE'
	]);
} else {
	log.setLevel('ERROR', 'CONTAINS', ['ERROR', 'ERROR_TRACE']);
}

if (isClient) {
	// Check for existing initialization state
	if (!window.EXTENSION_INIT_STATE) {
		window.EXTENSION_INIT_STATE = {
			initialized: false,
			contextId: CONTEXT_ID,
			activityTrackingStarted: false,
			startTime: Date.now()
		};
	}
}

const errorHandler = ErrorHandler.getInstance(); // Initialize error handlers

// Global handler for unhandled promise rejections
if (isClient) {
	window.addEventListener('unhandledrejection', (event) => {
		const error = event.reason;

		// Check if it's a connection error from extension messaging
		if (error?.message?.includes('Could not establish connection') ||
			error?.message?.includes('Receiving end does not exist') ||
			error?.message?.includes('Extension context invalidated') ||
			error?.message?.includes('Cannot access a chrome://') ||
			error?.message?.includes('webextension-polyfill')) {
			// Prevent the default error handling
			event.preventDefault();

			// Log it as a debug message instead of an error
			log.debug('Extension messaging not ready:', false, error);
			return;
		}

		// Let other errors propagate normally
		log.error('Unhandled promise rejection:', false, error);
	});

	// Also intercept console.error to suppress these specific errors
	const originalConsoleError = console.error;
	console.error = function(...args) {
		// Check if any argument contains the connection error messages
		const errorString = args.map(arg => String(arg)).join(' ');
		if (errorString.includes('Could not establish connection') ||
		    errorString.includes('Receiving end does not exist') ||
		    errorString.includes('Extension context invalidated') ||
		    errorString.includes('Cannot access a chrome://') ||
		    errorString.includes('webextension-polyfill')) {
			// Log as debug instead
			log.debug('Suppressed console error:', false, ...args);
			return;
		}

		// Call the original console.error for other errors
		originalConsoleError.apply(console, args);
	};
}

/**
 * Determine the context type based on the current URL
 */
export function getContextType(): string {
	if (!isClient) return 'unknown';

	const pathname = window.location.pathname;
	const href = window.location.href;

	if (pathname.includes('sidepanel') || href.includes('sidepanel')) {
		setContextTypeStore('sidepanel');
		return 'sidepanel';
	} else if (
		pathname.includes('index.html') ||
		href.includes('index.html') ||
		pathname.includes('home.html') ||
		href.includes('home.html') ||
		pathname === '/' ||
		pathname === '' ||
		pathname === '/home' ||
		// Include other wallet HTML pages
		pathname.includes('register.html') ||
		pathname.includes('login.html') ||
		pathname.includes('legal.html') ||
		pathname.includes('settings.html') ||
		pathname.includes('accounts.html') ||
		pathname.includes('tokens.html')
	) {
		setContextTypeStore('popup-wallet');
		return 'popup-wallet';
	} else if (pathname.includes('dapp/popups') || href.includes('dapp/popups')) {
		setContextTypeStore('popup-dapp');
		return 'popup-dapp';
	} else if (pathname.includes('options') || href.includes('options')) {
		setContextTypeStore('options');
		return 'options';
	} else {
		console.warn(
			`[Context Detection] Unknown context type for pathname: ${pathname}, href: ${href}`
		);
		setContextTypeStore('popup-wallet'); // Default to popup-wallet for main extension
		return 'popup-wallet';
	}
}

/**
 * Initialize client-side hooks for the extension
 * This runs early in the page lifecycle to set up:
 * - Error handlers
 * - UI listeners
 * - Messaging context
 *
 * Note: The main initialization flow is handled by:
 * 1. routes/+layout.ts - Port connection
 * 2. AppStateManager - Coordinated app initialization
 * 3. This file - UI-specific setup only
 */
export async function init() {
	if (!isClient) return; // Skip initialization on server

	// Add timeout to prevent hanging initialization
	const initTimeout = setTimeout(() => {
		log.warn('Initialization timeout - forcing completion');
		window.EXTENSION_INIT_STATE.initialized = true;
	}, 10000); // 10 second timeout

	try {
		// Use window state to prevent multiple initializations across contexts
		if (window.EXTENSION_INIT_STATE && window.EXTENSION_INIT_STATE.initialized) {
			clearTimeout(initTimeout);
			return;
		}

		log.info('Starting initialization process');

		try {
			await getYakklSettings();
		} catch (error) {
			console.info(`[${CONTEXT_ID}] Failed to get settings in hooks - passing on:`, error);
		}

		// Initialize global error handlers early
		initializeGlobalErrorHandlers();

		// Register UI context with global listener manager if not already done
		if (!globalListenerManager.hasContext('ui')) {
			globalListenerManager.registerContext('ui', uiListenerManager);
		}

		// Initialize stores first (these need to be ready before any UI rendering)
		await loadTokens();

		// Get context type for this initialization
		const contextType = getContextType();

		// Initialize messaging service if browser API is available
		log.info('Checking browser API availability:', false, { browser_ext: !!browser_ext });
		if (browser_ext) {
			log.info('Initializing messaging service with browser API');
			try {
				initializeMessaging(browser_ext);
				await initializeUiContext(browser_ext, contextType);
				log.info('UI context registered successfully with background');
			} catch (error) {
				log.warn('Failed to initialize messaging service:', false, error);
			}
		} else {
			log.warn('Browser API not available, messaging service not initialized');
		}

		// Set up UI listeners through the manager
		await setupUIListeners();

		// Note: Registration with background script is already handled by initializeUiContext above
		// No need for duplicate registration

		// Mark as initialized
		window.EXTENSION_INIT_STATE.initialized = true;
		clearTimeout(initTimeout);
		log.info('Initialization completed successfully');
	} catch (error: any) {
		clearTimeout(initTimeout);
		console.warn(`[${CONTEXT_ID}] Initialization error:`, error);
		handleError(error);
		// Mark as initialized even on error to prevent infinite retries
		window.EXTENSION_INIT_STATE.initialized = true;
	}
}

export function handleError(error: Error) {
	console.warn(`[${CONTEXT_ID}] Error:`, error);

	// Prevent navigation errors from causing reloads
	if (error?.message?.includes('navigate') || error?.message?.includes('Navigation')) {
		console.warn('Navigation error detected, preventing reload');
		return;
	}

	errorHandler.handleError(error);
}

// Export for SvelteKit hooks
export const handleClientError = ({ error, event }: any) => {
	console.error('Client error:', {
		error: error?.message || error,
		url: event?.url?.href
	});

	// Check if this is a navigation error
	if (error?.message?.includes('navigate') || error?.message?.includes('Navigation')) {
		console.warn('Navigation error in hooks, preventing reload');
		// Return a safe error that won't trigger a reload
		return {
			message: 'Navigation temporarily unavailable',
			code: 'NAV_ERROR'
		};
	}

	// Return the error without triggering a reload
	return {
		message: error?.message || 'An error occurred',
		code: error?.code || 'UNKNOWN_ERROR'
	};
};

async function setupUIListeners() {
	if (!isClient) return; // Skip on server

	try {
		// Clean up any existing listeners first
		removeUIListeners();
		// Add UI listeners through the manager
		addUIListeners();
		// Set up cleanup for page unload
		const cleanup = () => {
			try {
				// Stop activity tracking if it was started
				// if (window.EXTENSION_INIT_STATE.activityTrackingStarted) {
				//   stopActivityTracking();
				// }

				removeUIListeners();
			} catch (error) {
				console.warn(`[${CONTEXT_ID}] Cleanup error:`, error);
			}
		};

		// Add unload handler
		try {
			// @ts-ignore
			if (!window.fencedFrameConfig) {
				window.removeEventListener('beforeunload', cleanup);
				window.addEventListener('beforeunload', cleanup);
			}
		} catch (e: any) {
			if (e.message.includes('fenced frames')) {
				console.warn('Skipping unload in fenced frame context');
				return;
			} else {
				console.warn(`[${CONTEXT_ID}] Failed to add unload handler:`, e);
			}
		}

		return cleanup;
	} catch (error) {
		console.warn(`[${CONTEXT_ID}] Setup UI listeners error:`, error);
	}
}

// Run init early, but only in browser context
if (isClient) {
	// Wait for DOM to be ready and browser API to be available
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			// Give browser API time to initialize after DOM is ready
			setTimeout(() => {
				init().catch((err) => {
					console.warn(`[${CONTEXT_ID}] Failed to initialize:`, err);
				});
			}, 200);
		});
	} else {
		// DOM is already loaded, still give browser API time to initialize
		setTimeout(() => {
			init().catch((err) => {
				console.warn(`[${CONTEXT_ID}] Failed to initialize:`, err);
			});
		}, 200);
	}
}

// Note: The registerWithBackgroundScript functionality has been consolidated into initializeUiContext
// which is called above. This includes:
// - Sending ui_context_initialized message (handled by messagingService.registerUiContext)
// - Setting up idle status listeners (handled by messagingService.setupActivityTracking)
// - Registering beforeunload handler (handled inside messagingService.registerUiContext)
// This prevents duplicate messages and race conditions.

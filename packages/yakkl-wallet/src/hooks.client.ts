// src/hooks.client.ts
import { getYakklSettings, setContextTypeStore } from '$lib/common/stores';
import { loadTokens } from '$lib/common/stores/tokens';
import { ErrorHandler } from '$lib/managers/ErrorHandler';
import { log } from '$lib/common/logger-wrapper';
import { addUIListeners, removeUIListeners } from '$lib/common/listeners/ui/uiListeners';
import { globalListenerManager } from '$lib/managers/GlobalListenerManager';
import { uiListenerManager } from '$lib/common/listeners/ui/uiListeners';
import { protectedContexts } from '$lib/common/globals';
import { initializeGlobalErrorHandlers } from '$lib/common/globalErrorHandler';
import { initializeMessaging, initializeUiContext } from '$lib/common/messaging';
import browser from '$lib/common/browser-wrapper';
import { initializationManager } from '$lib/common/initialization-manager';
import { initializeBrowserPolyfill } from '$lib/common/browser-polyfill-unified';

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
		log.warn(
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
async function performUIInitialization() {
	if (!isClient) return; // Skip initialization on server

	// Ensure browser polyfill is loaded first
	await initializeBrowserPolyfill();

	try {
		await getYakklSettings();
	} catch (error) {
		log.info(`[${CONTEXT_ID}] Failed to get settings in hooks - passing on:`, false, error);
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

	if (browser) {
		try {
			initializeMessaging(browser);
			await initializeUiContext(browser, contextType);
		} catch (error) {
			log.debug('[hooks.client] Failed to initialize messaging service:', false, error);
		}
	}

	// Set up UI listeners through the manager
	await setupUIListeners();

	// Mark as initialized
	window.EXTENSION_INIT_STATE.initialized = true;
}

export async function init() {
	if (!isClient) return;

	// Use centralized initialization manager to prevent race conditions
	try {
		await initializationManager.initialize(performUIInitialization);
	} catch (error: any) {
		handleError(error);
		// Still mark as initialized to prevent infinite retries
		if (window.EXTENSION_INIT_STATE) {
			window.EXTENSION_INIT_STATE.initialized = true;
		}
	}
}

export function handleError(error: Error) {
	log.warn(`[${CONTEXT_ID}] Error:`, false, error);

	// Prevent navigation errors from causing reloads
	if (error?.message?.includes('navigate') || error?.message?.includes('Navigation')) {
		log.warn('Navigation error detected, preventing reload');
		return;
	}

	errorHandler.handleError(error);
}

// Export for SvelteKit hooks
export const handleClientError = ({ error, event }: any) => {
	log.warn('Client error:', false, {
		error: error?.message || error,
		url: event?.url?.href
	});

	// Check if this is a navigation error
	if (error?.message?.includes('navigate') || error?.message?.includes('Navigation')) {
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
				log.warn(`[${CONTEXT_ID}] Cleanup error:`, false, error);
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
				return;
			}
		}

		return cleanup;
	} catch (error) {
		log.warn(`[${CONTEXT_ID}] Setup UI listeners error:`, false, error);
	}
}

// Run init early, but only in browser context
if (isClient) {
	init().catch((err) => {
		log.warn(`[${CONTEXT_ID}] Failed to initialize:`, false, err);
	});
}

// Note: The registerWithBackgroundScript functionality has been consolidated into initializeUiContext
// which is called above. This includes:
// - Sending ui_context_initialized message (handled by messagingService.registerUiContext)
// - Setting up idle status listeners (handled by messagingService.setupActivityTracking)
// - Registering beforeunload handler (handled inside messagingService.registerUiContext)
// This prevents duplicate messages and race conditions.

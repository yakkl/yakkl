// src/hooks.client.ts
// import type { BrowserAPI } from '$lib/types/browser-types';
import { getSettings, setContextTypeStore, syncStorageToStore } from '$lib/common/stores';
import { loadTokens } from '$lib/common/stores/tokens';
import { BalanceCacheManager } from '$lib/managers/BalanceCacheManager';
import { AccountTokenCacheManager } from '$lib/managers/AccountTokenCacheManager';
import { ErrorHandler } from '$lib/managers/ErrorHandler';
import { log } from '$lib/managers/Logger';
import { addUIListeners, removeUIListeners } from '$lib/common/listeners/ui/uiListeners';
import { globalListenerManager } from '$lib/managers/GlobalListenerManager';
import { uiListenerManager } from '$lib/common/listeners/ui/uiListeners';
import { protectedContexts } from '$lib/common/globals';
import { initializeGlobalErrorHandlers, cleanupGlobalErrorHandlers } from '$lib/common/globalErrorHandler';
import { browser_ext } from '$lib/common/environment';

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
		? Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
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
	// console.log(`[${CONTEXT_ID}] Logger set to DEBUG mode`);
} else {
	log.setLevel('ERROR', 'CONTAINS', ['ERROR', 'ERROR_TRACE']);
	// if (isClient) {
	//   console.log(`[${CONTEXT_ID}] Logger set to ERROR mode`);
	// }
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

// let browser_ext: BrowserAPI | null = null;
let initializationAttempted = false;

// function getBrowserExt(): BrowserAPI | null {
// 	if (!isClient) return null;

// 	// If already initialized, return the existing instance
// 	if (browser_ext) return browser_ext;

// 	// Only log once
// 	if (!initializationAttempted) {
// 		initializationAttempted = true;
// 	}

// 	// Use the centralized browser detection 
// 	// browser_ext = getBrowserExtFromWrapper();

// 	// Log only on first failed attempt
// 	if (!browser_ext && initializationAttempted) {
// 		log.warn(
// 			'Browser extension API not available - ' + 'check if browser-polyfill.js is loading correctly'
// 		);
// 	}

// 	return browser_ext;
// }

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
 * Load cache managers early to ensure cached data is available
 */
async function loadCacheManagers(): Promise<void> {
	if (!isClient) return;

	try {
		// Initialize cache managers to load their data from storage
		// These will load cached balance and token data that needs to be available immediately
		BalanceCacheManager.getInstance();
		AccountTokenCacheManager.getInstance();

		// Give them a moment to load from storage
		await new Promise(resolve => setTimeout(resolve, 10));

		log.debug('Cache managers loaded successfully');
	} catch (error) {
		log.warn('Failed to load cache managers:', false, error);
		// Don't throw - this shouldn't block initialization
	}
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

export async function init() {
	if (!isClient) return; // Skip initialization on server

	try {
		// Use window state to prevent multiple initializations across contexts
		if (window.EXTENSION_INIT_STATE && window.EXTENSION_INIT_STATE.initialized) {
			return;
		}

		try {
			await getSettings();
		} catch (error) {
			console.info(`[${CONTEXT_ID}] Failed to get settings in hooks - passing on:`, error);
		}

		// Initialize global error handlers early
		initializeGlobalErrorHandlers();

		// First get the browser API
		// const browserApi = getBrowserExt();

		// Register UI context with global listener manager if not already done
		if (!globalListenerManager.hasContext('ui')) {
			globalListenerManager.registerContext('ui', uiListenerManager);
		}

		// Initialize stores first (these need to be ready before any UI rendering)
		await syncStorageToStore();
		await loadTokens();

		// Load cache managers very early to ensure cached data is available
		await loadCacheManagers();

		// Get context type for this initialization
		const contextType = getContextType();

		// Set up UI listeners through the manager
		await setupUIListeners();

		// Register with background script after a delay to ensure it's ready
		// This delay helps prevent the "Receiving end does not exist" error
		setTimeout(() => {
			registerWithBackgroundScript();
		}, 500); // Wait 500ms to ensure background script is ready

		// Mark as initialized
		window.EXTENSION_INIT_STATE.initialized = true;
	} catch (error: any) {
		console.warn(`[${CONTEXT_ID}] Initialization error:`, error);
		handleError(error);
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

// Function to register with background script - moved to a function so we can call it at the right time
async function registerWithBackgroundScript() {
	if (!isClient || !browser_ext) return;

	try {
		const contextType = getContextType();
		// const browserExt = getBrowserExt();

		// Function to send initialization message with retry logic
		const sendInitMessage = async (retries = 3, delay = 100) => {
			// Give the background script a moment to initialize
			await new Promise(resolve => setTimeout(resolve, 50));
			for (let i = 0; i < retries; i++) {
				try {
					await browser_ext?.runtime.sendMessage({
						type: 'ui_context_initialized',
						contextId: CONTEXT_ID,
						contextType: contextType,
						timestamp: Date.now()
					});
					console.log(`[${CONTEXT_ID}] Successfully registered context with background script`);
					return; // Success, exit the retry loop
				} catch (err: any) {
					if (i === retries - 1) {
						// Last attempt failed
						console.warn(`[${CONTEXT_ID}] Failed to register context after ${retries} attempts:`, err);
					} else {
						// Wait before retrying
						console.log(`[${CONTEXT_ID}] Retrying context registration (attempt ${i + 2}/${retries})...`);
						await new Promise(resolve => setTimeout(resolve, delay * (i + 1))); // Exponential backoff
					}
				}
			}
		};

		// Send initialization message with retry logic
		sendInitMessage().catch(err => {
			// Silently ignore - we already logged the error in sendInitMessage
			// This prevents uncaught promise rejection
		});

		// Only set up idle status listener for protected contexts
		if (contextNeedsIdleProtection(contextType)) {
			// Set up idle status listener
			browser_ext?.runtime.onMessage.addListener(
				(message: any, _sender: any, _sendResponse: any): any => {
					if (message.type === 'IDLE_STATUS_CHANGED') {
						// Check if message is targeted to this context type
						if (
							message.targetContextTypes &&
							Array.isArray(message.targetContextTypes) &&
							!message.targetContextTypes.includes(contextType)
						) {
							return undefined;
						}

						// Dispatch event for UI components
						window.dispatchEvent(
							new CustomEvent('yakklIdleStateChanged', {
								detail: {
									state: message.state,
									timestamp: message.timestamp
								}
							})
						);

						return undefined; // Allow other listeners to process this message
					}
					return undefined;
				}
			);
		}

		window.addEventListener('beforeunload', () => {
			browser_ext?.runtime
				.sendMessage({
					type: 'ui_context_closing',
					contextId: CONTEXT_ID
				})
				.catch((err: any) => console.warn('Failed to send context closing message', err));
		});
	} catch (err) {
		console.warn(`[${CONTEXT_ID}] Error registering context:`, err);
	}
}

// Export for external use if needed
// export { getBrowserExt };

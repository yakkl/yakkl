// Top-level +layout.ts
export const prerender = true; // Must be here to create files. Do NOT use ssr = false because this will keep routes from working well

import { YAKKL_INTERNAL } from '$lib/common/constants';
import { isServerSide, wait } from '$lib/common/utils';
// Removed: import type { Runtime } from '$lib/types/browser-types';
// Added: Use local type to avoid module resolution error in browser context
import { handleLockDown } from '$lib/common/handlers';
import { log } from '$lib/common/logger-wrapper';
// Import but don't use at module level
import { browser_ext } from '$lib/common/environment';
// Use the local browser types instead of webextension-polyfill to avoid import errors
import type { Runtime } from '$lib/types/browser-types';

let port: Runtime.Port | undefined;

// Function to connect port - will only run in browser context during load
async function connectPort(): Promise<boolean> {
	if (!browser_ext) {
		return false;
	}

	// Temporarily suppress console errors from browser-polyfill
	const originalConsoleError = console.error;
	let errorSuppressed = false;

	console.error = (...args: any[]) => {
		// Check if this is the specific error we want to suppress
		const errorStr = args.join(' ');
		if (errorStr.includes('Could not establish connection') ||
		    errorStr.includes('Receiving end does not exist')) {
			errorSuppressed = true;
			return; // Suppress this specific error
		}
		// Let other errors through
		originalConsoleError.apply(console, args);
	};

	try {
		// Added: Cast to RuntimePort to use our local type
		port = browser_ext.runtime.connect({ name: YAKKL_INTERNAL }) as Runtime.Port;

		// Restore console.error
		console.error = originalConsoleError;

		if (port) {
			port.onDisconnect.addListener(async () => {
				handleLockDown();
				const disconnectPort = port; // Capture current port before clearing
				port = undefined;
				
				// Check if port has error information (Chrome specific)
				if (disconnectPort && 'error' in disconnectPort) {
					const error = (disconnectPort as any).error;
					if (error) {
						log.error('Port disconnect:', false, error.message || error);
					}
				}
			});
			return true;
		}
	} catch (error) {
		// Restore console.error
		console.error = originalConsoleError;

		// Silently handle the connection error if it's the "Receiving end does not exist" error
		// This can happen during extension reload or when background script isn't ready yet
		if (error instanceof Error && error.message?.includes('Receiving end does not exist')) {
			log.debug('Background script not ready yet, port connection will be retried');
		} else if (!errorSuppressed) {
			log.error('Port connection failed:', false, error);
		}
	}
	return false;
}

// This function will only be called during load, not during SSR
async function initializeExtension() {
	try {
    if (!browser_ext) {
      return;
    }

		// Add initial delay to ensure background script is ready
		// This helps prevent the "Receiving end does not exist" error
		await wait(200);

		let connected = await connectPort();
		if (!connected) {
			log.info('Port connection failed, retrying in 1 second...');
			await wait(1000);
			connected = await connectPort();
		}
	} catch (error) {
		log.error('Extension initialization failed:', false, error);
	}
}

// Move the initialization to the load function to prevent SSR issues
export const load = async () => {
	// Skip extension initialization during SSR
	if (!browser_ext) {
		return {};
	}

	try {
		// Initialize the browser API
		// Only proceed with extension initialization if we have a browser API
		if (browser_ext) {
			await initializeExtension();
		}
	} catch (error) {
		log.error('Error initializing extension:', false, error);
	}
	return {};
};

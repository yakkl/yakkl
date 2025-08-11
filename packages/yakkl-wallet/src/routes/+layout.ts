// Top-level +layout.ts
export const prerender = true; // Must be here to create files. Do NOT use ssr = false because this will keep routes from working well

import { YAKKL_INTERNAL } from '$lib/common/constants';
import { handleLockDown } from '$lib/common/handlers';
import { log } from '$lib/common/logger-wrapper';
import { appStateManager } from '$lib/managers/AppStateManager';
import type { Browser } from 'webextension-polyfill';
import type { Runtime } from '$lib/types/browser-types';

let browser: Browser;

if (typeof window === 'undefined') {
  browser = await import ('webextension-polyfill');
} else {
  browser = await import ('$lib/common/environment').then(m => m.browser_ext);
}

let port: Runtime.Port | undefined;

// Function to connect port - will only run in browser context during load
async function connectPort(): Promise<boolean> {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		// Added: Cast to RuntimePort to use our local type
		port = browser.runtime.connect({ name: YAKKL_INTERNAL }) as Runtime.Port;
		if (port) {
			// Set extension connected flag on window for AppStateManager
			if (!window.yakkl) {
				window.yakkl = {} as any;
			}
			window.yakkl.isConnected = true;
			
			port.onDisconnect.addListener(async () => {
				handleLockDown();
				const disconnectPort = port; // Capture current port before clearing
				port = undefined;
				if (window.yakkl) {
					window.yakkl.isConnected = false;
				}

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
		// Silently handle the connection error if it's the "Receiving end does not exist" error
		// This can happen during extension reload or when background script isn't ready yet
		if (error instanceof Error && error.message?.includes('Receiving end does not exist')) {
			log.debug('Background script not ready yet, port connection will be retried');
		} else {
			log.error('Port connection failed:', false, error);
		}
	}
	return false;
}

// This function will only be called during load, not during SSR
async function initializeExtension() {
	try {
    if (typeof window === 'undefined') {
      return;
    }

		// Try connecting immediately, no arbitrary delay
		let connected = await connectPort();
		
		// If initial connection fails, retry with exponential backoff
		if (!connected) {
			const maxRetries = 5;
			let retryDelay = 100; // Start with 100ms
			
			for (let i = 0; i < maxRetries && !connected; i++) {
				log.debug(`Port connection retry ${i + 1}/${maxRetries} in ${retryDelay}ms`);
				await new Promise(resolve => setTimeout(resolve, retryDelay));
				connected = await connectPort();
				retryDelay = Math.min(retryDelay * 2, 1000); // Cap at 1 second
			}
			
			if (!connected) {
				throw new Error('Port connection failed after retries');
			}
		}
	} catch (error) {
		log.error('Extension initialization failed:', false, error);
		throw error; // Propagate error to be handled by AppStateManager
	}
}

// Move the initialization to the load function to prevent SSR issues
export const load = async () => {
	// Skip extension initialization during SSR
	if (typeof window === 'undefined') {
		return {};
	}

	try {
		// First establish port connection for extension
		await initializeExtension();
		
		// Then initialize the entire app state in coordinated manner
		await appStateManager.initialize();
	} catch (error) {
		log.error('Error during app initialization:', false, error);
		// App will show error state via AppStateManager
	}
	return {};
};

// $lib/browser-polyfill-wrapper.ts
import type { Browser } from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';

let browser_ext: Browser | null = null;
let initialized = false;

// Helper function to safely check the environment
function isServerSide(): boolean {
	return typeof window === 'undefined' || typeof document === 'undefined';
}

export function getBrowserExt(): Browser | null {
	// Don't attempt to use outside a browser
	if (isServerSide()) {
		return null;
	}

	if (!initialized) {
		initializeBrowserAPI();
	}

	return browser_ext;
}

export function initializeBrowserAPI(): Browser | null {
	if (initialized) return browser_ext;

	// Skip for SSR
	if (isServerSide()) {
		return null;
	}

	try {
		// Access the global browser object
		if (window && (window as any).browser) {
			browser_ext = (window as any).browser as Browser;
			initialized = true;
		} else {
			log.warn('Browser extension API not found in global scope');
		}
	} catch (error: unknown) {
		log.error('Failed to initialize browser extension API:', false, error);
	}

	return browser_ext;
}

// For asynchronous access
export async function getBrowserExtAsync(): Promise<Browser | null> {
	if (isServerSide()) return null;
	return getBrowserExt();
}

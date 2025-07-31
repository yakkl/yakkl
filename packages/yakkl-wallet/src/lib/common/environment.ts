// $lib/common/environment.ts
import { log } from '$lib/managers/Logger';
import type { Browser } from 'webextension-polyfill';

// Use a more generic type or create your own
type BrowserAPI = Browser; // or create a proper interface in your types file

// Helper function to check if we're in a browser environment
function isBrowserSide(): boolean {
	return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export const isClient = isBrowserSide();

// Create a comprehensive mock for SSR to prevent polyfill errors
const mockBrowser = {
	runtime: {
		id: 'mock-extension-id', // Critical for webextension-polyfill
		connect: () => ({
			onMessage: { addListener: () => {} },
			onDisconnect: { addListener: () => {} }
		}),
		sendMessage: () => Promise.resolve({}),
		onMessage: {
			addListener: () => {},
			removeListener: () => {},
			hasListener: () => false
		},
		getManifest: () => ({ version: '1.0.0' })
	},
	storage: {
		local: {
			get: () => Promise.resolve({}),
			set: () => Promise.resolve(),
			remove: () => Promise.resolve(),
			clear: () => Promise.resolve()
		}
	}
};

// Set up mocks during SSR to prevent webextension-polyfill errors
if (!isClient && typeof globalThis !== 'undefined') {
	if (!(globalThis as any).chrome) {
		(globalThis as any).chrome = mockBrowser;
	}
	if (!(globalThis as any).browser) {
		(globalThis as any).browser = mockBrowser;
	}
}

// Dynamic browser API loader to avoid SSR issues
let cachedBrowserAPI: BrowserAPI | null = null;
let apiLoadAttempted = false;

async function loadBrowserAPI(): Promise<BrowserAPI | null> {
	// if (!isClient) return null;
  // Testing having the above commented out

	if (apiLoadAttempted) return cachedBrowserAPI;
	apiLoadAttempted = true;

	try {
		// Try to dynamically import webextension-polyfill
		const browserModule = await import('$lib/browser-polyfill-wrapper');
		const browser = browserModule.default;
		cachedBrowserAPI = browser;
		return browser;
	} catch (error) {
		log.warn('Could not load webextension-polyfill, falling back to native APIs:', error);

		// Fallback to native browser APIs
		try {
			if ((window as any).browser) {
				cachedBrowserAPI = (window as any).browser;
				return cachedBrowserAPI;
			}

			if ((window as any).chrome && (window as any).chrome.runtime) {
				cachedBrowserAPI = (window as any).chrome;
				return cachedBrowserAPI;
			}
		} catch (err) {
			log.error('Error accessing native browser APIs:', err);
		}
	}

	cachedBrowserAPI = null;
	return null;
}

// Get the browser API from dynamic import or global
export async function getBrowserExtFromGlobal(): Promise<BrowserAPI | null> {
	// if (!isClient) return null;
  // Testing having the above commented out

  log.info('Loading browser API from global', false);
	try {
		return await loadBrowserAPI();
	} catch (err) {
		log.error('Error accessing browser API:', err);
		return null;
	}
}

// Synchronous version for backward compatibility (but prefer async version)
export function getBrowserExt(): BrowserAPI | null {
	if (!isClient) return null;

	// Return cached version if available
	if (cachedBrowserAPI) return cachedBrowserAPI;

	// Try native APIs as fallback for sync access
	try {
		if ((window as any).browser) {
			return (window as any).browser;
		}

		if ((window as any).chrome && (window as any).chrome.runtime) {
			return (window as any).chrome;
		}
	} catch (err) {
		log.error('Error accessing browser API from global:', err);
	}

	return null;
}

// For backward compatibility - but this will be null until async load completes
export const browser_ext = isClient ? await getBrowserExtFromGlobal() : null;
export const browserSvelte = isClient && !!browser_ext;

export function isBrowserEnv(): boolean {
	return isClient && getBrowserExt() !== null;
}

// Async version for new code
export async function isBrowserEnvAsync(): Promise<boolean> {
	if (!isClient) return false;
	const api = await getBrowserExtFromGlobal();
	return api !== null;
}

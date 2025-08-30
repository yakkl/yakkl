// $lib/common/environment.ts
import { log } from '$lib/managers/Logger';
import type { Browser } from 'webextension-polyfill';
import { getBrowserSync, getBrowserAsync, initializeBrowserPolyfill, browserExtension } from './browser-polyfill-unified';

console.log('[environment] environment.ts loaded');

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
} as unknown as BrowserAPI;

// Set up mocks during SSR to prevent webextension-polyfill errors
if (!isClient && typeof globalThis !== 'undefined') {
	if (!(globalThis as any).chrome) {
		(globalThis as any).chrome = mockBrowser;
	}
	if (!(globalThis as any).browser) {
		(globalThis as any).browser = mockBrowser;
	}
}

// Get the browser API from unified loader
export async function getBrowserExtFromGlobal(): Promise<BrowserAPI | null> {
	console.log('[getBrowserExtFromGlobal] Called');

	if (!isClient) {
		console.log('[getBrowserExtFromGlobal] Not in browser, returning mock');
		return mockBrowser;
	}

	// Return cached if available
	if (cachedBrowserApi) {
		console.log('[getBrowserExtFromGlobal] Returning cached API');
		return cachedBrowserApi;
	}

	try {
		// Use unified loader to get browser API
		const api = await getBrowserAsync();
		if (api) {
			console.log('[getBrowserExtFromGlobal] Got API from unified loader');
			cachedBrowserApi = api;
			return api;
		}

		console.warn('[getBrowserExtFromGlobal] No browser API found');
		return null;
	} catch (err) {
		console.error('[getBrowserExtFromGlobal] Error accessing browser API:', err);
		return null;
	}
}

// Synchronous version for backward compatibility
export function getBrowserExt(): BrowserAPI | null {
	if (!isClient) return mockBrowser;

	// Return cached if available
	if (cachedBrowserApi) return cachedBrowserApi;

	// Use the synchronous getter from unified loader
	const browser = getBrowserSync();
	if (browser) {
		cachedBrowserApi = browser;
		return browser;
	}

	// Return null if not yet loaded - don't trigger lazy initialization
	// The initialization should happen through InitializationManager
	return null;
}

// Use the proxy from unified loader for immediate access
// This will work synchronously if already loaded, or async if not
export const browser_ext: BrowserAPI = isClient ? browserExtension : mockBrowser;
export const browserSvelte = true; // Always true now since we have mock for SSR

// Add cached browser API for reliable access
let cachedBrowserApi: BrowserAPI | null = null;

export function isBrowserEnv(): boolean {
	// With unified loader, we can always return true in client
	return isClient;
}

// Async version for new code
export async function isBrowserEnvAsync(): Promise<boolean> {
	if (!isClient) return false;
	const api = await getBrowserExtFromGlobal();
	return api !== null;
}

// Do not auto-initialize here - let InitializationManager handle it
// This prevents race conditions with multiple initialization paths

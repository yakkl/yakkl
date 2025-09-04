// Top-level +layout.ts
export const prerender = true; // Must be here to create files. Do NOT use ssr = false because this will keep routes from working well

import { YAKKL_INTERNAL } from '$lib/common/constants';
import { handleLockDown } from '$lib/common/handlers';
import { log } from '$lib/common/logger-wrapper';
import { appStateManager } from '$lib/managers/AppStateManager';
import type { Runtime } from '$lib/types/browser-types';
import { browser_ext } from '$lib/common/environment';
import { initializationManager } from '$lib/common/initialization-manager';
import { initializeBrowserPolyfill } from '$lib/common/browser-polyfill-unified';

// Singleton port management
class PortManager {
	private static instance: PortManager;
	private port: Runtime.Port | undefined;
	private connectionPromise: Promise<boolean> | null = null;
	private isConnected = false;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 3;

	private constructor() {}

	static getInstance(): PortManager {
		if (!PortManager.instance) {
			PortManager.instance = new PortManager();
		}
		return PortManager.instance;
	}

	async connect(): Promise<boolean> {
		if (typeof window === 'undefined') {
			return false;
		}

		// Return true if already connected and port is alive
		if (this.isConnected && this.port) {
			// Verify port is still alive
			try {
				// Test the port by checking if we can access it
				if (this.port.name === YAKKL_INTERNAL) {
					return true;
				}
			} catch (e) {
				this.isConnected = false;
				this.port = undefined;
			}
		}

		// Prevent concurrent connection attempts
		if (this.connectionPromise) {
			return this.connectionPromise;
		}
		this.connectionPromise = this.performConnection();
		const result = await this.connectionPromise;
		this.connectionPromise = null;
		return result;
	}

	private async performConnection(): Promise<boolean> {
		try {
			// Clean up any existing port
			if (this.port) {
				try {
					this.port.disconnect();
				} catch (e) {
					// Ignore disconnect errors
				}
				this.port = undefined;
			}

			// Ensure browser API is available
			if (!browser_ext || !browser_ext.runtime || !browser_ext.runtime.connect) {
				return false;
			}

			this.port = browser_ext.runtime.connect({ name: YAKKL_INTERNAL }) as Runtime.Port;

			if (!this.port) {
				return false;
			}

			// Set up disconnect handler BEFORE marking as connected
			this.port.onDisconnect.addListener(() => {
				this.handleDisconnect();
			});

			// Mark as connected
			this.isConnected = true;
			this.reconnectAttempts = 0;

			// Update global state
			if (!window.yakkl) {
				window.yakkl = {} as any;
			}
			window.yakkl.isConnected = true;
			return true;
		} catch (error) {
			log.error('[PortManager] Connection failed:', false, error);

			if (error instanceof Error && error.message?.includes('Receiving end does not exist')) {
				log.debug('[PortManager] Background script not ready');
			}

			this.isConnected = false;
			this.port = undefined;
			return false;
		}
	}

	private handleDisconnect(): void {
		this.isConnected = false;
		this.port = undefined;

		if (window.yakkl) {
			window.yakkl.isConnected = false;
		}

		// Check for Chrome runtime errors
		if (browser_ext?.runtime?.lastError) {
			log.error('[PortManager] Chrome runtime error:', false, browser_ext.runtime.lastError);
		}

		// Only attempt reconnect if we haven't exceeded max attempts
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			log.debug(`[PortManager] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

			setTimeout(() => {
				this.connect().catch(err => {
					log.error('[PortManager] Reconnect failed:', false, err);
				});
			}, 1000 * this.reconnectAttempts); // Exponential backoff
		} else {
			log.error('[PortManager] Max reconnect attempts reached, giving up');
			handleLockDown();
		}
	}

	disconnect(): void {
		if (this.port) {
			try {
				this.port.disconnect();
			} catch (e) {
				// Ignore errors
			}
		}
		this.port = undefined;
		this.isConnected = false;
		this.connectionPromise = null;
	}
}

// Create singleton instance
const portManager = PortManager.getInstance();

// Function to connect port - will only run in browser context during load
async function connectPort(): Promise<boolean> {
	return portManager.connect();
}

// This function will only be called during load, not during SSR
async function performLayoutInitialization() {
	log.debug('[performLayoutInitialization] Starting...');

	if (typeof window === 'undefined') {
		return;
	}

	// Ensure browser polyfill is loaded first
	await initializeBrowserPolyfill();

	try {
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

		// Initialize the app state after port connection
		await appStateManager.initialize();
	} catch (error) {
		log.error('Layout initialization failed:', false, error);
		throw error;
	}
}

// Move the initialization to the load function to prevent SSR issues
export const load = async () => {
	// Skip extension initialization during SSR
	if (typeof window === 'undefined') {
		return {};
	}

	try {
		// Use centralized initialization manager to prevent race conditions
		// This ensures only one initialization path runs, preventing the hang
		await initializationManager.initialize(performLayoutInitialization);
	} catch (error) {
		log.error('[Root Layout] Error during initialization:', false, error);
		// App will show error state via AppStateManager
	}
	return {};
};

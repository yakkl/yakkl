// Top-level +layout.ts
export const prerender = true; // Must be here to create files. Do NOT use ssr = false because this will keep routes from working well

import { YAKKL_INTERNAL } from '$lib/common/constants';
import { handleLockDown } from '$lib/common/handlers';
import { log } from '$lib/common/logger-wrapper';
import { appStateManager } from '$lib/managers/AppStateManager';
import type { Browser } from 'webextension-polyfill';
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
		console.log('[PortManager] connect() called');

		if (typeof window === 'undefined') {
			console.log('[PortManager] No window object, returning false');
			return false;
		}

		// Return true if already connected and port is alive
		if (this.isConnected && this.port) {
			console.log('[PortManager] Already connected, verifying port...');
			// Verify port is still alive
			try {
				// Test the port by checking if we can access it
				if (this.port.name === YAKKL_INTERNAL) {
					console.log('[PortManager] ✓ Port already connected and alive');
					return true;
				}
			} catch (e) {
				console.log('[PortManager] Port check failed, reconnecting...');
				this.isConnected = false;
				this.port = undefined;
			}
		}

		// Prevent concurrent connection attempts
		if (this.connectionPromise) {
			console.log('[PortManager] Connection already in progress, waiting...');
			return this.connectionPromise;
		}

		console.log('[PortManager] Initiating new connection...');

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
				console.error('[PortManager] Browser API not available');
				return false;
			}

			console.log('[PortManager] Creating port connection...');
			this.port = browser_ext.runtime.connect({ name: YAKKL_INTERNAL }) as Runtime.Port;

			if (!this.port) {
				console.error('[PortManager] Port creation returned null');
				return false;
			}

			// Set up disconnect handler BEFORE marking as connected
			this.port.onDisconnect.addListener(() => {
				console.log('[PortManager] Port disconnected');
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

			console.log('[PortManager] ✓ Successfully connected');
			return true;

		} catch (error) {
			console.error('[PortManager] Connection failed:', error);

			if (error instanceof Error && error.message?.includes('Receiving end does not exist')) {
				console.log('[PortManager] Background script not ready');
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
			console.error('[PortManager] Chrome runtime error:', browser_ext.runtime.lastError);
		}

		// Only attempt reconnect if we haven't exceeded max attempts
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			console.log(`[PortManager] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

			setTimeout(() => {
				this.connect().catch(err => {
					console.error('[PortManager] Reconnect failed:', err);
				});
			}, 1000 * this.reconnectAttempts); // Exponential backoff
		} else {
			console.error('[PortManager] Max reconnect attempts reached, giving up');
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
	console.log('[performLayoutInitialization] Starting...');

	if (typeof window === 'undefined') {
		console.log('[performLayoutInitialization] No window object, skipping');
		return;
	}

	// Ensure browser polyfill is loaded first
	await initializeBrowserPolyfill();
	console.log('[performLayoutInitialization] Browser polyfill ready');

	try {
		console.log('[performLayoutInitialization] Attempting to connect port...');
		// Try connecting immediately, no arbitrary delay
		let connected = await connectPort();
		console.log('[performLayoutInitialization] Initial connection result:', connected);

		// If initial connection fails, retry with exponential backoff
		if (!connected) {
			console.log('[performLayoutInitialization] Initial connection failed, starting retries...');
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
		console.log('[performLayoutInitialization] Initializing AppStateManager...');
		await appStateManager.initialize();
		console.log('[performLayoutInitialization] AppStateManager initialized successfully');
	} catch (error) {
		log.error('Layout initialization failed:', false, error);
		throw error;
	}
}

// Move the initialization to the load function to prevent SSR issues
export const load = async () => {
	console.log('[Root Layout] Load function called');

	// Skip extension initialization during SSR
	if (typeof window === 'undefined') {
		console.log('[Root Layout] SSR context, skipping initialization');
		return {};
	}

	console.log('[Root Layout] Browser context, delegating to InitializationManager');

	try {
		// Use centralized initialization manager to prevent race conditions
		// This ensures only one initialization path runs, preventing the hang
		await initializationManager.initialize(performLayoutInitialization);
		console.log('[Root Layout] Initialization completed successfully');
	} catch (error) {
		console.error('[Root Layout] Error during initialization:', error);
		log.error('Error during initialization:', false, error);
		// App will show error state via AppStateManager
	}
	return {};
};

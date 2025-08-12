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
			if (!browser || !browser.runtime) {
				console.log('[PortManager] Loading browser API...');
				const env = await import('$lib/common/environment');
				browser = env.browser_ext;
			}
			
			if (!browser || !browser.runtime || !browser.runtime.connect) {
				console.error('[PortManager] Browser API not available');
				return false;
			}
			
			console.log('[PortManager] Creating port connection...');
			this.port = browser.runtime.connect({ name: YAKKL_INTERNAL }) as Runtime.Port;
			
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
		if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
			console.error('[PortManager] Chrome runtime error:', chrome.runtime.lastError);
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

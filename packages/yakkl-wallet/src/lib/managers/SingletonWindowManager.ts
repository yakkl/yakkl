import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
import type { Windows } from 'webextension-polyfill';
import { openWindows } from '$contexts/background/extensions/chrome/ui';
import { showExtensionPopup } from '$contexts/background/extensions/chrome/ui';

const browser_ext = browser;

export class SingletonWindowManager {
	private static instance: SingletonWindowManager | null = null;
	private currentWindowId: number | null = null;
	private initialized = false;
	private handleWindowRemoved = this.onWindowRemoved.bind(this);

	static getInstance(): SingletonWindowManager {
		if (!SingletonWindowManager.instance) {
			SingletonWindowManager.instance = new SingletonWindowManager();
		}
		return SingletonWindowManager.instance;
	}

	private constructor() {
		// Don't initialize here - wait for explicit initialization
	}

	private async initialize() {
		if (this.initialized) {
			log.debug('SingletonWindowManager already initialized');
			return;
		}

		try {
			log.info('Initializing SingletonWindowManager');
			
			// Initialize from session storage
			await this.loadStoredWindowId();

			// Listen for window removal - ensure we don't add duplicate listeners
			if (browser_ext?.windows?.onRemoved) {
				// Remove any existing listener first
				if (browser_ext.windows.onRemoved.hasListener(this.handleWindowRemoved)) {
					browser_ext.windows.onRemoved.removeListener(this.handleWindowRemoved);
					log.info('Removed existing window removal listener');
				}
				// Add the listener
				browser_ext.windows.onRemoved.addListener(this.handleWindowRemoved);
				log.info('Added window removal listener');
			}

			this.initialized = true;
			log.info('SingletonWindowManager initialized successfully');
		} catch (error) {
			log.error('Failed to initialize SingletonWindowManager:', false, error);
			// Even on error, mark as initialized to prevent repeated attempts
			this.initialized = true;
		}
	}

	private async loadStoredWindowId() {
		try {
			if (!browser_ext?.storage?.session) {
				log.warn('Browser extension storage not available');
				return;
			}

			const stored = await browser_ext.storage.session.get('windowId');
			if (stored?.windowId) {
				// Verify the window still exists before using it
				try {
					const window = await browser_ext.windows.get(stored.windowId as number);
					if (window && window.id === stored.windowId) {
						this.currentWindowId = stored.windowId as number;
						log.info('Loaded and verified stored window ID', false, { windowId: this.currentWindowId });
					} else {
						// Window doesn't exist, clean up
						await browser_ext.storage.session.remove('windowId');
						log.info('Stored window no longer exists, cleaned up');
					}
				} catch (error) {
					// Window doesn't exist
					await browser_ext.storage.session.remove('windowId');
					log.info('Stored window not found, cleaned up', false, error);
				}
			}
		} catch (error) {
			log.error('Failed to load stored window ID:', false, error);
		}
	}

	async showPopup(url: string = '', pinnedLocation: string = '0'): Promise<void> {
		log.info('SingletonWindowManager.showPopup called', false, { 
			url, 
			pinnedLocation, 
			currentWindowId: this.currentWindowId,
			initialized: this.initialized 
		});
		
		try {
			// Ensure we're initialized
			await this.initialize();
			
			// Extra safety check - if we're being called after logout, clear any stale window ID
			if (this.currentWindowId) {
				try {
					// Verify the window still exists
					await browser_ext.windows.get(this.currentWindowId);
				} catch (error) {
					log.info('Stale window ID detected after logout, clearing', false, { 
						windowId: this.currentWindowId,
						error: error instanceof Error ? error.message : 'Window not found'
					});
					this.currentWindowId = null;
					// Clear from session storage too
					if (browser_ext.storage?.session) {
						await browser_ext.storage.session.remove('windowId').catch(() => {});
					}
				}
			}
			
			// Log state after initialization
			log.info('After initialization', false, { 
				currentWindowId: this.currentWindowId,
				initialized: this.initialized 
			});

			// Check if browser_ext is available
			if (!browser_ext) {
				throw new Error('Browser extension API not available');
			}

			// Check if we have an existing window
			if (this.currentWindowId) {
				let windowExists = false;
				
				try {
					// Try to get the window
					const existingWindow = await browser_ext.windows.get(this.currentWindowId);
					
					// Check if window actually exists and is our popup
					if (existingWindow && existingWindow.id === this.currentWindowId) {
						windowExists = true;
						log.info('Found existing popup window', false, { 
							windowId: this.currentWindowId, 
							windowState: existingWindow.state,
							focused: existingWindow.focused 
						});
						
						// Focus existing window
						await browser_ext.windows.update(this.currentWindowId, {
							focused: true,
							drawAttention: true
						});

						// Update URL if provided
						if (url && browser_ext.tabs) {
							const tabs = await browser_ext.tabs.query({ windowId: this.currentWindowId });
							if (tabs?.[0]?.id) {
								// Ensure we use the full extension URL
								const fullUrl = browser_ext.runtime.getURL(url);
								log.info('Updating tab URL', false, { tabId: tabs[0].id, url, fullUrl });
								await browser_ext.tabs.update(tabs[0].id, { url: fullUrl });
							}
						}

						return;
					} else {
						// Window object returned but doesn't match our ID
						log.warn('Window returned but ID mismatch', false, { 
							expectedId: this.currentWindowId,
							actualId: existingWindow?.id 
						});
					}
				} catch (error) {
					// Error getting window - it doesn't exist
					log.info('Error checking window existence', false, { 
						windowId: this.currentWindowId,
						errorMessage: (error as Error).message,
						errorString: String(error)
					});
				}
				
				// If we reach here, the window doesn't exist or is invalid - clean up
				if (!windowExists) {
					log.info('Window is invalid or closed, resetting state', false, { 
						windowId: this.currentWindowId 
					});
					this.currentWindowId = null;
					
					// Clean up session storage
					if (browser_ext.storage?.session) {
						try {
							await browser_ext.storage.session.remove('windowId');
							log.info('Cleaned up windowId from session storage');
						} catch (e) {
							log.warn('Failed to remove windowId from session storage', false, e);
						}
					}
				}
			}

			// Create new window
			log.info('Creating new popup window', false, { url });
			let window: Windows.Window;
			try {
				window = await showExtensionPopup(428, 926, url, pinnedLocation);
			} catch (error) {
				log.error('Failed to create popup window', false, { 
					error: error instanceof Error ? error.message : error,
					url,
					pinnedLocation 
				});
				throw error;
			}
			
			if (!window || !window.id) {
				log.error('Window creation returned invalid result', false, { window });
				throw new Error('Failed to create popup window - invalid window object');
			}
			
			this.currentWindowId = window.id;
			log.info('New popup window created successfully', false, { windowId: window.id });

			// Store window ID in session storage
			if (browser_ext.storage?.session) {
				try {
					await browser_ext.storage.session.set({ windowId: window.id });
					log.info('Stored windowId in session storage', false, { windowId: window.id });
				} catch (e) {
					log.warn('Failed to store windowId in session storage', false, e);
				}
			}

			// Draw attention to the new window
			try {
				await browser_ext.windows.update(window.id, { drawAttention: true });
			} catch (e) {
				log.warn('Failed to draw attention to window', false, e);
			}

			// Track window in openWindows map
			if (openWindows) {
				openWindows.set(window.id, window);
			}
		} catch (error) {
			log.error('SingletonWindowManager - showPopup', false, error);
		}
	}

	private async onWindowRemoved(windowId: number) {
		log.info('Window removed event fired', false, { 
			removedWindowId: windowId, 
			currentWindowId: this.currentWindowId,
			isOurWindow: windowId === this.currentWindowId
		});
		
		if (windowId === this.currentWindowId) {
			log.info('Our popup window was closed, cleaning up', false, { windowId });
			this.currentWindowId = null;
			
			// Try to remove from session storage, but don't fail if already removed
			try {
				// Check if session storage is available before trying to remove
				if (browser_ext.storage?.session) {
					const stored = await browser_ext.storage.session.get('windowId');
					if (stored?.windowId) {
						await browser_ext.storage.session.remove('windowId');
						log.info('Removed windowId from session storage');
					} else {
						log.info('WindowId already removed from session storage');
					}
				}
			} catch (error) {
				log.warn('Session storage operation failed', false, error);
			}
			
			// Don't lock the wallet when window is closed - only lock on explicit logout or idle timeout
			// This allows users to close and reopen the wallet without re-authenticating
			log.info('Window closed - wallet remains unlocked for quick reopening');
		}
	}


	/**
	 * Reset the singleton instance - useful for testing or when extension is reloaded
	 */
	static reset() {
		if (SingletonWindowManager.instance) {
			const instance = SingletonWindowManager.instance;
			
			// Remove listener if exists
			if (browser_ext?.windows?.onRemoved && instance.handleWindowRemoved) {
				browser_ext.windows.onRemoved.removeListener(instance.handleWindowRemoved);
			}
			
			// Clear state
			instance.currentWindowId = null;
			instance.initialized = false;
			
			// Clear singleton instance
			SingletonWindowManager.instance = null;
			
			log.info('SingletonWindowManager reset');
		}
	}
}

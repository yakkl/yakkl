import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
import type { Windows } from 'webextension-polyfill';
import { openWindows } from '$contexts/background/extensions/chrome/ui';
import { showExtensionPopup } from '$contexts/background/extensions/chrome/ui';
import { STORAGE_YAKKL_SETTINGS } from '$lib/common/constants';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/backgroundSecuredStorage';
import type { YakklSettings } from '$lib/common/interfaces';

// NOTE: This can only be used in the background context

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
			if (browser?.windows?.onRemoved) {
				// Remove any existing listener first
				if (browser.windows.onRemoved.hasListener(this.handleWindowRemoved)) {
					browser.windows.onRemoved.removeListener(this.handleWindowRemoved);
					log.info('Removed existing window removal listener');
				}
				// Add the listener
				browser.windows.onRemoved.addListener(this.handleWindowRemoved);
				log.info('Added window removal listener');
			}

			this.initialized = true;
			log.info('SingletonWindowManager initialized successfully');
		} catch (error) {
			log.warn('Failed to initialize SingletonWindowManager:', false, error);
			// Even on error, mark as initialized to prevent repeated attempts
			this.initialized = true;
		}
	}

	private async loadStoredWindowId() {
		try {
			if (!browser?.storage?.session) {
				log.warn('Browser extension storage not available');
				return;
			}

			const stored = await browser.storage.session.get('windowId');
			if (stored?.windowId) {
				// Verify the window still exists before using it
				try {
					const window = await browser.windows.get(stored.windowId as number);
					if (window && window.id === stored.windowId) {
						this.currentWindowId = stored.windowId as number;
						log.info('Loaded and verified stored window ID', false, { windowId: this.currentWindowId });
					} else {
						// Window doesn't exist, clean up
						this.currentWindowId = null;
						await browser.storage.session.remove('windowId');
						log.info('Stored window no longer exists, cleaned up');
					}
				} catch (error) {
					// Window doesn't exist
					this.currentWindowId = null;
					await browser.storage.session.remove('windowId');
					log.info('Stored window not found, cleaned up', false, error);
				}
			}
		} catch (error) {
			log.warn('Failed to load stored window ID:', false, error);
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
			// Check if browser is available
			if (!browser) {
				throw new Error('Browser extension API not available');
			}

			// Ensure we're initialized
			await this.initialize();

			// Log state after initialization
			log.info('After initialization', false, {
				currentWindowId: this.currentWindowId,
				initialized: this.initialized
			});

			// Check if we have an existing window
			if (this.currentWindowId) {
				let windowExists = false;
				let windowValid = false;

				try {
					// Try to get the window
					const existingWindow = await browser.windows.get(this.currentWindowId);

					// Check if window actually exists and is our popup
					if (existingWindow && existingWindow.id === this.currentWindowId) {
						windowExists = true;
						windowValid = true;
						log.info('Found existing popup window', false, {
							windowId: this.currentWindowId,
							windowState: existingWindow.state,
							focused: existingWindow.focused
						});

						// Focus existing window
						await browser.windows.update(this.currentWindowId, {
							focused: true,
							drawAttention: true
						});

						// Update URL if provided
						if (url && browser.tabs) {
							const tabs = await browser.tabs.query({ windowId: this.currentWindowId });
							if (tabs?.[0]?.id) {
								// Ensure we use the full extension URL
								const fullUrl = browser.runtime.getURL(url);
								log.info('Updating tab URL', false, { tabId: tabs[0].id, url, fullUrl });
								await browser.tabs.update(tabs[0].id, { url: fullUrl });
							}
						}

						return;
					} else {
						// Window object returned but doesn't match our ID
						log.warn('Window returned but ID mismatch', false, {
							expectedId: this.currentWindowId,
							actualId: existingWindow?.id
						});
						windowExists = true;
						windowValid = false;
					}
				} catch (error) {
					// Error getting window - it doesn't exist
					log.info('Window does not exist or cannot be accessed', false, {
						windowId: this.currentWindowId,
						errorMessage: (error as Error).message,
						errorString: String(error)
					});
					windowExists = false;
					windowValid = false;
				}

				// If window doesn't exist or is invalid, clean up and create a new one
				if (!windowExists || !windowValid) {
					log.info('Window is invalid or closed, cleaning up and creating new window', false, {
						windowId: this.currentWindowId,
						windowExists,
						windowValid
					});

					// Remove from openWindows map if it exists (before clearing currentWindowId)
					if (openWindows && this.currentWindowId) {
						openWindows.delete(this.currentWindowId);
					}

					// Clear the current window ID
					this.currentWindowId = null;

					// Clean up session storage
					if (browser.storage?.session) {
						try {
							await browser.storage.session.remove('windowId');
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
				log.warn('Failed to create popup window', false, {
					error: error instanceof Error ? error.message : error,
					url,
					pinnedLocation
				});
				throw error;
			}

			if (!window || !window.id) {
				log.warn('Window creation returned invalid result', false, { window });
				throw new Error('Failed to create popup window - invalid window object');
			}

			this.currentWindowId = window.id;
			log.info('New popup window created successfully', false, { windowId: window.id });

			// Store window ID in session storage
			if (browser.storage?.session) {
				try {
					await browser.storage.session.set({ windowId: window.id });
					log.info('Stored windowId in session storage', false, { windowId: window.id });
				} catch (e) {
					log.warn('Failed to store windowId in session storage', false, e);
				}
			}

			// Draw attention to the new window
			try {
				await browser.windows.update(window.id, { drawAttention: true });
			} catch (e) {
				log.warn('Failed to draw attention to window', false, e);
			}

			// Track window in openWindows map
			if (openWindows) {
				openWindows.set(window.id, window);
			}
		} catch (error) {
			log.warn('SingletonWindowManager - showPopup', false, error);
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
				if (browser.storage?.session) {
					const stored = await browser.storage.session.get('windowId');
					if (stored?.windowId) {
						await browser.storage.session.remove('windowId');
						log.info('Removed windowId from session storage');
					} else {
						log.info('WindowId already removed from session storage');
					}
				}
			} catch (error) {
				log.warn('Session storage operation failed', false, error);
			}

      const settings = await getObjectFromLocalStorage<YakklSettings>(STORAGE_YAKKL_SETTINGS);
      if (settings) {
        settings.isLocked = true;
        await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, settings);
			log.info('Window closed - wallet is locked and shoule never remain open');
      }
		}
	}


	/**
	 * Check if there's an active popup window
	 */
	async hasActiveWindow(): Promise<boolean> {
		try {
			await this.initialize();

			if (!this.currentWindowId || !browser) {
				return false;
			}

			try {
				const window = await browser.windows.get(this.currentWindowId);
				return !!(window && window.id === this.currentWindowId);
			} catch (error) {
				// Window doesn't exist
				this.currentWindowId = null;
				if (browser?.storage?.session) {
					await browser.storage.session.remove('windowId');
				}
				return false;
			}
		} catch (error) {
			log.warn('Failed to check for active window:', false, error);
			return false;
		}
	}

	/**
	 * Get the current window ID if available
	 */
	getCurrentWindowId(): number | null {
		return this.currentWindowId;
	}

	/**
	 * Reset the singleton instance - useful for testing or when extension is reloaded
	 */
	static reset() {
		if (SingletonWindowManager.instance) {
			const instance = SingletonWindowManager.instance;

			// Remove listener if exists
			if (browser?.windows?.onRemoved && instance.handleWindowRemoved) {
				browser.windows.onRemoved.removeListener(instance.handleWindowRemoved);
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

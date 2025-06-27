// import { browser_ext } from "$lib/common/environment";
import { log } from '$lib/common/logger-wrapper';
import { openWindows } from '$lib/extensions/chrome/ui';
import { showExtensionPopup } from '$lib/extensions/chrome/ui';
import browser from 'webextension-polyfill';

const browser_ext = browser;

export class SingletonWindowManager {
	private static instance: SingletonWindowManager | null = null;
	private currentWindowId: number | null = null;
	private initialized = false;

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
		if (this.initialized) return;

		try {
			// Initialize from session storage
			await this.loadStoredWindowId();

			// Listen for window removal
			if (browser_ext?.windows?.onRemoved) {
				browser_ext.windows.onRemoved.addListener((windowId) => {
					if (windowId === this.currentWindowId) {
						this.currentWindowId = null;
						browser_ext.storage.session.remove('windowId').catch(() => {});
					}
				});
			}

			this.initialized = true;
		} catch (error) {
			log.error('Failed to initialize SingletonWindowManager:', false, error);
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
				this.currentWindowId = stored.windowId as number;
			}
		} catch (error) {
			log.error('Failed to load stored window ID:', false, error);
		}
	}

	async showPopup(url: string = '', pinnedLocation: string = '0'): Promise<void> {
		try {
			// Ensure we're initialized
			await this.initialize();

			// Check if browser_ext is available
			if (!browser_ext) {
				throw new Error('Browser extension API not available');
			}

			// Check if we have an existing window
			if (this.currentWindowId) {
				try {
					const window = await browser_ext.windows.get(this.currentWindowId);
					if (window) {
						// Focus existing window
						await browser_ext.windows.update(this.currentWindowId, {
							focused: true,
							drawAttention: true
						});

						// Update URL if provided
						if (url && browser_ext.tabs) {
							const tabs = await browser_ext.tabs.query({ windowId: this.currentWindowId });
							if (tabs?.[0]?.id) {
								await browser_ext.tabs.update(tabs[0].id, { url });
							}
						}

						return;
					}
				} catch {
					// Window doesn't exist anymore
					this.currentWindowId = null;
				}
			}

			// Create new window
			const window = await showExtensionPopup(428, 926, url, pinnedLocation);
			this.currentWindowId = window.id;

			// Store window ID
			if (browser_ext.storage?.session) {
				await browser_ext.storage.session.set({ windowId: window.id });
			}

			// Draw attention
			await browser_ext.windows.update(window.id, { drawAttention: true });

			// Track window
			if (openWindows) {
				openWindows.set(window.id, window);
			}
		} catch (error) {
			log.error('SingletonWindowManager - showPopup', false, error);
		}
	}
}

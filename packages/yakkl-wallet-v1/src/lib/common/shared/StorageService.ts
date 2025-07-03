// $lib/shared/StorageService.ts
import type { Browser } from 'webextension-polyfill';
import { BrowserAccessor } from './BrowserAccessor';
import { log } from '$lib/common/logger-wrapper';

/**
 * Service for cross-context storage operations
 */
export class StorageService {
	private browserAccessor: BrowserAccessor;
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	constructor() {
		this.browserAccessor = BrowserAccessor.getInstance();
	}

	/**
	 * Initialize the service
	 */
	public async initialize(): Promise<void> {
		if (this.initialized) return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			try {
				// Ensure browser accessor is initialized
				await this.browserAccessor.initialize();
				this.initialized = true;
			} catch (error) {
				log.error('Failed to initialize StorageService:', false, error);
			} finally {
				this.initPromise = null;
			}
		})();

		return this.initPromise;
	}

	/**
	 * Get data from storage with proper type checking
	 */
	public async getData<T>(key: string, defaultValue: T): Promise<T> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		return this.browserAccessor.performOperation(async (browser: Browser) => {
			try {
				// Get the data from storage
				const result = await browser.storage.local.get(key);

				// Check if the key exists
				if (result[key] !== undefined) {
					// Safely type cast and validate
					return this.validateAndCast(result[key], defaultValue);
				}
			} catch (error) {
				log.error(`Error getting data for key "${key}":`, false, error);
			}

			return defaultValue;
		}, defaultValue);
	}

	/**
	 * Save data to storage
	 */
	public async saveData<T>(key: string, value: T): Promise<boolean> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		return this.browserAccessor.performOperation(async (browser: Browser) => {
			try {
				await browser.storage.local.set({ [key]: value });
				log.debug(`Data saved for key "${key}"`);
				return true;
			} catch (error) {
				log.error(`Error saving data for key "${key}":`, false, error);
				return false;
			}
		}, false);
	}

	/**
	 * Validate and cast the value to the expected type
	 */
	private validateAndCast<T>(value: unknown, defaultValue: T): T {
		try {
			// For primitive types
			if (typeof value === typeof defaultValue) {
				return value as T;
			}

			// For arrays
			if (Array.isArray(value) && Array.isArray(defaultValue)) {
				return value as T;
			}

			// For objects (excluding null)
			if (
				typeof value === 'object' &&
				value !== null &&
				typeof defaultValue === 'object' &&
				defaultValue !== null
			) {
				return value as T;
			}

			// If types don't match, log a warning and return default
			log.warn(`Type mismatch in storage: expected ${typeof defaultValue}, got ${typeof value}`);
			return defaultValue;
		} catch (error) {
			log.error('Error validating storage data:', false, error);
			return defaultValue;
		}
	}

	/**
	 * Remove data from storage
	 */
	public async removeData(key: string): Promise<boolean> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		return this.browserAccessor.performOperation(async (browser: Browser) => {
			try {
				await browser.storage.local.remove(key);
				log.debug(`Data removed for key "${key}"`);
				return true;
			} catch (error) {
				log.error(`Error removing data for key "${key}":`, false, error);
				return false;
			}
		}, false);
	}

	/**
	 * Clear all storage
	 */
	public async clearAll(): Promise<boolean> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		return this.browserAccessor.performOperation(async (browser: Browser) => {
			try {
				await browser.storage.local.clear();
				log.debug('All storage data cleared');
				return true;
			} catch (error) {
				log.error('Error clearing storage:', false, error);
				return false;
			}
		}, false);
	}
}

// Example usage:
// Some UI component
/*
import { StorageService } from '$lib/shared/StorageService';
import { onMount } from 'svelte';

// Create the service
const storageService = new StorageService();
let userSettings = {};

onMount(async () => {
  try {
    // Initialize
    await storageService.initialize();

    // Get data
    userSettings = await storageService.getData('userSettings', {});

    // Save data
    await storageService.saveData('lastAccess', new Date().toISOString());
  } catch (error) {
    console.error("Error working with storage:", error);
  }
});
*/

// $lib/shared/StorageService.ts
import { log } from '$lib/common/logger-wrapper';
import { browser_ext } from '../environment';
import { getObjectFromExtensionStorage, removeFromExtensionStorage, setObjectInExtensionStorage } from '../stores';

/**
 * Service for cross-context storage operations
 * This is a simple wrapper around the storage functions in stores.ts
 */
export class StorageService {
	private initialized = false;

	constructor() {
		this.initialized = true;
	}

	/**
	 * Initialize the service (kept for backward compatibility)
	 */
	public async initialize(): Promise<void> {
		this.initialized = true;
	}

	/**
	 * Get data from storage with proper type checking
	 */
	public async getData<T>(key: string, defaultValue: T): Promise<T> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			const result = await getObjectFromExtensionStorage<T>(key);
			return result ?? defaultValue;
		} catch (error) {
			log.error(`Error getting data for key "${key}":`, false, error);
			return defaultValue;
		}
	}

	/**
	 * Save data to storage
	 */
	public async saveData<T>(key: string, value: T): Promise<void | boolean> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			await setObjectInExtensionStorage(key, value);
			log.debug(`Data saved for key "${key}"`);
			return true;
		} catch (error) {
			log.error(`Error saving data for key "${key}":`, false, error);
			return false;
		}
	}


	/**
	 * Remove data from storage
	 */
	public async removeData(key: string): Promise<void | boolean> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			await removeFromExtensionStorage(key);
			log.debug(`Data removed for key "${key}"`);
			return true;
		} catch (error) {
			log.error(`Error removing data for key "${key}":`, false, error);
			return false;
		}
	}

	/**
	 * Clear all storage
	 */
	public async clearAll(): Promise<boolean> {
		// Ensure initialized
		if (!this.initialized) {
			await this.initialize();
		}

		try {
			// Note: clearAllExtensionStorage should be imported from stores.ts if needed
			if (browser_ext?.storage?.local) {
				await browser_ext.storage.local.clear();
				log.debug('All storage data cleared');
				return true;
			}
			return false;
		} catch (error) {
			log.error('Error clearing storage:', false, error);
			return false;
		}
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

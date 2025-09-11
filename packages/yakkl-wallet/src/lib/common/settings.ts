import { STORAGE_YAKKL_SETTINGS } from "./constants";
import type { YakklSettings } from "./interfaces";
import { getObjectFromLocalStorage } from "./storage";

export async function getYakklSettings(
	id?: string,
	persona?: string
): Promise<YakklSettings | null> {
	try {
		const value = await getObjectFromLocalStorage<YakklSettings>(STORAGE_YAKKL_SETTINGS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value; // Return an empty object or provide a default value if necessary
	} catch (error) {
		console.error('[stores.ts] getYakklSettings: Error:', error);
		throw error;
	}
}

// Direct version for critical initialization paths (sidepanel)
export async function getYakklSettingsDirect(
	id?: string,
	persona?: string
): Promise<YakklSettings | null> {
	try {
		const { getObjectFromLocalStorageDirect } = await import('./storage');
		const value = await getObjectFromLocalStorageDirect<YakklSettings>(STORAGE_YAKKL_SETTINGS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value; // Return an empty object or provide a default value if necessary
	} catch (error) {
		console.error('[stores.ts] getYakklSettingsDirect: Error:', error);
		return null; // Return null instead of throwing to handle initialization gracefully
	}
}

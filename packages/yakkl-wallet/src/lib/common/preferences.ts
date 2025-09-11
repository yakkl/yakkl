import { STORAGE_YAKKL_PREFERENCES } from "./constants";
import type { Preferences } from "./interfaces";
import { getObjectFromLocalStorage } from "./storage";
import { log } from "$lib/managers/Logger";

export async function getPreferences(id?: string, persona?: string): Promise<Preferences | null> {
	try {
		const value = await getObjectFromLocalStorage<Preferences>(STORAGE_YAKKL_PREFERENCES);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value; // Return an empty object or provide a default value if necessary
	} catch (error) {
		console.error('[stores.ts] getPreferences: Error:', error);
		throw error;
	}
}

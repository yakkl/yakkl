import { STORAGE_YAKKL_PROFILE } from "./constants";
import type { Profile } from "./interfaces";
import { getObjectFromLocalStorage } from "./storage";

export async function getProfile(id?: string, persona?: string): Promise<Profile | null> {
	try {
		const value = await getObjectFromLocalStorage<Profile>(STORAGE_YAKKL_PROFILE);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value; // Return an empty object or provide a default value if necessary
	} catch (error) {
		console.error('[profile.ts] getProfile: Error:', error);
		throw error;
	}
}

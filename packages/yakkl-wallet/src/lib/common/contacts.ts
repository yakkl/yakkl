import { STORAGE_YAKKL_CONTACTS } from "./constants";
import type { YakklContact } from "./interfaces";
import { getObjectFromLocalStorage } from "./storage";

export async function getYakklContacts(id?: string, persona?: string): Promise<YakklContact[]> {
	try {
		const value = await getObjectFromLocalStorage<YakklContact[]>(STORAGE_YAKKL_CONTACTS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value || []; // Return an empty array or provide a default value if necessary
	} catch (error) {
		console.error('[stores.ts] getYakklContacts: Error:', error);
		throw error;
	}
}

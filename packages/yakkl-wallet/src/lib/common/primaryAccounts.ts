import { STORAGE_YAKKL_PRIMARY_ACCOUNTS } from "./constants";
import type { YakklPrimaryAccount } from "./interfaces";
import { getObjectFromLocalStorage } from "./storage";
import { log } from "$lib/common/logger-wrapper";

export async function getYakklPrimaryAccounts(
	id?: string,
	persona?: string
): Promise<YakklPrimaryAccount[]> {
	// eslint-disable-next-line no-useless-catch
	try {
		const value = await getObjectFromLocalStorage<YakklPrimaryAccount[]>(
			STORAGE_YAKKL_PRIMARY_ACCOUNTS
		);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value || [];
	} catch (error) {
		log.error('Error in getYakklPrimaryAccounts:', false, error);
		throw error;
	}
}

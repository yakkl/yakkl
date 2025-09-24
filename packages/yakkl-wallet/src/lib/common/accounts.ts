import { STORAGE_YAKKL_ACCOUNTS } from "./constants";
import type { YakklAccount } from "./interfaces";
import { getObjectFromLocalStorage, setObjectInLocalStorage } from "./storage";
import { log } from "$lib/common/logger-wrapper";
import { verifyEncryption, yakklAccountsStore } from "./stores";

export async function getYakklAccounts(id?: string, persona?: string): Promise<YakklAccount[]> {
	// eslint-disable-next-line no-useless-catch
	try {
		const value = await getObjectFromLocalStorage<YakklAccount[]>(STORAGE_YAKKL_ACCOUNTS);

		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			log.error('[getYakklAccounts] ERROR: String value received from storage:', false, value);
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		const accounts = value || [];
		log.info('[getYakklAccounts] Loaded accounts count:', false, accounts.length);
		return accounts;
	} catch (error) {
		log.error('Error in getYakklAccounts:', false, error);
		throw error;
	}
}

export async function setYakklAccountsStorage(values: YakklAccount[], updateMemoryStore = true) {
	try {
		const newValues = (await verifyEncryption(values)) as unknown as YakklAccount[];
		if (updateMemoryStore) {
      log.info('[setYakklAccountsStorage] Updating memory store:', false, updateMemoryStore);
      let { yakklAccountsStore } = await import('./stores');
			yakklAccountsStore.set(newValues);
		}
		await setObjectInLocalStorage<YakklAccount[]>('yakklAccounts', newValues);
	} catch (error) {
		log.error('Error in setYakklAccountsStorage:', false, error);
		throw error;
	}
}

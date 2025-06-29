/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */

export const prerender = false;

import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { writable, get } from 'svelte/store';
import {
	yakklSettings,
	profile,
	yakklPrimaryAccounts,
	yakklCurrentlySelected,
	yakklWatchList,
	yakklContacts,
	yakklAccounts,
	yakklPreferences,
	yakklChats,
	yakklBlockedList
} from '$lib/models/dataModels';
import {
	STORAGE_YAKKL_REGISTERED_DATA,
	STORAGE_YAKKL_ACCOUNTS,
	STORAGE_YAKKL_PRIMARY_ACCOUNTS,
	STORAGE_YAKKL_CURRENTLY_SELECTED,
	STORAGE_YAKKL_PROFILE,
	STORAGE_YAKKL_PREFERENCES,
	STORAGE_YAKKL_SETTINGS,
	STORAGE_YAKKL_CONTACTS,
	STORAGE_YAKKL_WATCHLIST,
	STORAGE_YAKKL_BLOCKEDLIST,
	STORAGE_YAKKL_CONNECTED_DOMAINS,
	STORAGE_YAKKL_CHATS,
	STORAGE_YAKKL_WALLET_BLOCKCHAINS,
	STORAGE_YAKKL_WALLET_PROVIDERS,
	STORAGE_YAKKL_TOKENDATA,
	STORAGE_YAKKL_TOKENDATA_CUSTOM,
	STORAGE_YAKKL_COMBINED_TOKENS
} from '$lib/common/constants';

import { encryptData, decryptData } from '$lib/common/encryption';
import { isEncryptedData } from '$lib/common/misc';
import { type PricingStore } from '$lib/common/types';
import { isEqual } from 'lodash-es';

import type {
	CurrentlySelectedData,
	Preferences,
	Profile,
	Settings,
	YakklCurrentlySelected,
	YakklBlocked,
	YakklWatch,
	YakklAccount,
	YakklContact,
	YakklRegisteredData,
	YakklPrimaryAccount,
	HasData,
	YakklConnectedDomain,
	YakklChat,
	GasTransStore,
	ContractData,
	TokenData,
	MarketPriceData,
	ActiveTab
} from '$lib/common/interfaces';

import { walletStore, type Wallet } from '$lib/managers/Wallet';
import type { Blockchain } from '$lib/managers/Blockchain';
import type { Provider } from '$lib/managers/Provider';
import type { TokenService } from '$lib/managers/blockchains/evm/TokenService';
import { tokens } from './stores/tokens';
// import { timerManagerStore } from '$lib/managers/TimerManager';
import { log } from '$lib/managers/Logger';
import { AccountTypeCategory, NetworkType } from '$lib/common/types';
import { browser_ext } from '$lib/common/environment';
import type { RSSItem } from '$lib/managers/ExtensionRSSFeedService';

// Svelte writeable stores
export const alert = writable({
	msg: 'Welcome to the YAKKL® Smart Wallet!',
	icon: 1,
	color: {
		background: 'bg-indigo-400',
		text: 'text-indigo-800'
	},
	opacity: 0.5,
	ms: 3000
});

// default ms = 3 seconds. To make the Alert stay until user clicks close then set ms = 0

// loadCheckCurrentlySelectedStore - Checks the $yakklCurrentlySelectedStore to see if 'data' is encrypted and it does not decrpt any contained objects attached to the 'data' object until needed
export async function loadCheckCurrentlySelectedStore(): Promise<YakklCurrentlySelected | null> {
	try {
		const currentlySelected = getYakklCurrentlySelectedStore();
		const miscStore = getMiscStore();

		if (miscStore && currentlySelected !== null) {
			if (isEncryptedData(currentlySelected.data)) {
				decryptData(currentlySelected.data, miscStore).then((result) => {
					currentlySelected.data = result as CurrentlySelectedData;
					// setYakklCurrentlySelectedStore(currentlySelected);
					return currentlySelected; //true;
				});
			} else {
				return currentlySelected; //true;
			}
		}
		return null;
	} catch (error) {
		log.error('Error in loadCheckCurrentlySelectedStore:', false, error);
		throw error;
	}
}

export async function verifyEncryption<T extends HasData<any>>(value: T | T[]): Promise<T | T[]> {
	try {
		const miscStore = getMiscStore();

		if (miscStore) {
			// Helper function to process each item
			const processItem = async (item: T) => {
				if (!isEncryptedData(item.data)) {
					const result = await encryptData(item.data, miscStore);
					item.data = result as any;
				}
				return item;
			};

			// If the input value is an array, process each item in the array
			if (Array.isArray(value)) {
				return Promise.all(value.map(processItem));
			} else {
				// If the input value is a single item, process it directly
				return processItem(value);
			}
		}

		return value;
	} catch (error) {
		log.error('Error in verifyEncryption:', false, error);
		throw error;
	}
}

//
// NOTE: getYakkl... or setYakkl... represents both a storage and store. If there is no Yakkl prefix like 'getMiscStore' then it is only in memory and not stored
//

// ---------------------------------
// Svelte memory stores

export const yakklPreferencesStore = writable<Preferences>(yakklPreferences);
export const yakklSettingsStore = writable(yakklSettings);
export const profileStore = writable(profile);
export const yakklCurrentlySelectedStore = writable<YakklCurrentlySelected | null>(
	yakklCurrentlySelected
);
export const yakklContactsStore = writable<YakklContact[]>(yakklContacts);
export const yakklChatsStore = writable<YakklChat[]>(yakklChats);
export const yakklAccountsStore = writable<YakklAccount[]>(yakklAccounts);
export const yakklPrimaryAccountsStore = writable<YakklPrimaryAccount[]>(yakklPrimaryAccounts);
export const yakklWatchListStore = writable<YakklWatch[]>(yakklWatchList);
export const yakklBlockedListStore = writable<YakklBlocked[]>(yakklBlockedList);
export const yakklConnectedDomainsStore = writable<YakklConnectedDomain[]>(undefined); // Move to null since these do not need to be pre-seeded
export const yakklMiscStore = writable<string>(undefined); // Misc items so formats will change
export const yakklVeryStore = writable<any>(undefined); // Misc items so formats will change
export const yakklVersionStore = writable<string>(undefined);
export const yakklUserNameStore = writable<string>(undefined);
export const yakklPricingStore = writable<PricingStore>(undefined); // {provider: '', pair: '', price: 1 }  - This is for the trading pairs that change every so often
export const yakklGasTransStore = writable<GasTransStore | undefined>(undefined); // Currently this is only used as a reactive store for the gas or transaction fees
export const yakklContactStore = writable<YakklContact | null>(undefined); // The single selcted contact from the yakklContactsStore list
export const yakklAccountStore = writable<YakklAccount>(undefined); // The single selcted account from the yakklAccountsStore list
export const yakklWalletProvidersStore = writable<string[]>([]);
export const yakklWalletBlockchainsStore = writable<string[]>([]);
export const yakklTokenDataStore = writable<TokenData[]>([]); // This is the official list of default tokens that we check to see if the user has any positions in
export const yakklTokenDataCustomStore = writable<TokenData[]>([]); // This is the official list of user added tokens that we check to see if the user has any positions in
export const yakklCombinedTokenStore = writable<TokenData[]>([]); // This is the combined list of default and custom tokens. We use this instead of derived so we can control the reactiveness better
export const yakklInstancesStore = writable<
	[Wallet | null, Provider | null, Blockchain | null, TokenService<any> | null]
>([null, null, null, null]);

// yakklGPTRunningStore and yakklGPTKeyStore are used for the GPT API
export const yakklGPTRunningStore = writable(false); // Single indicator for GPT running or not
export const yakklGPTKeyStore = writable<string>(undefined); // Single indicator for GPT Key

export const yakklConnectionStore = writable<boolean>(true); // All fetch or api calls need to validate that the yakklConnectionStore is true before accessing the internet
export const yakklDappConnectRequestStore = writable<string | null>(null);

export const priceStore = writable<MarketPriceData | null>(null); // This is for the trading pairs that change every so often
export const sessionInitialized = writable(false);

export const activeTabBackgroundStore = writable<ActiveTab | null>(null);
export const activeTabUIStore = writable<ActiveTab | null>(null);
export const backgroundUIConnectedStore = writable(false);

export const wallet = writable<Wallet | null>(null);
export const yakklContractStore = writable<ContractData>({
	address: '',
	abi: '',
	functions: []
});
export const yakklContextTypeStore = writable<string>(undefined);

// Bookmarked Articles Store
export const yakklBookmarkedArticlesStore = writable<RSSItem[]>([]);

// --------------------------------

export function resetStores() {
	try {
		setPreferencesStore(yakklPreferences);
		setSettingsStore(yakklSettings);
		setProfileStore(profile);
		setYakklCurrentlySelectedStore(yakklCurrentlySelected);
		setYakklWatchListStore(yakklWatchList);
		setYakklBlockedListStore(yakklBlockedList);
		setYakklContactsStore(yakklContacts);
		setYakklChatsStore(yakklChats);
		setYakklAccountsStore(yakklAccounts);
		setYakklPrimaryAccountsStore(yakklPrimaryAccounts);

		setYakklTokenDataStore([]);
		setYakklTokenDataCustomStore([]);
		setYakklCombinedTokenStore([]);
		setYakklWalletBlockchainsStore([]);
		setYakklWalletProvidersStore([]);
		setYakklConnectedDomainsStore([]);
		yakklMiscStore.set(undefined);
		yakklContextTypeStore.set(undefined);
		yakklVeryStore.set(undefined);
		yakklVersionStore.set(undefined);
		yakklUserNameStore.set(undefined);
		yakklPricingStore.set(undefined);
		yakklGasTransStore.set(undefined);
		yakklContactStore.set(undefined);
		yakklAccountStore.set(undefined);
		yakklWalletProvidersStore.set([]);
		yakklWalletBlockchainsStore.set([]);
		yakklTokenDataStore.set([]);
		yakklTokenDataCustomStore.set([]);
		yakklCombinedTokenStore.set([]);
		yakklInstancesStore.set([null, null, null, null]);
		yakklGPTRunningStore.set(false);
		yakklGPTKeyStore.set(undefined);
		yakklConnectionStore.set(true);
		yakklDappConnectRequestStore.set(null);
		wallet.set(null);
		yakklContractStore.set({
			address: '',
			abi: '',
			functions: []
		});

		tokens.set([]);
		walletStore.set(null);
		// timerManagerStore.set(null);

		priceStore.set(null);
	} catch (error) {
		log.error(error);
		throw error;
	}
}

// Generic error logger
export function onError(e: any) {
	log.error(e);
}

// Anytime any local storage changes then we set the Svelte memory stores to keep things in sync
export function storageChange(changes: any) {
	try {
		if (changes.yakklPreferences) {
			setPreferencesStore(changes.yakklPreferences.newValue);
		}
		if (changes.yakklSettings) {
			setSettingsStore(changes.yakklSettings.newValue);
		}
		if (changes.profile) {
			setProfileStore(changes.profile.newValue);
		}
		if (changes.yakklCurrentlySelected) {
			setYakklCurrentlySelectedStore(changes.yakklCurrentlySelected.newValue);
		}
		if (changes.yakklWatchList) {
			setYakklWatchListStore(changes.yakklWatchList.newValue);
		}
		if (changes.yakklAccounts) {
			setYakklAccountsStore(changes.yakklAccounts.newValue);
		}
		if (changes.yakklPrimaryAccounts) {
			setYakklPrimaryAccountsStore(changes.yakklPrimaryAccounts.newValue);
		}
		if (changes.yakklContacts) {
			setYakklContactsStore(changes.yakklContacts.newValue);
		}
		if (changes.yakklChats) {
			setYakklChatsStore(changes.yakklChats.newValue);
		}
		if (changes.yakklConnectedDomains) {
			setYakklConnectedDomainsStore(changes.yakklConnectedDomains.newValue);
		}
		if (changes.yakklBlockedList) {
			setYakklBlockedListStore(changes.yakklBlockedList.newValue);
		}
	} catch (error) {
		log.error(error);
		throw error;
	}
}

export async function syncStorageToStore() {
	try {
		const [
			preferences,
			settings,
			profileLocal,
			yakklCurrentlySelectedLocal,
			yakklWatchList,
			yakklBlockedList,
			yakklAccounts,
			yakklPrimaryAccounts,
			yakklContacts,
			yakklChats,
			yakklTokenData,
			yakklTokenDataCustom,
			yakklConnectedDomains
		] = await Promise.all([
			getPreferences(),
			getSettings(),
			getProfile(),
			getYakklCurrentlySelected(),
			getYakklWatchList(),
			getYakklBlockedList(),
			getYakklAccounts(),
			getYakklPrimaryAccounts(),
			getYakklContacts(),
			getYakklChats(),
			getYakklTokenData(),
			getYakklTokenDataCustom(),
			getYakklConnectedDomains()
		]);

		setPreferencesStore(preferences ?? yakklPreferences);
		setSettingsStore(settings ?? yakklSettings);
		setProfileStore(profileLocal ?? profile);
		setYakklCurrentlySelectedStore(yakklCurrentlySelectedLocal ?? yakklCurrentlySelected);
		setYakklWatchListStore(yakklWatchList);
		setYakklBlockedListStore(yakklBlockedList);
		setYakklAccountsStore(yakklAccounts);
		setYakklPrimaryAccountsStore(yakklPrimaryAccounts);
		setYakklContactsStore(yakklContacts);
		setYakklChatsStore(yakklChats);
		setYakklTokenDataStore(yakklTokenData);
		setYakklTokenDataCustomStore(yakklTokenDataCustom);
		setYakklConnectedDomainsStore(yakklConnectedDomains);
	} catch (error) {
		log.error('Error syncing stores:', false, error);
		throw error; // Rethrow so that load() can catch it
	}
}

// NOTE: We need to think through the id and persona for each store and any wrappers and how best to handle them.
// We can filter on get and on set we will need to get all, find the item we need to update and then update it.

// Browser Extension local storage
// Returns old settings
export async function setSettings(settings: Settings) {
	return await setSettingsStorage(settings);
}

// --------------------------------
// Call these for getting memory data store only
export function getYakklPreferenceStore() {
	const store = get(yakklPreferencesStore);
	return store;
}

export function getSettingsStore() {
	const store = get(yakklSettingsStore);
	return store;
}

export function getProfileStore(values: Profile) {
	const store = get(profileStore);
	profileStore.set(values);
	return store;
}

export function getYakklCurrentlySelectedStore() {
	const store = get(yakklCurrentlySelectedStore);
	return store;
}

export function getYakklWatchListStore() {
	const store = get(yakklWatchListStore);
	return store;
}

export function getYakklBlockedListStore() {
	const store = get(yakklBlockedListStore);
	return store;
}

export function getYakklAccountsStore() {
	const store = get(yakklAccountsStore);
	return store;
}

export function getYakklPrimaryAccountsStore() {
	const store = get(yakklPrimaryAccountsStore);
	return store;
}

export function getYakklContactsStore() {
	const store = get(yakklContactsStore);
	return store;
}

export function getYakklTokenDataStore() {
	const store = get(yakklTokenDataStore);
	return store;
}

export function getYakklTokenDataCustomStore() {
	const store = get(yakklTokenDataCustomStore);
	return store;
}

export function getYakklCombinedTokenStore() {
	const store = get(yakklCombinedTokenStore);
	return store;
}

export function getYakklChatsStore() {
	const store = get(yakklChatsStore);
	return store;
}

export function getYakklWalletBlockchainsStore() {
	const store = get(yakklWalletBlockchainsStore);
	return store;
}

export function getYakklWalletProvidersStore() {
	const store = get(yakklWalletProvidersStore);
	return store;
}

export function getYakklConnectedDomainsStore() {
	const store = get(yakklConnectedDomainsStore);
	return store;
}

export function getYakklContractStore() {
	return get(yakklContractStore);
}

// Memory only
export function getMiscStore() {
	const store = get(yakklMiscStore);
	return store;
}

export function getContextTypeStore() {
	const store = get(yakklContextTypeStore);
	return store;
}

// Memory only
export function getVeryStore() {
	const store = get(yakklVeryStore);
	return store;
}

export function getDappConnectRequestStore() {
	const store = get(yakklDappConnectRequestStore);
	return store;
}

export function getContactStore() {
	const store = get(yakklContactStore);
	return store;
}

export function getAccountStore() {
	const store = get(yakklAccountStore);
	return store;
}

export function getVersionStore() {
	const store = get(yakklVersionStore);
	return store;
}

export function getUserNameStore() {
	const store = get(yakklUserNameStore);
	return store;
}

export function getYakklGPTKeyStore() {
	const store = get(yakklGPTKeyStore);
	return store;
}

export function getYakklConnectionStore() {
	const store = get(yakklConnectionStore);
	return store;
}

export function getYakklInstancesStore() {
	const store = get(yakklInstancesStore);
	return store;
}

// export function getYakklPriceStore() {
// 	const store = get(yakklPriceStore);
// 	return store;
// }

// --------------------------------
// Call these for setting memory data store only
// Return previous values
export function setPreferencesStore(values: Preferences | null) {
	const store = get(yakklPreferencesStore);
	yakklPreferencesStore.set(values === null ? yakklPreferences : values);
	return store;
}

export function setSettingsStore(values: Settings | null) {
	const store = get(yakklSettingsStore);
	yakklSettingsStore.set(values === null ? yakklSettings : values);
	return store;
}

// Return previous values
export function setProfileStore(values: Profile | null) {
	const store = get(profileStore);
	profileStore.set(values === null ? profile : values);
	return store;
}

// Return previous values
// Making sure the value set for currently selected is not encrypted
export function setYakklCurrentlySelectedStore(values: YakklCurrentlySelected | null) {
	const store = get(yakklCurrentlySelectedStore);
	yakklCurrentlySelectedStore.set(values !== null ? values : null); // Set here even if some items are empty. Validate items in save to storage
	return store;
}

// Return previous values
export function setYakklWatchListStore(values: YakklWatch[]) {
	const store = get(yakklWatchListStore);
	yakklWatchListStore.set(values);
	return store;
}

// Return previous values
export function setYakklBlockedListStore(values: YakklBlocked[]) {
	const store = get(yakklBlockedListStore);
	yakklBlockedListStore.set(values);
	return store;
}

// Return previous values
export function setYakklContactsStore(values: YakklContact[]) {
	const store = get(yakklContactsStore);
	yakklContactsStore.set(values);
	return store;
}

export function setYakklTokenDataStore(values: TokenData[]) {
	const store = get(yakklTokenDataStore);
	yakklTokenDataStore.set(values);
	return store;
}

export function setYakklTokenDataCustomStore(values: TokenData[]) {
	const store = get(yakklTokenDataCustomStore);
	yakklTokenDataCustomStore.set(values);
	return store;
}

export function setYakklCombinedTokenStore(values: TokenData[]) {
	const store = get(yakklCombinedTokenStore);
	yakklCombinedTokenStore.set(values);
	return store;
}

// Return previous values
export function setYakklChatsStore(values: YakklChat[]) {
	const store = get(yakklChatsStore);
	yakklChatsStore.set(values);
	return store;
}

// Return previous values
export function setYakklWalletBlockchainsStore(values: string[]) {
	const store = get(yakklWalletBlockchainsStore);
	yakklWalletBlockchainsStore.set(values);
	return store;
}

// Return previous values
export function setYakklWalletProvidersStore(values: string[]) {
	const store = get(yakklWalletProvidersStore);
	yakklWalletProvidersStore.set(values);
	return store;
}

// Return previous values
export function setYakklConnectedDomainsStore(values: YakklConnectedDomain[]) {
	const store = get(yakklConnectedDomainsStore);
	yakklConnectedDomainsStore.set(values);
	return store;
}

// Return previous values
export function setYakklAccountsStore(values: YakklAccount[]) {
	const store = get(yakklAccountsStore);
	yakklAccountsStore.set(values);
	return store;
}

// Return previous values
export function setYakklPrimaryAccountsStore(values: YakklPrimaryAccount[]) {
	const store = get(yakklPrimaryAccountsStore);
	yakklPrimaryAccountsStore.set(values);
	return store;
}

// Return previous values
export function setMiscStore(values: string) {
	const store = get(yakklMiscStore);
	yakklMiscStore.set(values);
	return store;
}

export function setContextTypeStore(values: string) {
	const store = get(yakklContextTypeStore);
	yakklContextTypeStore.set(values);
	return store;
}

// Return previous values
export function setVeryStore(values: any) {
	const store = get(yakklVeryStore);
	yakklVeryStore.set(values);
	return store;
}

export function setDappConnectRequestStore(values: string | null) {
	const store = get(yakklDappConnectRequestStore);
	yakklDappConnectRequestStore.set(values);
	return store;
}

// Return previous values
export function setContactStore(values: YakklContact | null) {
	const store = get(yakklContactStore);
	yakklContactStore.set(values);
	return store;
}

// Return previous values
export function setAccountStore(values: YakklAccount) {
	const store = get(yakklAccountStore);
	yakklAccountStore.set(values);
	return store;
}

// Return previous values
export function setVersionStore(values: string) {
	const store = get(yakklVersionStore);
	yakklVersionStore.set(values);
	return store;
}

// Return previous values
export function setUserNameStore(values: string) {
	const store = get(yakklUserNameStore);
	yakklUserNameStore.set(values);
	return store;
}

export function setYakklGPTKeyStore(values: string) {
	const store = get(yakklGPTKeyStore);
	yakklGPTKeyStore.set(values);
	return store;
}

// Return previous values
export function setYakklConnectionStore(values: boolean) {
	const store = get(yakklConnectionStore);
	yakklConnectionStore.set(values);
	return store;
}

export function setYakklContractStore(values: ContractData) {
	const store = get(yakklContractStore);
	yakklContractStore.set(values);
	return store;
}

export function setYakklInstancesStore(
	values: [Wallet | null, Provider | null, Blockchain | null, TokenService<any> | null]
) {
	const store = get(yakklInstancesStore);
	yakklInstancesStore.set(values);
	return store;
}

// --------------------------------

export async function getYakklRegisteredData(
	id?: string,
	persona?: string
): Promise<YakklRegisteredData | null> {
	try {
		const value = await getObjectFromLocalStorage<YakklRegisteredData>(
			STORAGE_YAKKL_REGISTERED_DATA
		);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later - think through the license key and persona
		}

		return value || null; // Return an empty object or provide a default value if necessary
	} catch (error) {
		log.error('Error in getYakklRegisteredData:', false, error);
		throw error;
	}
}

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
		log.error('Error in getYakklContacts:', false, error);
		throw error;
	}
}

export async function getYakklTokenData(id?: string, persona?: string): Promise<TokenData[]> {
	try {
		const value = await getObjectFromLocalStorage<TokenData[]>(STORAGE_YAKKL_TOKENDATA);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		if (value) setYakklTokenDataStore(value);
		return value || []; // Return an empty array or provide a default value if necessary
	} catch (error) {
		log.error('Error in getYakklTokenData:', false, error);
		throw error;
	}
}

export async function getYakklTokenDataCustom(id?: string, persona?: string): Promise<TokenData[]> {
	try {
		const value = await getObjectFromLocalStorage<TokenData[]>(STORAGE_YAKKL_TOKENDATA_CUSTOM);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		if (value) setYakklTokenDataCustomStore(value);
		return value || []; // Return an empty array or provide a default value if necessary
	} catch (error) {
		log.error('Error in getYakklTokenDataCustom:', false, error);
		throw error;
	}
}

export async function getYakklCombinedToken(id?: string, persona?: string): Promise<TokenData[]> {
	try {
		const value = await getObjectFromLocalStorage<TokenData[]>(STORAGE_YAKKL_COMBINED_TOKENS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		if (value) setYakklCombinedTokenStore(value);
		return value || []; // Return an empty array or provide a default value if necessary
	} catch (error) {
		log.error('Error in getYakklCombinedToken:', false, error);
		throw error;
	}
}

export async function getYakklChats(id?: string, persona?: string): Promise<YakklChat[]> {
	try {
		let value = await getObjectFromLocalStorage<YakklChat[]>(STORAGE_YAKKL_CHATS);
		if (typeof value === 'string') {
			value = [];
			setYakklChatsStorage(value);
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		// Convert object to array if necessary
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			value = Object.values(value);
		}
		return value || [];
	} catch (error) {
		log.error('Error in getYakklChats:', false, error);
		return [];
	}
}

export async function getYakklWalletBlockchains(): Promise<string[]> {
	try {
		let value = await getObjectFromLocalStorage<string[]>(STORAGE_YAKKL_WALLET_BLOCKCHAINS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			value = [];
			setYakklWalletBlockchainsStorage(value);
		}
		return value || []; // Return an empty array or provide a default value if necessary
	} catch (error) {
		log.error('Error in getYakklWalletBlockchains:', false, error);
		throw error;
	}
}

export async function getYakklWalletProviders(): Promise<string[]> {
	try {
		let value = await getObjectFromLocalStorage<string[]>(STORAGE_YAKKL_WALLET_PROVIDERS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			value = [];
			setYakklWalletProvidersStorage(value);
		}
		return value || []; // Return an empty array or provide a default value if necessary
	} catch (error) {
		log.error('Error in getYakklWalletProviders:', false, error);
		throw error;
	}
}

export async function getYakklConnectedDomains(
	id?: string,
	persona?: string
): Promise<YakklConnectedDomain[]> {
	try {
		const value = await getObjectFromLocalStorage<YakklConnectedDomain[]>(
			STORAGE_YAKKL_CONNECTED_DOMAINS
		);

		log.info('getYakklConnectedDomains - value:', false, value);

		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			return value.filter((d) => d.id === id && d.persona === persona) || [];
		}

		return value || []; // Return an empty array or provide a default value if necessary
	} catch (error) {
		log.error('Error in getYakklConnectedDomains:', false, error);
		throw error;
	}
}

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
		log.error('Error in getPreferences:', false, error);
		throw error;
	}
}

export async function getSettings(id?: string, persona?: string): Promise<Settings | null> {
	try {
		const value = await getObjectFromLocalStorage<Settings>(STORAGE_YAKKL_SETTINGS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value; // Return an empty object or provide a default value if necessary
	} catch (error) {
		log.error('Error in getSettings:', false, error);
		throw error;
	}
}

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
		log.error('Error in getProfile:', false, error);
		throw error;
	}
}

export async function getYakklCurrentlySelected(
	id?: string,
	persona?: string
): Promise<YakklCurrentlySelected> {
	try {
		const value = await getObjectFromLocalStorage<YakklCurrentlySelected>(
			STORAGE_YAKKL_CURRENTLY_SELECTED
		);

		if (id && persona) {
			// TODO: Implement this later
		}

		// If no value or value is a string, return default values
		if (!value || typeof value === 'string') {
			log.warn('No currently selected Yakkl found, using defaults', false, value);
			return {
				id: '',
				shortcuts: {
					quantity: 0n,
					accountType: AccountTypeCategory.PRIMARY,
					accountName: 'YAKKL_ZERO_ACCOUNT',
					smartContract: false,
					address: '',
					alias: '',
					primary: null,
					init: false,
					legal: false,
					isLocked: true,
					showTestNetworks: false,
					profile: {
						userName: '',
						name: null,
						email: ''
					},
					gasLimit: 21000,
					networks: [
						{
							blockchain: 'Ethereum',
							name: 'Mainnet',
							chainId: 1,
							symbol: 'ETH',
							type: NetworkType.MAINNET,
							explorer: 'https://etherscan.io',
							decimals: 18
						}
					],
					network: {
						blockchain: 'Ethereum',
						name: 'Mainnet',
						chainId: 1,
						symbol: 'ETH',
						type: NetworkType.MAINNET,
						explorer: 'https://etherscan.io',
						decimals: 18
					},
					blockchain: 'Ethereum',
					type: NetworkType.MAINNET,
					chainId: 1,
					symbol: 'ETH',
					explorer: 'https://etherscan.io'
				},
				preferences: {
					locale: 'en_US',
					currency: { code: 'USD', symbol: '$' }
				},
				data: {},
				version: '1.0.0',
				createDate: new Date().toISOString(),
				updateDate: new Date().toISOString()
			};
		}
		return value;
	} catch (error) {
		log.error('Error in getYakklCurrentlySelected:', false, error);
		throw error;
	}
}

export async function getYakklWatchList(id?: string, persona?: string): Promise<YakklWatch[]> {
	// eslint-disable-next-line no-useless-catch
	try {
		const value = await getObjectFromLocalStorage<YakklWatch[]>(STORAGE_YAKKL_WATCHLIST);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value || [];
	} catch (error) {
		log.error('Error in getYakklWatchList:', false, error);
		throw error;
	}
}

export async function getYakklBlockedList(id?: string, persona?: string): Promise<YakklBlocked[]> {
	// eslint-disable-next-line no-useless-catch
	try {
		const value = await getObjectFromLocalStorage<YakklBlocked[]>(STORAGE_YAKKL_BLOCKEDLIST);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value || [];
	} catch (error) {
		log.error('Error in getYakklBlockedList:', false, error);
		throw error;
	}
}

export async function getYakklAccounts(id?: string, persona?: string): Promise<YakklAccount[]> {
	// eslint-disable-next-line no-useless-catch
	try {
		const value = await getObjectFromLocalStorage<YakklAccount[]>(STORAGE_YAKKL_ACCOUNTS);
		if (typeof value === 'string') {
			// Handle the case where value is a string, which shouldn't happen in this context
			throw new Error('Unexpected string value received from local storage');
		}

		if (id && persona) {
			// TODO: Implement this later
		}

		return value || [];
	} catch (error) {
		log.error('Error in getYakklAccounts:', false, error);
		throw error;
	}
}

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

// --------------------------------
// Call these storage functions when you need to update both persistent and memory stores
export async function setYakklContactsStorage(values: YakklContact[]) {
	try {
		yakklContactsStore.set(values);
		await setObjectInLocalStorage('yakklContacts', values);
	} catch (error) {
		log.error('Error in setYakklContactsStorage:', false, error);
		throw error;
	}
}

export async function setYakklTokenDataStorage(values: TokenData[]) {
	try {
		// const current = get(yakklTokenDataStore);

		// Only update if the values are different
		// if (!isEqual(current, values)) {
		yakklTokenDataStore.set(values);
		await setObjectInLocalStorage('yakklTokenData', values);
		// }
	} catch (error) {
		log.error('Error in setYakklTokenDataStorage:', false, error);
		throw error;
	}
}

export async function setYakklTokenDataCustomStorage(values: TokenData[]) {
	try {
		// const current = get(yakklTokenDataCustomStore);

		// Only update if the values are different
		// if (!isEqual(current, values)) {
		yakklTokenDataCustomStore.set(values);
		await setObjectInLocalStorage('yakklTokenDataCustom', values);
		// }
	} catch (error) {
		log.error('Error in setYakklTokenDataCustomStorage:', false, error);
		throw error;
	}
}

export async function setYakklCombinedTokenStorage(values: TokenData[]) {
	try {
		// const current = get(yakklCombinedTokenStore);

		// Only update if the values are different
		// if (!isEqual(current, values)) {
		yakklCombinedTokenStore.set(values);
		await setObjectInLocalStorage('yakklCombinedTokens', values);
		// }
	} catch (error) {
		log.error('Error in setYakklCombinedTokenStorage:', false, error);
		throw error;
	}
}

export async function setYakklChatsStorage(values: YakklChat[]) {
	try {
		// const current = get(yakklChatsStore);
		// if (!isEqual(current, values)) {
		yakklChatsStore.set(values);
		await setObjectInLocalStorage('yakklChats', values);
		// }
	} catch (error) {
		log.error('Error in setYakklChatsStorage:', false, error);
		throw error;
	}
}

export async function setYakklWalletBlockchainsStorage(values: string[]) {
	try {
		// const current = get(yakklWalletBlockchainsStore);
		// if (!isEqual(current, values)) {
		yakklWalletBlockchainsStore.set(values);
		await setObjectInLocalStorage('yakklWalletBlockchains', values);
		// }
	} catch (error) {
		log.error('Error in setYakklWalletBlockchainsStorage:', false, error);
		throw error;
	}
}

export async function setYakklWalletProvidersStorage(values: string[]) {
	try {
		// const current = get(yakklWalletProvidersStore);
		// if (!isEqual(current, values)) {
		yakklWalletProvidersStore.set(values);
		await setObjectInLocalStorage('yakklWalletProviders', values);
		// }
	} catch (error) {
		log.error('Error in setYakklWalletProvidersStorage:', false, error);
		throw error;
	}
}

export async function setYakklConnectedDomainsStorage(values: YakklConnectedDomain[]) {
	try {
		const current = get(yakklConnectedDomainsStore);
		if (!isEqual(current, values)) {
			yakklConnectedDomainsStore.set(values);
			await setObjectInLocalStorage('yakklConnectedDomains', values);
		}
	} catch (error) {
		log.error('Error in setYakklConnectedDomainsStorage:', false, error);
		throw error;
	}
}

export async function setSettingsStorage(values: Settings) {
	try {
		// const current = get(yakklSettingsStore);
		// if (!isEqual(current, values)) {
		yakklSettingsStore.set(values);
		await setObjectInLocalStorage('settings', values);
		// }
	} catch (error) {
		log.error('Error in setSettingsStorage:', false, error);
		throw new Error('Error in setSettingsStorage: ' + false, error);
	}
}

export async function setPreferencesStorage(values: Preferences) {
	try {
		// const current = get(yakklPreferencesStore);
		// if (!isEqual(current, values)) {
		yakklPreferencesStore.set(values);
		await setObjectInLocalStorage('preferences', values);
		// }
	} catch (error) {
		log.error('Error in setPreferencesStorage:', false, error);
		throw new Error('Error in setPreferencesStorage: ' + false, error);
	}
}

export async function setProfileStorage(values: Profile) {
	try {
		// const current = get(profileStore);
		// const newValues = (await verifyEncryption(values)) as Profile;

		// if (!isEqual(current, newValues)) {
		profileStore.set(values);
		await setObjectInLocalStorage('profile', values);
		// }
	} catch (error) {
		log.error('Error in setProfileStorage:', false, error);
		throw new Error('Error in setProfileStorage: ' + false, error);
	}
}

export async function setYakklCurrentlySelectedStorage(values: YakklCurrentlySelected) {
	try {
		if (
			values.shortcuts.address.trim().length === 0 ||
			values.shortcuts.accountName.trim().length === 0
		) {
			throw new Error(
				'Attempting to save yakklCurrentlySelected with no address or no account name. Select a default account and retry.'
			);
		}

		// Get current store value
		// const current = get(yakklCurrentlySelectedStore);

		// Avoid unnecessary updates by checking for equality
		// if (!isEqual(current, values)) {
		// Update the store with the new value

		// Verify encryption (ensures the value is encrypted correctly before storing)
		const newValues = await verifyEncryption(values);
		setYakklCurrentlySelectedStore(newValues as YakklCurrentlySelected);

		// Update localStorage only if the encrypted data differs
		// const currentEncrypted = await verifyEncryption(current); // Encrypt current for comparison
		// if (!isEqual(currentEncrypted, newValues)) {
		await setObjectInLocalStorage('yakklCurrentlySelected', newValues);
		// }
		// }
		// setYakklCurrentlySelectedStore(values);
		// const newValues = await verifyEncryption(values); // We put this after the store since data.<whatever> holds already encrypted data
		// await setObjectInLocalStorage('yakklCurrentlySelected', newValues);
	} catch (error) {
		log.error('Error in setYakklCurrentlySelectedStorage:', false, error);
		throw error;
	}
}

export async function setYakklWatchListStorage(values: YakklWatch[]) {
	try {
		yakklWatchListStore.set(values);
		await setObjectInLocalStorage('yakklWatchList', values);
	} catch (error) {
		log.error('Error in setYakklWatchListStorage:', false, error);
		throw error;
	}
}

export async function setYakklBlockedListStorage(values: YakklBlocked[]) {
	try {
		yakklBlockedListStore.set(values);
		await setObjectInLocalStorage('yakklBlockedList', values);
	} catch (error) {
		log.error('Error in setYakklBlockedListStorage:', false, error);
		throw error;
	}
}

// No need for memory store since only being held in persistent storage
export async function setYakklAccountsStorage(values: YakklAccount[]) {
	try {
		const newValues = (await verifyEncryption(values)) as unknown as YakklAccount[];
		yakklAccountsStore.set(newValues);
		await setObjectInLocalStorage<YakklAccount[]>('yakklAccounts', newValues);
	} catch (error) {
		log.error('Error in setYakklAccountsStorage:', false, error);
		throw error;
	}
}

// No need for memory store since only being held in persistent storage
export async function setYakklPrimaryAccountsStorage(values: YakklPrimaryAccount[]) {
	try {
		const newValues = (await verifyEncryption(values)) as unknown as YakklPrimaryAccount[];
		yakklPrimaryAccountsStore.set(newValues);
		await setObjectInLocalStorage('yakklPrimaryAccounts', newValues);
	} catch (error) {
		log.error('Error in setYakklPrimaryAccountsStorage:', false, error);
		throw error;
	}
}

export async function updateYakklTokenData(updater: (token: TokenData) => TokenData) {
	try {
		// Get the current token data from the store
		const currentData = get(yakklTokenDataStore);
		// Update the token data using the updater function
		const updatedData = currentData.map((token) => updater(token));
		// Update the store
		yakklTokenDataStore.set(updatedData);
		// Persist the updated data in local storage
		await setObjectInLocalStorage('yakklTokenData', updatedData);
	} catch (error) {
		log.error('Error updating token data:', false, error);
		throw error;
	}
}

export async function updateYakklTokenDataCustom(updater: (token: TokenData) => TokenData) {
	try {
		// Get the current token data from the store
		const currentData = get(yakklTokenDataCustomStore);
		// Update the token data using the updater function
		const updatedData = currentData.map((token) => updater(token));
		// Update the store
		yakklTokenDataCustomStore.set(updatedData);
		// Persist the updated data in local storage
		await setObjectInLocalStorage('yakklTokenDataCustom', updatedData);
	} catch (error) {
		log.error('Error updating custom token data:', false, error);
		throw error;
	}
}

// Function to update the combined store
export function updateCombinedTokenStore() {
	const combinedTokens = [...get(yakklTokenDataStore), ...get(yakklTokenDataCustomStore)];
	yakklCombinedTokenStore.set(combinedTokens); // Single reactive update for the combined tokens
}

// Bookmarked Articles Storage
export async function getYakklBookmarkedArticles(): Promise<RSSItem[]> {
	try {
		const result = await getObjectFromLocalStorage<RSSItem[]>('yakklBookmarkedArticles');
		const articles = result || [];
		yakklBookmarkedArticlesStore.set(articles); // Ensure store is in sync
		return articles;
	} catch (error) {
		console.error('Error getting bookmarked articles:', error);
		return [];
	}
}

export async function setYakklBookmarkedArticles(articles: RSSItem[]): Promise<void> {
	try {
		await setObjectInLocalStorage('yakklBookmarkedArticles', articles);
		yakklBookmarkedArticlesStore.set(articles); // Update store after storage
	} catch (error) {
		console.error('Error setting bookmarked articles:', error);
	}
}

// Initialize bookmarked articles from storage
getYakklBookmarkedArticles().then((articles) => {
	yakklBookmarkedArticlesStore.set(articles);
});

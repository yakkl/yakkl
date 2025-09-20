/* eslint-disable @typescript-eslint/no-explicit-any */
import { log } from '$lib/managers/Logger';
// MIGRATION: Move to @yakkl/security
// import { decryptData, deriveKeyFromPassword, encryptData } from '@yakkl/security/wallet/encryption-utils';
// Note: digestMessage needs to be added to @yakkl/security
import { decryptData, deriveKeyFromPassword, digestMessage, encryptData } from './encryption';
import type { EncryptedData } from '$lib/common/interfaces';
import type { SaltedKey } from '$lib/common/evm';
import { CURRENT_STORAGE_VERSION } from '$lib/common/constants';
import browser from 'webextension-polyfill';

// NOTE: This can only be used in the background context

export interface SecureWrapper<T> {
	encrypted: EncryptedData; // AES-GCM encrypted JSON of T (includes public)
	public: Partial<T>; // Duplicated plain subset
	hash: string; // SHA-256 of decrypted full object
	version: number;
	createdAt?: number;
	lastUpdated?: number;
}

export type ValidatedStorageResult<T> = {
	value: T | null;
	error?: 'timeout' | 'corrupted' | 'not_found' | 'exception';
};

// Memoized key cache (in-memory, cleared on reload)
let cachedKey: SaltedKey | null = null;

// This function is used to extract public fields from an object
function extractPublicFields<T>(obj: T, paths: string[]): Partial<T> {
	const result: any = {};

	function walk(current: any, res: any, keys: string[]) {
		if (!current || typeof current !== 'object') return;
		const [head, ...rest] = keys;

		if (head === '*') {
			for (const key in current) {
				res[key] ??= {};
				walk(current[key], res[key], rest);
			}
		} else {
			if (!(head in current)) return;
			if (rest.length === 0) {
				res[head] = current[head];
			} else {
				res[head] ??= {};
				walk(current[head], res[head], rest);
			}
		}
	}

	for (const path of paths) {
		walk(obj, result, path.split('.'));
	}

	return result;
}

/**
 * Memoize derived key to improve performance across multiple decryption calls.
 */
export async function getMemoizedKey(password: string, existingSalt?: string): Promise<SaltedKey> {
	if (cachedKey) return cachedKey;
	cachedKey = await deriveKeyFromPassword(password, existingSalt);
	return cachedKey;
}

/**
 * Clears cached derived key (e.g., on logout).
 */
export function clearMemoizedKey() {
	cachedKey = null;
}

export async function hashData(data: any): Promise<string> {
	return crypto.subtle
		.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data)))
		.then((hashBuffer) => {
			return Array.from(new Uint8Array(hashBuffer))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('');
		});
}

export async function validateStoredData(key: string) {
	const result = await browser.storage.local.get([key, `${key}_hash`]);
	const currentHash = await hashData(result[key]);

	return currentHash === result[`${key}_hash`];
}

function isValidatedStorageResult<T>(value: any): value is ValidatedStorageResult<T> {
	return value && typeof value === 'object' && 'value' in value;
}

export async function getValidatedObjectFromLocalStorage<T>(
	key: string,
	timeoutMs = 2000
): Promise<ValidatedStorageResult<T>> {
	try {
		const storagePromise = browser.storage.local.get([key, `${key}_hash`]);

		const timeoutPromise = new Promise<ValidatedStorageResult<T>>((resolve) =>
			setTimeout(() => resolve({ value: null, error: 'timeout' }), timeoutMs)
		);

		const result = await Promise.race([storagePromise, timeoutPromise]);

		// If timeout occurred
		if (isValidatedStorageResult<T>(result)) {
			return result;
		}

		if (!result || !(key in result)) {
			return { value: null, error: 'not_found' };
		}

		const expectedHash = result[`${key}_hash`];
		const actualHash = await hashData(result[key]);

		if (expectedHash !== actualHash) {
			return { value: null, error: 'corrupted' };
		}

		return { value: result[key] as T };
	} catch (error) {
		log.error('Error getting object from local storage', false, error);
		return { value: null, error: 'exception' };
	}
}

export async function getObjectFromLocalStorage<T>(
	key: string,
	timeoutMs = 2000
): Promise<T | null> {
	const { value } = await getValidatedObjectFromLocalStorage<T>(key, timeoutMs);
	return value;
}

// Testing downwards compatibility above
// export const getObjectFromLocalStorage = async <T>(key: string, timeoutMs = 2000): Promise<T | null> => {
//   try {
//     const storagePromise = browser.storage.local.get([key, `${key}_hash`]);

//     // Set a timeout to prevent infinite hangs
//     const timeoutPromise = new Promise<null>((resolve) =>
//       setTimeout(() => {
//         resolve(null);
//       }, timeoutMs)
//     );

//     const result = await Promise.race([storagePromise, timeoutPromise]);
//     const currentHash = await hashData(result[key]); // Did not use validateStoredData() because we want to return null if the data is corrupted and not make multiple get requests

//     if (!result || !(key in result) || result[`${key}_hash`] !== currentHash) {
//       return null; // Data is corrupted or has been tampered with
//     }

//     return result[key] as T;
//   } catch (error) {
//     log.error('Error getting object from local storage', false, error);
//     return null;
//   }
// };

export async function setObjectInLocalStorage<T extends Record<string, any>>(
	key: string,
	obj: T | string
): Promise<void> {
	try {
		const hash = await hashData(obj);
		await browser.storage.local.set({ [key]: obj, [`${key}_hash`]: hash });
	} catch (error) {
		log.error('Error setting object in local storage', false, error);
		throw error;
	}
}

/**
 * Clears all secure items from storage with optional namespace filter.
 */
export async function clearSecureData(namespace?: string): Promise<void> {
	try {
		const all = await browser.storage.local.get();
		const keysToRemove = namespace
			? Object.keys(all).filter((k) => k.startsWith(`${namespace}:`))
			: Object.keys(all);
		if (keysToRemove.length > 0) {
			await browser.storage.local.remove(keysToRemove);
		}
	} catch (error) {
		log.error('Error clearing secure data', false, error);
		throw error;
	}
}

export async function removeSecureData(keys: string | string[]): Promise<void> {
	try {
		await browser.storage.local.remove(keys);
		log.info('Local storage successfully removed object(s)', false, keys);
	} catch (error) {
		log.error('Error removing object(s) from local storage', false, error);
		throw error;
	}
}

// Note: This will need to have all keys that are related to yakkl have the yakkl prefix
// BE CAREFUL WITH THIS FUNCTION!
export async function removeYakklSecureData(): Promise<void> {
	try {
		const stored = await browser.storage.local.get();
		const yakklKeys = Object.keys(stored).filter((key) => key.startsWith('yakkl'));

		if (yakklKeys.length > 0) {
			// Remove comment below to enable this dangerous function
			// await browser.storage.local.remove(yakklKeys);
			log.info(`Removed ${yakklKeys.length} yakkl-related keys from storage`);
		}
	} catch (error) {
		log.error('Error removing yakkl objects from local storage', false, error);
		throw error;
	}
}

// Full encryption/decryption storage

export async function storeSecureData<T>(
	key: string,
	data: T,
	publicPaths: string[],
	passwordOrKey: string | SaltedKey
): Promise<void> {
	const publicSubset = extractPublicFields(data, publicPaths);
	const encrypted = await encryptData(data, passwordOrKey);
	const hash = await digestMessage(JSON.stringify(data));

	const now = Date.now();

	const wrapper: SecureWrapper<T> = {
		encrypted,
		public: publicSubset,
		hash,
		version: CURRENT_STORAGE_VERSION,
		createdAt: now,
		lastUpdated: now
	};

	await browser.storage.local.set({ [key]: wrapper });
}

/**
 * Loads and validates encrypted secure data.
 * Auto-heals public fields if tampered.
 */
export async function loadSecureData<T>(
	key: string,
	passwordOrKey: string | SaltedKey
): Promise<{
	value: T;
	public: Partial<T>;
	tamperedFields?: (keyof T)[];
	autoRepaired?: boolean;
	corrupt?: boolean;
	version: number;
	createdAt?: number;
	lastUpdated?: number;
} | null> {
	const result = await browser.storage.local.get(key);
	const stored = result[key] as SecureWrapper<T> | undefined;
	if (!stored) return null;

	if (stored.version !== 1) {
		log.warn(`SecureStorage: Expected version 1, found ${stored.version}`);
	}

	const decrypted = await decryptData<T>(stored.encrypted, passwordOrKey);
	const hash = await digestMessage(JSON.stringify(decrypted));
	if (hash !== stored.hash) {
		log.warn(`SecureStorage: Hash mismatch on key '${key}'`);
		return {
			value: decrypted,
			public: stored.public,
			corrupt: true,
			version: stored.version,
			createdAt: stored.createdAt,
			lastUpdated: stored.lastUpdated
		};
	}

	const tamperedFields: (keyof T)[] = [];
	const fixedPublic: Partial<T> = { ...stored.public };

	for (const key in stored.public) {
		if (stored.public[key] !== decrypted[key]) {
			tamperedFields.push(key);
			fixedPublic[key] = decrypted[key];
		}
	}

	if (tamperedFields.length > 0) {
		const updatedWrapper: SecureWrapper<T> = {
			...stored,
			public: fixedPublic,
			lastUpdated: Date.now()
		};
		await browser.storage.local.set({ [key]: updatedWrapper });
	}

	return {
		value: decrypted,
		public: fixedPublic,
		tamperedFields: tamperedFields.length ? tamperedFields : undefined,
		autoRepaired: tamperedFields.length > 0,
		version: stored.version,
		createdAt: stored.createdAt,
		lastUpdated: stored.lastUpdated
	};
}

/**
 * SecureStore class to simplify access and namespacing.
 */
export class SecureStore {
	constructor(
		private readonly namespace: string,
		private readonly keySource: string | SaltedKey
	) {}

	private scopedKey(key: string): string {
		return `${this.namespace}:${key}`;
	}

	async set<T>(key: string, data: T, publicPaths: string[]): Promise<void> {
		const fullKey = this.scopedKey(key);
		await storeSecureData(fullKey, data, publicPaths, this.keySource);
	}

	async get<T>(key: string): Promise<ReturnType<typeof loadSecureData<T>>> {
		const fullKey = this.scopedKey(key);
		return loadSecureData<T>(fullKey, this.keySource);
	}

	async remove(key: string): Promise<void> {
		const fullKey = this.scopedKey(key);
		await removeSecureData(fullKey);
	}

	async clearAll(): Promise<void> {
		await clearSecureData(this.namespace);
	}
}

/**
 * Migrates plain-text localStorage data to secure storage with public field selection.
 */
export async function migrateToSecureStorage<T>(
	legacyKey: string,
	secureStore: SecureStore,
	newKey: string,
	publicPaths: string[]
): Promise<void> {
	const legacyData = await browser.storage.local.get(legacyKey);
	if (!legacyData || !(legacyKey in legacyData)) return;

	const plainData = legacyData[legacyKey] as T;
	await secureStore.set(newKey, plainData, publicPaths);

	// Note: Do NOT delete legacy key (for audit or rollback)
}

/**
 * Example usage:
 *
 * const store = new SecureStore('wallet', await getMemoizedKey(password));
 * await migrateToSecureStorage<YakklCurrentlySelected>(
 *   'yakklCurrentlySelected',
 *   store,
 *   'yakklCurrentlySelected.secure',
 *   [
 *     'shortcuts.address',
 *     'shortcuts.smartContract',
 *     'preferences.locale',
 *     'shortcuts.networks.*.chainId'
 *   ]
 * );
 */

/**
 * Example usage:
 *
 * const store = new SecureStore('wallet', await getMemoizedKey(password));
 * await store.set('yakklCurrentlySelected', data, [
 *   'shortcuts.address',
 *   'shortcuts.smartContract',
 *   'preferences.locale',
 *   'shortcuts.networks.*.chainId' // wildcard!
 * ]);
 * const loaded = await store.get('yakklCurrentlySelected');
 * if (loaded?.corrupt) showWarning("Data was tampered with!");
 */

// export async function storeSecure<T>(key: string, fullData: T, publicKeys: (keyof T)[], passwordOrKey: string) {
//   const publicPart = publicKeys.reduce((acc, k) => {
//     acc[k] = fullData[k];
//     return acc;
//   }, {} as Partial<T>);

//   const encrypted = await encryptData(JSON.stringify(fullData), passwordOrKey);
//   const hash = await hashData(fullData);

//   const wrapper: SecureWrapper<T> = {
//     encrypted,
//     public: publicPart,
//     hash,
//   };

//   await browser.storage.local.set({ [key]: wrapper });
// }

// export async function loadSecureData<T>(
//   key: string,
//   passwordOrKey: string | SaltedKey
// ): Promise<{ value: T; public: Partial<T>; tamperedFields?: (keyof T)[] } | null> {
//   const stored = (await browser.storage.local.get(key))[key] as SecureWrapper<T> | undefined;
//   if (!stored) return null;

//   const decrypted = await decryptData<T>(stored.encrypted, passwordOrKey);

//   const hash = await digestMessage(JSON.stringify(decrypted));
//   if (hash !== stored.hash) {
//     log.warn("Hash mismatch! Potential tampering.");
//     return null;
//   }

//   const tamperedFields: (keyof T)[] = [];

//   for (const key in stored.public) {
//     if (stored.public[key] !== decrypted[key]) {
//       tamperedFields.push(key);
//     }
//   }

//   return {
//     value: decrypted,
//     public: stored.public,
//     tamperedFields: tamperedFields.length ? tamperedFields : undefined,
//   };
// }

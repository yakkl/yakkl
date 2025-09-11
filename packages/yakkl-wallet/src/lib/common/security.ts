/* eslint-disable @typescript-eslint/no-explicit-any */
import { decryptData, digestMessage, type EncryptedData } from '@yakkl/security';
import type {
	AccountData,
	CurrentlySelectedData,
	Profile,
	ProfileData,
	SessionToken
} from '$lib/common/interfaces';
import { isEncryptedData } from '$lib/common/misc';
import {
	setMiscStore,
	getMiscStore,
  setYakklSettings,
  setYakklSettingsStorage,
} from '$lib/common/stores';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';
import { storeEncryptedHash, storeSessionToken } from './auth/session';
import { getNormalizedSettings } from './utils';
import { planStore } from '$lib/stores';
import { setUserPlan } from '$lib/utils/features';
import { getProfile } from './profile';

export interface AccountKey {
	address: string;
	privateKey: string;
}

export async function verify(id: string): Promise<Profile | undefined> {
	try {
		if (!id) {
			return undefined;
		}

		const profile = await getProfile();
		const digest = await digestMessage(id);

		if (!profile || !digest) {
			return undefined; // Don't set the store to anything here
		}

		// Validate profile structure before attempting decryption
		if (!profile.data || !profile.username) {
			throw 'Invalid profile structure';
		}

		if (isEncryptedData(profile.data)) {
			let profileData: ProfileData;

			try {
				profileData = await decryptData(profile.data as EncryptedData, digest) as ProfileData;
			} catch (decryptError) {
				throw 'Invalid credentials - decryption failed';
			}

			if (profileData) {
				// Validate decrypted profile data
				if (!profileData.name || !profileData.email) {
					throw 'Invalid profile data after decryption';
				}

				setMiscStore(digest); // Works for client side

        const settings = await getNormalizedSettings();
        settings.plan.type = profileData.planType;
        await setYakklSettings(settings);
        await setYakklSettingsStorage(settings);

        // Set the plan directly
        setUserPlan(profileData.planType);
        planStore.setPlan(profileData.planType);

        const sessionToken: SessionToken = await storeEncryptedHash(digest); // Works for background context

				if (sessionToken) {
					storeSessionToken(sessionToken.token, sessionToken.expiresAt);
				}
			} else {
				throw 'Verification failed - no profile data after decryption';
			}
		} else {
			throw 'Profile data must be encrypted';
		}

		return profile;
	} catch (e) {
		throw `Verification failed! - ${e}`;
	}
}

export async function getYakklCurrentlySelectedAccountKey(): Promise<AccountKey | null> {
	try {
		const currentlySelected = await getYakklCurrentlySelected();
		const yakklMiscStore = getMiscStore();
		let accountKey: AccountKey | null = null;
		let address: string | null = null;
		let privateKey: string | null | undefined = null;

		if (!yakklMiscStore || !currentlySelected) {
			return null;
		}
		// May want to put this in a function
		if (isEncryptedData(currentlySelected.data)) {
			const result = await decryptData(currentlySelected.data as EncryptedData, yakklMiscStore);
			const data = result as CurrentlySelectedData;
			address = data?.account?.address || null;
			if (isEncryptedData(data?.account?.data)) {
				const result = await decryptData(data.account.data as EncryptedData, yakklMiscStore);
				const accountData = result as AccountData;
				privateKey = accountData.privateKey;
			} else {
				privateKey = data ? data.account?.data.privateKey : null;
			}
		} else {
			privateKey = currentlySelected.data
				? (((currentlySelected.data as CurrentlySelectedData).account?.data as AccountData)
						?.privateKey ?? null)
				: null;
		}

		if (privateKey && address) {
			accountKey = {
				address: address,
				privateKey: privateKey
			};
		}
		return accountKey;
	} catch (e: any) {
		throw `Error getting account key - ${e}`;
	}
}

export function extractSecureDomain(url: string): string | null {
	try {
		// Parse the URL
		const parsedUrl = new URL(url);

		// Check if the protocol is secure (https) or if it's a special case
		const isSecure = parsedUrl.protocol === 'https:';
		const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
		const isChromeExtension = parsedUrl.protocol === 'chrome:';

		if (!isSecure && !isLocalhost && !isChromeExtension) {
			throw new Error(
				'Insecure protocol detected. Only HTTPS, localhost, and chrome:// are allowed.'
			);
		}

		// Return just the hostname (domain)
		return parsedUrl.hostname;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Invalid URL or security violation: ${error.message}`);
		}
		throw new Error('Invalid URL format');
	}
}

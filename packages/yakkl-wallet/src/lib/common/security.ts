/* eslint-disable @typescript-eslint/no-explicit-any */
import { digestMessage } from '@yakkl/security';
import { decryptData, encryptData } from '$lib/common/encryption';
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
import { log } from '$lib/common/logger-wrapper';
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
			log.warn('Verify called with empty id', false);
			return undefined;
		}

		const profile = await getProfile();
		const digest = await digestMessage(id);

		if (!profile || !digest) {
			log.warn('Profile or digest missing during verification', false, { hasProfile: !!profile, hasDigest: !!digest });
			return undefined; // Don't set the store to anything here
		}

		// Validate profile structure before attempting decryption
		if (!profile.data || !profile.username) {
			log.error('Invalid profile structure', false, { hasData: !!profile.data, hasUserName: !!profile.username });
			throw 'Invalid profile structure';
		}

		if (isEncryptedData(profile.data)) {
			let profileData: ProfileData;

			try {
				profileData = await decryptData(profile.data, digest) as ProfileData;
			} catch (decryptError) {
				log.error('Failed to decrypt profile data', false, decryptError);
				throw 'Invalid credentials - decryption failed';
			}

			if (profileData) {
				// Validate decrypted profile data
				if (!profileData.name || !profileData.email) {
					log.error('Decrypted profile data is incomplete', false, profileData);
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

        // TODO: Remove this
				console.log('[VERIFY] storeEncryptedHash returned:', {
					sessionToken,
					hasToken: !!sessionToken?.token,
					expiresAt: sessionToken?.expiresAt
				});

				if (sessionToken) {
					storeSessionToken(sessionToken.token, sessionToken.expiresAt);
					console.log('[VERIFY] Stored session token in store');
				} else {
					console.error('[VERIFY] No session token returned from storeEncryptedHash');
				}

				log.info('Verification successful', false, {
					username: profile.username,
					hasSessionToken: !!sessionToken
				});
			} else {
				throw 'Verification failed - no profile data after decryption';
			}
		} else {
			log.warn('Profile data is not encrypted', false);
			throw 'Profile data must be encrypted';
		}

		return profile;
	} catch (e) {
		log.error('Verification failed!', false, e);
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
			const result = await decryptData(currentlySelected.data, yakklMiscStore);
			const data = result as CurrentlySelectedData;
			address = data?.account?.address || null;
			if (isEncryptedData(data?.account?.data)) {
				const result = await decryptData(data.account.data, yakklMiscStore);
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
		// error_log(e);
		log.errorStack(e);
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

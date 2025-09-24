import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from './constants';
import { dateString } from './datetime';
import type { YakklSettings, YakklCurrentlySelected } from './interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from './storage';
import { yakklCurrentlySelectedStore, yakklSettingsStore } from './stores';
import { log } from '$lib/common/logger-wrapper';
import { PlanType } from './types';
import { browserJWT } from '@yakkl/security';

// Create a local invalidateJWT function that uses the security package
async function invalidateJWT(token?: string) {
  await browserJWT.clearToken();
  if (token) {
    await browserJWT.revoke(token);
  }
}

// Will keep this for now but may want to deprecate it and use the new background script to handle locks
// locked: true = lock, false = unlock
// invalidatejwt: true = invalidate JWT if locked, false = don't invalidate JWT
// planType: the plan type to set (default is EXPLORER_MEMBER) to force lowest plan type
// tokenToInvalidate: the token to invalidate (optional)
export async function setLocks(locked: boolean = true, invalidatejwt: boolean = true, planType: PlanType = PlanType.EXPLORER_MEMBER, tokenToInvalidate?: string) {
	try {
		let dirty = false;

		log.info('setLocks', false, { locked, planType });

		// If locking, invalidate JWT token for additional security
		if (locked && invalidatejwt) {
			try {
				await invalidateJWT(tokenToInvalidate);
				log.debug('JWT token invalidated during lock');
			} catch (error) {
				log.warn('Failed to invalidate JWT during lock:', false, error);
				// Continue with lock even if JWT invalidation fails
			}
		}

		const yakklSettings = (await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS)) as YakklSettings;
		if (yakklSettings) {
			dirty = false;
			if (locked) {
				if (!yakklSettings.isLocked) {
					yakklSettings.isLocked = true;
					yakklSettings.lastAccessDate = dateString();
					// Only update plan type if explicitly provided and it's a valid plan type
					if (planType && Object.values(PlanType).includes(planType)) {
						yakklSettings.plan.type = planType;
					}
					await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, yakklSettings);
					dirty = true;
				}
			} else {
				if (yakklSettings.isLocked) {
					yakklSettings.isLocked = false;
					yakklSettings.lastAccessDate = dateString();
					// Only update plan type if explicitly provided and it's a valid plan type
					if (planType && Object.values(PlanType).includes(planType)) {
						yakklSettings.plan.type = planType;
					}
					await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, yakklSettings);
					dirty = true;
				}
			}
			if (dirty) yakklSettingsStore.set(yakklSettings);
		}

		const yakklCurrentlySelected = (await getObjectFromLocalStorage(
			STORAGE_YAKKL_CURRENTLY_SELECTED
		)) as YakklCurrentlySelected;
		if (yakklCurrentlySelected) {
			dirty = false;
			if (locked) {
				if (!yakklCurrentlySelected.shortcuts.isLocked) {
					yakklCurrentlySelected.shortcuts.isLocked = true;
					await setObjectInLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, yakklCurrentlySelected);
					dirty = true;
				}
			} else {
				if (yakklCurrentlySelected.shortcuts.isLocked) {
					yakklCurrentlySelected.shortcuts.isLocked = false;
					await setObjectInLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, yakklCurrentlySelected);
					dirty = true;
				}
			}

			if (dirty) yakklCurrentlySelectedStore.set(yakklCurrentlySelected);

			log.info('setLocks', false, { yakklCurrentlySelected });
			log.info('setLocks', false, { yakklSettings });
		}
	} catch (error) {
		log.error('Error setting locks:', false, error);
	}
}

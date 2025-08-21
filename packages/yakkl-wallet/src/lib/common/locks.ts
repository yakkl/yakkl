import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from './constants';
import { dateString } from './datetime';
import type { YakklSettings, YakklCurrentlySelected } from './interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from './storage';
import { yakklCurrentlySelectedStore, yakklSettingsStore } from './stores';
import { log } from '$lib/managers/Logger';
import { PlanType } from './types';
import { invalidateJWT } from '$lib/utilities/jwt-background';

// Will keep this for now but may want to deprecate it and use the new background script to handle locks

export async function setLocks(locked: boolean = true, planType?: PlanType, tokenToInvalidate?: string) {
	try {
		let dirty = false;

		log.info('setLocks', false, { locked, planType });

		// If locking, invalidate JWT token for additional security
		if (locked) {
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

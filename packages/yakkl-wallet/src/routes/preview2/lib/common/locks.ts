import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from './constants';
import { dateString } from './datetime';
import type { Settings, YakklCurrentlySelected } from './interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from './storage';
import { yakklCurrentlySelectedStore, yakklSettingsStore } from './stores';
import { log } from '$lib/managers/Logger';
import { PlanType } from './types';

// Will keep this for now but may want to deprecate it and use the new background script to handle locks

export async function setLocks(locked: boolean = true, planType: PlanType = PlanType.BASIC_MEMBER) {
	try {
		let dirty = false;

		const yakklSettings = (await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS)) as Settings;
		if (yakklSettings) {
			dirty = false;
			if (locked) {
				if (!yakklSettings.isLocked) {
					yakklSettings.isLocked = true;
					yakklSettings.lastAccessDate = dateString();
					if (planType) yakklSettings.plan.type = planType;
					await setObjectInLocalStorage('settings', yakklSettings);
					dirty = true;
				}
			} else {
				if (yakklSettings.isLocked) {
					yakklSettings.isLocked = false;
					yakklSettings.lastAccessDate = dateString();
					if (planType) yakklSettings.plan.type = planType;
					await setObjectInLocalStorage('settings', yakklSettings);
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
		}
	} catch (error) {
		log.error('Error setting locks:', false, error);
	}
}

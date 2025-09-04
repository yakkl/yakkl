// import browser from 'webextension-polyfill';
import type { YakklSettings, YakklCurrentlySelected } from '$lib/common/interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { setIconLock, setIconUnlock } from '$lib/utilities';
import {
	STORAGE_YAKKL_CURRENTLY_SELECTED,
	STORAGE_YAKKL_SETTINGS,
	TIMER_ICON_CHECK_TIME
} from '$lib/common/constants';
// Removed Svelte store import - using direct storage only in background
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { log } from '$lib/common/logger-wrapper';

// NOTE: This file is BACKGROUND ONLY - UI contexts should use messaging

export function startLockIconTimer() {
	try {
		const timerManager = UnifiedTimerManager.getInstance();
		timerManager.addInterval(
			'iconTimer_lockIcon',
			async () => {
				try {
					const yakklSettings = (await getObjectFromLocalStorage(
						STORAGE_YAKKL_SETTINGS
					)) as YakklSettings;
					const yakklCurrentlySelected = (await getObjectFromLocalStorage(
						STORAGE_YAKKL_CURRENTLY_SELECTED
					)) as YakklCurrentlySelected;
					if (yakklCurrentlySelected) {
						// This just makes sure the locks are the same
						if (yakklSettings.isLocked !== yakklCurrentlySelected.shortcuts.isLocked) {
							yakklCurrentlySelected.shortcuts.isLocked = yakklSettings.isLocked;
							await setObjectInLocalStorage(
								STORAGE_YAKKL_CURRENTLY_SELECTED,
								yakklCurrentlySelected
							);
							// Removed Svelte store update - background only uses storage
						}
					}
					if (yakklSettings.isLocked) {
						await setIconLock();
						// Don't send message from background to itself
					} else {
						await setIconUnlock();
					}
				} catch (error) {
					log.error('Error in lock icon timer interval:', false, error);
				}
			},
			TIMER_ICON_CHECK_TIME
		);
		timerManager.startInterval('iconTimer_lockIcon');
	} catch (error: any) {
		log.error('Error starting lock icon timer:', false, error, error?.stack);
	}
}

export async function stopLockIconTimer() {
	try {
		await setIconLock();
		const yakklSettings = (await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS)) as YakklSettings;
		if (yakklSettings) {
			const timerManager = UnifiedTimerManager.getInstance();
			timerManager.stopInterval('iconTimer_lockIcon'); // Stops and clears the timer
			// Don't send message from background to itself
		}
	} catch (error: any) {
		log.error('Error stopping lock icon timer:', false, error, error?.stack);
	}
}

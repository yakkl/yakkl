import type { Settings, YakklCurrentlySelected } from '$lib/common/interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { setIconLock, setIconUnlock } from '$lib/utilities';
import { browser_ext } from '$lib/common/environment';
import {
	STORAGE_YAKKL_CURRENTLY_SELECTED,
	STORAGE_YAKKL_SETTINGS,
	TIMER_ICON_CHECK_TIME
} from '$lib/common/constants';
import { yakklCurrentlySelectedStore } from '$lib/common/stores';
import { getTimerManager } from '$lib/managers/TimerManager';
import { log } from '$lib/managers/Logger';

// NOTE: This is used on extension UI side as well which could be a problem

export function startLockIconTimer() {
	try {
		getTimerManager().addTimer(
			'iconTimer_lockIcon',
			async () => {
				try {
					const yakklSettings = (await getObjectFromLocalStorage(
						STORAGE_YAKKL_SETTINGS
					)) as Settings;
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
							yakklCurrentlySelectedStore.set(yakklCurrentlySelected);
						}
					}
					if (yakklSettings.isLocked) {
						await setIconLock();
						if (browser_ext) {
							await browser_ext.runtime.sendMessage({ type: 'lockdown' });
						}
					} else {
						await setIconUnlock();
					}
				} catch (error) {
					log.error('Error in lock icon timer interval:', false, error);
				}
			},
			TIMER_ICON_CHECK_TIME
		);
		getTimerManager().startTimer('iconTimer_lockIcon');
	} catch (error: any) {
		log.error('Error starting lock icon timer:', false, error, error?.stack);
	}
}

export async function stopLockIconTimer() {
	try {
		await setIconLock();
		const yakklSettings = (await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS)) as Settings;
		if (yakklSettings) {
			getTimerManager().removeTimer('iconTimer_lockIcon'); // Stops and clears the timer
			if (browser_ext) {
				await browser_ext.runtime.sendMessage({ type: 'lockdown' });
			}
		}
	} catch (error: any) {
		log.error('Error stopping lock icon timer:', false, error, error?.stack);
	}
}

import { setIconLock } from '$lib/utilities/utilities';
import { dateString } from './datetime';
import type { YakklSettings } from './interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from './storage';
import { isBrowserEnv } from './environment';
import { stopLockIconTimer } from '$contexts/background/extensions/chrome/iconTimer';
import { yakklCurrentlySelectedStore } from './stores';
import { get } from 'svelte/store';
import { log } from '$lib/managers/Logger';
import { STORAGE_YAKKL_SETTINGS } from './constants';

// Handlers / Callbacks that are not used as listeners in the extension

// Originally onBeforeUnload handler
export async function handleLockDown() {
	try {
		if (isBrowserEnv()) {
			log.info('handleLockDown: Setting icon lock...', false);

			await setIconLock();
			const yakklSettings = (await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS)) as YakklSettings;
			if (yakklSettings && !yakklSettings.isLocked) {
				yakklSettings.isLocked = true;
				yakklSettings.isLockedHow = 'window_exit';
				yakklSettings.updateDate = dateString();
				await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, yakklSettings);
				const yakklCurrentlySelected = get(yakklCurrentlySelectedStore);
				yakklCurrentlySelected.shortcuts.isLocked = true;
				yakklCurrentlySelectedStore.set(yakklCurrentlySelected);
				stopLockIconTimer();
			}
		} else {
			log.info('handleLockDown: Does not believe to be in a browser environment.');
		}
	} catch (error) {
		log.error('Error in lock down handler:', false, error);
	}
}

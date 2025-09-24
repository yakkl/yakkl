import { yakklStoredObjects } from '../models/dataModels';
import browser from 'webextension-polyfill'; // This will cause a build error if not used in a background script.
import { log } from '$lib/common/logger-wrapper';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from './constants';
import type { YakklSettings, YakklCurrentlySelected } from './interfaces';

// Background only functions...

export async function initializeStorageDefaults() {
	try {
		// Retrieve stored values for all keys at once
		const storedData = await browser.storage.local.get(yakklStoredObjects.map((obj) => obj.key));

		for (const { key, value } of yakklStoredObjects) {
			if (storedData[key] === undefined) {
				try {
					await browser.storage.local.set({ [key]: value });
				} catch (error) {
					log.error(`Error setting default for ${key}:`, false, error);
				}
			} else {
				// log.info(`Already exists: ${key}`);
			}
		}
	} catch (error) {
		log.error('Failed to initialize storage defaults:', false, error);
	}
}

export async function manageLockedState() {
	try {
		const yakklSettings: YakklSettings = (await browser.storage.local.get(
			STORAGE_YAKKL_SETTINGS
		)) as unknown as YakklSettings; //await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as YakklSettings;
		const yakklCurrentlySelected: YakklCurrentlySelected = (await browser.storage.local.get(
			STORAGE_YAKKL_CURRENTLY_SELECTED
		)) as unknown as YakklCurrentlySelected; //await getObjectFromLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED) as YakklCurrentlySelected;
		if (
			yakklCurrentlySelected?.shortcuts &&
			'isLocked' in yakklCurrentlySelected.shortcuts &&
			'isLocked' in yakklSettings
		) {
			if (!yakklSettings.isLocked || !yakklCurrentlySelected.shortcuts.isLocked) {
				yakklCurrentlySelected.shortcuts.isLocked = yakklSettings.isLocked = true;
				await browser.storage.local.set({
					[STORAGE_YAKKL_CURRENTLY_SELECTED]: yakklCurrentlySelected
				}); //await setObjectInLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, yakklCurrentlySelected);
				await browser.storage.local.set({ [STORAGE_YAKKL_SETTINGS]: yakklSettings }); //await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, yakklSettings);
			}
			if (browser?.action?.setIcon) {
				if (yakklSettings.isLocked) {
					await browser.action.setIcon({
						path: {
							16: '/images/logoBullLock16x16.png',
							32: '/images/logoBullLock32x32.png',
							48: '/images/logoBullLock48x48.png',
							128: '/images/logoBullLock128x128.png'
						}
					});
				} else {
					await browser.action.setIcon({
						path: {
							16: '/images/logoBull16x16.png',
							32: '/images/logoBull32x32.png',
							48: '/images/logoBull48x48.png',
							128: '/images/logoBull128x128.png'
						}
					});
				}
			}
		} else {
			if (browser?.action?.setIcon) {
				await browser.action.setIcon({
					path: {
						16: '/images/logoBullLock16x16.png',
						32: '/images/logoBullLock32x32.png',
						48: '/images/logoBullLock48x48.png',
						128: '/images/logoBullLock128x128.png'
					}
				});
			}
		}
	} catch (error) {
		log.error('Error managing locked state:', false, error);
	}
}

/**
 * Sets up a timer to watch locked state at specified intervals
 * @param ms Milliseconds between checks
 * @returns The interval ID
 */
export async function watchLockedState(ms: number): Promise<NodeJS.Timeout> {
	// Call immediately once
	await manageLockedState();

	// Set up the interval
	const intervalId = setInterval(async () => {
		try {
			await manageLockedState();
		} catch (error) {
			log.error('Error in watchLockedState interval:', false, error);
		}
	}, ms);

	// Return the interval ID so it can be cleared if needed
	return intervalId;
}

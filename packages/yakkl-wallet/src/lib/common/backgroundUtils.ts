import { yakklStoredObjects } from "../models/dataModels";
import browser from "webextension-polyfill"; // This will cause a build error if not used in a background script.
import { log } from "$plugins/Logger";
import { getObjectFromLocalStorage, setObjectInLocalStorage } from "./backgroundSecuredStorage";
import { STORAGE_YAKKL_CURRENTLY_SELECTED, STORAGE_YAKKL_SETTINGS } from "./constants";
import type { Settings, YakklCurrentlySelected } from "./interfaces";

// Background only functions...

export async function initializeStorageDefaults() {
  try {
    // Retrieve stored values for all keys at once
    const storedData = await browser.storage.local.get(
      yakklStoredObjects.map(obj => obj.key)
    );

    for (const { key, value } of yakklStoredObjects) {
      if (storedData[key] === undefined) {
        try {
          await browser.storage.local.set({ [key]: value });
          // log.info(`Default stored: ${key}`);
        } catch (error) {
          log.error(`Error setting default for ${key}:`, false, error);
        }
      } else {
        // log.info(`Already exists: ${key}`);
      }
    }
  } catch (error) {
    log.error("Failed to initialize storage defaults:", false, error);
  }
}

export async function manageLockedState() {
  const yakklSettings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as Settings;
  const yakklCurrentlySelected = await getObjectFromLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED) as YakklCurrentlySelected;
  if (yakklCurrentlySelected && yakklSettings) { // This just makes sure the locks are the same
    if (!yakklSettings.isLocked || !yakklCurrentlySelected?.shortcuts?.isLocked) {
        yakklCurrentlySelected.shortcuts.isLocked = yakklSettings.isLocked = true;
        await setObjectInLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED, yakklCurrentlySelected);
        await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, yakklSettings);
    }
    if (yakklSettings?.isLocked) {
      await browser.action.setIcon({path: {16: "/images/logoBullLock16x16.png", 32: "/images/logoBullLock32x32.png", 48: "/images/logoBullLock48x48.png", 128: "/images/logoBullLock128x128.png"}});
    } else {
      await browser.action.setIcon({path: {16: "/images/logoBull16x16.png", 32: "/images/logoBull32x32.png", 48: "/images/logoBull48x48.png", 128: "/images/logoBull128x128.png"}});
    }

  } else {
    await browser.action.setIcon({path: {16: "/images/logoBullLock16x16.png", 32: "/images/logoBullLock32x32.png", 48: "/images/logoBullLock48x48.png", 128: "/images/logoBullLock128x128.png"}});
  }

  log.warn("Managing locked state", false, yakklSettings, yakklSettings?.isLocked);
}

/**
 * Sets up a timer to watch locked state at specified intervals
 * @param ms Milliseconds between checks
 * @returns The interval ID
 */
export async function watchLockedState(ms: number): Promise<NodeJS.Timeout> {
  log.info(`Setting up locked state watcher with interval: ${ms}ms`);

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

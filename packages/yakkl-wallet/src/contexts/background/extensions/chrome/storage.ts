// import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { STORAGE_YAKKL_SETTINGS, VERSION } from '$lib/common/constants';
import type { Preferences, YakklSettings } from '$lib/common/interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { log } from '$lib/common/logger-wrapper';
import { upgrade } from '$lib/upgrades/upgrades';
import UpgradeMigrationManager from '$lib/upgrades/UpgradeMigrationManager';
import { detect } from 'detect-browser';

type RuntimePlatformInfo = Runtime.PlatformInfo;

export async function setLocalObjectStorage(
	platform: RuntimePlatformInfo | null,
	shouldUpgrade: boolean = true  // Default to true for automatic upgrades
): Promise<void> {
	try {
		const yakklSettings = (await getObjectFromLocalStorage<YakklSettings>(
			STORAGE_YAKKL_SETTINGS
		)) as YakklSettings | null;
		const prevVersion = yakklSettings?.version ?? VERSION;

		// Always run upgrades unless explicitly disabled and version has changed
		if (shouldUpgrade && prevVersion !== VERSION) {
			log.info(`Version change detected: ${prevVersion} -> ${VERSION}, running upgrades`);
			await upgrade(prevVersion, VERSION);
		} else if (shouldUpgrade) {
			// Even if versions match, check if individual storage items need upgrading
			const migrationManager = UpgradeMigrationManager.getInstance();
			const upgradeNeeded = await migrationManager.checkIfUpgradeNeeded(VERSION);
			if (upgradeNeeded) {
				log.info('Some storage items need upgrading, running migration');
				await migrationManager.upgradeAllData(prevVersion, VERSION);
			}
		}

		const yakklPreferences = (await getObjectFromLocalStorage<Preferences>(
			'preferences'
		)) as Preferences | null;

		if (yakklSettings) {
			yakklSettings.previousVersion = yakklSettings.version;
			yakklSettings.version = VERSION;
			yakklSettings.updateDate = new Date().toISOString();
			yakklSettings.upgradeDate = yakklSettings.updateDate;
			yakklSettings.lastAccessDate = yakklSettings.updateDate;

			if (platform !== null) {
				const browserPlatform = detect();
				yakklSettings.platform.arch = platform.arch;
				yakklSettings.platform.os = platform.os;
				yakklSettings.platform.browser = browserPlatform?.name ?? '';
				yakklSettings.platform.browserVersion = browserPlatform?.version ?? '';
				yakklSettings.platform.platform = browserPlatform?.type ?? '';
			}

			await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, yakklSettings);
		}
	} catch (e) {
		log.error('setLocalObjectStorage Error', false, e);
		throw e;
	}
}

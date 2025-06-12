/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-debugger */
// Upgrades for the app...
import { getObjectFromLocalStorage, removeObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { AccessSourceType, PromoClassificationType, type Settings } from '$lib/common';
import { log } from '$lib/plugins/Logger';

// This list gets updated with each new version
const yakklUpdateStorage = [
  'preferences',
  'profile',
  'settings',
  'yakklAccounts',
  'yakklBookmarkedArticles',
  'yakklChats',
  'yakklConnectedDomains',
  'yakklContacts',
  'yakklCombinedTokens',
  'yakklCurrentlySelected',
  'yakklPrimaryAccounts',
  'yakklRegisteredData',
  'yakklSecurity',
  'yakklTokenData',
  'yakklTokenDataCustom',
  'yakklWalletBlockchains',
  'yakklWalletProviders',
  'yakklWatchList',

// NOTE: Add new storage areas here

];

// NOTE: This file changes with each version upgrade!!

export function upgrade(fromVersion: string, toVersion: string) {
  try {
    // This should cycle through all the versions and upgrade each one or return if already upgraded
    // if (checkVersion(toVersion)) {
    //   console.log(`Already upgraded to ${toVersion}`);
    //   return
    // }

    latest(toVersion);
    log.info(`Upgraded from ${fromVersion} to ${toVersion}`);

  } catch (e) {
    log.warn(e);
  }
}

// This function will be archived on the next upgrade and new one will be created!!!
async function latest(toVersion: string) {
  // Upgrade latest
  // We need to change networks from integer to hex values
  // yakklAccount - change chainId to number
  // yakklCurrentlySelected - change all chainId values to number
  // yakklConnectedDomains - change the addresses array to hold objects with chainId, network, and address

  // const yakklPreferences: Preferences = await getObjectFromLocalStorage('preferences') as Preferences;
  // Create backup!
  // setObjectInLocalStorage('preferencesBackup', yakklPreferences );

  // const yakklUpdatedPreferences = yakklPreferences;

  // Update if needed
  // if (yakklPreferences.wallet !== undefined) {
  //   yakklUpdatedPreferences.wallet = yakklPreferences.wallet;
  //   yakklUpdatedPreferences.wallet.title = DEFAULT_TITLE;
  //   // delete yakklUpdatedPreferences.wallet;
  //   setObjectInLocalStorage('preferences', yakklUpdatedPreferences );
  // }

  console.log('upgrading settings');
  console.log('toVersion', toVersion);

  const yakklSettings: Settings = await getObjectFromLocalStorage('settings') as Settings;
  setObjectInLocalStorage('settingsBackup', yakklSettings ); // Create backup

  if (yakklSettings) {
    if (yakklSettings.plan.source === undefined) {
      yakklSettings.plan.source = AccessSourceType.STANDARD;
    }
      if (yakklSettings.plan.promo === undefined) {
      yakklSettings.plan.promo = PromoClassificationType.NONE;
    }
    if (yakklSettings.plan.trialEndDate === undefined) {
      yakklSettings.plan.trialEndDate = '';
    }
    if (yakklSettings.trialCountdownPinned === undefined) {
      yakklSettings.trialCountdownPinned = false;
    }
    yakklSettings.previousVersion = yakklSettings.version;
    yakklSettings.version = toVersion;
    setObjectInLocalStorage('settings', yakklSettings);
  }

  console.log('settings upgraded');
  console.log('yakklSettings', yakklSettings);
  console.log('toVersion', toVersion);

  // Now remove the backups
  removeBackups();

  updateVersion(toVersion);
}

// All have to be true to not be upgraded
export async function checkVersion(toVersion: string) {
  try {
    for (let index = 0; index < yakklUpdateStorage.length; index++) {
      const dataFile = yakklUpdateStorage[index];
      const data = await getObjectFromLocalStorage(dataFile);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      if (data?.version && data.version !== toVersion) {
        return false;
      }
    }
    return true;
  } catch (e) {
    log.warn(e);
  }
}

export async function updateVersion(toVersion: string) {
  try {
    if (!toVersion) return;

    for (let index = 0; index < yakklUpdateStorage.length; index++) {
      const dataFile = yakklUpdateStorage[index].toString();
      let data: any = await getObjectFromLocalStorage(dataFile);

      if (data) {
        if (Array.isArray(data)) {
          data = data.map(item => {
            return {
              ...item,
              version: toVersion
            };
          });
        } else {
          data.version = toVersion; // Created issue #YB-64 due to upgrade from 0.29.5 to 0.30.5 see for more details
        }

        await setObjectInLocalStorage(dataFile, data);
      } else {
        log.info(`No data found for ${dataFile}. May not have been initialized yet.`);
      }
    }
  } catch (e) {
    log.warn(e);
  }
}


// Can optimize this by using a loop later
export async function removeBackups() {
  try {
    removeObjectFromLocalStorage('settingsBackup');
    // removeObjectFromLocalStorage('yakklNetworksBackup');
    // removeObjectFromLocalStorage('yakklCurrentlySelectedBackup');
    // removeObjectFromLocalStorage('yakklAccountsBackup');
    // removeObjectFromLocalStorage('yakklProvidersBackup');
    // removeObjectFromLocalStorage('yakklConnectedDomainsBackup');
  } catch (e) {
    log.warn(e);
  }
}

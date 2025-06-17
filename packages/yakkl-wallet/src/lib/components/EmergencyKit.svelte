<script lang="ts">
  //
  // NOTE: This for the Bulk Emergency Kit. The single EmergencyKit is only for YakklAccount or yakklPrimaryAccount.
  //

  import { EmergencyKitManager } from '$lib/managers/EmergencyKitManager';
  import {
    getProfile, getPreferences, getSettings, getYakklCurrentlySelected,
    getYakklContacts, getYakklChats, getYakklAccounts, getYakklPrimaryAccounts,
    getYakklWatchList, getYakklBlockedList, getYakklConnectedDomains, getMiscStore,
    setProfileStorage, setPreferencesStorage, setSettingsStorage, setYakklCurrentlySelectedStorage,
    setYakklContactsStorage, setYakklChatsStorage, setYakklAccountsStorage, setYakklPrimaryAccountsStorage,
    setYakklWatchListStorage, setYakklBlockedListStorage, setYakklConnectedDomainsStorage,
    profileStore, yakklPreferencesStore, yakklSettingsStore, yakklCurrentlySelectedStore,
    yakklContactsStore, yakklChatsStore, yakklAccountsStore, yakklPrimaryAccountsStore,
    yakklWatchListStore, yakklBlockedListStore, yakklConnectedDomainsStore,
    getYakklTokenData,
    getYakklTokenDataCustom,
    setYakklTokenDataStorage,
    yakklTokenDataStore,
    setYakklTokenDataCustomStorage,
    yakklTokenDataCustomStore,
    setYakklCombinedTokenStorage,
    yakklCombinedTokenStore,
    setYakklWalletProvidersStorage,
    setYakklWalletBlockchainsStorage,
    yakklWalletBlockchainsStore,
    yakklWalletProvidersStore,
    getYakklCombinedToken,
    getYakklWalletProviders,
    getYakklWalletBlockchains
  } from '$lib/common/stores';
  import { VERSION, type EmergencyKitMetaData, isEncryptedData, type CurrentlySelectedData } from '$lib/common';
  import { browserSvelte, browser_ext } from '$lib/common/environment';
  import { decryptData } from '$lib/common/encryption';
  import Confirmation from './Confirmation.svelte';
  import { log } from '$lib/managers/Logger';
	import { safeLogout } from '$lib/common/safeNavigate';

  interface Props {
    mode?: 'import' | 'export' | 'restore';
    onComplete: (success: boolean, message: string) => void;
    onCancel?: () => void;
  }

  let { mode = 'export', onComplete, onCancel = () => {} }: Props = $props();

  let file: File | null = $state(null); // File name to export to or import from
  let metadata: EmergencyKitMetaData | null = $state(null);
  let loading = $state(false);
  let error = $state('');
  let showConfirmation = $state(false);

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      file = target.files[0];
      try {
        metadata = await EmergencyKitManager.readBulkEmergencyKitMetadata(file);
      } catch (err) {
        error = 'Failed to read emergency kit metadata';
        log.error(err);
      }
    }
  }

  async function handleExport() {
    loading = true;
    error = '';
    try {
      const preferences = await getPreferences();
      const settings = await getSettings();
      const profile = await getProfile();
      const currentlySelected = await getYakklCurrentlySelected();
      const contacts = await getYakklContacts();
      const chats = await getYakklChats();
      const accounts = await getYakklAccounts();
      const primaryAccounts = await getYakklPrimaryAccounts();
      const watchList = await getYakklWatchList();
      const blockedList = await getYakklBlockedList();
      const connectedDomains = await getYakklConnectedDomains();
      const passwordOrSaltedKey = getMiscStore();
      const tokenData = await getYakklTokenData();
      const tokenDataCustom = await getYakklTokenDataCustom();
      const combinedTokenStore = await getYakklCombinedToken();
      const walletProviders = await getYakklWalletProviders();
      const walletBlockchains = await getYakklWalletBlockchains();


      if (!preferences || !settings || !profile || !currentlySelected || !passwordOrSaltedKey) {
        throw new Error('Missing required data for export');
      }

      const bulkEmergencyKit = await EmergencyKitManager.createBulkEmergencyKit(
        preferences,
        settings,
        profile,
        currentlySelected,
        contacts ?? [],
        chats ?? [],
        accounts ?? [],
        primaryAccounts ?? [],
        watchList ?? [],
        blockedList ?? [],
        connectedDomains ?? [],
        passwordOrSaltedKey,
        tokenData ?? [],
        tokenDataCustom ?? [],
        combinedTokenStore ?? [],
        walletProviders ?? [],
        walletBlockchains ?? []
      );

      const fileName = await EmergencyKitManager.downloadBulkEmergencyKit(bulkEmergencyKit);
      onComplete(true, 'Emergency kit exported successfully as ' + fileName);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to export emergency kit';
      log.error(err);
      onComplete(false, error);
    } finally {
      loading = false;
    }
  }

  async function handleImport() {
    if (!file) {
      error = 'Please select a file to import';
      return;
    }
    showConfirmation = true;
  }

  async function confirmImport() {
    showConfirmation = false;
    loading = true;
    error = '';
    try {
      const passwordOrSaltedKey = getMiscStore();
      const { newData, existingData } = await EmergencyKitManager.importBulkEmergencyKit(file!, passwordOrSaltedKey);

      // Update local storage and Svelte stores
      await updateStorageAndStores(newData, existingData);

      // After successful import, send YAKKL_ACCOUNT message with the currently selected account
      // Come back to this later - this is more cosmetic and not needed for now.
      // if (browserSvelte) {
      //   const currentlySelected = await getYakklCurrentlySelected();
      //   if (currentlySelected && currentlySelected.data) {
      //     let accountData = currentlySelected.data;
      //     if (isEncryptedData(accountData)) {
      //       accountData = await decryptData(accountData, passwordOrSaltedKey) as CurrentlySelectedData;
      //     }
      //     const account = (accountData as CurrentlySelectedData).account;

      //     browser_ext.runtime.sendMessage({
      //       type: 'YAKKL_ACCOUNT',
      //       data: account
      //     }).catch((error: Error) => {
      //       log.error('Error sending account message', true, error);
      //     });
      //   }
      // }

      onComplete(true, `Emergency kit imported successfully for: ${file!.name}`);
      safeLogout();
    } catch (err) {
      error = `Failed to import emergency kit for: ${file!.name}`;
      log.error(err);
      onComplete(false, `Failed to import emergency kit for: ${file!.name}`);
    } finally {
      loading = false;
    }
  }

  async function updateStorageAndStores(newData: any, existingData: any) {
    // Update this when new data stores are added to the wallet UNLESS it's not important to restore the given data store.
    // Compare with EmergencyKitManager.ts for the list of data stores that are updated.
    const updateFunctions = [
      { key: 'yakklPreferencesStore', setStorage: setPreferencesStorage, store: yakklPreferencesStore },
      { key: 'yakklSettingsStore', setStorage: setSettingsStorage, store: yakklSettingsStore },
      { key: 'profileStore', setStorage: setProfileStorage, store: profileStore },
      { key: 'yakklCurrentlySelectedStore', setStorage: setYakklCurrentlySelectedStorage, store: yakklCurrentlySelectedStore },
      { key: 'yakklContactsStore', setStorage: setYakklContactsStorage, store: yakklContactsStore },
      { key: 'yakklChatsStore', setStorage: setYakklChatsStorage, store: yakklChatsStore },
      { key: 'yakklAccountsStore', setStorage: setYakklAccountsStorage, store: yakklAccountsStore },
      { key: 'yakklPrimaryAccountsStore', setStorage: setYakklPrimaryAccountsStorage, store: yakklPrimaryAccountsStore },
      { key: 'yakklWatchListStore', setStorage: setYakklWatchListStorage, store: yakklWatchListStore },
      { key: 'yakklBlockedListStore', setStorage: setYakklBlockedListStorage, store: yakklBlockedListStore },
      { key: 'yakklConnectedDomainsStore', setStorage: setYakklConnectedDomainsStorage, store: yakklConnectedDomainsStore },
      { key: 'yakklTokenDataStore', setStorage: setYakklTokenDataStorage, store: yakklTokenDataStore },
      { key: 'yakklTokenDataCustomStore', setStorage: setYakklTokenDataCustomStorage, store: yakklTokenDataCustomStore },
      { key: 'yakklCombinedTokenStore', setStorage: setYakklCombinedTokenStorage, store: yakklCombinedTokenStore },
      { key: 'yakklWalletProvidersStore', setStorage: setYakklWalletProvidersStorage, store: yakklWalletProvidersStore },
      { key: 'yakklWalletBlockchainsStore', setStorage: setYakklWalletBlockchainsStorage, store: yakklWalletBlockchainsStore },
    ];

    // Validate VERSION once before the loop
    if (typeof VERSION === 'undefined' || typeof VERSION !== 'string' || VERSION.trim() === '') {
      log.error("VERSION is not properly defined.");
      return;
    }

    // This version now updates the version of all of the data stores that have a version property.
    for (const { key, setStorage, store } of updateFunctions) {
      const data = newData[key] || existingData[key]; // Currently a placeholder for future use and existingData is not used! This is for future use if using something like a backend database.
      if (data) {
        // Check if data is a valid object and has a version property
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Update version if it exists (either as 'version' or 'VERSION')
          if ('version' in data || 'VERSION' in data) {
            data['version'] = VERSION;
            log.info(`Updated version for ${key} to ${VERSION}`);
          }
        } else if (data && typeof data === 'object' && Array.isArray(data)) {
          log.warn(`${key} contains array data - version not updated`);
        } else {
          log.error(`Invalid data object for ${key}. Cannot assign version.`);
          continue; // Skip this iteration
        }

        try {
          await setStorage(data);
          store.set(data);
        } catch (error: any) {
          log.error(`Failed to update ${key}:`, false, error);
        }
      }
    }

    // Previous version of the code that only updated the version of preferences
    // for (const { key, setStorage, store } of updateFunctions) {
    //   const data = newData[key] || existingData[key];
    //   if (data) {
    //     if ( key === 'yakklPreferencesStore') {
    //       if (data && typeof data === 'object' && !Array.isArray(data)) {
    //         // Keep the metadata version of the latest version
    //         if (typeof VERSION !== 'undefined' && typeof VERSION === 'string' && VERSION.trim() !== '') {
    //           data['version'] = VERSION;
    //         } else {
    //           log.error("VERSION is not properly defined.");
    //         }
    //       } else {
    //         log.error("Invalid 'data' object. Cannot assign 'version'.");
    //       }
    //     }

    //     await setStorage(data);
    //     store.set(data);
    //   }
    // }
  }

</script>

<div class="p-4">
  <h2 class="text-2xl font-bold mb-4">{mode === 'export' ? 'Export' : 'Import'} Emergency Kit</h2>

  {#if mode === 'export'}
    <button onclick={handleExport} class="bg-blue-500 text-white px-4 py-2 rounded" disabled={loading}>
      {loading ? 'Exporting...' : 'Export Emergency Kit'}
    </button>
  {:else}
    <div class="mb-4">
      <label for="importFile" class="block mb-2">Select File to Import:</label>
      <input type="file" id="importFile" onchange={handleFileSelect} accept=".json" class="w-full p-2 border rounded" />
    </div>
    {#if metadata}
      <div class="mb-4">
        <h3 class="text-lg font-semibold">Emergency Kit Metadata:</h3>
        <p>ID: {metadata.id}</p>
        <p>Created: {new Date(metadata.createDate).toLocaleString()}</p>
        <p>Version: {metadata.version}</p>
        <p>Type: {metadata.type}</p>
        <p>Files: {metadata.files}</p>
      </div>
      <div class="mb-4">
        <h4 class="text-lg font-bold">YAKKL will <span class="text-red-500 underline">auto logout</span> once the import is complete! Simply login again to continue.</h4>
      </div>
    {/if}
    <button onclick={handleImport} class="bg-green-500 text-white px-4 py-2 rounded" disabled={loading || !file}>
      {loading ? 'Importing...' : 'Import'}
    </button>
    <button onclick={onCancel} class="bg-red-400 text-white px-4 py-2 rounded" >
      Cancel
    </button>
  {/if}

  {#if error}
    <p class="text-red-500 mt-4">{error}</p>
  {/if}
</div>

<Confirmation
  bind:show={showConfirmation}
  title="Confirm Import"
  message="Are you sure you want to continue? Doing so will override your current Smart Wallet data!"
  confirmText="Yes, Import"
  rejectText="Cancel"
  onConfirm={confirmImport}
/>


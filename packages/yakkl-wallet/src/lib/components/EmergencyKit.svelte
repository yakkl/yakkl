<script lang="ts">
  import { EmergencyKitManager } from '$lib/managers/EmergencyKitManager';
  import { currentAccount, accounts } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { notificationService } from '$lib/services/notification.service';
  import { log } from '$lib/common/logger-wrapper';
  import { getMiscStore } from '$lib/common/stores';
  import EmergencyKitShamir from './EmergencyKitShamir.svelte';

  let { onClose } = $props();

  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let allAccounts = $derived($accounts);

  let showPrivateKey = $state(false);
  let showSeedPhrase = $state(false);
  let copied = $state(false);
  let loading = $state(false);
  let mode = $state<'export' | 'import'>('export');
  let file = $state<File | null>(null);
  let metadata = $state<any>(null);
  let showShamirModal = $state(false);
  let emergencyKitData = $state<any>(null);

  function handlePrint() {
    // Navigate to the dedicated print page
    window.open('/accounts/print-emergency-kit', '_blank');
  }

  async function handleExport() {
    loading = true;
    try {
      // Get all the necessary data
      const {
        getPreferences, getYakklSettings, getProfile, getYakklCurrentlySelected,
        getYakklContacts, getYakklChats, getYakklAccounts, getYakklPrimaryAccounts,
        getYakklWatchList, getYakklBlockedList, getYakklConnectedDomains,
        	getYakklTokenData, getYakklTokenDataCustom, getYakklCombinedTokens,
        getYakklWalletProviders, getYakklWalletBlockchains
      } = await import('$lib/common/stores');

      const preferences = await getPreferences();
      const settings = await getYakklSettings();
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
      		const combinedTokenStore = await getYakklCombinedTokens();
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

      // Store for Shamir option
      emergencyKitData = bulkEmergencyKit;

      const fileName = await EmergencyKitManager.downloadBulkEmergencyKit(bulkEmergencyKit);

      await notificationService.show({
        message: `Emergency kit exported successfully as ${fileName}`,
        type: 'success'
      });

      // Don't close yet - user might want to create Shamir shards
    } catch (err) {
      log.error('Failed to export emergency kit', false, err);
      await notificationService.show({
        message: 'Failed to export emergency kit',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      file = target.files[0];
      try {
        metadata = await EmergencyKitManager.readBulkEmergencyKitMetadata(file);
      } catch (err) {
        log.error('Failed to read emergency kit metadata', false, err);
      }
    }
  }

  async function handleImport() {
    if (!file) {
      await notificationService.show({
        message: 'Please select a file to import',
        type: 'error'
      });
      return;
    }

    loading = true;
    try {
      const passwordOrSaltedKey = getMiscStore();
      const { newData, existingData } = await EmergencyKitManager.importBulkEmergencyKit(
        file,
        passwordOrSaltedKey
      );

      // Update stores will be handled in v1 logic
      await notificationService.show({
        message: 'Emergency kit imported successfully. Logging out...',
        type: 'success'
      });

      // Logout after import
      const { safeLogout } = await import('$lib/common/safeNavigate');
      setTimeout(() => {
        safeLogout();
      }, 2000);

    } catch (err) {
      log.error('Failed to import emergency kit', false, err);
      await notificationService.show({
        message: 'Failed to import emergency kit',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
  <div class="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <!-- Header -->
    <div class="p-6 border-b border-zinc-200 dark:border-zinc-700">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Emergency Recovery Kit</h2>
        <button
          onclick={onClose}
          class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mode Tabs -->
      <div class="flex gap-1 mt-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1">
        <button
          onclick={() => mode = 'export'}
          class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors {mode === 'export' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
        >
          Export Kit
        </button>
        <button
          onclick={() => mode = 'import'}
          class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors {mode === 'import' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}"
        >
          Import Kit
        </button>
      </div>
    </div>

    <!-- Warning Banner -->
    <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 m-6">
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 class="font-semibold text-red-800 dark:text-red-200">Critical Security Information</h3>
          <p class="text-sm text-red-700 dark:text-red-300 mt-1">
            This kit contains sensitive information that provides complete access to your wallet.
            Store it securely and never share it with anyone.
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-6">
      {#if mode === 'export'}
        <!-- Export Mode Content -->
        <div class="space-y-6">
          <div class="text-center space-y-4">
            <div class="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Export Your Emergency Kit</h3>
              <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                Create a complete backup of your wallet including all accounts, settings, and preferences.
              </p>
            </div>
          </div>

          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h4 class="font-medium text-amber-800 dark:text-amber-200 mb-2">What's Included:</h4>
            <ul class="space-y-1 text-sm text-amber-700 dark:text-amber-300">
              <li>• All wallet accounts and keys (encrypted)</li>
              <li>• Your preferences and settings</li>
              <li>• Contact list and connected domains</li>
              <li>• Token data and custom tokens</li>
            </ul>
          </div>
        </div>
      {:else}
        <!-- Import Mode Content -->
        <div class="space-y-6">
          <div class="text-center space-y-4">
            <div class="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Import Emergency Kit</h3>
              <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                Restore your wallet from a previously exported emergency kit file.
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <div>
              <label for="importFile" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Select Emergency Kit File
              </label>
              <input
                type="file"
                id="importFile"
                accept=".json"
                onchange={handleFileSelect}
                class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
              />
            </div>

            {#if metadata}
              <div class="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-2">
                <h4 class="font-medium text-zinc-900 dark:text-white">Kit Details:</h4>
                <div class="text-sm space-y-1 text-zinc-600 dark:text-zinc-400">
                  <p>ID: {metadata.id}</p>
                  <p>Created: {new Date(metadata.createDate).toLocaleString()}</p>
                  <p>Version: {metadata.version}</p>
                  <p>Type: {metadata.type}</p>
                </div>
              </div>

              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p class="text-sm text-red-700 dark:text-red-300">
                  <strong>Important:</strong> YAKKL will automatically log out after import. You'll need to log in again with your password.
                </p>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- Actions -->
    <div class="p-6 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-3">
      {#if mode === 'export'}
        <button
          onclick={handleExport}
          class="yakkl-btn-primary flex items-center gap-2"
          disabled={loading}
        >
          {#if loading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Exporting...
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Emergency Kit
          {/if}
        </button>

        {#if emergencyKitData}
          <button
            onclick={() => showShamirModal = true}
            class="yakkl-btn-secondary flex items-center gap-2"
            title="Split your emergency kit into multiple secure shards"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Create Shamir Shards
          </button>
        {/if}
      {:else}
        <button
          onclick={handleImport}
          class="yakkl-btn-primary flex items-center gap-2"
          disabled={loading || !file}
        >
          {#if loading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Importing...
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import Emergency Kit
          {/if}
        </button>
      {/if}

      <button
        onclick={onClose}
        class="yakkl-btn-secondary ml-auto"
      >
        Cancel
      </button>
    </div>
  </div>
</div>

<!-- Shamir's Secret Sharing Modal -->
<EmergencyKitShamir
  bind:show={showShamirModal}
  {emergencyKitData}
  onComplete={() => {
    showShamirModal = false;
    onClose();
  }}
/>

<style>
  @media print {
    .fixed {
      position: static;
      background: white;
    }

    button {
      display: none;
    }

    .max-h-\[90vh\] {
      max-height: none;
    }
  }
</style>

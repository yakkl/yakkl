<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ExportPrivateKey from '$lib/components/ExportPrivateKey.svelte';
  import { ChevronLeft, Key, Download, AlertTriangle } from 'lucide-svelte';
  import { sessionManager } from '$lib/managers/SessionManager';
  import { currentAccount } from '$lib/stores/account.store';

  let pageReady = $state(false);
  let showExportModal = $state(false);
  let account = $derived($currentAccount);

  // Check authentication on mount
  onMount(async () => {
    // Check if user is authenticated
    const isActive = sessionManager.isSessionActive();
    if (!isActive) {
      console.log('[ExportAccount] No valid session, redirecting to login');
      goto('/login');
      return;
    }
    pageReady = true;
  });

  function handleBack() {
    // Go back to accounts page
    goto('/accounts');
  }

  function handleExportPrivateKey() {
    showExportModal = true;
  }

  function handleExportSeedPhrase() {
    // TODO: Implement seed phrase export
    alert('Seed phrase export coming soon. Only account owners can export the master seed phrase.');
  }

  function handleExportSuccess() {
    // Return to accounts page after successful export
    goto('/accounts');
  }
</script>

{#if pageReady}
<div class="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-md mx-auto">
    <button
      onclick={handleBack}
      class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
    >
      <ChevronLeft class="w-5 h-5" />
      Back
    </button>

    <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Export Account</h1>

    {#if account}
      <div class="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="text-sm text-gray-600 dark:text-gray-400">Current Account</div>
        <div class="font-semibold text-gray-900 dark:text-gray-100">{account.ens || account.username || 'Account'}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>
      </div>
    {/if}

    <div class="space-y-4">
      <button
        onclick={handleExportPrivateKey}
        class="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-4 text-left group"
      >
        <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
          <Key class="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">Export Private Key</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Export the private key for this account</p>
        </div>
      </button>

      <button
        onclick={handleExportSeedPhrase}
        class="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-4 text-left group opacity-50 cursor-not-allowed"
        disabled
      >
        <div class="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-colors">
          <Download class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">Export Seed Phrase</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Export the master recovery phrase (Primary accounts only)</p>
        </div>
      </button>
    </div>

    <div class="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <div class="flex gap-3">
        <AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-red-800 dark:text-red-200">
          <strong>Security Warning:</strong> Never share your private key or seed phrase with anyone.
          Anyone with access to these can steal all your funds. Only export if you need to import
          your account into another wallet. Store exports in a secure location.
        </div>
      </div>
    </div>
  </div>
</div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
  <ExportPrivateKey
    bind:show={showExportModal}
    onVerify={() => {
      // Modal handles its own success
    }}
  />
{/if}

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import ImportOption from '$lib/components/v1/ImportOption.svelte';
  import ImportPrivateKey from '$lib/components/v1/ImportPrivateKey.svelte';
  import ImportPhrase from '$lib/components/v1/ImportPhrase.svelte';
  import ImportWatchAccount from '$lib/components/v1/ImportWatchAccount.svelte';
  import { ChevronLeft, Key, FileText, Eye } from 'lucide-svelte';
  import { sessionManager } from '$lib/managers/SessionManager';
  
  let importType = $state<'private-key' | 'seed-phrase' | 'watch' | null>(null);
  let showModal = $state(false);
  let pageReady = $state(false);
  
  // Check authentication on mount
  onMount(async () => {
    // Check if user is authenticated
    const isActive = sessionManager.isSessionActive();
    if (!isActive) {
      console.log('[ImportAccount] No valid session, redirecting to login');
      goto('/login');
      return;
    }
    pageReady = true;
  });
  
  function handleBack() {
    if (importType) {
      importType = null;
    } else {
      // Go back to accounts page, not home
      goto('/accounts');
    }
  }
  
  function handleImportSuccess() {
    // Go to accounts page to see the new account
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
    
    {#if !importType}
      <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Import Account</h1>
      
      <div class="space-y-4">
        <button
          onclick={() => {
            importType = 'seed-phrase';
            showModal = true;
          }}
          class="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-4 text-left group"
        >
          <div class="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-colors">
            <FileText class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Import with Seed Phrase</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Use your 12 or 24 word recovery phrase</p>
          </div>
        </button>
        
        <button
          onclick={() => {
            importType = 'private-key';
            showModal = true;
          }}
          class="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-4 text-left group"
        >
          <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
            <Key class="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Import Private Key</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Import an account using its private key</p>
          </div>
        </button>
        
        <button
          onclick={() => {
            importType = 'watch';
            showModal = true;
          }}
          class="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all flex items-center gap-4 text-left group"
        >
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
            <Eye class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Watch Address</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Monitor any wallet address without private keys</p>
          </div>
        </button>
      </div>
      
      <div class="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p class="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Security Note:</strong> Never share your seed phrase or private key with anyone. YAKKL will never ask for them outside of this import process.
        </p>
      </div>
    {/if}
  </div>
</div>
{/if}

<!-- Import Modals - Rendered outside main content -->
{#if importType === 'seed-phrase' && showModal}
  <ImportPhrase 
    bind:show={showModal}
    onComplete={handleImportSuccess}
    onCancel={() => {
      importType = null;
      showModal = false;
    }}
  />
{/if}

{#if importType === 'private-key' && showModal}
  <ImportPrivateKey 
    bind:show={showModal}
    onComplete={handleImportSuccess}
    onCancel={() => {
      importType = null;
      showModal = false;
    }}
  />
{/if}

{#if importType === 'watch' && showModal}
  <ImportWatchAccount 
    bind:show={showModal}
    onComplete={handleImportSuccess}
    onCancel={() => {
      importType = null;
      showModal = false;
    }}
  />
{/if}
<script lang="ts">
  import { goto } from '$app/navigation';
  import KeyManagement from '$lib/components/pro/KeyManagement.svelte';
  import Button from '$lib/components/Button.svelte';
  import Icon from '$lib/components/Icon.svelte';
  
  async function handleClose() {
    await goto('/settings');
  }
</script>

<div class="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
  <div class="flex items-center justify-between w-full h-14 bg-white/90 dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800 px-4">
    <div class="flex items-center gap-3">
      <button
        on:click={handleClose}
        class="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 
          dark:hover:text-white transition-colors"
        title="Back to Settings"
      >
        <Icon name="arrow-left" class="w-5 h-5" />
      </button>
      <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
        API Key Management
      </h1>
    </div>
  </div>
  
  <main class="flex-1 overflow-hidden">
    <KeyManagement />
  </main>
  
  <div class="h-14 bg-white/90 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800">
    <div class="flex justify-between items-center w-full h-full px-6">
      <div class="text-sm text-gray-500 dark:text-gray-400">
        <Icon name="shield" class="w-4 h-4 inline mr-1" />
        All API keys are encrypted and stored locally
      </div>
      <Button
        variant="secondary"
        onclick={handleClose}
        class="px-6"
      >
        Close
      </Button>
    </div>
  </div>
</div>
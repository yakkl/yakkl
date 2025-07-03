<script lang="ts">
  import ExtensionDashboard from "$lib/components/extensions/ExtensionDashboard.svelte";
  import ExtensionTestSuite from "$lib/components/extensions/ExtensionTestSuite.svelte";
  
  let activeTab = $state('dashboard');
</script>

<svelte:head>
  <title>Extensions - YAKKL Wallet v2</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Extensions</h1>
    <p class="text-zinc-600 dark:text-zinc-400">
      Extend your wallet with powerful plugins and enhancements
    </p>
  </div>

  <!-- Tabs -->
  <div class="flex gap-4 mb-6 border-b border-zinc-200 dark:border-zinc-700">
    <button
      onclick={() => activeTab = 'dashboard'}
      class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {
        activeTab === 'dashboard' 
          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
          : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
      }"
    >
      📦 Extension Dashboard
    </button>
    <button
      onclick={() => activeTab = 'test'}
      class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {
        activeTab === 'test' 
          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
          : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
      }"
    >
      🧪 Test Suite
    </button>
  </div>

  <!-- Content -->
  {#if activeTab === 'dashboard'}
    <ExtensionDashboard />
  {:else}
    <ExtensionTestSuite />
  {/if}
</div>
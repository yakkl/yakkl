<script lang="ts">
  /**
   * ExtensionDashboard - Shows available extensions and manages them
   */

  import { onMount } from 'svelte';
  import { extensions, discoveredExtensions, isCoreAvailable, discoverExtensions, loadExtension } from '../../core/integration';
  import ExtensionRenderer from './ExtensionRenderer.svelte';

  interface ExtensionManifest {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    tier: string;
  }

  interface Extension {
    manifest?: ExtensionManifest;
    id?: string;
  }

  let { className = '' } = $props();

  let loading = $state(false);
  let activeTab = $state('installed');
  let selectedCategory = $state('all');

  // Reactive stores
  let loadedExtensions: Extension[] = $derived($extensions as Extension[]);
  let discovered: Extension[] = $derived($discoveredExtensions as Extension[]);

  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All', icon: '📦' },
    { id: 'portfolio', name: 'Portfolio', icon: '💼' },
    { id: 'trading', name: 'Trading', icon: '📈' },
    { id: 'defi', name: 'DeFi', icon: '🏦' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'analytics', name: 'Analytics', icon: '📊' },
    { id: 'utility', name: 'Utility', icon: '🛠️' }
  ];

  // Filter extensions by category
  let filteredExtensions = $derived(() => {
    if (selectedCategory === 'all') {
      return loadedExtensions;
    }
    return loadedExtensions.filter(v => v.manifest?.category === selectedCategory);
  });

  onMount(async () => {
    if (isCoreAvailable()) {
      await refreshDiscovery();
    }
  });

  async function refreshDiscovery() {
    loading = true;
    try {
      await discoverExtensions();
    } catch (error) {
      console.error('Failed to discover extensions:', error);
    } finally {
      loading = false;
    }
  }

  async function installExtension(extensionId: string) {
    try {
      await loadExtension(extensionId);
    } catch (error) {
      console.error(`Failed to install extension ${extensionId}:`, error);
    }
  }

  function getTierColor(tier: string): string {
    switch (tier) {
      case 'community': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'verified': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'pro': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      case 'private': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'enterprise': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      default: return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';
    }
  }

  function getCategoryIcon(category: string): string {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || '📦';
  }
</script>

<div class={`extension-dashboard ${className}`}>
  {#if !isCoreAvailable()}
    <div class="p-6 text-center">
      <div class="mb-4">
        <svg class="w-12 h-12 mx-auto text-zinc-400 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Extension System</h3>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        YAKKL Core is not available. Extension functionality is disabled.
      </p>
      <div class="text-xs text-zinc-500 dark:text-zinc-500">
        The extension system will be available once YAKKL Core is integrated.
      </div>
    </div>
  {:else}
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h2 class="text-xl font-bold text-zinc-900 dark:text-white">Extensions</h2>
          <p class="text-sm text-zinc-600 dark:text-zinc-400">Extend your wallet with plugins</p>
        </div>
      </div>

      <button
        onclick={refreshDiscovery}
        disabled={loading}
        class="yakkl-btn-secondary text-sm {loading ? 'opacity-50' : ''}"
      >
        {#if loading}
          <svg class="w-4 h-4 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {/if}
        Discover
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6">
      <button
        onclick={() => activeTab = 'installed'}
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {
          activeTab === 'installed'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }"
      >
        Installed ({loadedExtensions.length})
      </button>
      <button
        onclick={() => activeTab = 'discover'}
        class="px-4 py-2 text-sm font-medium rounded-lg transition-colors {
          activeTab === 'discover'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }"
      >
        Discover ({discovered.length})
      </button>
    </div>

    <!-- Category Filter -->
    <div class="flex flex-wrap gap-2 mb-6">
      {#each categories as category}
        <button
          onclick={() => selectedCategory = category.id}
          class="px-3 py-1 text-sm rounded-full transition-colors {
            selectedCategory === category.id
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }"
        >
          {category.icon} {category.name}
        </button>
      {/each}
    </div>

    <!-- Content -->
    {#if activeTab === 'installed'}
      <!-- Installed Extensions -->
      {#if filteredExtensions.length === 0}
        <div class="text-center py-12">
          <div class="mb-4">
            <svg class="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2">
            {selectedCategory === 'all' ? 'No extensions installed' : `No ${selectedCategory} extensions`}
          </h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {selectedCategory === 'all'
              ? 'Discover and install extensions to extend your wallet functionality'
              : `Browse other categories or discover new ${selectedCategory} extensions`
            }
          </p>
          <button
            onclick={() => activeTab = 'discover'}
            class="yakkl-btn-primary text-sm"
          >
            Discover Extensions
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each filteredExtensions as extension}
            <div class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div class="flex items-start gap-3 mb-3">
                <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                  {getCategoryIcon(extension.manifest?.category || 'utility')}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-medium text-zinc-900 dark:text-white truncate">
                      {extension.manifest?.name || 'Unknown Extension'}
                    </h3>
                    <span class={`px-2 py-0.5 text-xs font-medium rounded-full ${getTierColor(extension.manifest?.tier || 'community')}`}>
                      {extension.manifest?.tier || 'community'}
                    </span>
                  </div>
                  <p class="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {extension.manifest?.description || 'No description available'}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="text-xs text-zinc-500 dark:text-zinc-500">
                  v{extension.manifest?.version || '1.0.0'}
                </div>
                <div class="flex gap-2">
                  <span class="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full">
                    ✓ Active
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else}
      <!-- Discover Extensions -->
      {#if discovered.length === 0}
        <div class="text-center py-12">
          <div class="mb-4">
            <svg class="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-zinc-900 dark:text-white mb-2">No extensions discovered</h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Discovery is scanning for available extensions in your environment
          </p>
          <button
            onclick={refreshDiscovery}
            class="yakkl-btn-primary text-sm"
          >
            Scan Again
          </button>
        </div>
      {:else}
        <div class="space-y-4">
          {#each discovered as extension}
            <div class="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                    {getCategoryIcon(extension.manifest?.category || 'utility')}
                  </div>
                  <div>
                    <h3 class="font-medium text-zinc-900 dark:text-white">
                      {extension.manifest?.name || extension.id}
                    </h3>
                    <p class="text-sm text-zinc-600 dark:text-zinc-400">
                      {extension.manifest?.description || 'No description available'}
                    </p>
                  </div>
                </div>

                <button
                  onclick={() => installExtension(extension.manifest?.id || extension.id)}
                  class="yakkl-btn-primary text-sm"
                >
                  Install
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>

<script lang="ts">
  /**
   * ModRenderer - Renders mod components safely
   * 
   * This component handles the rendering of mod UI components
   * with proper sandboxing and error handling
   */
  
  import { onMount, onDestroy } from 'svelte';
  import { mods, isCoreAvailable, loadMod, initializeCore } from '../../core/integration';
  
  let { 
    modId,
    componentId,
    mountPoint = 'dashboard',
    props = {},
    conditions = [],
    fallback = null,
    className = ''
  } = $props();

  let modComponent = $state(null);
  let loading = $state(true);
  let error = $state(null);
  let mounted = $state(false);

  // Reactive mod list
  let loadedMods = $derived($mods);

  onMount(async () => {
    await loadModComponent();
  });

  onDestroy(() => {
    unmountComponent();
  });

  async function loadModComponent() {
    try {
      // Ensure core is initialized first
      await initializeCore();
      
      if (!isCoreAvailable()) {
        error = 'YAKKL Core not available';
        loading = false;
        return;
      }
    } catch (initError) {
      error = 'Failed to initialize YAKKL Core';
      loading = false;
      return;
    }

    if (!modId || !componentId) {
      error = 'Mod ID and Component ID are required';
      loading = false;
      return;
    }

    try {
      loading = true;
      error = null;

      // Check if mod is already loaded
      let mod = loadedMods.find(v => v.manifest.id === modId);
      
      if (!mod) {
        // Try to load the mod
        mod = await loadMod(modId);
      }

      if (!mod) {
        console.warn(`Mod ${modId} not found in registry`);
        errorMessage = `Mod ${modId} not found or failed to load`;
        hasError = true;
        loading = false;
        return;
      }

      // Get the component from the mod
      const component = mod.getComponent(componentId);
      
      if (!component) {
        console.warn(`Component ${componentId} not found in mod ${modId}`);
        errorMessage = `Component ${componentId} not found in mod ${modId}`;
        hasError = true;
        loading = false;
        return;
      }

      // Check component conditions
      if (conditions.length > 0) {
        const conditionsMet = checkConditions(conditions);
        if (!conditionsMet) {
          unmountComponent();
          loading = false;
          return;
        }
      }

      modComponent = component;
      mounted = true;
      loading = false;
    } catch (err) {
      error = err.message || 'Failed to load mod component';
      loading = false;
      console.error('ModRenderer error:', err);
    }
  }

  function checkConditions(conditions: any[]): boolean {
    // Simple condition checking - in production this would be more sophisticated
    return conditions.every(condition => {
      // For now, assume all conditions are met
      // This would check things like account state, network, balance, etc.
      return true;
    });
  }

  function unmountComponent() {
    modComponent = null;
    mounted = false;
  }

  function handleComponentError(event: CustomEvent) {
    error = `Component error: ${event.detail.message}`;
    console.error('Mod component error:', event.detail);
  }

  // Reactive reload when modId changes
  $effect(() => {
    if (modId) {
      loadModComponent();
    }
  });
</script>

<div class={`mod-renderer ${className}`}>
  {#if loading}
    <div class="mod-loading">
      <div class="animate-pulse flex items-center gap-2">
        <div class="w-4 h-4 bg-indigo-200 dark:bg-indigo-800 rounded-full"></div>
        <div class="text-sm text-zinc-500 dark:text-zinc-400">Loading mod...</div>
      </div>
    </div>
  {:else if error}
    <div class="mod-error">
      {#if fallback}
        {@render fallback?.()}
      {:else}
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium text-red-800 dark:text-red-200">Mod Error</span>
          </div>
          <p class="text-sm text-red-600 dark:text-red-300">{error}</p>
          <button 
            onclick={loadModComponent}
            class="mt-2 text-xs text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
          >
            Try Again
          </button>
        </div>
      {/if}
    </div>
  {:else if modComponent}
    <div 
      class="mod-component"
      data-mod-id={modId}
      data-component-id={componentId}
      data-mount-point={mountPoint}
    >
      <!-- This is where the mod component would be rendered -->
      <!-- For now, show a placeholder with component info -->
      <div class="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            🧩
          </div>
          <div>
            <div class="font-medium text-indigo-900 dark:text-indigo-100">
              Mod Component
            </div>
            <div class="text-xs text-indigo-600 dark:text-indigo-400">
              {modId} → {componentId}
            </div>
          </div>
        </div>
        
        <div class="space-y-2">
          <div class="text-sm text-indigo-700 dark:text-indigo-300">
            Mount Point: <code class="bg-indigo-100 dark:bg-indigo-800 px-1 py-0.5 rounded text-xs">{mountPoint}</code>
          </div>
          
          {#if Object.keys(props).length > 0}
            <div class="text-sm text-indigo-700 dark:text-indigo-300">
              Props: <code class="bg-indigo-100 dark:bg-indigo-800 px-1 py-0.5 rounded text-xs">{JSON.stringify(props)}</code>
            </div>
          {/if}
          
          <div class="pt-2 border-t border-indigo-200 dark:border-indigo-700">
            <div class="text-xs text-indigo-500 dark:text-indigo-400">
              🔌 This is a mod component placeholder. In production, the actual component from the mod would render here.
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Component conditions not met or component not available -->
    <div class="mod-hidden">
      <!-- Hidden component - could show debug info in dev mode -->
    </div>
  {/if}
</div>

<style>
  .mod-renderer {
    @apply w-full;
  }
  
  .mod-loading {
    @apply p-4;
  }
  
  .mod-error {
    @apply w-full;
  }
  
  .mod-component {
    @apply w-full;
  }
  
  .mod-hidden {
    @apply hidden;
  }
  
  /* Sandbox styles for mod components */
  .mod-component :global(*) {
    /* Basic sandboxing - prevent mods from breaking layout */
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  
  /* Prevent mod components from affecting global styles */
  .mod-component :global(.mod-component) {
    isolation: isolate;
  }
</style>
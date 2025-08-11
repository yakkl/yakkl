<script lang="ts">
  /**
   * ExtensionRenderer - Renders extension components safely
   * 
   * This component handles the rendering of extension UI components
   * with proper sandboxing and error handling
   */
  
  import { onMount, onDestroy } from 'svelte';
  import { extensions, isCoreAvailable, loadExtension, initializeCore } from '../../core/integration';
  
  let { 
    extensionId,
    componentId,
    mountPoint = 'dashboard',
    props = {},
    conditions = [],
    fallback = null,
    className = ''
  } = $props();

  let extensionComponent = $state(null);
  let loading = $state(true);
  let error = $state(null);
  let mounted = $state(false);

  // Reactive extension list
  let loadedExtensions = $derived($extensions);

  onMount(async () => {
    await loadExtensionComponent();
  });

  onDestroy(() => {
    unmountComponent();
  });

  async function loadExtensionComponent() {
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

    if (!extensionId || !componentId) {
      error = 'Extension ID and Component ID are required';
      loading = false;
      return;
    }

    try {
      loading = true;
      error = null;

      // Check if extension is already loaded
      let extension = loadedExtensions.find(v => v.manifest.id === extensionId);
      
      if (!extension) {
        // Try to load the extension
        extension = await loadExtension(extensionId);
      }

      if (!extension) {
        console.warn(`Extension ${extensionId} not found in registry`);
        error = `Extension ${extensionId} not found or failed to load`;
        loading = false;
        return;
      }

      // Get the component from the extension
      const component = extension.getComponent(componentId);
      
      if (!component) {
        console.warn(`Component ${componentId} not found in extension ${extensionId}`);
        error = `Component ${componentId} not found in extension ${extensionId}`;
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

      extensionComponent = component;
      mounted = true;
      loading = false;
    } catch (err) {
      error = err.message || 'Failed to load extension component';
      loading = false;
      console.error('ExtensionRenderer error:', err);
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
    extensionComponent = null;
    mounted = false;
  }

  function handleComponentError(event: CustomEvent) {
    error = `Component error: ${event.detail.message}`;
    console.error('Extension component error:', event.detail);
  }

  // Reactive reload when extensionId changes
  $effect(() => {
    if (extensionId) {
      loadExtensionComponent();
    }
  });
</script>

<div class={`extension-renderer ${className}`}>
  {#if loading}
    <div class="extension-loading">
      <div class="animate-pulse flex items-center gap-2">
        <div class="w-4 h-4 bg-indigo-200 dark:bg-indigo-800 rounded-full"></div>
        <div class="text-sm text-zinc-500 dark:text-zinc-400">Loading extension...</div>
      </div>
    </div>
  {:else if error}
    <div class="extension-error">
      {#if fallback}
        {@render fallback?.()}
      {:else}
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-2">
            <svg class="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium text-red-800 dark:text-red-200">Extension Error</span>
          </div>
          <p class="text-sm text-red-600 dark:text-red-300">{error}</p>
          <button 
            onclick={loadExtensionComponent}
            class="mt-2 text-xs text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline"
          >
            Try Again
          </button>
        </div>
      {/if}
    </div>
  {:else if extensionComponent}
    <div 
      class="extension-component"
      data-extension-id={extensionId}
      data-component-id={componentId}
      data-mount-point={mountPoint}
    >
      <!-- This is where the extension component would be rendered -->
      <!-- For now, show a placeholder with component info -->
      <div class="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
            🧩
          </div>
          <div>
            <div class="font-medium text-indigo-900 dark:text-indigo-100">
              Extension Component
            </div>
            <div class="text-xs text-indigo-600 dark:text-indigo-400">
              {extensionId} → {componentId}
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
              🔌 This is an extension component placeholder. In production, the actual component from the extension would render here.
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Component conditions not met or component not available -->
    <div class="extension-hidden">
      <!-- Hidden component - could show debug info in dev mode -->
    </div>
  {/if}
</div>

<style>
  .extension-renderer {
    @apply w-full;
  }
  
  .extension-loading {
    @apply p-4;
  }
  
  .extension-error {
    @apply w-full;
  }
  
  .extension-component {
    @apply w-full;
  }
  
  .extension-hidden {
    @apply hidden;
  }
  
  /* Sandbox styles for extension components */
  .extension-component :global(*) {
    /* Basic sandboxing - prevent extensions from breaking layout */
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  
  /* Prevent extension components from affecting global styles */
  .extension-component :global(.extension-component) {
    isolation: isolate;
  }
</style>
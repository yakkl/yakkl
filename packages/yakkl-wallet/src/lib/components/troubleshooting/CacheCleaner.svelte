<script lang="ts">
  import { browser_ext } from '$lib/common/environment';
  
  interface CacheItem {
    name: string;
    description: string;
    size?: string;
    action: () => Promise<void>;
  }
  
  let clearing = $state(false);
  let clearResults = $state<string[]>([]);
  let selectedItems = $state<Set<string>>(new Set());
  
  const cacheItems: CacheItem[] = [
    {
      name: 'Local Storage',
      description: 'All wallet settings and preferences',
      action: async () => {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear();
        }
      }
    },
    {
      name: 'Session Storage',
      description: 'Temporary session data',
      action: async () => {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      }
    },
    {
      name: 'IndexedDB',
      description: 'Transaction history and cached data',
      action: async () => {
        if ('indexedDB' in window) {
          const databases = await indexedDB.databases();
          for (const db of databases) {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          }
        }
      }
    },
    {
      name: 'Extension Storage',
      description: 'Browser extension data',
      action: async () => {
        if (browser_ext?.storage?.local) {
          await browser_ext.storage.local.clear();
        }
      }
    },
    {
      name: 'Service Worker Cache',
      description: 'Cached network requests',
      action: async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
      }
    }
  ];
  
  function toggleItem(name: string) {
    if (selectedItems.has(name)) {
      selectedItems.delete(name);
    } else {
      selectedItems.add(name);
    }
    selectedItems = new Set(selectedItems); // Trigger reactivity
  }
  
  function selectAll() {
    selectedItems = new Set(cacheItems.map(item => item.name));
  }
  
  function selectNone() {
    selectedItems.clear();
    selectedItems = new Set(); // Trigger reactivity
  }
  
  async function clearSelectedCaches() {
    if (selectedItems.size === 0) {
      alert('Select at least one cache to clear');
      return;
    }
    
    const confirmMsg = `This will permanently delete the following data:\n\n${
      Array.from(selectedItems).join('\n')
    }\n\nThis action cannot be undone. Continue?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    clearing = true;
    clearResults = [];
    
    for (const item of cacheItems) {
      if (selectedItems.has(item.name)) {
        try {
          clearResults.push(`🗑️ Clearing ${item.name}...`);
          await item.action();
          clearResults.push(`✅ ${item.name} cleared successfully`);
        } catch (err) {
          clearResults.push(`❌ Failed to clear ${item.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }
    }
    
    clearResults.push('');
    clearResults.push('🔄 Cache clearing complete. You may need to reload the wallet.');
    
    clearing = false;
  }
</script>

<div class="space-y-4">
  <div class="alert alert-error">
    <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
    <div>
      <h3 class="font-bold">Cache Management</h3>
      <div class="text-sm">Clear stored data to resolve persistent issues and start fresh.</div>
    </div>
  </div>
  
  <div class="space-y-2">
    <div class="flex gap-2 mb-2">
      <button class="btn btn-sm" onclick={selectAll}>Select All</button>
      <button class="btn btn-sm" onclick={selectNone}>Select None</button>
    </div>
    
    {#each cacheItems as item}
      <label class="flex items-center space-x-3 p-3 bg-base-200 rounded-lg cursor-pointer hover:bg-base-300">
        <input 
          type="checkbox" 
          class="checkbox" 
          checked={selectedItems.has(item.name)}
          onchange={() => toggleItem(item.name)}
        />
        <div class="flex-1">
          <div class="font-medium">{item.name}</div>
          <div class="text-sm opacity-70">{item.description}</div>
        </div>
      </label>
    {/each}
  </div>
  
  <button 
    class="btn btn-error" 
    onclick={clearSelectedCaches}
    disabled={clearing || selectedItems.size === 0}
  >
    {clearing ? 'Clearing...' : `Clear Selected (${selectedItems.size})`}
  </button>
  
  {#if clearResults.length > 0}
    <div class="mockup-code text-sm">
      <pre><code>{#each clearResults as result}{result}
{/each}</code></pre>
    </div>
  {/if}
</div>
<script lang="ts">
  import { browser_ext } from '$lib/common/environment';
  import { tokenStore } from '$lib/stores/token.store';
  import { walletCacheStore } from '$lib/stores/wallet-cache.store';
  import { transactionStore } from '$lib/stores/transaction.store';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  
  let storageData: any = {
    tokens: null,
    transactions: null,
    walletCache: null,
    lastPriceUpdate: null
  };
  
  let storeData: any = {
    tokens: null,
    walletCache: null,
    transactions: null
  };
  
  let priceStatus: any = {
    lastUpdate: 'Never',
    minutesAgo: 'N/A',
    isUpdating: false
  };
  
  let showStorage = false;
  let showStores = false;
  let showPrices = false;
  
  // Auto-refresh
  let refreshInterval: NodeJS.Timeout | null = null;
  let autoRefresh = false;
  
  async function loadData() {
    try {
      // Get raw storage data
      const raw = await browser_ext.storage.local.get([
        'yakklTokenCache',
        'yakklTransactionsCache',
        'yakklWalletCache',
        'lastPriceUpdate'
      ]);
      
      storageData = {
        tokens: raw.yakklTokenCache || {},
        transactions: raw.yakklTransactionsCache || {},
        walletCache: raw.yakklWalletCache || {},
        lastPriceUpdate: raw.lastPriceUpdate || null
      };
      
      // Get store values
      storeData = {
        tokens: get(tokenStore),
        walletCache: get(walletCacheStore),
        transactions: get(transactionStore)
      };
      
      // Calculate price status
      if (storageData.lastPriceUpdate) {
        const lastUpdate = new Date(storageData.lastPriceUpdate);
        const minutesAgo = Math.round((Date.now() - storageData.lastPriceUpdate) / 60000);
        
        priceStatus = {
          lastUpdate: lastUpdate.toLocaleTimeString(),
          minutesAgo,
          isUpdating: minutesAgo < 0.25 // If updated in last 15 seconds, likely updating
        };
      }
      
      // Extract token price info
      extractTokenPrices();
    } catch (error) {
      console.error('Failed to load diagnostic data:', error);
    }
  }
  
  function extractTokenPrices() {
    const prices: any[] = [];
    
    if (storageData.walletCache?.chainAccountCache) {
      for (const [chainId, chainData] of Object.entries(storageData.walletCache.chainAccountCache)) {
        for (const [address, accountCache] of Object.entries(chainData as any)) {
          const cache = accountCache as any;
          if (cache.tokens) {
            for (const token of cache.tokens) {
              prices.push({
                chain: chainId,
                account: address.slice(0, 8) + '...',
                symbol: token.symbol,
                balance: token.balance,
                price: token.price || 0,
                value: token.value ? Number(BigInt(token.value)) / 100 : 0,
                lastUpdated: token.priceLastUpdated
              });
            }
          }
        }
      }
    }
    
    return prices;
  }
  
  async function triggerPriceUpdate() {
    priceStatus.isUpdating = true;
    
    try {
      await browser_ext.runtime.sendMessage({
        type: 'FORCE_PRICE_UPDATE'
      });
      
      // Wait a moment then reload data
      setTimeout(() => {
        loadData();
      }, 2000);
    } catch (error) {
      console.error('Failed to trigger price update:', error);
      priceStatus.isUpdating = false;
    }
  }
  
  async function triggerFullRefresh() {
    try {
      await browser_ext.runtime.sendMessage({
        type: 'YAKKL_REFRESH_REQUEST',
        refreshType: 'all'
      });
      
      // Wait then reload
      setTimeout(() => {
        loadData();
      }, 3000);
    } catch (error) {
      console.error('Failed to trigger full refresh:', error);
    }
  }
  
  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadData();
      }, 5000); // Refresh every 5 seconds
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }
  
  onMount(() => {
    loadData();
    
    // Listen for storage changes
    const listener = (changes: any, areaName: string) => {
      if (areaName === 'local') {
        loadData();
      }
    };
    
    browser_ext.storage.onChanged.addListener(listener);
    
    return () => {
      browser_ext.storage.onChanged.removeListener(listener);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });
  
  // Helper to format values
  function formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }
</script>

<div class="p-4 bg-base-200 rounded-lg space-y-4">
  <div class="flex justify-between items-center">
    <h3 class="text-lg font-bold">🔍 Data Inspector</h3>
    <div class="flex gap-2">
      <button 
        class="btn btn-xs {autoRefresh ? 'btn-warning' : 'btn-ghost'}"
        on:click={toggleAutoRefresh}
      >
        {autoRefresh ? '⏸ Stop' : '▶ Auto'} Refresh
      </button>
      <button class="btn btn-xs btn-primary" on:click={loadData}>
        🔄 Refresh
      </button>
    </div>
  </div>
  
  <!-- Price Status -->
  <div class="bg-base-300 p-3 rounded">
    <div class="flex justify-between items-center mb-2">
      <h4 class="font-semibold">💰 Price Status</h4>
      <div class="flex gap-2">
        <button 
          class="btn btn-xs btn-accent"
          on:click={triggerPriceUpdate}
          disabled={priceStatus.isUpdating}
        >
          {priceStatus.isUpdating ? '⏳ Updating...' : '🚀 Force Price Update'}
        </button>
        <button 
          class="btn btn-xs btn-secondary"
          on:click={triggerFullRefresh}
        >
          🔄 Full Refresh
        </button>
      </div>
    </div>
    
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span class="opacity-70">Last Update:</span>
        <span class="font-mono ml-2">{priceStatus.lastUpdate}</span>
      </div>
      <div>
        <span class="opacity-70">Minutes Ago:</span>
        <span class="font-mono ml-2 {priceStatus.minutesAgo > 5 ? 'text-warning' : 'text-success'}">
          {priceStatus.minutesAgo}
        </span>
      </div>
    </div>
    
    {#if priceStatus.isUpdating}
      <div class="text-xs text-info mt-2">⚡ Price update in progress...</div>
    {/if}
  </div>
  
  <!-- Token Prices -->
  <div class="bg-base-300 p-3 rounded">
    <button 
      class="w-full text-left font-semibold mb-2"
      on:click={() => showPrices = !showPrices}
    >
      {showPrices ? '▼' : '▶'} Token Prices & Values
    </button>
    
    {#if showPrices}
      <div class="overflow-x-auto">
        <table class="table table-xs">
          <thead>
            <tr>
              <th>Chain</th>
              <th>Symbol</th>
              <th>Balance</th>
              <th>Price</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {#each extractTokenPrices() as token}
              <tr>
                <td>{token.chain}</td>
                <td class="font-mono">{token.symbol}</td>
                <td class="text-right">{parseFloat(token.balance).toFixed(4)}</td>
                <td class="text-right ${token.price > 0 ? 'text-success' : 'text-error'}">
                  ${token.price.toFixed(2)}
                </td>
                <td class="text-right font-semibold">
                  ${token.value.toFixed(2)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
  
  <!-- Raw Storage Data -->
  <div class="bg-base-300 p-3 rounded">
    <button 
      class="w-full text-left font-semibold mb-2"
      on:click={() => showStorage = !showStorage}
    >
      {showStorage ? '▼' : '▶'} Raw Storage Data
    </button>
    
    {#if showStorage}
      <div class="space-y-2">
        {#each Object.entries(storageData) as [key, value]}
          <details class="collapse collapse-arrow bg-base-100">
            <summary class="collapse-title text-sm font-medium">
              {key} 
              <span class="text-xs opacity-70 ml-2">
                ({typeof value === 'object' ? Object.keys(value || {}).length + ' keys' : 'empty'})
              </span>
            </summary>
            <div class="collapse-content">
              <pre class="text-xs overflow-auto max-h-48 bg-base-200 p-2 rounded">
{formatValue(value)}
              </pre>
            </div>
          </details>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Store Data -->
  <div class="bg-base-300 p-3 rounded">
    <button 
      class="w-full text-left font-semibold mb-2"
      on:click={() => showStores = !showStores}
    >
      {showStores ? '▼' : '▶'} Svelte Store Data
    </button>
    
    {#if showStores}
      <div class="space-y-2">
        {#each Object.entries(storeData) as [key, value]}
          <details class="collapse collapse-arrow bg-base-100">
            <summary class="collapse-title text-sm font-medium">
              {key} Store
              <span class="text-xs opacity-70 ml-2">
                ({Array.isArray(value) ? value.length + ' items' : typeof value})
              </span>
            </summary>
            <div class="collapse-content">
              <pre class="text-xs overflow-auto max-h-48 bg-base-200 p-2 rounded">
{formatValue(value)}
              </pre>
            </div>
          </details>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Quick Stats -->
  <div class="bg-base-300 p-3 rounded text-xs">
    <div class="grid grid-cols-3 gap-2">
      <div>
        <span class="opacity-70">Total Tokens:</span>
        <span class="font-bold ml-1">
          {Object.values(storageData.walletCache?.chainAccountCache || {})
            .reduce((sum: number, chain: any) => 
              sum + Object.values(chain).reduce((s: number, a: any) => 
                s + (a.tokens?.length || 0), 0), 0)}
        </span>
      </div>
      <div>
        <span class="opacity-70">Chains:</span>
        <span class="font-bold ml-1">
          {Object.keys(storageData.walletCache?.chainAccountCache || {}).length}
        </span>
      </div>
      <div>
        <span class="opacity-70">Accounts:</span>
        <span class="font-bold ml-1">
          {Object.values(storageData.walletCache?.chainAccountCache || {})
            .reduce((sum: number, chain: any) => 
              sum + Object.keys(chain).length, 0)}
        </span>
      </div>
    </div>
  </div>
</div>

<style>
  /* Custom scrollbar for code blocks */
  pre::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }
  
  pre::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  
  pre::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
  }
  
  pre::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
  }
</style>
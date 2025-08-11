<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { browser_ext } from '$lib/common/environment';
  import { checkExtensionConnection, ConnectionState } from '$lib/common/extensionConnection';
  import { currentChain } from '$lib/stores/chain.store';
  import { connectionCheckLimiter } from '$lib/common/rateLimiter';
  
  interface ConnectionStatus {
    name: string;
    status: 'checking' | 'online' | 'degraded' | 'offline';
    latency?: number;
    error?: string;
  }
  
  let connections = $state<ConnectionStatus[]>([
    { name: 'Browser Extension', status: 'checking' },
    { name: 'Service Worker', status: 'checking' },
    { name: 'Background Script', status: 'checking' },
    { name: 'YAKKL API', status: 'checking' },
    { name: 'Primary RPC', status: 'checking' }
  ]);
  
  let checkInterval: number;
  
  async function checkAllConnections(skipRateLimit = false) {
    // Check rate limit (skip for automatic checks)
    if (!skipRateLimit && !connectionCheckLimiter.isAllowed('connection-check')) {
      const resetTime = connectionCheckLimiter.getResetTime('connection-check');
      const seconds = Math.ceil(resetTime / 1000);
      alert(`Rate limit reached. Please wait ${seconds} seconds before checking again.`);
      return;
    }
    
    // Check Browser Extension
    const extConnection = await checkExtensionConnection();
    connections[0] = {
      name: 'Browser Extension',
      status: extConnection === ConnectionState.CONNECTED ? 'online' : 
              extConnection === ConnectionState.DISCONNECTED ? 'offline' : 'degraded',
      error: extConnection === ConnectionState.INVALID_CONTEXT ? 'Invalid context' : undefined
    };
    
    // Check Service Worker
    if (browser_ext?.runtime) {
      const start = performance.now();
      try {
        await browser_ext.runtime.sendMessage({ type: 'PING' });
        connections[1] = {
          name: 'Service Worker',
          status: 'online',
          latency: Math.round(performance.now() - start)
        };
      } catch (err) {
        connections[1] = {
          name: 'Service Worker',
          status: 'offline',
          error: err instanceof Error ? err.message : 'Connection failed'
        };
      }
    }
    
    // Check Background Script
    try {
      const start = performance.now();
      // Simulate background script check
      connections[2] = {
        name: 'Background Script',
        status: browser_ext ? 'online' : 'offline',
        latency: browser_ext ? Math.round(performance.now() - start) : undefined
      };
    } catch (err) {
      connections[2] = {
        name: 'Background Script',
        status: 'offline',
        error: 'Not available'
      };
    }
    
    // Check YAKKL API
    try {
      const start = performance.now();
      const response = await fetch('https://api.yakkl.com/health', {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      connections[3] = {
        name: 'YAKKL API',
        status: response.ok ? 'online' : 'degraded',
        latency: Math.round(performance.now() - start)
      };
    } catch (err) {
      connections[3] = {
        name: 'YAKKL API',
        status: 'offline',
        error: err instanceof Error ? err.message : 'Connection failed'
      };
    }
    
    // Check Primary RPC
    try {
      const start = performance.now();
      const chain = get(currentChain);
      const rpcUrl = chain?.rpcUrl || 'https://eth-mainnet.yakkl.com';
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: AbortSignal.timeout(5000)
      });
      
      const latency = Math.round(performance.now() - start);
      connections[4] = {
        name: 'Primary RPC',
        status: response.ok && latency < 1000 ? 'online' : latency < 3000 ? 'degraded' : 'offline',
        latency
      };
    } catch (err) {
      connections[4] = {
        name: 'Primary RPC',
        status: 'offline',
        error: err instanceof Error ? err.message : 'RPC unreachable'
      };
    }
  }
  
  onMount(() => {
    checkAllConnections(true); // Skip rate limit for initial check
    checkInterval = window.setInterval(() => checkAllConnections(true), 10000); // Auto-checks skip rate limit
  });
  
  onDestroy(() => {
    if (checkInterval) clearInterval(checkInterval);
  });
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }
  
  function getStatusIcon(status: string): string {
    switch (status) {
      case 'online': return '✅';
      case 'degraded': return '⚠️';
      case 'offline': return '❌';
      default: return '⏳';
    }
  }
</script>

<div class="space-y-4">
  <!-- Info Card -->
  <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
    <div class="flex items-center gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-blue-600 dark:stroke-blue-400 shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="text-sm text-blue-800 dark:text-blue-200">Real-time connection status for all wallet services.</span>
    </div>
  </div>
  
  <!-- Connection Status Cards -->
  <div class="bg-base-100 dark:bg-gray-800 rounded-lg shadow-sm border border-base-300 dark:border-gray-700 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead class="bg-base-200 dark:bg-gray-700">
          <tr>
            <th class="text-sm font-semibold text-base-content dark:text-gray-200">Service</th>
            <th class="text-sm font-semibold text-base-content dark:text-gray-200">Status</th>
            <th class="text-sm font-semibold text-base-content dark:text-gray-200">Latency</th>
            <th class="text-sm font-semibold text-base-content dark:text-gray-200">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-base-300 dark:divide-gray-700">
        {#each connections as conn}
          <tr class="hover:bg-base-200/50 dark:hover:bg-gray-700/50 transition-colors">
            <td class="font-medium text-base-content dark:text-gray-200">{conn.name}</td>
            <td>
              <span class="{getStatusColor(conn.status)} flex items-center gap-2">
                {getStatusIcon(conn.status)}
                {conn.status}
              </span>
            </td>
            <td>
              {#if conn.latency}
                <span class="font-mono">{conn.latency}ms</span>
              {:else}
                -
              {/if}
            </td>
            <td>
              {#if conn.error}
                <span class="text-sm text-red-500">{conn.error}</span>
              {:else if conn.status === 'online'}
                <span class="text-sm text-green-500">Connected</span>
              {:else}
                <span class="text-sm text-gray-500">-</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    </div>
  </div>
</div>

<!-- Component Footer -->
<div class="flex justify-start mt-6 pt-4 border-t border-base-300 dark:border-gray-700">
  <button 
    class="btn btn-sm btn-primary shadow-sm hover:shadow-md transition-all duration-200" 
    onclick={() => checkAllConnections(false)}
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
    Refresh Status
  </button>
</div>
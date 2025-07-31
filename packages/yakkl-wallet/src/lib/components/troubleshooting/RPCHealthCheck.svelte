<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { currentChain } from '$lib/stores/chain.store';
  import { rpcHealthLimiter } from '$lib/common/rateLimiter';
  
  interface RPCNode {
    name: string;
    url: string;
    chainId: number;
    status: 'checking' | 'healthy' | 'slow' | 'dead';
    responseTime?: number;
    blockNumber?: number;
    error?: string;
  }
  
  let rpcNodes = $state<RPCNode[]>([]);
  let testing = $state(false);
  let currentRPC = $state('');
  
  const DEFAULT_RPCS = {
    1: [
      { name: 'YAKKL Primary', url: 'https://eth-mainnet.yakkl.com' },
      { name: 'Ankr Public', url: 'https://rpc.ankr.com/eth' },
      { name: 'LlamaRPC', url: 'https://eth.llamarpc.com' },
      { name: 'PublicNode', url: 'https://ethereum.publicnode.com' }
    ],
    137: [
      { name: 'YAKKL Polygon', url: 'https://polygon-mainnet.yakkl.com' },
      { name: 'Polygon Official', url: 'https://polygon-rpc.com' },
      { name: 'Ankr Polygon', url: 'https://rpc.ankr.com/polygon' },
      { name: 'PublicNode Polygon', url: 'https://polygon-bor-rpc.publicnode.com' }
    ],
    42161: [
      { name: 'YAKKL Arbitrum', url: 'https://arbitrum-mainnet.yakkl.com' },
      { name: 'Arbitrum Official', url: 'https://arb1.arbitrum.io/rpc' },
      { name: 'Ankr Arbitrum', url: 'https://rpc.ankr.com/arbitrum' },
      { name: 'PublicNode Arbitrum', url: 'https://arbitrum-one.publicnode.com' }
    ]
  };
  
  async function testRPCNode(node: RPCNode): Promise<void> {
    const start = performance.now();
    
    try {
      const response = await fetch(node.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }),
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const responseTime = Math.round(performance.now() - start);
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      node.responseTime = responseTime;
      node.blockNumber = parseInt(data.result, 16);
      
      if (responseTime < 500) {
        node.status = 'healthy';
      } else if (responseTime < 2000) {
        node.status = 'slow';
      } else {
        node.status = 'dead';
      }
      
    } catch (err) {
      node.status = 'dead';
      node.error = err instanceof Error ? err.message : 'Unknown error';
      node.responseTime = Math.round(performance.now() - start);
    }
  }
  
  async function testAllRPCs() {
    // Check rate limit
    if (!rpcHealthLimiter.isAllowed('rpc-health-check')) {
      const resetTime = rpcHealthLimiter.getResetTime('rpc-health-check');
      const seconds = Math.ceil(resetTime / 1000);
      alert(`Rate limit reached. Please wait ${seconds} seconds before testing again.`);
      return;
    }
    
    testing = true;
    
    const network = get(currentChain);
    const chainId = network?.chainId || 1;
    const rpcs = DEFAULT_RPCS[chainId as keyof typeof DEFAULT_RPCS] || DEFAULT_RPCS[1];
    
    rpcNodes = rpcs.map(rpc => ({
      ...rpc,
      chainId,
      status: 'checking' as const
    }));
    
    // Test all RPCs in parallel
    await Promise.all(rpcNodes.map(node => testRPCNode(node)));
    
    // Sort by response time
    rpcNodes.sort((a, b) => (a.responseTime || 9999) - (b.responseTime || 9999));
    
    testing = false;
  }
  
  function switchToRPC(node: RPCNode) {
    if (node.status === 'dead') {
      alert('Cannot switch to a dead RPC node');
      return;
    }
    
    // In real implementation, update the network store
    currentRPC = node.url;
    alert(`Switched to ${node.name}\n\nNote: This is a mock. Real implementation would update network settings.`);
  }
  
  onMount(() => {
    testAllRPCs();
  });
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'badge-success';
      case 'slow': return 'badge-warning';
      case 'dead': return 'badge-error';
      default: return 'badge-ghost';
    }
  }
</script>

<div class="space-y-4">
  <!-- Info Card -->
  <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
    <div class="flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-amber-600 dark:stroke-amber-400 shrink-0 w-6 h-6 mt-0.5">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
      </svg>
      <div>
        <h3 class="font-bold text-amber-800 dark:text-amber-200">RPC Node Health</h3>
        <div class="text-sm text-amber-700 dark:text-amber-300">Test and switch between RPC endpoints for optimal performance.</div>
      </div>
    </div>
  </div>
  
  {#if testing}
    <div class="flex items-center gap-2 text-base-content dark:text-gray-200">
      <span class="loading loading-spinner loading-sm"></span>
      <span>Testing RPC nodes...</span>
    </div>
  {:else if rpcNodes.length > 0}
    <div class="space-y-3">
      {#each rpcNodes as node}
        <div class="bg-base-100 dark:bg-gray-800 rounded-lg shadow-sm border border-base-300 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div class="p-4">
            <div class="flex flex-col gap-3">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-base-content dark:text-gray-200">{node.name}</h4>
                  <p class="text-xs text-base-content/60 dark:text-gray-400 font-mono break-all mt-1">{node.url}</p>
                  {#if node.error}
                    <p class="text-xs text-error dark:text-red-400 mt-2">{node.error}</p>
                  {/if}
                </div>
              
                <div class="flex items-center gap-3 flex-shrink-0">
                  <div class="text-right">
                    {#if node.responseTime !== undefined}
                      <p class="font-mono text-sm text-base-content dark:text-gray-200">{node.responseTime}ms</p>
                    {/if}
                    {#if node.blockNumber}
                      <p class="text-xs text-base-content/60 dark:text-gray-400">Block #{node.blockNumber.toLocaleString()}</p>
                    {/if}
                  </div>
                  
                  <div class="badge {getStatusColor(node.status)}">
                    {node.status}
                  </div>
                  
                  <button 
                    class="btn btn-sm {node.status === 'healthy' ? 'btn-primary shadow-sm' : 'btn-ghost'} transition-all duration-200"
                    onclick={() => switchToRPC(node)}
                    disabled={node.status === 'dead'}
                  >
                    {node.status === 'healthy' ? 'Use This' : 'Unavailable'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  
</div>

<!-- Component Footer -->
<div class="flex justify-start mt-6 pt-4 border-t border-base-300 dark:border-gray-700">
  <button 
    class="btn btn-primary shadow-sm hover:shadow-md transition-all duration-200" 
    onclick={testAllRPCs} 
    disabled={testing}
  >
    {#if testing}
      <span class="loading loading-spinner loading-sm mr-2"></span>
      Testing...
    {:else}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 mr-2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-3.285.557a1.156 1.156 0 01-1.311-.926l-.557-3.286c-.293-1.716 1.379-2.299 3.611-1.067L19.8 15.3z" />
      </svg>
      Test All RPCs
    {/if}
  </button>
</div>
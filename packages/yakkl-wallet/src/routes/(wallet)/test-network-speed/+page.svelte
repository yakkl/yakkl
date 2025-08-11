<script lang="ts">
  import { onMount } from 'svelte';
  import { testNetworkSpeed, clearNetworkSpeedCache, type NetworkSpeedResult } from '$lib/common/networkSpeed';
  
  let speedResult: NetworkSpeedResult | null = $state(null);
  let testing = $state(false);
  let error: string | null = $state(null);
  
  async function runSpeedTest() {
    testing = true;
    error = null;
    speedResult = null;
    
    try {
      clearNetworkSpeedCache(); // Force fresh test
      speedResult = await testNetworkSpeed();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Speed test failed:', err);
    } finally {
      testing = false;
    }
  }
  
  onMount(() => {
    runSpeedTest();
  });
</script>

<div class="container mx-auto p-8 max-w-2xl">
  <h1 class="text-2xl font-bold mb-6">Network Speed Test</h1>
  
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      {#if testing}
        <div class="flex items-center gap-4">
          <span class="loading loading-spinner loading-md"></span>
          <p>Testing network speed...</p>
        </div>
      {:else if error}
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      {:else if speedResult}
        <div class="space-y-4">
          <div class="stat-group">
            <div class="stat">
              <div class="stat-title">Latency</div>
              <div class="stat-value text-primary">{speedResult.latency}ms</div>
            </div>
            
            <div class="stat">
              <div class="stat-title">Download Speed</div>
              <div class="stat-value text-secondary">{speedResult.downloadSpeed} Mbps</div>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="font-semibold">Connection Quality:</span>
              <span class="badge badge-{speedResult.connectionQuality === 'excellent' ? 'success' : 
                                      speedResult.connectionQuality === 'good' ? 'info' : 
                                      speedResult.connectionQuality === 'fair' ? 'warning' : 'error'} 
                                      badge-lg">{speedResult.connectionQuality}</span>
            </div>
            
            <div class="flex justify-between">
              <span class="font-semibold">Recommended Timeout:</span>
              <span class="font-mono">{speedResult.recommendedTimeout}ms</span>
            </div>
          </div>
          
          <div class="alert alert-info mt-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="text-sm">Based on your connection speed, message timeouts will be automatically adjusted.</p>
              <p class="text-sm mt-1">Critical operations like transactions will have extended timeouts.</p>
            </div>
          </div>
        </div>
      {/if}
      
      <div class="card-actions justify-end mt-6">
        <button class="btn btn-primary" onclick={runSpeedTest} disabled={testing}>
          {testing ? 'Testing...' : 'Run Test Again'}
        </button>
      </div>
    </div>
  </div>
</div>
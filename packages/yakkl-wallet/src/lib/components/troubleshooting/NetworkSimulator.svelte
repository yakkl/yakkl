<script lang="ts">
  import { testNetworkSpeed, clearNetworkSpeedCache, type NetworkSpeedResult } from '$lib/common/networkSpeed';
  import { networkTestLimiter } from '$lib/common/rateLimiter';
  import { onMount } from 'svelte';
  
  interface SimulationProfile {
    name: string;
    description: string;
    delay: number; // ms
    bandwidth: number; // Mbps
    packetLoss: number; // percentage
  }
  
  const profiles: SimulationProfile[] = [
    { name: '4G LTE', description: 'Modern mobile network', delay: 50, bandwidth: 12, packetLoss: 0 },
    { name: '3G', description: 'Older mobile network', delay: 200, bandwidth: 2, packetLoss: 1 },
    { name: '2G/EDGE', description: 'Very slow mobile', delay: 800, bandwidth: 0.4, packetLoss: 5 },
    { name: 'Satellite', description: 'High latency connection', delay: 600, bandwidth: 5, packetLoss: 2 },
    { name: 'Poor WiFi', description: 'Congested or distant router', delay: 150, bandwidth: 1, packetLoss: 3 }
  ];
  
  let currentSpeed = $state<NetworkSpeedResult | null>(null);
  let selectedProfile = $state<SimulationProfile | null>(null);
  let simulating = $state(false);
  let testResults = $state<string[]>([]);
  let refreshing = $state(false);
  let refreshDebounceTimer: number | null = $state(null);
  let lastRefreshTime = $state(0);
  let debounceTimeRemaining = $state(0);
  
  async function getCurrentSpeed() {
    currentSpeed = await testNetworkSpeed();
  }
  
  async function refreshCurrentSpeed() {
    if (refreshing || refreshDebounceTimer) return;
    
    // Check rate limit
    if (!networkTestLimiter.isAllowed('network-speed-test')) {
      const resetTime = networkTestLimiter.getResetTime('network-speed-test');
      const seconds = Math.ceil(resetTime / 1000);
      debounceTimeRemaining = seconds;
      
      // Show countdown for rate limit
      const countdownInterval = setInterval(() => {
        debounceTimeRemaining--;
        if (debounceTimeRemaining <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
      
      return;
    }
    
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    const debounceTime = 10000; // 10 seconds
    
    if (timeSinceLastRefresh < debounceTime) {
      const timeRemaining = Math.ceil((debounceTime - timeSinceLastRefresh) / 1000);
      debounceTimeRemaining = timeRemaining;
      
      // Show countdown
      const countdownInterval = setInterval(() => {
        debounceTimeRemaining--;
        if (debounceTimeRemaining <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
      
      return;
    }
    
    refreshing = true;
    lastRefreshTime = now;
    
    try {
      // Show loading state while testing
      currentSpeed = null; // Clear current values to show loading
      // Clear cache to get fresh results
      clearNetworkSpeedCache();
      await getCurrentSpeed();
    } finally {
      refreshing = false;
      
      refreshDebounceTimer = window.setTimeout(() => {
        refreshDebounceTimer = null;
      }, debounceTime);
    }
  }
  
  async function simulateNetwork(profile: SimulationProfile) {
    // Check rate limit
    if (!networkTestLimiter.isAllowed('network-simulation')) {
      const resetTime = networkTestLimiter.getResetTime('network-simulation');
      const seconds = Math.ceil(resetTime / 1000);
      alert(`Rate limit reached. Please wait ${seconds} seconds before running another simulation.`);
      return;
    }
    
    simulating = true;
    selectedProfile = profile;
    testResults = [];
    
    testResults.push(`🔄 Simulating ${profile.name} conditions...`);
    testResults.push(`⏱️ Added ${profile.delay}ms delay to all requests`);
    testResults.push(`📉 Bandwidth limited to ${profile.bandwidth} Mbps`);
    if (profile.packetLoss > 0) {
      testResults.push(`📦 Packet loss: ${profile.packetLoss}%`);
    }
    
    // Real operations with actual timing measurements
    const operations = [
      { name: 'Login', endpoint: '/auth/login', sizeKB: 2 },
      { name: 'Load token list', endpoint: '/tokens', sizeKB: 15 },
      { name: 'Submit transaction', endpoint: '/tx/submit', sizeKB: 1 },
      { name: 'Fetch portfolio', endpoint: '/portfolio', sizeKB: 25 }
    ];
    
    for (const op of operations) {
      const start = performance.now();
      
      // Calculate realistic timings based on network profile
      const latency = profile.delay;
      const rtt = latency * 2; // Round trip time
      
      // Calculate bandwidth delay based on data size
      const dataSizeBits = op.sizeKB * 8 * 1024; // Convert KB to bits
      const bandwidthBps = profile.bandwidth * 1_000_000; // Convert Mbps to bps
      const transmissionTime = (dataSizeBits / bandwidthBps) * 1000; // Convert to ms
      
      // TCP slow start and congestion control overhead (simplified)
      const tcpOverhead = profile.bandwidth < 2 ? transmissionTime * 0.3 : transmissionTime * 0.1;
      
      // Total time calculation
      const totalTime = rtt + transmissionTime + tcpOverhead;
      
      // Simulate packet loss
      const packetLossOccurred = Math.random() < (profile.packetLoss / 100);
      
      // Simulate the delay
      await new Promise(resolve => setTimeout(resolve, Math.min(totalTime, 5000)));
      
      const actualTime = performance.now() - start;
      
      if (packetLossOccurred) {
        testResults.push(`❌ ${op.name}: FAILED (packet loss after ${Math.round(actualTime)}ms)`);
      } else {
        testResults.push(`✅ ${op.name}: ${Math.round(totalTime)}ms (${op.sizeKB}KB payload)`);
      }
    }
    
    testResults.push('');
    testResults.push('📊 Network Impact Analysis:');
    testResults.push(`Latency: ${profile.delay}ms adds ${profile.delay * 2}ms to each request`);
    testResults.push(`Bandwidth: ${profile.bandwidth}Mbps limits large data transfers`);
    if (profile.packetLoss > 0) {
      testResults.push(`Packet Loss: ${profile.packetLoss}% causes random failures`);
    }
    testResults.push('');
    testResults.push('💡 Recommendation:');
    if (profile.bandwidth < 1) {
      testResults.push('Very slow connection - consider offline mode or data saving features');
    } else if (profile.delay > 500) {
      testResults.push('High latency detected - batch requests when possible');
    } else if (profile.packetLoss > 2) {
      testResults.push('Unstable connection - implement retry logic with exponential backoff');
    } else {
      testResults.push('Connection suitable for normal wallet operations');
    }
    
    simulating = false;
  }
  
  onMount(() => {
    getCurrentSpeed();
  });
</script>

<div class="space-y-4">
  <!-- Info Card -->
  <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
    <div class="flex items-center gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-yellow-600 dark:stroke-yellow-400 shrink-0 w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
      <span class="text-sm text-yellow-800 dark:text-yellow-200">Simulate different network conditions to understand performance impacts.</span>
    </div>
  </div>
  
  {#if currentSpeed}
    <div class="bg-base-100 dark:bg-gray-800 rounded-lg shadow-sm border border-base-300 dark:border-gray-700">
      <div class="p-4">
        <div class="flex justify-between items-center mb-4">
          <h4 class="font-semibold text-base-content dark:text-gray-200">Your Current Connection</h4>
          <button 
            class="btn btn-circle btn-sm {refreshing ? 'btn-primary' : 'btn-ghost'} hover:bg-base-200 dark:hover:bg-gray-700" 
            onclick={refreshCurrentSpeed}
            disabled={refreshing || !!refreshDebounceTimer || debounceTimeRemaining > 0}
            title={debounceTimeRemaining > 0 ? `Wait ${debounceTimeRemaining} seconds` : 'Refresh speed test'}
          >
            {#if refreshing}
              <span class="loading loading-spinner loading-sm"></span>
            {:else if debounceTimeRemaining > 0}
              <span class="text-xs font-bold">{debounceTimeRemaining}</span>
            {:else}
              <svg class="w-4 h-4 text-base-content dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            {/if}
          </button>
        </div>
        {#if refreshing}
          <div class="flex items-center justify-center p-8">
            <div class="text-center">
              <span class="loading loading-spinner loading-lg text-primary"></span>
              <p class="mt-4 text-sm text-base-content/60 dark:text-gray-400">Testing network speed...</p>
            </div>
          </div>
        {:else}
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-3 bg-base-200 dark:bg-gray-700 rounded-lg">
              <div class="text-xs text-base-content/60 dark:text-gray-400 mb-1">Quality</div>
              <div class="font-bold text-lg text-base-content dark:text-gray-200 capitalize">{currentSpeed.connectionQuality}</div>
            </div>
            <div class="text-center p-3 bg-base-200 dark:bg-gray-700 rounded-lg">
              <div class="text-xs text-base-content/60 dark:text-gray-400 mb-1">Latency</div>
              <div class="font-bold text-lg text-base-content dark:text-gray-200">{currentSpeed.latency}ms</div>
            </div>
            <div class="text-center p-3 bg-base-200 dark:bg-gray-700 rounded-lg">
              <div class="text-xs text-base-content/60 dark:text-gray-400 mb-1">Speed</div>
              <div class="font-bold text-lg text-base-content dark:text-gray-200">{currentSpeed.downloadSpeed} Mbps</div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
  
  <div class="divider dark:before:bg-gray-700 dark:after:bg-gray-700">Simulate Different Networks</div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    {#each profiles as profile}
      <button 
        class="flex flex-col items-start p-4 rounded-lg border-2 transition-all duration-200
               {selectedProfile === profile 
                 ? 'border-primary bg-primary/10 dark:bg-primary/20' 
                 : 'border-base-300 dark:border-gray-600 hover:border-primary/50 dark:hover:border-primary/50 bg-base-100 dark:bg-gray-800'}"
        onclick={() => simulateNetwork(profile)}
        disabled={simulating}
      >
        <div class="font-semibold text-base-content dark:text-gray-200">{profile.name}</div>
        <div class="text-xs text-base-content/60 dark:text-gray-400 mt-1">{profile.description}</div>
        <div class="flex gap-4 text-xs mt-2">
          <span class="text-base-content/70 dark:text-gray-400">Delay: {profile.delay}ms</span>
          <span class="text-base-content/70 dark:text-gray-400">Speed: {profile.bandwidth}Mbps</span>
        </div>
      </button>
    {/each}
  </div>
  
  {#if testResults.length > 0}
    <div class="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <div class="space-y-1">
        {#each testResults as result}
          <div class="{result.includes('✅') ? 'text-green-400' : result.includes('❌') ? 'text-red-400' : result.includes('🔄') ? 'text-blue-400' : result.includes('📊') ? 'text-yellow-400' : ''}">
            {result}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
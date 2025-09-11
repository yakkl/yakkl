<script lang="ts">
  import { onMount } from 'svelte';
  import { torDetector, type TORDetectionResult } from '$lib/services/tor-detector.service';
  import { log } from '$lib/common/logger-wrapper';
  
  let showBlocker = $state(false);
  let detectionResult = $state<TORDetectionResult | null>(null);
  let isChecking = $state(true);
  
  onMount(async () => {
    try {
      // Check for TOR on mount
      const result = await torDetector.detectTOR();
      detectionResult = result;
      
      if (result.isTOR) {
        showBlocker = true;
        log.warn('TOR detected - blocking wallet operation');
      }
      
      isChecking = false;
    } catch (error) {
      log.error('Error checking TOR status:', false, error);
      isChecking = false;
    }
  });
  
  function closeWallet() {
    // Close the extension window
    if (typeof window !== 'undefined') {
      window.close();
    }
  }
</script>

{#if showBlocker && detectionResult}
  <!-- Full screen blocking modal -->
  <div class="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="max-w-lg w-full bg-base-100 rounded-2xl shadow-2xl border border-red-500/50 overflow-hidden">
      <!-- Header with warning icon -->
      <div class="bg-red-500/10 border-b border-red-500/20 p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-bold text-base-content">TOR Connection Detected</h2>
            <p class="text-sm text-base-content/60 mt-1">
              Detection confidence: <span class="capitalize font-medium text-red-500">{detectionResult.confidence}</span>
            </p>
          </div>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-6 space-y-4">
        <div class="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <h3 class="font-semibold text-warning mb-2 flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Why YAKKL Wallet Cannot Work Over TOR
          </h3>
          <ul class="space-y-2 text-sm text-base-content/80">
            <li class="flex items-start gap-2">
              <span class="text-red-500 mt-0.5">×</span>
              <span>Blockchain RPC providers block TOR exit nodes for security</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-500 mt-0.5">×</span>
              <span>Transaction broadcasting will fail or timeout</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-500 mt-0.5">×</span>
              <span>Extreme latency (>2s) breaks DeFi and DEX interactions</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-500 mt-0.5">×</span>
              <span>Real-time price feeds and market data unavailable</span>
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-500 mt-0.5">×</span>
              <span>Smart contract interactions will timeout or fail</span>
            </li>
          </ul>
        </div>
        
        <!-- Detection details -->
        {#if detectionResult.detectionMethod.length > 0}
          <div class="text-xs text-base-content/40">
            <details class="cursor-pointer">
              <summary class="hover:text-base-content/60">Technical Details</summary>
              <div class="mt-2 p-2 bg-base-200 rounded">
                <p class="mb-1">Detection methods used:</p>
                <ul class="list-disc list-inside">
                  {#each detectionResult.detectionMethod as method}
                    <li>{method}</li>
                  {/each}
                </ul>
              </div>
            </details>
          </div>
        {/if}
        
        <!-- Recommendation -->
        <div class="bg-info/10 border border-info/20 rounded-lg p-4">
          <h3 class="font-semibold text-info mb-2">Recommended Solution</h3>
          <p class="text-sm text-base-content/80">
            Please disconnect from TOR and use a standard internet connection to access YAKKL Wallet. 
            For enhanced privacy while trading, we recommend using a reputable VPN service instead of TOR.
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-6 bg-base-200/50 border-t border-base-300">
        <button
          onclick={closeWallet}
          class="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
        >
          Close YAKKL Wallet
        </button>
        <p class="text-xs text-center text-base-content/40 mt-3">
          The wallet will automatically close to protect your assets
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure the blocker is always on top */
  :global(.tor-blocker) {
    z-index: 99999 !important;
  }
</style>
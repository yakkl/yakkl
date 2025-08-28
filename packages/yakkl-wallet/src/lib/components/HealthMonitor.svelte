<script lang="ts">
  import { healthStore, healthColor, type SystemHealth } from '$lib/stores/health-monitor.store';
  import { onMount, onDestroy } from 'svelte';
  
  interface Props {
    className?: string;
  }
  
  let { className = '' }: Props = $props();
  
  let health = $state<SystemHealth | null>(null);
  let showDetails = $state(false);
  let color = $state('text-gray-500');
  
  // Subscribe to stores
  let unsubHealth: (() => void) | null = null;
  let unsubColor: (() => void) | null = null;
  
  onMount(() => {
    // Subscribe to health data
    unsubHealth = healthStore.subscribe(value => {
      health = value;
    });
    
    // Subscribe to color
    unsubColor = healthColor.subscribe(value => {
      color = value;
    });
    
    // Force initial update
    healthStore.forceUpdate();
  });
  
  onDestroy(() => {
    unsubHealth?.();
    unsubColor?.();
  });
  
  function toggleDetails() {
    showDetails = !showDetails;
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      case 'disabled':
        return 'text-gray-400';
      default:
        return 'text-gray-500';
    }
  }
  
  function getStatusBadge(status: string): string {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'disabled':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-500';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-500';
    }
  }
</script>

<!-- Health Monitor Icon Button -->
<div class="relative {className}">
  <button
    onclick={toggleDetails}
    class="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-base-200 transition-colors"
    title="Network Health Monitor"
  >
    <!-- Stethoscope Icon with status color -->
    <svg 
      class="w-4 h-4 {color}" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- Stethoscope shape -->
      <path d="M2 12v5a2 2 0 0 0 2 2h5" />
      <path d="M9 18h6a2 2 0 0 0 2-2v-5" />
      <circle cx="20" cy="10" r="2" />
      <path d="M18 10V3a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v7" />
      <path d="M5 10h14" />
      
      <!-- Status indicator dot -->
      {#if health?.overall === 'healthy'}
        <circle cx="20" cy="10" r="1.5" fill="currentColor" class="animate-pulse" />
      {:else if health?.overall === 'degraded'}
        <circle cx="20" cy="10" r="1.5" fill="currentColor" class="animate-pulse" />
      {:else if health?.overall === 'critical'}
        <circle cx="20" cy="10" r="1.5" fill="currentColor" class="animate-ping" />
      {/if}
    </svg>
    
    <!-- Status text (hidden on small screens) -->
    <span class="hidden sm:inline text-xs {color} font-medium capitalize">
      {health?.overall || 'checking'}
    </span>
  </button>
  
  <!-- Health Details Popup -->
  {#if showDetails && health}
    <div class="absolute bottom-full right-0 mb-2 w-80 bg-base-100 border border-base-300 rounded-lg shadow-xl z-50">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-base-300">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold">Network Health Monitor</h3>
          <button
            onclick={() => showDetails = false}
            class="text-base-content/60 hover:text-base-content"
            aria-label="Close network health monitor"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="mt-1 flex items-center gap-2">
          <span class="text-xs text-base-content/60">Overall Status:</span>
          <span class="px-2 py-0.5 rounded-full text-xs font-medium {getStatusBadge(health.overall)}">
            {health.overall}
          </span>
        </div>
      </div>
      
      <!-- Provider List -->
      <div class="p-4 space-y-2 max-h-64 overflow-y-auto">
        {#each health.providers as provider}
          <div class="flex items-center justify-between p-2 rounded-lg bg-base-200/50">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full {getStatusColor(provider.status)} 
                {provider.status === 'healthy' ? 'animate-pulse' : ''}"
              ></div>
              <span class="text-sm font-medium capitalize">
                {provider.provider}
                {#if health.activeProvider === provider.provider}
                  <span class="ml-1 text-xs text-primary">(active)</span>
                {/if}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-base-content/60">
              {#if provider.status !== 'disabled'}
                <span>{provider.successRate.toFixed(0)}% success</span>
                {#if provider.responseTime > 0}
                  <span>{provider.responseTime.toFixed(0)}ms</span>
                {/if}
                {#if provider.failureCount > 0}
                  <span class="text-warning">{provider.failureCount} fails</span>
                {/if}
              {:else}
                <span>Disabled</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Footer Stats -->
      <div class="px-4 py-2 border-t border-base-300 bg-base-200/30">
        <div class="flex justify-between text-xs text-base-content/60">
          <span>Total Requests: {health.totalRequests}</span>
          <span>Avg Response: {health.avgResponseTime.toFixed(0)}ms</span>
        </div>
        <div class="mt-1 text-xs text-base-content/40">
          Last updated: {new Date(health.lastUpdate).toLocaleTimeString()}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Ensure popup stays above other content */
  .relative {
    position: relative;
  }
</style>
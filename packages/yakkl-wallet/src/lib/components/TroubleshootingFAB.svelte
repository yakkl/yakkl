<script lang="ts">
  import { onMount } from 'svelte';
  import TroubleshootingModal from './TroubleshootingModal.svelte';
  import SimpleTooltip from './SimpleTooltip.svelte';

  let showModal = $state(false);
  let connectionStatus: 'online' | 'degraded' | 'offline' = $state('online');
  let pulseAnimation = $state(false);

  // Monitor connection status
  onMount(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('https://api.yakkl.com', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        }).catch(() =>
          // Fallback check
          fetch('https://www.gstatic.com/generate_204', {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          })
        );

        connectionStatus = 'online';
      } catch (error) {
        connectionStatus = 'offline';
        pulseAnimation = true;
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    // Also check on online/offline events
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', () => {
      connectionStatus = 'offline';
      pulseAnimation = true;
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  });

  function openTroubleshooting() {
    showModal = true;
    pulseAnimation = false;
  }
</script>

<!-- FAB in footer area, more visible -->
<div class="fixed bottom-2 right-6 z-50">
  <!-- Connection status indicator -->
  <div class="absolute -top-1 -right-1">
    <span class="flex h-3 w-3">
      {#if connectionStatus === 'offline' && pulseAnimation}
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
      {/if}
      <span class="relative inline-flex rounded-full h-3 w-3 bg-{connectionStatus === 'online' ? 'green' : connectionStatus === 'degraded' ? 'yellow' : 'red'}-500"></span>
    </span>
  </div>

  <!-- FAB Button - more visible -->
  <SimpleTooltip 
    content="Network Analysis & Diagnostics - Check connection status, test network speed, and troubleshoot issues"
    position="left"
  >
    <button
      onclick={openTroubleshooting}
      class="btn btn-circle btn-xs shadow-md hover:shadow-lg transition-all duration-200 opacity-70 hover:opacity-900 {connectionStatus === 'offline' ? 'btn-error' : 'btn-primary'}"
      aria-label="Open network diagnostics"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12 18.75a.75.75 0 01.75-.75v0a.75.75 0 01.75.75v0a.75.75 0 01-.75.75v0a.75.75 0 01-.75-.75v0z" />
      </svg>
    </button>
  </SimpleTooltip>
</div>

<!-- Modal -->
{#if showModal}
  <TroubleshootingModal bind:show={showModal} />
{/if}

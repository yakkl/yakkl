<!-- Unified dapp side panel component -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { log } from '$lib/plugins/Logger';
  import { browser } from '$app/environment';

  let currentView: string = '';
  let requestId: string = '';
  let method: string = '';
  let loading: boolean = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DynamicComponent = any;

  onMount(() => {
    if (browser) {
      // Get URL parameters
      const params = new URLSearchParams(window.location.search);
      requestId = params.get('requestId') || '';
      method = params.get('method') || '';

      // Set the appropriate view based on the method
      currentView = getViewForMethod(method);
      loading = false;

      // Listen for content updates
      window.addEventListener('message', handleMessage);
    }
  });

  function getViewForMethod(method: string): string {
    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return 'accounts';
      case 'eth_sendTransaction':
        return 'transactions';
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData_v3':
      case 'personal_sign':
        return 'sign';
      case 'wallet_addEthereumChain':
      case 'wallet_switchEthereumChain':
        return 'network';
      default:
        return 'approve';
    }
  }

  function handleMessage(event: MessageEvent) {
    if (event.data.type === 'UPDATE_CONTENT') {
      const params = new URLSearchParams(new URL(event.data.url).search);
      log.info('handleMessage - 54 (DappSidePanel):', false, { params });
      requestId = params.get('requestId') || requestId;
      method = params.get('method') || method;
      currentView = getViewForMethod(method);
      log.debug('Side panel content updated:', false, { requestId, method, currentView });
    }
  }

  async function loadComponent(view: string): Promise<{ default: DynamicComponent }> {
    switch (view) {
      case 'accounts':
        log.info('Loading accounts page:', false, view);
        return import('../../routes/(app)/dapp/popups/accounts/+page.svelte');
      case 'transactions':
        log.info('Loading transactions page:', false, view);
        return import('../../routes/(app)/dapp/popups/transactions/+page.svelte');
      case 'sign':
        log.info('Loading sign page:', false, view);
        return import('../../routes/(app)/dapp/popups/sign/+page.svelte');
      default:
        log.info('Loading approve page:', false, view);
        return import('../../routes/(app)/dapp/popups/approve/+page.svelte');
    }
  }

  $: componentPromise = loadComponent(currentView);
</script>

<div class="flex flex-col h-screen bg-base-100">
  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center h-full">
      <div class="loading loading-spinner text-primary"></div>
    </div>
  {:else}
    <!-- Dynamic Content -->
    <div class="flex-1">
      {#await componentPromise}
        <div class="flex items-center justify-center h-full">
          <div class="loading loading-spinner text-primary"></div>
        </div>
      {:then module}
        <svelte:component this={module.default} {requestId} {method} />
      {:catch error}
        <div class="p-4 text-error">Failed to load component: {error.message}</div>
      {/await}
    </div>
  {/if}
</div>

<style>
  /* Ensure the side panel takes full height */
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  /* Custom scrollbar styling */
  :global(::-webkit-scrollbar) {
    width: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(::-webkit-scrollbar-thumb) {
    background-color: hsl(var(--p));
    border-radius: 3px;
  }

  /* Smooth transitions */
  :global(.flex-1) {
    transition: all 0.2s ease;
  }
</style>

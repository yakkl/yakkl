<script lang="ts">
  import { browserSvelte } from '$lib/common/environment';
  import { page } from '$app/state';
  import { safeNavigate } from '$lib/common/safeNavigate';
  import { onMount } from 'svelte';
  import { log } from '$lib/common/logger-wrapper';
  import { getYakklSettings } from '$lib/common/stores';
  import Failed from '$lib/components/Failed.svelte';

  let loading = $state(true);
  let showFailure = $state(false);
  let errorValue = $state('');

  onMount(async () => {
    if (!browserSvelte) return;

    try {
      // Check if wallet is initialized
      const settings = await getYakklSettings();
      if (!settings.init || !settings.legal.termsAgreed) {
        errorValue = "You must register and agree to the terms of service before using YAKKL®. Click on 'Open Wallet' to register.";
        showFailure = true;
        loading = false;
        return;
      }

      // Get URL parameters
      const requestId = page.url.searchParams.get('requestId');
      const method = page.url.searchParams.get('method');

      if (!requestId) {
        errorValue = 'Missing request ID. Invalid dApp request.';
        showFailure = true;
        loading = false;
        return;
      }

      // Route to appropriate handler based on method
      if (method) {
        // For specific methods, go to approval flow
        safeNavigate(`/dapp/popups/approve?requestId=${requestId}&method=${method}`);
      } else {
        // Default to approval flow for general requests
        safeNavigate(`/dapp/popups/approve?requestId=${requestId}`);
      }

    } catch (error) {
      log.error('Error in dApp routing:', false, error);
      errorValue = 'Failed to process dApp request.';
      showFailure = true;
      loading = false;
    }
  });

  function handleFailureAction() {
    // Close the popup window
    try {
      window.close();
    } catch (error) {
      log.warn('Could not close window:', false, error);
    }
  }
</script>

<svelte:head>
  <title>YAKKL - dApp Request</title>
</svelte:head>

<Failed
  bind:show={showFailure}
  title="dApp Request Failed"
  content={errorValue}
  onReject={handleFailureAction}
/>

{#if loading && !showFailure}
  <div class="flex flex-col items-center justify-center h-full p-8">
    <div class="loading loading-spinner loading-lg text-primary mb-4"></div>
    <h2 class="text-xl font-semibold mb-2">Processing dApp Request</h2>
    <p class="text-base-content/70 text-center">
      Please wait while we process the connection request...
    </p>
  </div>
{/if}

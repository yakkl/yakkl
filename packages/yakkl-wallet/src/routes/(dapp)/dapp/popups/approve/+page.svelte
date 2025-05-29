<script lang="ts">
  import { browserSvelte } from '$lib/common/environment';
  import { page } from '$app/state';
  // The grayed out store items are for testing purposes used in the clearData function
  import { getMiscStore, getSettings, yakklDappConnectRequestStore, yakklMiscStore } from '$lib/common/stores';
  import { PATH_LOGIN, YAKKL_DAPP, DEFAULT_TITLE } from '$lib/common/constants';
  import { onMount } from 'svelte';
	import Copyright from '$lib/components/Copyright.svelte';
	import Failed from '$lib/components/Failed.svelte';
  import { log } from '$lib/common/logger-wrapper';
  import type { Runtime } from 'webextension-polyfill';
	import Warning from '$lib/components/Warning.svelte';
	import Confirmation from '$lib/components/Confirmation.svelte';
	import { createPortManagerWithStream } from '$lib/plugins/PortManagerWithStream';
  import { safeNavigate, safeLogout } from '$lib/common/safeNavigate';
	import { safeClientSendMessage } from '$lib/common/safeClientSendMessage';

  type RuntimePort = Runtime.Port | undefined;
  // let port: RuntimePort;

  let showConfirm = $state(false);
  let showSuccess = false;
  let showFailure = $state(false);
  let errorValue = $state('No domain/site name was found. Access to YAKKL® is denied.');
  let domain: string = $state('');
  let domainLogo: string = $state('');
  let domainTitle: string = $state('');
  let title: string = $state(DEFAULT_TITLE);
  let requestId: string | null = null;
  let method: string = $state('');
  let message;  // This gets passed letting the user know what the intent is

  let portManager = createPortManagerWithStream(YAKKL_DAPP);

  if (browserSvelte) {
    try {
      requestId = page.url.searchParams.get('requestId');
      const methodParam = page.url.searchParams.get('method');
      if (methodParam) method = methodParam;
      $yakklDappConnectRequestStore = requestId;
    } catch(e) {
      log.error(e);
      handleReject('No requestId or methodwas found. Access to YAKKL® is denied.');
    }
  }

  // NOTE: domains will be added (if not already there at the next step - if accounts)
  async function handleProcess() {
    if (!browserSvelte) return;

    try {
      // Store the request info in session storage so it persists after login
      sessionStorage.setItem('yakklSigningRequest', JSON.stringify({
        requestId,
        method
      }));

      return safeNavigate('/dapp/login?requestId=' + requestId + '&method=' + method);
    } catch(e) {
      errorValue = e as string;
      showFailure = true;
    }
  }

  // We no longer need to do get_params since we can access the request data directly
  async function onMessageListener(event: any) {
    if (!browserSvelte) return;

    try {
      if (!domainLogo) domainLogo = '/images/failIcon48x48.png'; // Set default logo but change if favicon is present

      if (event.method === 'get_params') {
        if (!event?.result?.data) {
          await handleReject('No request data was found. Access to YAKKL® is denied.');
          return;
        }
        const requestData = event.result.data;

        // Extract metadata from the correct location in the data structure
        const metaData = requestData.metaData?.metaData || requestData.metaData;
        if (!metaData) {
          await handleReject('Invalid request data structure. Access to YAKKL® is denied.');
          return;
        }

        domainTitle = metaData.title;
        domain = metaData.domain;
        domainLogo = metaData.icon ?? '/images/failIcon48x48.png';
        message = metaData.message ?? 'Nothing was passed to explain the intent of this approval. Be mindful of this request!';

        if (!requestId) requestId = requestData?.id ?? null;
        if (!requestId) {
          await handleReject('No request ID was found. Access to YAKKL® is denied.');
          return;
        }

        // Set the page title
        title = domainTitle || domain || DEFAULT_TITLE;
      }

    } catch(e) {
      log.error(e);
    }
  }

  // Only use this for testing!
  // async function clearData() {
  //   ////
  //   // NOTE: Only enable these if you need to CLEAR everything out for testing!
  //   $yakklConnectedDomainsStore = null;
  //   await setYakklConnectedDomainsStorage([]);
  //   let yakklAccounts = [];
  //   yakklAccounts = await getYakklAccounts();
  //   log.debug('onMessageListener - 72 (approve):', false, 'Cleared all connected domains and accounts', $yakklConnectedDomainsStore, yakklAccounts);
  //   if (yakklAccounts.length > 0) {
  //     yakklAccounts = yakklAccounts.map((item) => {
  //       item.connectedDomains = [];
  //       return item;
  //     });
  //   }
  //   // Removed redundant loop for clearing connectedDomains
  //   $yakklAccountsStore = yakklAccounts;
  //   await setYakklAccountsStorage(yakklAccounts);
  //   log.debug('onMessageListener - 72 (approve):', false, 'Cleared all connected domains and accounts', $yakklConnectedDomainsStore, $yakklAccountsStore);
  //   // Comment out this section after testing for clearing
  //   ////
  // }

  onMount(async () => {
    try {
      if (browserSvelte) {
        domainLogo = '/images/failIcon48x48.png';
        const settings = await getSettings();
        if (!settings.init || !settings.legal.termsAgreed) {
          errorValue = "You must register and agree to the terms of service before using YAKKL®. Click on 'Open Wallet' to register.";
          showFailure = true;
          return;
        }

        await safeClientSendMessage({ type: 'clientReady' }); // Safeguard to ensure the client is ready before sending messages

        // Check if we're returning from login with a session token
        const storedRequest = sessionStorage.getItem('yakklSigningRequest');
        if (storedRequest) {
          const { requestId: storedRequestId, method: storedMethod } = JSON.parse(storedRequest);
          requestId = storedRequestId;
          method = storedMethod;
          sessionStorage.removeItem('yakklSigningRequest');
        }

        if (!requestId) {
          errorValue = 'Missing request ID';
          showFailure = true;
          return;
        }

        const ok = await portManager.createPort();
        if (ok) {
          const stream = portManager.getStream();
          stream?.on('data', onMessageListener);
          stream?.write({ method: 'get_params', id: requestId });
        }

        // REGISTER SESSION with background
        log.info('Approve: BEFORE - REGISTER_SESSION_PORT - requestId and port:', false, requestId, portManager.getPort());

        portManager.setRequestId(requestId);

        await safeClientSendMessage({
          type: 'REGISTER_SESSION_PORT',
          port: portManager.getPort(),
          requestId
        });

        log.info('Approve: AFTER - REGISTER_SESSION_PORT - requestId and port:', false, requestId, portManager.getPort());
      }
    } catch(e) {
      log.error(e);
    }
  });

  // data must represent ProviderRpcError format
  async function handleReject(message: string = 'User rejected the request.') {
    try {
      showConfirm = false;
      showFailure = false;
      showSuccess = false;
      errorValue = '';

      const port = portManager?.getPort();
      if (port) {
        port.postMessage({id: requestId, method: 'error', response: {type: 'YAKKL_RESPONSE', data: {name: 'ProviderRpcError', code: 4001, message: message}}});
      }

      try {
        if (portManager) {
          await portManager.waitForIdle(1500);
          portManager.disconnect();
        }
      } catch (e) {
        log.warn('Port did not go idle in time', false, e);
      }
    } catch(e) {
      log.error(e);
    } finally {
      safeLogout();
    }
  }

  function handleApprove() {
    showConfirm = true;
  }

</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!-- <Warning
  bind:show={showFailure}
  title="Error"
  value={errorValue} /> -->

<Failed
  bind:show={showFailure}
  title="Failed!"
  content={errorValue}
  onReject={handleReject}/>

<Confirmation
  bind:show={showConfirm}
  title="Connect to {domain}"
  message="This will connect {domain} to YAKKL®. Do you wish to continue?"
  onConfirm={handleProcess}
  onReject={handleReject}
/>

<div class="flex flex-col h-full max-h-screen overflow-hidden">
  <!-- Header -->
  <div class="p-4 border-b border-base-300 flex-shrink-0">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <img id="dappImageId" crossorigin="anonymous" src={domainLogo} alt="Dapp logo" class="w-8 h-8 rounded-full flex-shrink-0" />
        <span class="font-semibold truncate">{title}</span>
      </div>
      <button
        onclick={() => handleReject()}
        class="btn btn-ghost btn-sm flex-shrink-0"
        aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 p-4 flex flex-col max-w-[428px]">
    <div class="text-center mb-4 flex-shrink-0">
      {#if method !== 'eth_requestAccounts' && method !== 'eth_sendTransaction' && method !== 'eth_signTypedData_v4' && method !== 'personal_sign'}
        <h2 class="text-xl font-bold mb-2">Security Risk</h2>
      {:else}
        <h2 class="text-xl font-bold mb-2">Connection Request</h2>
        <p class="text-base-content/80">This site would like to:</p>
      {/if}
    </div>

    <div class="space-y-4 mb-4 overflow-y-auto flex-1 min-h-0">
      <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {#if method === 'eth_requestAccounts'}
          <span>1. Request approval to connect to your wallet addresses</span>
        {:else if method === 'eth_sendTransaction'}
          <span>1. Request approval to send a transaction</span>
        {:else if (method as string) === 'eth_signTypedData_v4' || (method as string) === 'personal_sign' || (method as string) === 'eth_signTransaction'}
          <span>1. Request approval to sign a message</span>
        {:else if method === 'wallet_requestPermissions' || method === 'wallet_revokePermissions' || method === 'wallet_getPermissions'}
          <!-- wallet_requestPermissions is the only one requiring user approval but added the other two for completeness -->
          <span>1. Request approval to connect to your wallet addresses</span>
        {:else}
          <span>Request approval for '{method}' but it is not supported by YAKKL® due to security concerns.</span>
        {/if}
      </div>

      <!-- <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>2. Request approval for signing</span>
      </div>

      <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>3. Request approval for sending transactions</span>
      </div> -->
    </div>

    <div class="bg-base-200 rounded-lg p-4 mb-4 flex-shrink-0">
      <p class="text-sm text-base-content/70">
        {#if method !== 'eth_requestAccounts' && method !== 'eth_sendTransaction' && method !== 'eth_signTypedData_v4' && method !== 'personal_sign' && method !== 'eth_signTransaction' && method !== 'wallet_requestPermissions' && method !== 'wallet_revokePermissions' && method !== 'wallet_getPermissions'}
        The request is a possible security risk and not allowed!
        {:else}
        By connecting, you agree to allow this site to connect to your addresses. Any signing or transaction requests will have an additional approval step.
        {/if}
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div class="p-4 border-t border-base-300 flex-shrink-0">
    <div class="flex gap-4 justify-end">
      {#if method !== 'eth_requestAccounts' && method !== 'eth_sendTransaction' && method !== 'eth_signTypedData_v4' && method !== 'personal_sign' && method !== 'eth_signTransaction' && method !== 'wallet_requestPermissions' && method !== 'wallet_revokePermissions' && method !== 'wallet_getPermissions'}
        <button onclick={() => handleReject('Unsupported method - Security risk: ' + method)} class="btn btn-primary">
          Reject
        </button>
      {:else}
        <button onclick={handleApprove} class="btn btn-primary">
        {#if method === 'eth_requestAccounts'}
          Connect
        {:else if method === 'eth_sendTransaction'}
          Approve Transaction
        {:else if (method as string) === 'eth_signTypedData_v4' || (method as string) === 'personal_sign' || (method as string) === 'eth_signTransaction'}
          Approve Signing
        {:else if method === 'wallet_requestPermissions'}
          Approve Connection
        {:else if method === 'wallet_revokePermissions'}
          Revoke Connection
        {:else if method === 'wallet_getPermissions'}
          View Permissions
        {/if}
        </button>
      {/if}
    </div>
  </div>
</div>

<Copyright />

<style>
  /* Add smooth transitions */
  .btn {
    transition: all 0.2s ease;
  }

  /* Improve hover states */
  .btn:hover {
    transform: translateY(-1px);
  }

  /* Custom scrollbar */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--p)) transparent;
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: hsl(var(--p));
    border-radius: 3px;
  }
</style>


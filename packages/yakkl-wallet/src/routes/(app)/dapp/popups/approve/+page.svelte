<script lang="ts">
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { yakklConnectedDomainsStore, getSettings, yakklDappConnectRequestStore, setYakklConnectedDomainsStorage, getYakklAccounts, yakklAccountsStore, setYakklAccountsStorage } from '$lib/common/stores';
  import { PATH_LOGIN, YAKKL_DAPP, PATH_DAPP_ACCOUNTS, DEFAULT_TITLE } from '$lib/common/constants';
  import { onMount, onDestroy } from 'svelte';
	import { wait } from '$lib/common/utils';
	import Copyright from '$lib/components/Copyright.svelte';
	import Failed from '$lib/components/Failed.svelte';
  import { log } from '$plugins/Logger';

  import type { Runtime } from 'webextension-polyfill';

  type RuntimePort = Runtime.Port | undefined;

  let showConfirm = $state(false);
  let showSuccess = false;
  let showFailure = $state(false);
  let errorValue = $state('No domain/site name was found. Access to YAKKL® is denied.');
  let port: RuntimePort;
  let domain: string = $state('');
  let domainLogo: string = $state('');
  let domainTitle: string = $state('');
  // let requestData: any;
  // let method: string;
  let requestId: string | null = null;
  let message;  // This gets passed letting the user know what the intent is
  let context;

  if (browserSvelte) {
    try {
      requestId = page.url.searchParams.get('requestId');
      $yakklDappConnectRequestStore = requestId;
    } catch(e) {
      log.error(e);
    }
  }

  if (!requestId) requestId = ''; // May want to auto reject if this is not valid

  // NOTE: domains will be added (if not already there at the next step - accounts)
  async function handleIsLocked() {
    try {
      let yakklSettings = await getSettings();
      if (yakklSettings.isLocked === true) {
        return await goto(PATH_LOGIN + '.html?requestId=' + requestId); // May force login auth every time so all of the checks would not be needed!
      } else {
        return await goto(PATH_DAPP_ACCOUNTS + '.html?requestId=' + requestId);
      }
    } catch(e) {
      errorValue = e as string;
      showFailure = true;
    }
  }

  async function onMessageListener(event: any) {
    try {
      if (!domainLogo) domainLogo = '/images/logoBullLock48x48.png'; // Set default logo but change if favicon is present
      if (event.method === 'get_params') {
        // Get metadata from the event data
        const metadata = event.data?.data?.metaDataParams || {};

        // Get favicon from URL parameters first, fall back to metadata
        const url = new URL(window.location.href);
        const favicon = url.searchParams.get('favicon');

        // Set domain information with proper fallbacks
        domainTitle = metadata.title || metadata.name || '';
        domain = metadata.domain || '';
        domainLogo = favicon || metadata.icon || '/images/logoBullLock48x48.png';
        message = metadata.message || 'Nothing was passed in explaining the intent of this approval! Be mindful!';
        context = metadata.context || 'accounts';
        requestId = !requestId ? event.data.id : requestId;

        // Ensure we have a valid domain
        if (!domain) {
          try {
            const origin = new URL(metadata.origin || window.location.href).origin;
            domain = origin.replace(/^https?:\/\//, '');
          } catch (e) {
            domain = 'unknown-domain';
          }
        }

        // Set the page title
        document.title = domainTitle || domain || DEFAULT_TITLE;

        log.info('onMessageListener - 61 (approve):', false, {domain, domainTitle, domainLogo, message, context, requestId});

        if (domain) {
          if ($yakklConnectedDomainsStore) {
            $yakklConnectedDomainsStore.find(element => {
              if (element.domain === domain) {
                const accounts = element.addresses;
                if (port)
                  port.postMessage({method: 'eth_requestAccounts', id: requestId, type: 'YAKKL_RESPONSE', result: accounts});
                return;
              }
            });
          } else {
            log.info('onMessageListener - 97 (approve):', false, 'No connected domains found');
            $yakklConnectedDomainsStore = [];
            await setYakklConnectedDomainsStorage([]);
          }
        }
      }

    if (event?.method === 'reject' || event?.data?.method === 'reject') {
      handleReject();
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
        // For testing only!
        // await clearData();

        port = browser_ext.runtime.connect({name: YAKKL_DAPP});
        if (port) {
          port.onMessage.addListener(onMessageListener);
          port.postMessage({method: 'get_params', id: requestId}); // request is not currently used but we may want to later
        }

        let img = document.getElementById('dappImageId') as HTMLImageElement;
        if (img) {
          img.onerror = function() {
            this.onerror = null;
            this.src = '/images/logoBullLock48x48.png';
          };
        }
      }
    } catch(e) {
      log.error(e);
    }
  });

  onDestroy(async () => {
    try {
      if (browserSvelte) {
        if (port) {
          port.disconnect();
          port.onMessage.removeListener(onMessageListener);
          port = undefined;
        }
      }
    } catch(e) {
      log.error(e);
    }
  });

  // data must represent ProviderRpcError format
  async function handleReject() {
    try {
      showConfirm = false;
      showFailure = false;
      showSuccess = false;
      errorValue = '';

      if (port) {
        port.postMessage({id: requestId, method: 'error', response: {type: 'YAKKL_RESPONSE', data: {name: 'ProviderRpcError', code: 4001, message: 'User rejected the request.'}}});
      }

      // If requestId is not valid then use 0 since we are bailing out anyway
      // May want to think about putting a slight tick to make sure all queues get flushed
      //goto(PATH_LOGOUT); // May want to do something else if they are already logged in!
      if (browserSvelte) {
        if (port) {
          port.disconnect();
          port.onMessage.removeListener(onMessageListener);
          port = undefined;
        }
      }
    } catch(e) {
      log.error(e);
    } finally {
      await close();
    }
  }

  async function close() {
    await wait(1000); // Wait for the port to disconnect and message to go through
    window.close();
  }

  function handleApprove() {
    showConfirm = true;
  }

</script>

<svelte:head>
	<title>{domainTitle || domain || DEFAULT_TITLE}</title>
</svelte:head>

<Failed
  bind:show={showFailure}
  title="Failed!"
  content={errorValue}
  handleReject={handleReject}/>

{#if showConfirm}
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
  <div class="bg-base-100 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
    <h3 class="text-lg font-bold mb-4 truncate" title={domain}>Connect to {domain}</h3>
    <p class="mb-6">This will connect <span class="font-bold text-primary truncate inline-block max-w-[200px]" title={domain}>{domain}</span> to YAKKL®. Do you wish to continue?</p>
    <div class="flex justify-end gap-4">
      <button class="btn btn-outline" onclick={handleReject}>Reject</button>
      <button class="btn btn-primary" onclick={handleIsLocked}>Approve</button>
    </div>
  </div>
</div>
{/if}

<div class="flex flex-col h-full max-h-screen overflow-hidden">
  <!-- Header -->
  <div class="p-4 border-b border-base-300 flex-shrink-0">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <img id="dappImageId" crossorigin="anonymous" src={domainLogo} alt="Dapp logo" class="w-8 h-8 rounded-full flex-shrink-0" />
        <span class="font-semibold truncate" title={domainTitle || domain}>{domainTitle || domain}</span>
      </div>
      <button
        onclick={handleReject}
        class="btn btn-ghost btn-sm flex-shrink-0"
        aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 p-6 overflow-hidden flex flex-col min-w-[360px] max-w-[426px]">
    <div class="text-center mb-8 flex-shrink-0">
      <h2 class="text-xl font-bold mb-2">Connection Request</h2>
      <p class="text-base-content/80">This site would like to:</p>
    </div>

    <div class="space-y-4 mb-6 overflow-y-auto flex-1 min-h-0">
      <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>View your wallet addresses</span>
      </div>

      <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Request approval for signing and transactions</span>
      </div>
    </div>

    <div class="bg-base-200 rounded-lg p-4 mb-8 flex-shrink-0">
      <p class="text-sm text-base-content/70">
        By connecting, you agree to allow this site to view your public address. This does not give permission to move funds.
      </p>
    </div>
  </div>

  <!-- Footer -->
  <div class="p-4 border-t border-base-300 flex-shrink-0">
    <div class="flex gap-4 justify-end">
      <button onclick={handleReject} class="btn btn-outline">
        Reject
      </button>
      <button onclick={handleApprove} class="btn btn-primary">
        Connect
      </button>
    </div>
  </div>
</div>

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

<Copyright />


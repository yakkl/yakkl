<script lang="ts">
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { getYakklAccounts, setYakklConnectedDomainsStorage, setYakklAccountsStorage, yakklDappConnectRequestStore, getYakklCurrentlySelected, getYakklConnectedDomains, getSettings } from '$lib/common/stores';
  import { YAKKL_DAPP, DEFAULT_TITLE, DEFAULT_PERSONA } from '$lib/common/constants';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
	import { type AccountAddress, type JsonRpcResponse, type SessionInfo, type YakklAccount, type YakklConnectedDomain, type YakklCurrentlySelected } from '$lib/common';
  import type { Runtime } from 'webextension-polyfill';
	import { dateString } from '$lib/common/datetime';
	import { log } from '$lib/managers/Logger';
  import Confirmation from '$lib/components/Confirmation.svelte';
  import type { BackgroundPendingRequest } from '$lib/extensions/chrome/background';
	import Warning from '$lib/components/Warning.svelte';
	import Failed from '$lib/components/Failed.svelte';
	import { createPortManagerWithStream, PortManagerWithStream } from '$lib/managers/PortManagerWithStream';
	import type { PortDuplexStream } from '$lib/managers/PortStreamManager';
	import { safeLogout } from '$lib/common/safeNavigate';
	import { sessionToken, verifySessionToken } from '$lib/common/auth/session';
	import { revokeDomainConnection, verifyDomainConnected } from '$lib/extensions/chrome/verifyDomainConnected';

  type RuntimePort = Runtime.Port | undefined;

  // Define the ConnectedDomainAddress interface locally
  interface ConnectedDomainAddress {
    id?: string;
    persona?: string;
    address: string;
    selected: boolean;
    checked: boolean;
    name: string;
    alias: string;
    blockchain: string;
    chainId: number;
  }

  interface FilteredAddress {
    id?: string;
    persona?: string;
    address: string;
    name: string;
    alias: string;
    blockchain: string;
    chainId: number;
    selected: boolean;
    checked: boolean;
  }

  interface AddressWithSelection {
    id?: string;
    persona?: string;
    address: string;
    selected?: boolean;
    alias?: string;
    blockchain?: string;
    chainId?: number;
    name?: string;
    checked?: boolean;
  }

  // DappInterface type definition
  interface DappInterface {
    sendResponse: (response: any) => void;
    sendError: (error: any) => void;
    method: string;
    params: any[];
    origin: string;
  }

  let currentlySelected: YakklCurrentlySelected;
  let yakklAccountsStore: YakklAccount[] = [];
  let yakklConnectedDomainsStore: YakklConnectedDomain[] = [];

  let accounts: AccountAddress [] = [];
  let accountsPicked = $state(0);
  let showConfirm = $state(false);
  let showFailure = $state(false);
  let errorValue = $state('No domain/site name was found. Access to YAKKL® is rejected.');
  let domain: string = $state('');
  let domainLogo: string = $state('');
  let domainTitle: string = $state('');
  let requestId: string | null;
  let pass = false;
  let filteredAddressesArray: AddressWithSelection[] = $state([]);
  let currentlySelectedAddress: string = $state('');
  let request: BackgroundPendingRequest;
  let title: string = $state(DEFAULT_TITLE);

  let portManager: PortManagerWithStream | null = null;
  let stream: PortDuplexStream | null = null;
  let dappInterface: DappInterface | null = null;

  if (browserSvelte) {
    try {
      requestId = page.url.searchParams.get('requestId');
      $yakklDappConnectRequestStore = requestId as string;

      log.info('Dapp - accounts page loading:', false, { requestId });

      if (requestId) {
        pass = true;
      }
      // NOTE: The internal check now makes sure the requestId is valid
    } catch(e) {
      log.error(e);
      throw e;
    }
  }

  // NOTE: We need to think through the id and persona for each store and any wrappers and how best to handle them.
  async function getAccounts() {
    try {
      // Get current connected domains
      const connectedDomains = await getYakklConnectedDomains();
      const domainExists = connectedDomains.find(d => d.domain === domain); // && d.id === currentlySelected?.id && d.persona === currentlySelected?.persona);

      // Get primary accounts
      const accounts = await getYakklAccounts();
      if (!accounts || accounts.length === 0) {
        await handleReject('No accounts available. Access to YAKKL® is rejected.');
      }

      yakklAccountsStore = accounts;

      // Map accounts to the filtered addresses array
      filteredAddressesArray = accounts.map((account: YakklAccount) => {
        // Check if this account has previously connected to the current domain
        const hasConnectedToDomain = Array.isArray(account.connectedDomains) &&
          account.connectedDomains.includes(domain);

        return {
          id: account.id || '',
          persona: account.persona || DEFAULT_PERSONA,
          address: account.address,
          name: account.name,
          alias: account.alias || account.address,
          blockchain: account.blockchain || 'ethereum',
          chainId: account.chainIds?.[0] || 1,
          selected: hasConnectedToDomain,
          checked: hasConnectedToDomain
        };
      }) as AddressWithSelection[];

      // Check if currentlySelected.shortcuts.account matches any accounts.address
      if (currentlySelected?.shortcuts?.address) {
        const matchingAccount = accounts.find(
          account => account.address === currentlySelected.shortcuts.address);
        if (matchingAccount) {
          currentlySelectedAddress = matchingAccount.address;
        }
      }
      // Update accountsPicked count
      accountsPicked = filteredAddressesArray.filter(addr => addr.selected).length;
    } catch (error) {
      log.error('Error in getAccounts:', false, error);
      showFailure = true;
      errorValue = 'Failed to load accounts. Please try again.';
    }
  }

  async function handleReject(message: string = 'User rejected the request.') {
    try {
      showConfirm = false;
      showFailure = false;
      if (dappInterface) {
        dappInterface.sendError({
          code: 4001,
          message
        });
      } else if (stream) {
        stream.write({
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: 4001,
            message
          }
        });
      }
    } catch(e) {
      log.error(e);
    } finally {
      if (browserSvelte) {
        await close();
      }
    }
  }

  function toggleAddress(address: string) {
    const index = filteredAddressesArray.findIndex(addr => addr.address === address);
    if (index !== -1) {
      const currentAddress = filteredAddressesArray[index];
      filteredAddressesArray[index] = {
        ...currentAddress,
        selected: !(currentAddress.selected ?? false)
      };
      filteredAddressesArray = [...filteredAddressesArray];
    }
    accountsPicked = filteredAddressesArray.filter(addr => addr.selected).length;
  }

  async function handleProcess(confirmed: boolean = true) {
    try {
      if (!domain) {
        await handleReject('No domain name is present. Access to YAKKL® is rejected.');
      }

      if (!verifySessionToken($sessionToken)) {
        await handleReject("Session token is invalid. Login again.");
      }

      // Get selected addresses from filteredAddressesArray
      const accounts = filteredAddressesArray
        .filter(addr => addr.selected)
        .map(addr => ({
          id: addr.id || '',
          persona: addr.persona || DEFAULT_PERSONA,
          address: addr.address,
          name: addr.name,
          alias: addr.alias,
          blockchain: addr.blockchain,
          chainId: addr.chainId
        }));

      let addresses = filteredAddressesArray
        .filter(addr => addr.selected)
        .map(addr => addr.address);

      accountsPicked = accounts.length;

      if (accounts.length === 0) {
        // Check if the domain is connected
        const isConnected = await verifyDomainConnected(domain);
        if (!isConnected) {
          await handleReject('No accounts were selected. Access to YAKKL® is rejected.');
        } else {
          revokeDomainConnection(domain);
          await handleReject('The domain is not connected to any accounts. Access to YAKKL® is rejected.');
        }
      }

      if (!Array.isArray(addresses)) {
        addresses = Object.values(addresses);
      }

      // Update the connected domains store
      const existingDomainIndex = yakklConnectedDomainsStore.findIndex(d => d.domain === domain); // && d.id === currentlySelected?.id && d.persona === currentlySelected?.persona);

      if (existingDomainIndex === -1) {
        // Create a new domain entry if it doesn't exist
        const newDomain: YakklConnectedDomain = {
          id: currentlySelected?.id || '',
          persona: currentlySelected?.persona || DEFAULT_PERSONA,
          domain: domain,
          name: domainTitle || domain,
          icon: domainLogo,
          addresses: accounts,
          permissions: {}, // We do not set permissions here. This is handled in the permissions page.
          chainId: currentlySelected?.shortcuts?.chainId || 1,
          url: domain,
          status: 'approved', // The status is a first line of defense for incoming requests.
          revoked: {},
          version: currentlySelected?.version || '',
          createDate: dateString(),
          updateDate: dateString()
        };

        yakklConnectedDomainsStore = [...yakklConnectedDomainsStore, newDomain];
      } else {
        // Update existing domain
        const existingDomain = yakklConnectedDomainsStore[existingDomainIndex];
        existingDomain.id = currentlySelected?.id || '';
        existingDomain.persona = currentlySelected?.persona || DEFAULT_PERSONA;
        existingDomain.name = domainTitle || domain;
        existingDomain.icon = domainLogo;
        existingDomain.addresses = accounts;
        existingDomain.updateDate = dateString();
        existingDomain.version = currentlySelected?.version || existingDomain.version;
        existingDomain.chainId = currentlySelected?.shortcuts?.chainId || 1;
        existingDomain.url = domain;
        existingDomain.status = 'approved'; // The status is a first line of defense for incoming requests.

        // Update the store with the modified domain
        yakklConnectedDomainsStore = [
          ...yakklConnectedDomainsStore.slice(0, existingDomainIndex),
          existingDomain,
          ...yakklConnectedDomainsStore.slice(existingDomainIndex + 1)
        ];
      }

      await setYakklConnectedDomainsStorage(yakklConnectedDomainsStore);

      // Update accounts store with connected domains
      for (const account of yakklAccountsStore) {
        const accountIndex = yakklAccountsStore.findIndex(a => a.address === account.address); // && a.id === currentlySelected?.id && a.persona === currentlySelected?.persona);
        if (accountIndex !== -1) {
          const existingAccount = yakklAccountsStore[accountIndex];
          if (!Array.isArray(existingAccount.connectedDomains)) {
            existingAccount.connectedDomains = [];
          }

          // Check if this account is in the selected accounts
          const isSelected = accounts.some(acc => acc.address === account.address); // && acc.id === currentlySelected?.id && acc.persona === currentlySelected?.persona);

          if (isSelected) {
            // Add domain if not already present
            if (!existingAccount.connectedDomains.includes(domain)) {
              existingAccount.connectedDomains.push(domain);
            }
          } else {
            // Remove domain if present
            const domainIndex = existingAccount.connectedDomains.indexOf(domain);
            if (domainIndex !== -1) {
              existingAccount.connectedDomains.splice(domainIndex, 1);
            }
          }

          yakklAccountsStore[accountIndex] = existingAccount;
        }
      }

      await setYakklAccountsStorage(yakklAccountsStore);

      // Send response to dapp
      if (dappInterface) {
        log.debug('Dapp - accounts process: Sending response to dapp:', false, {
          requestId,
          addresses
        });

        dappInterface.sendResponse({
          id: requestId,
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          result: addresses,
          method: dappInterface.method
        });
      } else if (stream) {
        log.debug('Dapp - accounts process: Sending response via stream:', false, {
          requestId,
          addresses
        });

        const response: JsonRpcResponse = {
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          id: requestId,
          result: addresses
        };
        stream.write(response);
      } else {
        await handleReject('Request failed to send to dapp due to missing port stream. Access to YAKKL® is rejected.');
      }
      await close();
    } catch (error: any) {
      log.error('Dapp - accounts process error:', true, error);
      errorValue = error as string;
    }
  }

  // We no longer need to do get_params since we can access the request data directly
  async function onMessageListener(event: any) {
    try {
      if (!domainLogo) domainLogo = '/images/failIcon48x48.png'; // Set default logo but change if favicon is present

      if (event.method === 'get_params') {
        request = event.result;
        if (!request || !request.data) {
          await handleReject('No requested data was found. Access to YAKKL® is rejected.');
        }

        const requestData = request.data;
        if (!requestData || !requestData.metaData) {
          await handleReject('Invalid request data. Access to YAKKL® is rejected.');
        }

        // Create dappInterface from the request data
        dappInterface = {
          sendResponse: (response: any) => {
            if (stream) {
              stream.write(response);
            }
          },
          sendError: (error: any) => {
            if (stream) {
              stream.write({
                type: 'YAKKL_RESPONSE:EIP6963',
                jsonrpc: '2.0',
                id: requestId,
                error
              });
            }
          },
          method: requestData.method || 'eth_requestAccounts',
          params: requestData.params || [],
          origin: requestData.metaData?.metaData?.origin || domain
        };

        // These needs to be fixed upstream
        domainTitle = requestData.metaData.metaData.title;
        domain = requestData.metaData.metaData.domain;
        domainLogo = requestData.metaData.metaData.icon;

        // Set the page title
        title = domainTitle || domain || DEFAULT_TITLE;

        if (!requestId) requestId = requestData?.id ?? null;
        if (!requestId) {
          showFailure = true;
          errorValue = 'No request ID was found. Access to YAKKL® is rejected.';
        } else {
          // Call getAccounts to handle domain checking and account setup
          await getAccounts();
        }
      }
    } catch(e) {
      log.error(e);
      handleReject('An error occurred while processing the request. Access to YAKKL® is rejected.');
    }
  }

  onMount(async () => {
    try {
      if (browserSvelte) {
        log.info('Dapp - accounts page mounted:', false);

        const settings = await getSettings();
        if (!settings.init || !settings.legal.termsAgreed) {
          errorValue = "You must register and agree to the terms of service before using YAKKL®. Click on 'Open Wallet' to register.";
          showFailure = true;
          return;
        }

        log.info('Dapp - accounts page getting settings:', false, settings);

        currentlySelected = await getYakklCurrentlySelected();
        log.info('Dapp - accounts page getting currently selected:', false, currentlySelected);

        // Since we're 1:1 we can attach to the known port name
        const sessionInfo = await browser_ext.runtime.sendMessage({
            type: 'REQUEST_SESSION_PORT',
            requestId
          }) as SessionInfo;

        console.log('sessionInfo - debugger', sessionInfo);
        console.log('Received session info:', sessionInfo, sessionInfo?.portName);

        // Guard against null response
        if (!sessionInfo || !sessionInfo.success) {
          log.warn('Failed to verify session port. No response received. Using YAKKL_DAPP.');
        }

        // Create port manager with the original port name
        portManager = createPortManagerWithStream(sessionInfo?.portName ?? YAKKL_DAPP);
        portManager.setRequestId(requestId);

        const success = await portManager.createPort();
        if (!success) {
          errorValue = 'Failed to connect to session port.';
          showFailure = true;
          return;
        }

        stream = portManager.getStream();
        if (!stream) {
          errorValue = 'Stream is not available.';
          showFailure = true;
          return;
        }

        stream.on('data', onMessageListener);
        stream.write({ method: 'get_params', id: requestId });
      }
    } catch(e) {
      log.error(e);
    }
  });

  async function close() {
    if (browserSvelte) {
      try {
        if (portManager) {
          await portManager.waitForIdle(1500);
          portManager.disconnect();
        }
      } catch (e) {
        log.warn('Port did not go idle in time', false, e);
      }
      safeLogout();
    }
  }

</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!-- <Warning bind:show={showFailure} title="Error" value={errorValue} /> -->
<Failed bind:show={showFailure} title="Failed!" content={errorValue} onReject={handleReject}/>
<Confirmation bind:show={showConfirm} title="Connect to {domain}" message="This will connect {domain} to {accountsPicked} of your addresses! Do you wish to continue?" onConfirm={handleProcess}/>

<!-- {#if showConfirm}
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
  <div class="bg-base-100 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
    <h3 class="text-lg font-bold mb-4">Connect to {domain}</h3>
    <p class="mb-6">Connect <span class="font-bold text-primary">{accountsPicked}</span> address{accountsPicked > 1 ? 'es' : ''} to {domain}?</p>
    <div class="mt-4 flex justify-end space-x-2">
      <button
        class="px-4 py-2 bg-gray-200 rounded"
        onclick={() => window.close()}
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 bg-blue-500 text-white rounded"
        onclick={handleProcess}
      >
        Connect
      </button>
    </div>
  </div>
</div>
{/if} -->

<!-- {#if showFailure}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-base-100 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
      <h3 class="text-lg font-bold mb-4 text-error">Failed!</h3>
      <p class="mb-6">{errorValue}</p>
      <div class="flex justify-end">
        <button
          class="btn btn-primary"
          onclick={() => handleReject()}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{:else} -->
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
    <div class="flex-1 p-6 overflow-hidden flex flex-col max-w-[428px]">
      <div class="text-center mb-4 flex-shrink-0">
        <h2 class="text-xl font-bold mb-2">Select Accounts</h2>
        <p class="text-base-content/80">Choose which accounts to connect to {domain}</p>
      </div>

      <div class="overflow-y-auto flex-1 min-h-0 mb-4">
        {#each filteredAddressesArray as address}
          {#if address.address === currentlySelectedAddress}
            <!-- Column layout for currentlySelectedAddress -->
            <div class="flex items-start gap-3 p-3 bg-base-200 rounded-lg mb-2">
              <input
                type="checkbox"
                class="checkbox checkbox-primary w-5 h-5 flex-shrink-0 text-2xl"
                checked={address.checked}
                onchange={() => toggleAddress(address.address)}
              />
              <div class="flex flex-col">
                <span class="font-mono text-sm truncate" title={address.address}>{address.address}</span>
                <span class="badge badge-primary text-xs mt-1">Default account</span>
              </div>
            </div>
          {:else}
            <!-- Row layout for other addresses -->
            <div class="flex items-center gap-3 p-3 bg-base-200 rounded-lg mb-2">
              <input
                type="checkbox"
                class="checkbox checkbox-primary w-5 h-5 flex-shrink-0 text-2xl"
                checked={address.checked}
                onchange={() => toggleAddress(address.address)}
              />
              <span class="font-mono text-sm truncate" title={address.address}>{address.address}</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-base-300 flex-shrink-0">
      <div class="flex gap-4 justify-end">
        <button onclick={() => handleReject()} class="btn btn-outline">
          Reject
        </button>
        <button onclick={() => { showConfirm=true; }} class="btn btn-primary">
          Connect
        </button>
      </div>
    </div>
  </div>
<!-- {/if} -->

<style>
  /* Smooth transitions */
  .btn {
    transition: all 0.2s ease;
  }

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

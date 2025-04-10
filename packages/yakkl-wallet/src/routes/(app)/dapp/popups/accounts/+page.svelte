<script lang="ts">
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { goto } from '$app/navigation';
  import { getYakklAccounts, setYakklConnectedDomainsStorage, setYakklAccountsStorage, yakklDappConnectRequestStore, getYakklCurrentlySelected, getYakklConnectedDomains } from '$lib/common/stores';
  import { deepCopy } from "$lib/utilities/utilities";
  import { PATH_LOGIN, YAKKL_DAPP, DEFAULT_TITLE, PATH_LOGOUT } from '$lib/common/constants';
  import { onMount, onDestroy } from 'svelte';
  import { navigating, page } from '$app/state'; // NOTE: address
  import { wait } from '$lib/common/utils';
	import ProgressWaiting from '$lib/components/ProgressWaiting.svelte';
	import type { AccountAddress, JsonRpcResponse, YakklAccount, YakklConnectedDomain, YakklCurrentlySelected } from '$lib/common';

  import type { Runtime } from 'webextension-polyfill';
	import { dateString } from '$lib/common/datetime';
	import { log } from '$lib/plugins/Logger';
  import Confirmation from '$lib/components/Confirmation.svelte';
  // import Failed from '$lib/components/Failed.svelte';
  // import { writable, get } from 'svelte/store';
  // import type { Readable } from 'svelte/store';

  // import type { YakklPrimaryAccount } from '$lib/common/interfaces';

  type RuntimePort = Runtime.Port | undefined;

  // Define the ConnectedDomainAddress interface locally
  interface ConnectedDomainAddress {
    address: string;
    selected: boolean;
    checked: boolean;
    name: string;
    alias: string;
    blockchain: string;
    chainId: number;
  }

  interface FilteredAddress {
    address: string;
    name: string;
    alias: string;
    blockchain: string;
    chainId: number;
    selected: boolean;
    checked: boolean;
  }

  interface AddressWithSelection {
    address: string;
    selected?: boolean;
    alias?: string;
    blockchain?: string;
    chainId?: number;
    name?: string;
    checked?: boolean;
  }

  let currentlySelected: YakklCurrentlySelected;
  let yakklAccountsStore: YakklAccount[] = [];
  let yakklConnectedDomainsStore: YakklConnectedDomain[] = [];

  // let searchTerm = $state('');
  // let addresses: Map<string, ConnectedDomainAddress> = new Map();  // Complete list
  // let filteredAddresses: Map<string, ConnectedDomainAddress> = $state(new Map());  // Filtered list
  let accounts: AccountAddress [] = [];
  // let accountNumber = 0; // Number of accounts
  let accountsPicked = $state(0);
  let showConfirm = $state(false);
  let showSuccess = $state(false);
  let showFailure = $state(false);
  let showWarning = $state(false);
  let showProgress = $state(false);
  let warningValue = $state('No accounts were selected. Access to YAKKL® is denied.');
  let errorValue = $state('No domain/site name was found. Access to YAKKL® is denied.');
  let port: RuntimePort;
  let domain: string = $state('');
  let domainLogo: string = $state('');
  let domainTitle: string = $state('');
  let requestId: string | null;
  let requestData: any;
  let pass = false;
  let filteredAddressesArray: AddressWithSelection[] = $state([]);
  let currentlySelectedAddress: string = $state('');

  if (browserSvelte) {
    try {
      requestId = page.url.searchParams.get('requestId');
      $yakklDappConnectRequestStore = requestId as string;

      if (navigating) {
        if (navigating?.from?.url?.pathname) {
          if (navigating.from.url.pathname.includes('dapp/popups/approve') ||
            navigating.from.url.pathname.includes('login/Login')) {
            pass = true;
          }
        }
      }

      if (pass !== true) {
        if (requestId) {
          pass = true;
        } else {
          if (browserSvelte) {
            goto(PATH_LOGIN);
          }
        }
      }
    } catch(e) {
      log.error(e);
    }
  }

  async function getAccounts() {
    try {
      // Get current connected domains
      const connectedDomains = await getYakklConnectedDomains();
      const domainExists = connectedDomains.find(d => d.domain === domain);

      // Get primary accounts
      const accounts = await getYakklAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available');
      }

      yakklAccountsStore = accounts;

      // Map accounts to the filtered addresses array
      filteredAddressesArray = accounts.map((account: YakklAccount) => {
        // Check if this account has previously connected to the current domain
        const hasConnectedToDomain = Array.isArray(account.connectedDomains) &&
          account.connectedDomains.includes(domain);

        return {
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

      log.info('currentlySelectedAddress:', false, currentlySelectedAddress);

      // Update accountsPicked count
      accountsPicked = filteredAddressesArray.filter(addr => addr.selected).length;

    } catch (error) {
      log.error('Error in getAccounts:', false, error);
      showFailure = true;
      errorValue = 'Failed to load accounts. Please try again.';
    }
  }

  function resetValuesExcept(value: string) {
    showConfirm = value === 'showConfirm' ? true : false;
    showSuccess = value === 'showSuccess' ? true : false;
    showFailure = value === 'showFailure' ? true : false;
    showWarning = value === 'showWarning' ? true : false;
    showProgress = value === 'showProgress' ? true : false;
  }

  async function handleReject() {
    try {
      resetValuesExcept(''); // Reset all values

      if (port) {
        port.postMessage({
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: 4001,
            message: 'User rejected the request.'
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

  async function handleProcess() {
    try {
      if (!domain) {
        throw 'No domain name is present.';
      }

      // Get selected addresses from filteredAddressesArray
      accounts = filteredAddressesArray
        .filter(addr => addr.selected)
        .map(addr => ({
          address: addr.address,
          name: addr.name,
          alias: addr.alias,
          blockchain: addr.blockchain,
          chainId: addr.chainId
        }));

      accountsPicked = accounts.length;
      log.info('accounts selected:', false, accounts);

      if (accounts.length === 0) {
        throw 'No accounts were selected. Please select at least one account.';
      }

      if (!Array.isArray(accounts)) {
        accounts = Object.values(accounts);
      }

      showProgress = true;

      // Update the connected domains store
      const existingDomainIndex = yakklConnectedDomainsStore.findIndex(d => d.domain === domain);

      if (existingDomainIndex === -1) {
        // Create a new domain entry if it doesn't exist
        const newDomain: YakklConnectedDomain = {
          id: currentlySelected?.id || '',
          domain: domain,
          name: domainTitle || domain,
          icon: domainLogo,
          addresses: accounts,
          permissions: [],
          version: currentlySelected?.version || '',
          createDate: dateString(),
          updateDate: dateString()
        };

        yakklConnectedDomainsStore = [...yakklConnectedDomainsStore, newDomain];
      } else {
        // Update existing domain
        const existingDomain = yakklConnectedDomainsStore[existingDomainIndex];
        existingDomain.name = domainTitle || domain;
        existingDomain.icon = domainLogo;
        existingDomain.addresses = accounts;
        existingDomain.updateDate = dateString();
        existingDomain.version = currentlySelected?.version || existingDomain.version;

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
        const accountIndex = yakklAccountsStore.findIndex(a => a.address === account.address);
        if (accountIndex !== -1) {
          const existingAccount = yakklAccountsStore[accountIndex];
          if (!Array.isArray(existingAccount.connectedDomains)) {
            existingAccount.connectedDomains = [];
          }

          // Check if this account is in the selected accounts
          const isSelected = accounts.some(acc => acc.address === account.address);

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
      if (port) {
        const response: JsonRpcResponse = {
          type: 'YAKKL_RESPONSE:EIP6963',
          jsonrpc: '2.0',
          id: requestId,
          result: accounts.map(acc => acc.address)
        };
        port.postMessage(response);
      }

      showProgress = false;
      showConfirm = false;
      showSuccess = false;

      await close();
    } catch (error: any) {
      log.error('Dapp - accounts process error:', true, error);
      errorValue = error as string;
      resetValuesExcept('showFailure');
    }
  }

  onMount(async () => {
    try {
      if (browserSvelte) {
        currentlySelected = await getYakklCurrentlySelected();

        port = browser_ext.runtime.connect({name: YAKKL_DAPP});
        if (port) {
          port.onMessage.addListener(async (event: any) => {
            try {
              requestData = event.data;

              if (!domainLogo) domainLogo = '/images/logoBullLock48x48.png'; // Set default logo but change if favicon is present

              if (event.method === 'get_params') {
                domainTitle = requestData?.data?.metaDataParams?.title ?? '';
                domain = requestData?.data?.metaDataParams?.domain ?? '';
                // Get favicon from URL parameters first, fall back to metadata
                const url = new URL(window.location.href);
                const favicon = url.searchParams.get('favicon');
                domainLogo = favicon ?? requestData?.data?.metaDataParams?.icon ?? '/images/logoBullLock48x48.png';
                domain = domain.trim();

                // Ensure we have a valid domain for the store and localStorage
                if (!domain) {
                  // If domain is empty, try to extract from the URL
                  try {
                    const origin = new URL(requestData?.data?.metaDataParams?.origin || window.location.href).origin;
                    domain = origin.replace(/^https?:\/\//, '');
                  } catch (e) {
                    // If all else fails, use a default value
                    domain = 'unknown-domain';
                  }
                }

                if (!requestId) requestId = requestData?.id ?? null;
                if (!requestId) {
                  showFailure = true;
                  errorValue = 'No request ID was found. Access to YAKKL® is denied.';
                } else {
                  // Call getAccounts to handle domain checking and account setup
                  await getAccounts();
                }
              }
            } catch(e) {
              log.error(e);
            }
          });
          port.postMessage({method: 'get_params', id: requestId});
        }
      }
    } catch(e) {
      log.error(e);
    }
  });

  onDestroy(() => {
    try {
      if (browserSvelte) {
        if (port) {
          port.disconnect();
          port = undefined;
        }
      }
    } catch(e) {
      log.error(e);
    }
  });

  async function close() {
    // goto(PATH_LOGOUT);
    await wait(1000); // Wait for the port to disconnect and message to go through
    window.close();
  }

</script>

<svelte:head>
	<title>{DEFAULT_TITLE}</title>
</svelte:head>

<ProgressWaiting bind:show={showProgress} title="Processing" value="Verifying selected accounts..."/>

<Confirmation bind:show={showConfirm} title="Connect to {domain}" message="This will connect {domain} to {accountsPicked} of your addresses! Do you wish to continue?" onConfirm={handleProcess}/>

<!-- <Warning bind:show={showWarning} title="Warning!" content={warningValue}/>

<Failed bind:show={showFailure} title="Failed!" content={errorValue} handleReject={() => {window.close()}}/>

<Success bind:show={showSuccess} title="Success!" content="{domain} is now connected to YAKKL®" handleConfirm={() => {window.close()}}/> -->

{#if showConfirm}
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
{/if}

{#if showFailure}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-base-100 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
      <h3 class="text-lg font-bold mb-4 text-error">Failed!</h3>
      <p class="mb-6">{errorValue}</p>
      <div class="flex justify-end">
        <button
          class="btn btn-primary"
          onclick={handleReject}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{:else}
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
      <button onclick={handleReject} class="btn btn-outline">
        Reject
      </button>
      <button onclick={() => { showConfirm=true; }} class="btn btn-primary">
        Connect
      </button>
    </div>
  </div>
</div>
{/if}
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


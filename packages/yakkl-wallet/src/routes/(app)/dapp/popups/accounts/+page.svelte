<script lang="ts">
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { goto } from '$app/navigation';
  import { Checkbox, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, TableSearch } from 'flowbite-svelte';
  import { getYakklAccounts, setYakklConnectedDomainsStorage, setYakklAccountsStorage, yakklDappConnectRequestStore, getYakklCurrentlySelected, getYakklConnectedDomains } from '$lib/common/stores';
  import { deepCopy, truncate } from "$lib/utilities/utilities";
  import { PATH_LOGIN, YAKKL_DAPP, DEFAULT_TITLE } from '$lib/common/constants';
  import { onMount, onDestroy } from 'svelte';
  import { navigating, page } from '$app/state'; // NOTE: address
  import { wait } from '$lib/common/utils';
	import ProgressWaiting from '$lib/components/ProgressWaiting.svelte';
	import type { AccountAddress, ConnectedDomainAddress, YakklAccount, YakklConnectedDomain, YakklCurrentlySelected } from '$lib/common';

  import type { Runtime } from 'webextension-polyfill';
	import { dateString } from '$lib/common/datetime';
	import { log } from '$lib/plugins/Logger';

  type RuntimePort = Runtime.Port | undefined;

  let currentlySelected: YakklCurrentlySelected;
  let yakklAccountsStore: YakklAccount[] = [];
  let yakklConnectedDomainsStore: YakklConnectedDomain[] = [];

  let searchTerm = $state('');
  let addresses: Map<string, ConnectedDomainAddress> = new Map();  // Complete list
  let filteredAddresses: Map<string, ConnectedDomainAddress> = $state(new Map());  // Filtered list
  let accounts: AccountAddress [] = [];
  let accountNumber = 0; // Number of accounts
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
  let filteredAddressesArray: ConnectedDomainAddress[] = $state();

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
      if (browserSvelte) {
        if (!currentlySelected.shortcuts.accountName) {
          currentlySelected = await getYakklCurrentlySelected();
        }
        yakklAccountsStore = await getYakklAccounts();

        for (const account of yakklAccountsStore) {
          if (currentlySelected.shortcuts.blockchain === account.blockchain) {
            // Could use a variable of type ConnectedDomainAddress and push that instead but this is easier
            addresses.set(account.address, {
              address: account.address,
              name: account.name,
              alias: account.alias,
              blockchain: currentlySelected.shortcuts.blockchain,
              chainId: currentlySelected.shortcuts.chainId as number,
              checked: false,
            }); // Only add if not already there for a given blockchain
          }
        };

        filteredAddresses = addresses;
        accountNumber = addresses.size;
      }
    } catch(e) {
      log.error(e);
    }
  }


  // (async () => {
  //   await getAccounts();
  // })();


  $effect(() => {
    try {
      filteredAddresses = addresses.has(searchTerm) ? addresses : new Map([...addresses].filter(([k, v]) => v.name.toLowerCase().includes(searchTerm.toLowerCase())));
      filteredAddressesArray = Array.from(filteredAddresses.values());
    } catch(e) {
      log.error(e);
    }
  });

  onMount(async () => {
    try {
      if (browserSvelte) {
        currentlySelected = await getYakklCurrentlySelected();

        await getAccounts();
        port = browser_ext.runtime.connect({name: YAKKL_DAPP});
        if (port) {
          port.onMessage.addListener(async (event: any) => {
            requestData = event.data;

            if (event.method === 'get_params') {
              domainTitle = requestData?.data?.metaDataParams?.title ?? '';
              domain = requestData?.data?.metaDataParams?.domain ?? '';
              domainLogo = requestData?.data?.metaDataParams?.icon ?? '/images/logoBullLock48x48.png';
              domain = domain.trim();

              if (!requestId) requestId = requestData?.id ?? null;
              if (!domain || !requestId) {
                showFailure = true;
              } else {
                // Update the connected domains
                yakklConnectedDomainsStore =  await getYakklConnectedDomains();
                if (yakklConnectedDomainsStore) {
                  yakklConnectedDomainsStore.find(element => {
                    if (element.domain === domain) {
                      let counter = 0;

                      for (const address of element.addresses) {
                        let index = -1;
                        let itemElem: ConnectedDomainAddress | null = null;

                        // Find the item in the items array
                        for (const [i, [key, value]] of Array.from(addresses.entries()).entries()) {
                          if (key === address.address) {
                            itemElem = value;
                            index = i;
                            accounts.push(value);
                            break;
                          }
                        };

                        counter++;
                        if (counter > accountNumber) {
                          return true; // circuit breaker
                        }

                        if (index >= 0) {
                          (document.getElementById("cb" + index.toString()) as HTMLInputElement).checked = true;
                          if (itemElem) itemElem.checked = true;
                        }

                      // let counter = 0;
                      // let index = 0;

                      // for (const address of element.addresses) {
                      //   let itemElem: ConnectedDomainAddress | undefined;
                      //   counter++;

                      //   if (counter > accountNumber) {
                      //     return; // circuit breaker
                      //   }

                      //   itemElem = addresses.get(address.address);
                      //   if (itemElem) {
                      //     index++;
                      //     (document.getElementById("cb" + index.toString()) as HTMLInputElement).checked = true;
                      //     itemElem.checked = true;
                      //     accounts.push(itemElem);
                      //   }
                      // }
                      // return;
                      };
                    }
                  });
                }
              }
            }
         });
          port.postMessage({method: 'get_params', id: requestId});
        }
      }
    } catch(e) {
      log.error(e);
    }
  });


  onDestroy( () => {
    try {
      if (browserSvelte) {
        if (port) {
          // port.onMessage.removeListener();
          port.disconnect();
          port = undefined;
        }
      }
    } catch(e) {
      log.error(e);
    }
  });


  function handleAccount(item: ConnectedDomainAddress, e: MouseEvent) {
    try {
      let index = -1;
      if (!item) throw 'No item was found.';
      const target = e.target as HTMLInputElement;
      if (!target) throw 'No event was found.';

      item.checked = target.checked;

      if (addresses.size > 0 && item.checked === true) {
        accounts.find((element, i) => {
          if (element.address === item.address) {
            index = i;
            return true;
          }
        });
        if (index >= 0) {
          accounts.splice(index,1);
          return;
        }
      }

      if (item.checked === true) {
        accounts.push(item);
      } else {
        index = -1;
        accounts.find((element, i) => {
          if (element.address === item.address) {
            index = i;
            return true;
          }
        });
        if (index >= 0) {
          accounts.splice(index, 1);
        }
      }
      accountsPicked = accounts.length;
    } catch(e) {
      log.error(e);
    }
  }

  // Not used but could be useful for future use
  // function handleToggleAll(e: any) {
  //   try {
  //     let arrIndex = 0;
  //     let accountsStore = [];

  //     if ($yakklAccountsStore?.length === 0) {
  //       throw 'No accounts are present.';
  //     }
  //     accountsStore = $yakklAccountsStore;

  //     if (!e || !e?.srcElement) throw 'No event was found.';

  //     if (e.srcElement.checked) {
  //       accounts.length = 0;
  //       addresses.clear();
  //       // select them all...
  //       for (const [index, account] of accountsStore.entries()) {
  //         if (currentlySelected.shortcuts.blockchain === account.blockchain) {
  //           addresses.set(account.address, {
	// 								address: account.address,
  //                 name: account.name,
  //                 alias: account.alias,
	// 								blockchain: currentlySelected.shortcuts.blockchain,
	// 								chainId: currentlySelected.shortcuts.chainId,
  //                 checked: true,
	// 							}); // Only add if not already there for a given blockchain

  //           // accounts.push({address: item.address, name: item.name, alias: item.alias, checked: true});

  //           (document.getElementById("cb" + index.toString()) as HTMLInputElement).checked = true;
  //         }
  //       };
  //     } else {
  //       // unselect them all...
  //       addresses.clear();
  //       for (const [index, account] of accountsStore.entries()) {
  //         if (currentlySelected.shortcuts.blockchain === account.blockchain) {
  //           addresses.set(account.address, {
	// 								address: account.address,
  //                 name: account.name,
  //                 alias: account.alias,
	// 								blockchain: currentlySelected.shortcuts.blockchain,
	// 								chainId: currentlySelected.shortcuts.chainId,
  //                 checked: false,
	// 							}); // Only add if not already there for a given blockchain
  //           (document.getElementById("cb" + index.toString()) as HTMLInputElement).checked = false;
  //         }
  //       };
  //       accounts.length = 0;
  //     }
  //   } catch(e) {
  //     console.log(e);
  //   }
  // }

  function handleConfirm() {
    accountsPicked = accounts.length;
    if (accounts.length > 0) {
      showConfirm=true;
    } else {
      showConfirm=false;
      warningValue = 'No accounts were selected. Access to YAKKL® is denied.';
      showWarning=true;
    }
  }

  // Final accepted step so all updates and confirmations are done here
  async function handleProcess() {
    let domains: YakklConnectedDomain[] = [];
    let addDomain = false;

    try {
      if (!domain) {
        throw 'No domain name is present.';
      }
      if (yakklAccountsStore.length === 0) {
        throw 'No accounts are present.';
      }

      showProgress = true;

      if (yakklConnectedDomainsStore) {
        domains = deepCopy(yakklConnectedDomainsStore);
      }
      if (domains?.length > 0) {
        let domainFound: boolean = false;
        domains.find((element) => {
          if (element.domain === domain) {
            element.addresses.length = 0;
            element.updateDate = dateString();
            for (const item of accounts) {
              if (!element.addresses.includes(item)) {
                element.addresses.push(item);
              }
            }
            domainFound = true; //element;
            return true;
          }
        });

        if (!domainFound) {
          addDomain = true;
        } else {
          addDomain = false;
        }
      } else {
        addDomain = true;
      }

      let localAddresses: AccountAddress[] = [];
      for (const item of accounts) {
        if (!localAddresses.find((address) => {address.address === item.address})) {
          localAddresses.push({address: item.address, name: item.name, alias: item.alias, blockchain: currentlySelected!.shortcuts.blockchain as string,
            chainId: currentlySelected!.shortcuts.chainId as number});
        }
      };

      if (addDomain === true) {
        domains.push({
          id: currentlySelected!.id,
          addresses: localAddresses,
          name: domainTitle,
          domain: domain,
          icon: domainLogo,
          permissions: [],
          version: currentlySelected!.version,
          createDate: dateString(),
          updateDate: dateString()
        });
      } else {
        domains.find((element: YakklConnectedDomain) => {
          if (element.domain === domain) {
            element.name = domainTitle;
            element.icon = domainLogo;
            element.addresses = localAddresses;
            element.version = currentlySelected!.version;
            element.updateDate = dateString();
            return;
          }
        });
      }

      // Update storage and stores
      yakklConnectedDomainsStore = deepCopy(domains);
      await setYakklConnectedDomainsStorage(domains);

      let yakklAccounts: YakklAccount[] = [];
      yakklAccounts = deepCopy(yakklAccountsStore);
      for (const item of accounts) {
        yakklAccounts.find(element => {
          if (element.address === item.address) {
            if (!element.connectedDomains.includes(domain)) {
              element.connectedDomains.push(domain);
            }
            return;
          }
        });
      };

      yakklAccountsStore = deepCopy(yakklAccounts);
      await setYakklAccountsStorage(yakklAccountsStore);

      let sendAccounts = [];
      for (const item of localAddresses) {
          sendAccounts.push(item.address);
      }

      let yakklCurrentlySelected = await getYakklCurrentlySelected();
      let chainId = yakklCurrentlySelected.shortcuts.chainId;

      if (port)
        port.postMessage({id: requestId, method: 'eth_requestAccounts', type: 'YAKKL_RESPONSE', chainId: chainId, result: sendAccounts});

      showConfirm = false;
      showSuccess = false; //true;

      await close();

    } catch (error: any) {
      log.error('Dapp - accounts process error:', true, error);
      errorValue = error as string;
      resetValuesExcept('showFailure');
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
        port.postMessage({id: requestId, method: 'eth_requestAccounts', response: {type: 'error', data: {name: 'ProviderRPCError', code: 4001, message: 'User rejected the request.'}}});
      }

    } catch(e) {
      log.error(e);
    } finally {
      // If requestId is not valid then use 0 since we are bailing out anyway
      // May want to think about putting a slight tick to make sure all queues get flushed
      //goto(PATH_LOGOUT); // May want to do something else if they are already logged in!
      if (browserSvelte) {
        await close();
      }
    }
  }

async function close() {
  await wait(1000); // Wait for the port to disconnect and message to go through
  window.close();
}

</script>

<svelte:head>
	<title>{DEFAULT_TITLE}</title>
</svelte:head>

<ProgressWaiting bind:show={showProgress} title="Processing" value="Verifying selected accounts..."/>

<!-- <Confirm bind:show={showConfirm} title="Connect to {domain}" content="This will connect {domain} to {accountsPicked} of your addresses! Do you wish to continue?" handleConfirm={handleProcess}/> -->

<!-- <Warning bind:show={showWarning} title="Warning!" content={warningValue}/>

<Failed bind:show={showFailure} title="Failed!" content={errorValue} handleReject={() => {window.close()}}/>

<Success bind:show={showSuccess} title="Success!" content="{domain} is now connected to YAKKL®" handleConfirm={() => {window.close()}}/> -->

{#if showConfirm}
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
  <div class="bg-base-100 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
    <h3 class="text-lg font-bold mb-4">Connect to {domain}</h3>
    <p class="mb-6">Connect <span class="font-bold text-primary">{accountsPicked}</span> address{accountsPicked > 1 ? 'es' : ''} to {domain}?</p>
    <div class="flex justify-end gap-4">
      <button class="btn btn-outline" onclick={() => showConfirm = false}>Cancel</button>
      <button class="btn btn-primary" onclick={handleProcess}>Connect</button>
    </div>
  </div>
</div>
{/if}

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="p-4 border-b border-base-300">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src={domainLogo} alt="Dapp logo" class="w-8 h-8 rounded-full" />
        <span class="font-semibold">{domainTitle || domain}</span>
      </div>
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button onclick={handleReject} class="btn btn-ghost btn-sm">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 p-4">
    <div class="text-center mb-6">
      <h2 class="text-xl font-bold mb-2">Select Accounts</h2>
      <p class="text-base-content/80">Choose which accounts to connect with this site</p>
    </div>

    <!-- Search -->
    <div class="relative mb-4">
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Search accounts"
        class="input input-bordered w-full pl-10"
      />
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>

    <!-- Account List -->
    <div class="overflow-y-auto max-h-[300px] rounded-lg border border-base-300">
      {#await filteredAddresses}
        <div class="p-4 text-center">
          <span class="loading loading-spinner"></span>
          <p class="mt-2">Loading accounts...</p>
        </div>
      {:then _}
        {#each filteredAddressesArray as item, i}
          <div class="flex items-center gap-3 p-3 hover:bg-base-200 border-b border-base-300 last:border-none">
            <input
              type="checkbox"
              id="cb{i}"
              class="checkbox checkbox-primary"
              onclick={(e) => handleAccount(item, e)}
              checked={item.checked}
            />
            <label for="cb{i}" class="flex-1 cursor-pointer">
              <div class="font-medium">{truncate(item.name, 20)}</div>
              <div class="text-sm text-base-content/70">
                {truncate(item.address, 6) + item.address.substring(item.address.length - 4)}
                {#if item?.alias?.length > 0}
                  <span class="ml-2 text-primary">{item.alias}</span>
                {/if}
              </div>
            </label>
          </div>
        {/each}
      {/await}
    </div>
  </div>

  <!-- Footer -->
  <div class="p-4 border-t border-base-300">
    <div class="flex gap-4 justify-end">
      <button onclick={handleReject} class="btn btn-outline">
        Cancel
      </button>
      <button onclick={handleConfirm} class="btn btn-primary">
        Connect ({accountsPicked})
      </button>
    </div>
  </div>
</div>

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


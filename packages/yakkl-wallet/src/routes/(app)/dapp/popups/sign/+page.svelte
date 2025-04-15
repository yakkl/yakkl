<script lang="ts">
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { navigating, page } from '$app/state';
  import { getYakklCurrentlySelected, getYakklAccounts, getMiscStore, getDappConnectRequestStore, setDappConnectRequestStore, yakklDappConnectRequestStore } from '$lib/common/stores';
  import { isEncryptedData, type AccountData, type YakklAccount, type YakklCurrentlySelected } from '$lib/common';
  import { YAKKL_DAPP } from '$lib/common/constants';
  import { onMount, onDestroy } from 'svelte';
  import { wait } from '$lib/common/utils';
  import { decryptData } from '$lib/common/encryption';
  import { log } from '$plugins/Logger';
  import type { Runtime } from 'webextension-polyfill';
  import type { JsonRpcResponse, YakklRequest } from '$lib/common/interfaces';
	import Confirmation from '$lib/components/Confirmation.svelte';
	import { requestSigning } from '$lib/extensions/chrome/signingClient';

  type RuntimePort = Runtime.Port | undefined;

  // let wallet: Wallet;

  let currentlySelected: YakklCurrentlySelected;
  let yakklMiscStore: string;
  let yakklDappConnectRequest: string | null;

  let showConfirm = $state(false);
  let showSuccess = $state(false);
  let showFailure = $state(false);
  let showSpinner = $state(false);
  let errorValue = $state('No domain/site name was found. Access to YAKKL® is denied.');
  let port: RuntimePort | undefined;

  let domain: string = $state('');
  let domainLogo: string = $state('');
  let domainTitle: string = $state('');
  let requestData: any;
  let method: string;
  let requestId: string | null;
  let message: any = $state('');  // This gets passed letting the user know what the intent is
  let context: any;
  let address: string = $state('');
  let signedData: any;
  let chainId: number;

  let params: any[] = $state([]);

  let personal_sign = {
    dataToSign: '',   // Only used for personal_sign
    address: '',
    description: '',
  };

  interface SignTypedData {
    address: string;
    dataToSign: string | Record<string, any>;
  };

  let signTypedData_v3v4: SignTypedData;

  signTypedData_v3v4 = {
    address: '',
    dataToSign: '',
  }

  let messageValue; // Used to display non-hex data that matches transaction or message
  let pass = false;

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

      log.info('pass:', false, pass, navigating, navigating?.from?.url?.pathname);

      if (pass !== true) {
        if (requestId) {
          pass = true;
        } else {
          if (browserSvelte) {
            throw new Error('Did not navigate from approved source and/or requestId not found');
          }
        }
      }
    } catch(e) {
      log.error(e);
      throw e;
    }
  }

  onMount(async () => {
    try {
      if (browserSvelte) {
        currentlySelected = await getYakklCurrentlySelected();
        yakklMiscStore = getMiscStore();
        yakklDappConnectRequest = getDappConnectRequestStore();
        method = page.url.searchParams.get('method') as string ?? '';
        yakklDappConnectRequest = requestId = page.url.searchParams.get('requestId') as string;
        setDappConnectRequestStore(yakklDappConnectRequest);
        chainId = currentlySelected.shortcuts.chainId as number;

        port = browser_ext.runtime.connect({name: YAKKL_DAPP});
        if (port) {
          port.onMessage.addListener(async(event: any) => {
            requestData = event.data;
            // method = context;

            log.info('Sign: event: ====>>', false, event, event.method, event.params);

            // TODO: Add a logo with an X with the text 'NO LOGO'
            if (!domainLogo) domainLogo = '/images/logoBullLock48x48.png'; // Set default logo but change if favicon is present

            if (event.method === 'get_params') {
              domainTitle = requestData?.data?.metaDataParams?.title ?? '';
              domain = requestData?.data?.metaDataParams?.domain ?? '';
              // Get favicon from URL parameters first, fall back to metadata
              const url = new URL(window.location.href);
              const favicon = url.searchParams.get('favicon');
              // Need to add getIcon() in inpage or content script
              domainLogo = favicon ?? requestData?.data?.metaDataParams?.icon ?? '/images/logoBullLock48x48.png';
              message = requestData?.data?.metaDataParams?.message ?? 'Nothing was passed in explaining the intent of this approval. Be mindful!';
              context = requestData?.data?.metaDataParams?.context ?? 'eth_signTypedData_v4';
              params = requestData?.data?.metaDataParams?.transaction ?? [];

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

              log.info('Sign: domain:', false, domain, domainTitle, domainLogo, message);

              if (!requestId) requestId = requestData?.id ?? null;
              if (!requestId) {
                  showFailure = true;
                  errorValue = 'No request ID was found. Access to YAKKL® is denied.';
                  throw errorValue;
              }
              let data;

              log.debug('Sign: method', false, {context, params, requestData, event, message});

              switch(context) {
                case 'personal_sign':
                  personal_sign.dataToSign = params[0];
                  personal_sign.address = address = params[1];
                  personal_sign.description = message = params[2];
                  log.info('Sign: personal_sign:', false, personal_sign);
                  break;
                // case 'eth_signTypedData_v3': // Not currently used but keep for now
                case 'eth_signTypedData_v4':
                  log.info('Sign: eth_signTypedData_v4:', false, params);
                  signTypedData_v3v4.address = address = params[0];
                  signTypedData_v3v4.dataToSign = params[1];
                  if (typeof signTypedData_v3v4.dataToSign === 'string') {
                    data = JSON.parse(signTypedData_v3v4.dataToSign);
                  } else {
                    data = signTypedData_v3v4.dataToSign;
                  }
                  message = data.message?.contents;
                  break;
                default:
                  messageValue = 'No message request was passed in. Error.';
                  break;
              }
            }
          });
        }

        if (port) {
          // const request: YakklRequest = {
          //   type: 'YAKKL_REQUEST:EIP6963',
          //   method: 'get_params',
          //   id: requestId,
          //   params: []
          // };
          // port.postMessage(request);

          // log.info('Sign: get_params request sent', false, request);

          log.info('Sign: get_params request sent', false, {method: 'get_params', id: requestId});

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

  async function handleReject(message: string = 'User rejected the request.') {
    try {
      if (browserSvelte) {
        showConfirm = false;
        showFailure = false;
        showSuccess = false;
        if (port) {
          port.postMessage({
            type: 'YAKKL_RESPONSE:EIP6963',
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: 4001,
              message: message
            }
          });
        }
      }
    } catch(e) {
      log.error(e);
    } finally {
      close();
    }
  }

async function handleProcess() {
  try {
    if (!browserSvelte) {
      handleReject();
    }
    let accounts: YakklAccount[] = [];
    accounts = await getYakklAccounts();
    if (!accounts) handleReject();

    log.info('Sign: handleProcess:', false, {accounts, address});

    const accountFound = accounts.find(element => {
      if (element.address === address)
        return element;
    });

    if (!accountFound) handleReject();

    const account: YakklAccount = accountFound as YakklAccount;

    log.info('Sign: handleProcess:', false, {account});

    if (isEncryptedData(account.data)) {
      await decryptData(account.data, yakklMiscStore).then(result => {
        account.data = result as AccountData;
      });
    }
    if (!(account.data as AccountData).privateKey) handleReject();

    log.info('Sign: handleProcess:', false, {context, params, requestId});

    // Use signingClient to handle the signing request
    signedData = await requestSigning(context, params, requestId);

    log.info('Sign: handleProcess:', false, {signedData, port});

    // Send response to dapp
    if (port) {
      const response: JsonRpcResponse = {
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        id: requestId,
        result: signedData
      };
      port.postMessage(response);
    } else {
      handleReject("Request failed to send to dapp due to connection port not found.");
    }
    close();
  } catch(e) {
    log.error(e);
    errorValue = e as string;
    showFailure = true;
  }
}

async function close() {
  if (browserSvelte) {
    // await wait(1000);
    // window.close();
  }
}

function handleConfirm() {
  showConfirm = true;
}

</script>

<svelte:head>
	<title>YAKKL® Smart Wallet</title>
</svelte:head>

<Confirmation bind:show={showConfirm} title="Connect to {domain}" message="This will connect {domain} to {address} and sign the transaction or message! Do you wish to continue?" onConfirm={handleProcess}/>

<div class="flex flex-col h-full max-h-screen overflow-hidden">
  <!-- Header -->
  <div class="p-4 border-b border-base-300 flex-shrink-0">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <img id="dappImageId" crossorigin="anonymous" src={domainLogo} alt="Dapp logo" class="w-8 h-8 rounded-full flex-shrink-0" />
        <span class="font-semibold truncate" title={domainTitle || domain}>{domainTitle || domain}</span>
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

  <!-- Content-->
  <div class="flex-1 p-6 overflow-hidden flex flex-col min-w-[360px] max-w-[426px]">
    <div class="text-center mb-4 flex-shrink-0">
      <span class="text-md font-bold mb-2">Signing of Message requesting permission to execute: PLEASE be mindful and know what you are doing. There is no cancel or return option! Be 100% sure or REJECT this transaction and research more before trying again.</span>
    </div>

    <div class="overflow-auto flex-1 min-h-0 mb-4">
      <span class="text-sm">
        Data to sign: {message}
      </span>
    </div>
  </div>

  <!-- Footer -->
  <div class="p-4 border-t border-base-300 flex-shrink-0">
    <div class="flex gap-4 justify-end">
      <button onclick={() => handleReject()} class="btn btn-outline">
        Reject
      </button>
      <button onclick={handleConfirm} class="btn btn-primary">
        Approve
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
  /* .overflow-y-auto {
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
  } */
</style>


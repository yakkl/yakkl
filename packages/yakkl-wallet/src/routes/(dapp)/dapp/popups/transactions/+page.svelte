<script lang="ts">
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { getYakklCurrentlySelected, getMiscStore, yakklDappConnectRequestStore, getYakklConnectedDomains, getYakklAccounts, getSettings } from '$lib/common/stores';
  import { DEFAULT_TITLE, YAKKL_DAPP, ETH_BASE_SCA_GAS_UNITS, ETH_BASE_EOA_GAS_UNITS } from '$lib/common/constants';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { type AccountData, type BigNumberish, type TransactionRequest, type TransactionResponse, type YakklAccount, type YakklCurrentlySelected, type JsonRpcResponse, type SessionInfo } from '$lib/common';
  import { decryptData } from '$lib/common/encryption';
  import { isEncryptedData } from '$lib/common/misc';
  import WalletManager from '$lib/plugins/WalletManager';
  import type { Wallet } from '$lib/plugins/Wallet';
  import { log } from '$lib/common/logger-wrapper';
  import { sessionToken, verifySessionToken } from '$lib/common/auth/session';
  import type { BackgroundPendingRequest } from '$lib/extensions/chrome/background';
  import Confirmation from '$lib/components/Confirmation.svelte';
  import Warning from '$lib/components/Warning.svelte';
  import Failed from '$lib/components/Failed.svelte';
  import { createPortManagerWithStream, PortManagerWithStream } from '$lib/plugins/PortManagerWithStream';
  import type { PortDuplexStream } from '$lib/plugins/PortStreamManager';
  import { safeLogout } from '$lib/common/safeNavigate';
	import { formatEther } from '$lib/utilities/utilities';
	import PincodeVerify from '$lib/components/PincodeVerify.svelte';

  // State management with Svelte 5 syntax
  let currentlySelected: YakklCurrentlySelected;
  let wallet: Wallet;
  let yakklMiscStore: string;

  let showConfirm = $state(false);
  let showSuccess = $state(false);
  let showFailure = $state(false);
  let showSpinner = $state(false);
  let showPincode = $state(false);
  let errorValue = $state('No domain/site name was found. Access to YAKKL® is denied.');

  let chainId: number;
  let domain: string = $state('');
  let domainLogo: string = $state('');
  let domainTitle: string = $state('');
  let title: string = $state(DEFAULT_TITLE);
  let method: string;
  let requestId: string | null;
  let message: string = $state('');
  let pinCode: string = $state('');

  let transaction: TransactionRequest = $state({} as TransactionRequest);
  let transactionDisplay: any = $state({});
  let gasLimit: BigNumberish = $state(0n);
  let addressApproved = $state(false);
  let tx: TransactionResponse | null = $state(null);

  let portManager: PortManagerWithStream | null = null;
  let stream: PortDuplexStream | null = null;

  // Extract parameters from URL
  if (browserSvelte) {
    try {
      requestId = page.url.searchParams.get('requestId');
      method = page.url.searchParams.get('method') || 'eth_sendTransaction';
      $yakklDappConnectRequestStore = requestId as string;

      if (!requestId) {
        errorValue = 'No request ID was found. Access to YAKKL® is denied.';
        showFailure = true;
      }
    } catch(e) {
      log.error('Error parsing URL parameters:', false, e);
      errorValue = 'Invalid request parameters. Access to YAKKL® is denied.';
      showFailure = true;
    }
  }

  // Process incoming message from background
  async function onMessageListener(event: any) {
    try {
      if (event.method === 'get_params') {
        const request = event.result as BackgroundPendingRequest;

        if (!request?.data?.metaData) {
          await handleReject('Invalid request data. Access to YAKKL® is denied.');
          return;
        }

        const requestData = request.data;
        const metaData = requestData.metaData.metaData;

        // Extract domain information
        domainTitle = metaData.title || '';
        domain = metaData.domain || '';
        domainLogo = metaData.icon || '/images/failIcon48x48.png';
        message = metaData.message || 'Transaction request from ' + domain;
        title = domainTitle || domain || DEFAULT_TITLE;

        // Process transaction data
        if (requestData.params && requestData.params.length > 0) {
          transaction = requestData.params[0] as TransactionRequest;

          // Format transaction for display
          await formatTransactionForDisplay();

          // Verify the address is connected
          await verifyAddressConnection();
        } else {
          await handleReject('No transaction data found. Access to YAKKL® is denied.');
        }
      }
    } catch(e) {
      log.error('Error processing message:', false, e);
      await handleReject('An error occurred while processing the request.');
    }
  }

  // Format transaction for user-friendly display
  async function formatTransactionForDisplay() {
    transactionDisplay = {
      from: transaction.from,
      to: transaction.to,
      value: transaction.quantity ? formatEther(transaction.quantity.toString()) + ' ETH' : '0 ETH',
      data: transaction.data ? `Data: ${(transaction.data as string).slice(0, 10)}...` : 'No data',
      gasLimit: 'Will be calculated',
      estimatedFee: 'Calculating...'
    };

    // Estimate gas if not provided
    if (!transaction.gasLimit) {
      const blockchain = wallet?.getBlockchain();
      if (blockchain?.isSmartContractSupported()) {
        const isSmartContract = await blockchain.isSmartContract(transaction.to as string);
        gasLimit = isSmartContract ? ETH_BASE_SCA_GAS_UNITS : ETH_BASE_EOA_GAS_UNITS;

        // Add extra gas for data
        if (transaction.data) {
          const dataLength = (transaction.data as string).length - 2; // Remove '0x'
          gasLimit = BigInt(gasLimit) + BigInt(dataLength * 68);
        }
      } else {
        gasLimit = ETH_BASE_EOA_GAS_UNITS;
      }

      // Check for user override
      if (currentlySelected?.shortcuts?.gasLimit) {
        gasLimit = currentlySelected.shortcuts.gasLimit;
      }

      transactionDisplay.gasLimit = gasLimit.toString();
    }
  }

  // Verify the sending address is connected to this domain
  async function verifyAddressConnection() {
    const addressToCheck = transaction.from as string;
    const connectedDomains = await getYakklConnectedDomains();

    for (const domainInfo of connectedDomains) {
      if (domainInfo.domain === domain) {
        const connectedAddress = domainInfo.addresses.find(addr =>
          addr.address.toLowerCase() === addressToCheck.toLowerCase()
        );

        if (connectedAddress) {
          addressApproved = true;
          break;
        }
      }
    }

    if (!addressApproved) {
      errorValue = `The address ${addressToCheck} is not connected to ${domain}. Please connect the address first.`;
      showFailure = true;
    }
  }

  onMount(async () => {
    try {
      if (browserSvelte) {
        const settings = await getSettings();
        if (!settings.init || !settings.legal.termsAgreed) {
          errorValue = "You must register and agree to the terms of service before using YAKKL®. Click on 'Open Wallet' to register.";
          showFailure = true;
          return;
        }

        currentlySelected = await getYakklCurrentlySelected();
        yakklMiscStore = getMiscStore();
        chainId = currentlySelected.shortcuts.chainId as number;

        // Initialize wallet
        wallet = WalletManager.getInstance(
          ['Alchemy'],
          ['Ethereum'],
          chainId,
          import.meta.env.VITE_ALCHEMY_API_KEY_PROD
        );

        // Request session port
        const sessionInfo = await browser_ext.runtime.sendMessage({
          type: 'REQUEST_SESSION_PORT',
          requestId
        }) as SessionInfo;

        if (!sessionInfo?.success) {
          log.warn('Failed to verify session port. No response received. Using YAKKL_DAPP.');
        }

        // Create port connection
        portManager = createPortManagerWithStream(sessionInfo.portName || YAKKL_DAPP);
        portManager.setRequestId(requestId);

        const success = await portManager.createPort();
        if (!success) {
          errorValue = 'Failed to connect to background service.';
          showFailure = true;
          return;
        }

        stream = portManager.getStream();
        if (!stream) {
          errorValue = 'Communication stream unavailable.';
          showFailure = true;
          return;
        }

        // Set up message listener and request params
        stream.on('data', onMessageListener);
        stream.write({ method: 'get_params', id: requestId });
      }
    } catch(e) {
      log.error('Initialization error:', false, e);
      errorValue = 'Failed to initialize transaction approval.';
      showFailure = true;
    }
  });

  // Handle user rejection
  async function handleReject(message: string = 'User rejected the request.') {
    try {
      showConfirm = false;
      showFailure = false;
      showSuccess = false;

      if (stream) {
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
      log.error('Error sending rejection:', false, e);
    } finally {
      await close();
    }
  }

  // Handle transaction approval
  async function handleApprove() {
    try {
      showConfirm = false;

      // Verify session token
      if (!verifySessionToken($sessionToken)) {
        await handleReject("Session expired. Please log in again.");
        return;
      }

      // // Verify credentials
      // if (!pinCode) {
      //   await handleReject("Please provide your pin code.");
      //   return;
      // }

      // const profile = await verify(userName.toLowerCase().trim().replace('.nfs.id', '') + '.nfs.id' + password);
      // if (!profile) {
      //   await handleReject("Invalid credentials.");
      //   return;
      // }

      showSpinner = true;

      // Get the account's private key
      const accounts = await getYakklAccounts();
      const account = accounts.find(acc =>
        acc.address.toLowerCase() === transaction.from?.toLowerCase()
      ) as YakklAccount;

      if (!account) {
        await handleReject("Account not found.");
        return;
      }

      // Decrypt account data if needed
      if (isEncryptedData(account.data)) {
        account.data = await decryptData(account.data, yakklMiscStore) as AccountData;
      }

      if (!(account.data as AccountData).privateKey) {
        await handleReject("Account key not available.");
        return;
      }

      // Prepare transaction
      transaction.gasLimit = gasLimit;
      transaction.nonce = -1; // Let provider set the nonce
      transaction.type = 2; // EIP-1559
      transaction.chainId = chainId;

      // Send transaction
      tx = await wallet.sendTransaction(transaction);

      if (tx?.hash) {
        // Send successful response
        if (stream) {
          const response: JsonRpcResponse = {
            type: 'YAKKL_RESPONSE:EIP6963',
            jsonrpc: '2.0',
            id: requestId,
            result: tx.hash
          };
          stream.write(response);
        }

        // Wait for confirmation
        tx.wait().then(async () => {
          showSuccess = true;
          setTimeout(async () => {
            await close();
          }, 2000);
        }).catch((error: any) => {
          errorValue = `Transaction failed: ${error.message}`;
          showFailure = true;
          showSpinner = false;
        });
      } else {
        throw new Error('No transaction hash received');
      }
    } catch(e) {
      log.error('Transaction error:', false, e);
      errorValue = e instanceof Error ? e.message : 'Transaction failed';
      showFailure = true;
      showSpinner = false;
    }
  }

  // Close the window
  async function close() {
    if (browserSvelte) {
      if (portManager) {
        try {
          await portManager.waitForIdle(1500);
          portManager.disconnect();
        } catch (e) {
          log.warn('Port did not go idle in time', false, e);
        }
      }
      showSpinner = false;
      safeLogout();
    }
  }

  function handleConfirm() {
    showConfirm = true;
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<!-- <Warning bind:show={showFailure} title="Error" value={errorValue} /> -->
<Failed bind:show={showFailure} title="Failed!" content={errorValue} onReject={handleReject}/>
<Confirmation bind:show={showConfirm} title="Approve Transaction" message="Are you sure you want to send this transaction? This action cannot be undone." onConfirm={handleApprove}/>
<PincodeVerify bind:show={showPincode} onVerified={handleApprove}/>

<!-- <div class="modal" class:modal-open={showConfirm}>
  <div class="modal-box relative">
    <div class="border border-base-content rounded-md m-2 text-center p-1">
      <h1 class="font-bold">Transaction Approval</h1>
      <p class="pt-4">Please enter your pin code to approve this transaction to <span class="font-bold underline">{domain}</span>.</p>
    </div>
    <div class="form-control w-full">
      <input
        type="password"
        placeholder="Pin code"
        class="input input-bordered input-primary w-full"
        bind:value={pinCode}
        autocomplete="off"
        required
      />
    </div>
    <div class="modal-action">
      <button class="btn" onclick={() => { showConfirm = false; }}>Reject</button>
      <button class="btn btn-primary" onclick={handleApprove}>Approve</button>
    </div>
  </div>
</div> -->

<div class="modal" class:modal-open={showSuccess}>
  <div class="modal-box relative">
    <h3 class="text-lg font-bold">Transaction Submitted!</h3>
    <p class="py-4">Your transaction has been submitted to the blockchain.</p>
    <p class="text-sm">Transaction Hash: {tx?.hash}</p>
    <div class="modal-action">
      <button class="btn" onclick={close}>Close</button>
    </div>
  </div>
</div>

{#if !showConfirm && !showSuccess && !showFailure}
<div class="flex flex-col h-full max-h-screen overflow-hidden">
  <!-- Header -->
  <div class="p-4 border-b border-base-300 flex-shrink-0">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 min-w-0">
        <img crossorigin="anonymous" src={domainLogo} alt="Dapp logo" class="w-8 h-8 rounded-full flex-shrink-0" />
        <span class="font-semibold truncate">{domainTitle || domain}</span>
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
  <div class="flex-1 p-6 overflow-hidden flex flex-col">
    <div class="text-center mb-4 flex-shrink-0">
      <h2 class="text-xl font-bold mb-2">Transaction Request</h2>
      <p class="text-base-content/80">{message}</p>
    </div>

    <div class="overflow-y-auto flex-1 min-h-0 mb-4">
      <div class="bg-base-200 rounded-lg p-4 space-y-3">
        <div class="flex justify-between items-center border-b border-base-300 pb-2">
          <span class="font-medium">From:</span>
          <span class="font-mono text-sm">{transactionDisplay.from}</span>
        </div>
        <div class="flex justify-between items-center border-b border-base-300 pb-2">
          <span class="font-medium">To:</span>
          <span class="font-mono text-sm">{transactionDisplay.to}</span>
        </div>
        <div class="flex justify-between items-center border-b border-base-300 pb-2">
          <span class="font-medium">Value:</span>
          <span class="font-bold text-primary">{transactionDisplay.value}</span>
        </div>
        <div class="flex justify-between items-center border-b border-base-300 pb-2">
          <span class="font-medium">Gas Limit:</span>
          <span>{transactionDisplay.gasLimit}</span>
        </div>
        {#if transaction.data}
        <div class="flex justify-between items-center">
          <span class="font-medium">Data:</span>
          <span class="text-sm truncate max-w-[200px]">{transactionDisplay.data}</span>
        </div>
        {/if}
      </div>

      {#if !addressApproved}
      <div class="alert alert-error mt-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Address not connected to this domain</span>
      </div>
      {/if}
    </div>

    {#if showSpinner}
    <div class="flex flex-col items-center justify-center p-4">
      <div class="loading loading-spinner loading-lg"></div>
      <p class="mt-2 font-bold animate-pulse">Processing transaction...</p>
    </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="p-4 border-t border-base-300 flex-shrink-0">
    <div class="flex gap-4 justify-end">
      <button onclick={() => handleReject()} class="btn btn-outline">
        Reject
      </button>
      <button
        onclick={handleConfirm}
        class="btn btn-primary"
        disabled={!addressApproved || showSpinner}
      >
        Approve
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

  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  /* Modal backdrop */
  .modal-open .modal-box {
    animation: modal-pop 0.3s ease-out;
  }

  @keyframes modal-pop {
    0% {
      transform: scale(0.9);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Loading animation */
  .loading {
    display: inline-block;
    width: 2rem;
    height: 2rem;
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: currentColor;
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>

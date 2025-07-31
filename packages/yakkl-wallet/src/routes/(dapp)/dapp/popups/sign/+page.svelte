<script lang="ts">
	import { browserSvelte } from '$lib/common/environment';
	import { browserAPI } from '$lib/services/browser-api.service';
	import { page } from '$app/state';
	import {
		getYakklCurrentlySelected,
		getMiscStore,
		yakklDappConnectRequestStore,
		getYakklAccounts,
		getSettings
	} from '$lib/common/stores';
	import {
		type YakklCurrentlySelected,
		type AccountData,
		type TransactionRequest,
		type YakklAccount
	} from '$lib/common';
	import {
		DEFAULT_TITLE,
		YAKKL_DAPP,
		ETH_BASE_SCA_GAS_UNITS,
		ETH_BASE_EOA_GAS_UNITS
	} from '$lib/common/constants';
	import { onMount } from 'svelte';
	import { log } from '$lib/common/logger-wrapper';
	// import type { Runtime } from 'webextension-polyfill';
	import type { JsonRpcResponse, SessionInfo, BackgroundPendingRequest } from '$lib/common/interfaces';
	import Confirmation from '$lib/components/Confirmation.svelte';
	import { requestSigning } from '$lib/extensions/chrome/signingClient';
	import Copyright from '$lib/components/Copyright.svelte';
	import Warning from '$lib/components/Warning.svelte';
	import Failed from '$lib/components/Failed.svelte';
	import {
		createPortManagerWithStream,
		PortManagerWithStream
	} from '$lib/managers/PortManagerWithStream';
	import type { PortDuplexStream } from '$lib/managers/PortStreamManager';
	import { sessionToken, verifySessionToken } from '$lib/common/auth/session';
	import { safeLogout } from '$lib/common/safeNavigate';
	import { decryptData } from '$lib/common/encryption';
	import { isEncryptedData } from '$lib/common/misc';
	import WalletManager from '$lib/managers/WalletManager';
	import type { Wallet } from '$lib/managers/Wallet';
	import { formatEther } from '$lib/utilities/utilities';

	// type RuntimePort = Runtime.Port | undefined;

	let currentlySelected: YakklCurrentlySelected;
	let yakklMiscStore: string;
	let wallet: Wallet;

	let showConfirm = $state(false);
	let showSuccess = $state(false);
	let showFailure = $state(false);
	let errorValue = $state('No domain/site name was found. Access to YAKKL® is denied.');

	let domain: string = $state('');
	let domainLogo: string = $state('');
	let domainTitle: string = $state('');
	let title: string = $state(DEFAULT_TITLE);
	let request: BackgroundPendingRequest;
	let method: string = $state('');
	let requestId: string | null;
	let message: any = $state('');
	let address: string = $state('');
	let signedData: any;
	let chainId: number;

	let params: any[] = $state([]);

	let personal_sign = {
		dataToSign: '',
		address: '',
		description: ''
	};

	interface SignTypedData {
		address: string;
		dataToSign: string | Record<string, any>;
	}

	let signTypedData_v3v4: SignTypedData = {
		address: '',
		dataToSign: ''
	};

	// For eth_signTransaction
	let transaction: TransactionRequest = $state({} as TransactionRequest);
	let transactionDisplay: any = $state({});
	let gasLimit: bigint = $state(0n);

	let messageValue;
	let pass = false;

	let portManager: PortManagerWithStream | null = null;
	let stream: PortDuplexStream | null = null;

	if (browserSvelte) {
		try {
			requestId = page.url.searchParams.get('requestId');
			method = (page.url.searchParams.get('method') as string) ?? '';
			$yakklDappConnectRequestStore = requestId as string;

			if (requestId) {
				pass = true;
			}
		} catch (e) {
			log.error(e);
			handleReject('No requestId or method was found. Access to YAKKL® is denied.');
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
				gasLimit = isSmartContract
					? BigInt(ETH_BASE_SCA_GAS_UNITS)
					: BigInt(ETH_BASE_EOA_GAS_UNITS);

				// Add extra gas for data
				if (transaction.data) {
					const dataLength = (transaction.data as string).length - 2;
					gasLimit = BigInt(gasLimit) + BigInt(dataLength * 68);
				}
			} else {
				gasLimit = BigInt(ETH_BASE_EOA_GAS_UNITS);
			}

			// Check for user override
			if (currentlySelected?.shortcuts?.gasLimit) {
				gasLimit = BigInt(currentlySelected.shortcuts.gasLimit);
			}

			transactionDisplay.gasLimit = gasLimit.toString();
		}
	}

	async function onMessageListener(event: any) {
		try {
			if (!domainLogo) domainLogo = '/images/failIcon48x48.png';

			if (event.method === 'get_params') {
				request = event.result;
				if (!request || !request.data) {
					return await handleReject('No request was found. Access to YAKKL® is denied.');
				}

				const requestData = request.data;
				if (
					!requestData ||
					!requestData.params ||
					!requestData.params[0] ||
					!requestData.metaData
				) {
					return await handleReject('Invalid request data. Access to YAKKL® is denied.');
				}

				if (!requestData.metaData.metaData.isConnected) {
					return await handleReject(
						'Domain is not connected. Connect to {domain} first via requestAccounts. Access to YAKKL® is denied.'
					);
				}

				domainTitle = requestData.metaData.metaData.title;
				domain = requestData.metaData.metaData.domain;
				domainLogo = requestData.metaData.metaData.icon;
				message =
					requestData.metaData.metaData.message ??
					'Nothing was passed to explain the intent of this approval. Be mindful of this request!';
				params = requestData.params ?? [];

				if (!Array.isArray(params)) {
					params = [params];
				}

				if (!requestId) requestId = requestData?.id ?? null;
				if (!requestId) {
					return await handleReject('No request ID was found. Access to YAKKL® is denied.');
				}

				title = domainTitle || domain || DEFAULT_TITLE;

				let data;
				switch (method) {
					case 'personal_sign':
						personal_sign.dataToSign = params[0];
						personal_sign.address = address = params[1];
						personal_sign.description = message;
						log.info('Sign: personal_sign:', false, personal_sign);
						break;
					case 'eth_signTypedData_v4':
						log.info('Sign: eth_signTypedData_v4:', false, params);
						signTypedData_v3v4.address = address = params[0];
						signTypedData_v3v4.dataToSign = params[1];
						if (typeof signTypedData_v3v4.dataToSign === 'string') {
							data = JSON.parse(signTypedData_v3v4.dataToSign);
						} else {
							data = signTypedData_v3v4.dataToSign;
						}
						message = data?.message?.contents || data;
						log.info('Sign: eth_signTypedData_v4:', false, { data, message });
						break;
					case 'eth_signTransaction':
						// Handle transaction signing
						transaction = params[0] as TransactionRequest;
						address = transaction.from as string;

						if (!wallet) {
							wallet = WalletManager.getInstance(
								['Alchemy'],
								['Ethereum'],
								chainId,
								import.meta.env.VITE_ALCHEMY_API_KEY_PROD
							);
						}

						await formatTransactionForDisplay();
						message = `Sign transaction from ${transaction.from} to ${transaction.to}`;
						log.info('Sign: eth_signTransaction:', false, transaction);
						break;
					default:
						messageValue = 'No message request was passed in. Error.';
						break;
				}
			}
		} catch (e) {
			log.error(e);
			await handleReject(
				'An error occurred while processing the request. Access to YAKKL® is denied.'
			);
		}
	}

	onMount(async () => {
		try {
			if (browserSvelte) {
				log.info('Dapp - sign page mounted:', false);

				const settings = await getSettings();
				if (!settings.init || !settings.legal.termsAgreed) {
					errorValue =
						"You must register and agree to the terms of service before using YAKKL®. Click on 'Open Wallet' to register.";
					showFailure = true;
					return;
				}

				currentlySelected = await getYakklCurrentlySelected();
				yakklMiscStore = getMiscStore();
				chainId = currentlySelected.shortcuts.chainId as number;

				// Initialize wallet for eth_signTransaction
				if (method === 'eth_signTransaction') {
					wallet = WalletManager.getInstance(
						['Alchemy'],
						['Ethereum'],
						chainId,
						import.meta.env.VITE_ALCHEMY_API_KEY_PROD
					);
				}

				const sessionInfo = (await browserAPI.runtimeSendMessage({
					type: 'REQUEST_SESSION_PORT',
					requestId
				})) as SessionInfo;

				log.info('Received session info:', false, sessionInfo);

				if (!sessionInfo || !sessionInfo.success) {
					log.warn('Failed to verify session port. No response received. Using YAKKL_DAPP.');
				}

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
		} catch (e) {
			log.error(e);
			errorValue =
				'Port setup error occurred while processing the request. Access to YAKKL® is denied.';
			showFailure = true;
		}
	});

	async function handleReject(message: string = 'User rejected the request.') {
		try {
			if (browserSvelte) {
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
			}
		} catch (e) {
			log.error(e);
		} finally {
			close();
		}
	}

	async function handleProcess() {
		try {
			if (!browserSvelte) {
				await handleReject();
			}

			if (!verifySessionToken($sessionToken)) {
				await handleReject('Session token is invalid. Login again.');
			}

			// Handle eth_signTransaction differently
			if (method === 'eth_signTransaction') {
				await handleSignTransaction();
			} else {
				// Use existing signingClient for other methods
				const response = await requestSigning(requestId, method, params, $sessionToken);
				if (!response) {
					await handleReject('Request failed due to no response from the signing request.');
				}

				if (response.error) {
					await handleReject(response.error.message || 'Signing request failed');
				}

				if (stream) {
					const jsonRpcResponse: JsonRpcResponse = {
						type: 'YAKKL_RESPONSE:EIP6963',
						jsonrpc: '2.0',
						id: requestId,
						result: response.result
					};
					stream.write(jsonRpcResponse);
					log.info('Sign: handleProcess - response:', false, { jsonRpcResponse });
				} else {
					await handleReject('Request failed to send to dapp due to connection port not found.');
				}
			}
			close();
		} catch (e) {
			log.error(e);
			errorValue = e instanceof Error ? e.message : 'Unknown error occurred';
			showFailure = true;
		}
	}

	async function handleSignTransaction() {
		try {
			// Get the account's private key
			const accounts = await getYakklAccounts();
			const account = accounts.find(
				(acc) => acc.address.toLowerCase() === transaction.from?.toLowerCase()
			) as YakklAccount;

			if (!account) {
				await handleReject('Account not found.');
				return;
			}

			// Decrypt account data if needed
			if (isEncryptedData(account.data)) {
				account.data = (await decryptData(account.data, yakklMiscStore)) as AccountData;
			}

			if (!(account.data as AccountData).privateKey) {
				await handleReject('Account key not available.');
				return;
			}

			// Prepare transaction
			transaction.gasLimit = gasLimit;
			transaction.nonce = transaction.nonce ?? -1; // Let provider set if not provided
			transaction.type = transaction.type ?? 2; // Default to EIP-1559
			transaction.chainId = chainId;

			// Create a signer with the private key
			await wallet.setSigner((account.data as AccountData).privateKey);

			// Get the blockchain provider from wallet
			const blockchain = wallet.getBlockchain();
			const provider = blockchain.getProvider();
			const signer = provider.getSigner();

			// Sign the transaction (but don't send it)
			const signedTx = await signer.signTransaction(transaction);

			// Send the signed transaction back
			if (stream) {
				const jsonRpcResponse: JsonRpcResponse = {
					type: 'YAKKL_RESPONSE:EIP6963',
					jsonrpc: '2.0',
					id: requestId,
					result: signedTx
				};
				stream.write(jsonRpcResponse);
				log.info('Sign: eth_signTransaction - response:', false, { jsonRpcResponse });
			} else {
				await handleReject('Request failed to send to dapp due to connection port not found.');
			}
		} catch (e) {
			log.error('Transaction signing error:', false, e);
			errorValue = e instanceof Error ? e.message : 'Transaction signing failed';
			showFailure = true;
		}
	}

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

	function handleConfirm() {
		showConfirm = true;
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<!-- <Warning bind:show={showFailure} title="Error" value={errorValue} /> -->
<Failed bind:show={showFailure} title="Failed!" content={errorValue} onReject={handleReject} />
<Confirmation
	bind:show={showConfirm}
	title="Connect to {domain}"
	message="This will connect {domain} to {address} and sign the transaction or message! Do you wish to continue?"
	onConfirm={handleProcess}
/>

<div class="flex flex-col h-full max-h-screen overflow-hidden">
	<!-- Header -->
	<div class="p-4 border-b border-base-300 flex-shrink-0">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 min-w-0">
				<img
					id="dappImageId"
					crossorigin="anonymous"
					src={domainLogo}
					alt="Dapp logo"
					class="w-8 h-8 rounded-full flex-shrink-0"
				/>
				<span class="font-semibold truncate" title={domainTitle || domain}
					>{domainTitle || domain}</span
				>
			</div>
			<button
				onclick={() => handleReject()}
				class="btn btn-ghost btn-sm flex-shrink-0"
				aria-label="Close"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>
	</div>

	<!-- Content-->
	<div class="flex-1 p-6 flex flex-col max-w-[428px]">
		<div class="text-center mb-4 flex-shrink-0 border-2 border-red-500 rounded-md p-2">
			<p class="text-md font-extrabold animate-pulse mb-2">Important!:</p>
			<span class="text-sm font-bold mb-2"
				>Signing of Message requesting permission to execute: PLEASE be mindful and know what you
				are doing.</span
			>
			<span class="text-sm font-bold mb-2"
				>There is no cancel or return option! Be 100% sure or REJECT this transaction and research
				more before trying again.</span
			>
		</div>

		<div class="overflow-auto flex-1 min-h-0 mb-4">
			{#if method === 'eth_signTransaction'}
				<span class="text-sm">Transaction Details:</span>
				<div class="bg-base-200 rounded-lg p-4 space-y-3 mt-2">
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
			{:else}
				<span class="text-sm">Data to sign:</span>
				<pre class="text-md border-2 border-blue-500 rounded-md p-2 bg-opacity-25">{message}</pre>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div class="p-4 border-t border-base-300 flex-shrink-0">
		<div class="flex gap-4 justify-end">
			<button onclick={() => handleReject()} class="btn btn-outline"> Reject </button>
			<button onclick={handleConfirm} class="btn btn-primary"> Approve </button>
		</div>
	</div>
</div>

<Copyright />

<style>
	/* Smooth transitions */
	.btn {
		transition: all 0.2s ease;
	}

	.btn:hover {
		transform: translateY(-1px);
	}

	/* Custom scrollbar styles */
	.overflow-auto {
		scrollbar-width: thin;
		scrollbar-color: hsl(var(--p)) transparent;
	}

	.overflow-auto::-webkit-scrollbar {
		width: 6px;
	}

	.overflow-auto::-webkit-scrollbar-track {
		background: transparent;
	}

	.overflow-auto::-webkit-scrollbar-thumb {
		background-color: hsl(var(--p));
		border-radius: 3px;
	}
</style>

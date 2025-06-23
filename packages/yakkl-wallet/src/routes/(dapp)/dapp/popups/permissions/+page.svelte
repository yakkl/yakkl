<script lang="ts">
	import { browser_ext, browserSvelte } from '$lib/common/environment';
	import { page } from '$app/state';
	import {
		getYakklCurrentlySelected,
		getMiscStore,
		yakklDappConnectRequestStore,
		getSettings
	} from '$lib/common/stores';
	import { type YakklCurrentlySelected } from '$lib/common';
	import { DEFAULT_TITLE, YAKKL_DAPP } from '$lib/common/constants';
	import { onMount } from 'svelte';
	import { log } from '$lib/common/logger-wrapper';
	import type { Runtime } from 'webextension-polyfill';
	import type { JsonRpcResponse, SessionInfo } from '$lib/common/interfaces';
	import type { BackgroundPendingRequest } from '$lib/extensions/chrome/background';
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

	type RuntimePort = Runtime.Port | undefined;

	let currentlySelected: YakklCurrentlySelected;
	let yakklMiscStore: string;

	let showConfirm = $state(false);
	let showSuccess = $state(false);
	let showFailure = $state(false);
	let errorValue = $state('No domain/site name was found. Access to YAKKL® is denied.');

	let domain: string = $state('');
	let domainLogo: string = $state('');
	let domainTitle: string = $state('');
	let title: string = $state(DEFAULT_TITLE);
	let request: BackgroundPendingRequest;
	let method: string;
	let requestId: string | null;
	let message: any = $state(''); // This gets passed letting the user know what the intent is
	let address: string = $state('');

	let params: any[] = $state([]);

	let permissions: any[] = $state([]);
	let messageValue; // Used to display non-hex data that matches transaction or message
	let pass = false;

	let portManager: PortManagerWithStream | null = null;
	let stream: PortDuplexStream | null = null;

	if (browserSvelte) {
		try {
			requestId = page.url.searchParams.get('requestId');
			method = (page.url.searchParams.get('method') as string) ?? '';
			$yakklDappConnectRequestStore = requestId as string; // NOT SURE IF THIS IS NEEDED here

			if (requestId) {
				pass = true;
			}
			// NOTE: The internal check now makes sure the requestId is valid
		} catch (e) {
			log.error(e);
			handleReject('No requestId or method was found. Access to YAKKL® is denied.');
		}
	}

	// We no longer need to do get_params since we can access the request data directly
	async function onMessageListener(event: any) {
		try {
			if (!domainLogo) domainLogo = '/images/failIcon48x48.png'; // Set default logo but change if favicon is present

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

				// These needs to be fixed upstream
				domainTitle = requestData.metaData.metaData.title;
				domain = requestData.metaData.metaData.domain;
				domainLogo = requestData.metaData.metaData.icon;
				message =
					requestData.metaData.metaData.message ??
					'Nothing was passed to explain the intent of this approval. Be mindful of this request!';
				params = requestData.params ?? [];
				// Make sure params is an array
				if (!Array.isArray(params)) {
					params = [params];
				}

				if (!requestId) requestId = requestData?.id ?? null;
				if (!requestId) {
					return await handleReject('No request ID was found. Access to YAKKL® is denied.');
				}

				// Set the page title
				title = domainTitle || domain || DEFAULT_TITLE;

				let data;
				switch (method) {
					case 'wallet_requestPermissions': // Only used at the moment
						permissions = params[0];
						log.info('Permissions:', false, permissions);
						break;
					case 'wallet_revokePermissions':
						permissions = params[0];
						log.info('Revoke Permissions:', false, permissions);
						break;
					case 'wallet_getPermissions':
						permissions = params[0];
						log.info('Get Permissions:', false, permissions);
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
				const settings = await getSettings();
				if (!settings.init || !settings.legal.termsAgreed) {
					errorValue =
						"You must register and agree to the terms of service before using YAKKL®. Click on 'Open Wallet' to register.";
					showFailure = true;
					return;
				}

				currentlySelected = await getYakklCurrentlySelected();

				// Since we're 1:1 we can attach to the known port name
				const sessionInfo = (await browser_ext.runtime.sendMessage({
					type: 'REQUEST_SESSION_PORT',
					requestId
				})) as SessionInfo;

				log.info('Received session info:', false, sessionInfo);

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

				// Connect to existing port
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
				'Port setuperror occurred while processing the request. Access to YAKKL® is denied.';
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

			// Will need to be more dynamic in the future once more items are standardized
			permissions = [
				{
					parentCapability: 'eth_accounts',
					caveats: []
				}
			];

			// Send response to dapp
			if (stream) {
				const jsonRpcResponse: JsonRpcResponse = {
					type: 'YAKKL_RESPONSE:EIP6963',
					jsonrpc: '2.0',
					id: requestId,
					result: permissions
				};
				stream.write(jsonRpcResponse);
				log.info('Sign: handleProcess - response:', false, { jsonRpcResponse });
			} else {
				await handleReject('Request failed to send to dapp due to connection port not found.');
			}
			close();
		} catch (e) {
			log.error(e);
			errorValue = e instanceof Error ? e.message : 'Unknown error occurred';
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
	message="This will grant permission for {domain} to access your account(s)! Do you wish to continue?"
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
				>Granting permission to access your account(s): PLEASE be mindful and know what you are
				doing.</span
			>
			<span class="text-sm font-bold mb-2"
				>Permissions can be revoked at any time! Be 100% sure or REJECT this process and research
				more before trying again.</span
			>
		</div>

		<div class="overflow-auto flex-1 min-h-0 mb-4">
			<span class="text-sm">Permissions:</span>
			<pre
				class="text-md border-2 border-blue-500 rounded-md p-2 bg-opacity-25">(your account(s))</pre>
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
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { sessionInitialized } from '$lib/common/stores';
	import { DEFAULT_POPUP_HEIGHT, DEFAULT_TITLE, DEFAULT_POPUP_WIDTH } from '$lib/common';
	import Header from '$components/Header.svelte';
	import Footer from '$components/Footer.svelte';
	import { blockContextMenu, blockWindowResize } from '$lib/utilities';
	import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';

	// Global error filtering function
	function shouldShowErrorToUser(error: any): boolean {
		const errorMessage = error?.message || error?.toString() || '';

		// Network/API errors that should be handled silently
		const networkErrors = [
			'missing response',
			'timeout',
			'TIMEOUT',
			'SERVER_ERROR',
			'NETWORK_ERROR',
			'Failed to fetch',
			'fetch',
			'Connection failed',
			'Request timeout',
			'eth_getBalance',
			'call revert exception',
			'alchemy.com',
			'infura.io',
			'requestBody',
			'serverError',
			'code=SERVER_ERROR',
			'version=web/',
			'JsonRpcError',
			'RPC Error',
			'getBalance',
			'Balance fetch'
		];

		return !networkErrors.some((pattern) =>
			errorMessage.toLowerCase().includes(pattern.toLowerCase())
		);
	}
	import { browserSvelte, browser_ext } from '$lib/common/environment';
	import { log } from '$lib/common/logger-wrapper';
	import { initializeUiContext } from '$lib/common/messaging';
	import InAppNotifications from '$lib/components/InAppNotifications.svelte';
	import SecurityWarningEnhanced from '$lib/components/SecurityWarningEnhanced.svelte';
	import Card from '$lib/components/Card.svelte';
	import { yakklMiscStore } from '$lib/common/stores';
	import TrialCountdown from '$lib/components/TrialCountdown.svelte';
	import Upgrade from '$lib/components/Upgrade.svelte';
	import { modal, modalName, closeModal } from '$lib/common/stores/modal';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	// Use reactive store subscription instead of a one-time value

	// UI State
	let popupWidth: number = $state(DEFAULT_POPUP_WIDTH);
	let popupHeight: number = DEFAULT_POPUP_HEIGHT;
	let title: string = $state(DEFAULT_TITLE);
	let contextMenu: boolean = $state(false);
	let resize: boolean = $state(false);
	let error: boolean = $state(false);
	let errorValue: string = $state('');
	let errorCooldown: boolean = $state(false);
	let maxHeightClass: string = $state('max-h-[448px]');

	// Effect: Handle Internet Connection Status
	$effect(() => {
		if (browserSvelte && !navigator.onLine) {
			log.warn('Internet connection is offline');
			errorValue =
				'It appears your Internet connection is offline. YAKKL needs access to the Internet to obtain current market prices and gas fees. A number of areas will either not function or work in a limited capacity. Thank you!';
			error = true;
		} else {
			error = false;
		}
	});

	// Effect: Manage Debug Mode and Blocking Features
	$effect(() => {
		if (process.env.DEV_MODE || process.env.NODE_ENV === 'development') {
			contextMenu = true;
			resize = true;
		}

		if (!contextMenu) blockContextMenu();
		if (!resize) blockWindowResize(popupWidth, popupHeight);
	});

	onMount(async () => {
		try {
			log.debug('+layout.svelte (wallet level) - onMount');
			// Reset session initialization state when app first loads
			sessionInitialized.set(false);

			if (browser_ext) {
				await initializeUiContext(browser_ext);
			}

			// Global error handlers to prevent network errors from reaching user
			window.addEventListener('error', (event) => {
				const error = event.error;
				if (error && !shouldShowErrorToUser(error)) {
					log.warn('[Global] Suppressed network error from user:', false, error);
					event.preventDefault();
					return false;
				}
			});

			window.addEventListener('unhandledrejection', (event) => {
				const error = event.reason;
				if (error && !shouldShowErrorToUser(error)) {
					log.warn('[Global] Suppressed network rejection from user:', false, error);
					event.preventDefault();
					return false;
				}
			});
		} catch (error) {
			log.error('+layout.svelte (wallet level) - onMount:', false, error);
		}
	});
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<SecurityWarningEnhanced />
<ErrorNoAction bind:show={error} title="Error" value={errorValue} />

<div
	id="wrapper"
	class="w-[{popupWidth}px] max-w-[{popupWidth}px] rounded-md flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen transition-opacity duration-500 animate-fade-in overflow-hidden"
>
	<!-- containerWidth={popupWidth} /> -->
	<Header />

	{#if $yakklMiscStore}
		<Card />
	{:else}
		<!-- Debug: Card not showing because yakklMiscStore is falsy -->
		<div class="text-xs text-gray-500 p-2">Card loading...</div>
	{/if}

	<div class="min-h-[40rem] mx-2 overflow-hidden">
		<div class="relative mt-1 overflow-hidden">
			<!-- rounded-xl overflow-y-auto bg-base-100 border-2 border-stone-700 border-r-stone-700/75 border-b-slate-700/75 -->
			<main class="p-2 {maxHeightClass} overflow-y-auto overflow-x-hidden">
				{@render children?.()}
			</main>
		</div>
	</div>

	<Footer containerWidth={popupWidth.toString()} />
</div>

<InAppNotifications />

<TrialCountdown />
<Upgrade show={$modal && $modalName === 'upgrade'} onClose={closeModal} onCancel={closeModal} />

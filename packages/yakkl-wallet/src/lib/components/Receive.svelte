<!-- Receive.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import QR from './QR.svelte';
	import { YAKKL_ZERO_ADDRESS } from '$lib/common/constants';
	import { yakklCurrentlySelectedStore } from '$lib/common/stores';
	import Modal from './Modal.svelte';
	import Copy from './Copy.svelte';

	interface Props {
		show?: boolean;
		address?: string;
		title?: string;
	}

	let { show = $bindable(false), address = $bindable(''), title = 'Receive' }: Props = $props();

	onMount(() => {
		if (
			$yakklCurrentlySelectedStore &&
			$yakklCurrentlySelectedStore.shortcuts.address !== YAKKL_ZERO_ADDRESS
		) {
			address = $yakklCurrentlySelectedStore.shortcuts.address;
		}
	});

	// function copyAddress() {
	//   navigator.clipboard.writeText(address);
	// }
</script>

<Modal bind:show {title}>
	<div class="p-6">
		{#if $yakklCurrentlySelectedStore && $yakklCurrentlySelectedStore.shortcuts.address !== YAKKL_ZERO_ADDRESS}
			<!-- Modern card layout with QR code -->
			<div class="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 mb-6 text-center">
				<div class="mb-6">
					<QR qrText={address} />
				</div>
				<h3 class="text-lg font-semibold text-gray-800 mb-2">Your Wallet Address</h3>
				<p class="text-sm text-gray-600 mb-4">Share this address to receive payments</p>
			</div>

			<!-- Address display with copy button on same line -->
			<div class="bg-white rounded-lg border border-gray-200 shadow-sm">
				<div class="flex items-center justify-between p-4">
					<div class="flex-1 min-w-0 mr-3">
						<div class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
							Ethereum Address
						</div>
						<p class="text-sm font-mono text-gray-900 truncate" title={address} id="eth-address">
							{address}
						</p>
					</div>
					<div class="flex-shrink-0">
						<Copy target={{ value: address }} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" />
					</div>
				</div>
			</div>

			<!-- Info card -->
			<div class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm text-blue-800">
							<span class="font-medium">Scan the QR code</span> with your mobile wallet or
							<span class="font-medium">copy the address</span> to receive payments
						</p>
					</div>
				</div>
			</div>
		{:else}
			<!-- Empty state -->
			<div class="text-center py-12">
				<div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
					<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-700 mb-2">No Portfolio Accounts</h3>
				<p class="text-gray-500">Create at least one Portfolio account to receive payments</p>
			</div>
		{/if}
	</div>
</Modal>

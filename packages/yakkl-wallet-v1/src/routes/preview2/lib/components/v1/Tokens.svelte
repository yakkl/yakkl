<script lang="ts">
	import {
		setYakklTokenDataCustomStorage,
		yakklCombinedTokenStore,
		yakklCurrentlySelectedStore,
		yakklTokenDataCustomStore
	} from '$lib/common/stores';
	import { getInstances, type TokenData } from '$lib/common';
	import Modal from './Modal.svelte';
	import TokenList from './TokenList.svelte';
	import TokenForm from './TokenForm.svelte';
	import { onMount } from 'svelte';
	import type { TokenService } from '$lib/managers/blockchains/evm/TokenService';
	import type { Provider } from '$lib/managers/Provider';
	import { getTokenBalance } from '$lib/utilities/balanceUtils';
	import { log } from '$lib/managers/Logger';

	interface Props {
		show?: boolean;
		onTokenSelect?: (token: TokenData) => void;
		className?: string;
	}

	let { show = $bindable(false), onTokenSelect = null, className = 'z-[899]' }: Props = $props();

	let showAddModal = $state(false);
	let tokens = $state<TokenData[]>([]); // Combined tokens for display
	let provider: Provider | null = null;
	let tokenService: TokenService<any> | null = null;

	// Fetch instances and setup provider/tokenService
	onMount(async () => {
		const instances = await getInstances();
		if (instances.length > 0) {
			provider = instances[1];
			tokenService = instances[3];
		}
	});

	// Subscribe to the combined token store for display
	$effect(() => {
		tokens = $yakklCombinedTokenStore; // Reactive combined store
	});

	function handleTokenSelect(selectedToken: TokenData) {
		if (onTokenSelect !== null) {
			onTokenSelect(selectedToken);
		}
		show = false;
	}

	async function handleTokenAdd(token: TokenData) {
		if (token?.customDefault === 'custom') {
			const balance = await getTokenBalance(
				token,
				$yakklCurrentlySelectedStore.shortcuts.address,
				provider,
				tokenService
			);
			token.balance = balance;
			yakklTokenDataCustomStore.update((tokens) => [...tokens, token]);
			setYakklTokenDataCustomStorage($yakklTokenDataCustomStore);
		}
		showAddModal = false;
	}

	function handleTokenDelete(deletedToken: TokenData) {
		yakklTokenDataCustomStore.update((tokens) => {
			const updatedTokens = tokens.filter((t) => t.address !== deletedToken.address);
			setYakklTokenDataCustomStorage(updatedTokens);
			return updatedTokens;
		});
	}

	function handleTokenUpdate(updatedToken: TokenData) {
		yakklTokenDataCustomStore.update((tokens) => {
			const updatedTokens = tokens.map((t) =>
				t.address === updatedToken.address ? updatedToken : t
			);
			log.info('updatedTokens', false, updatedTokens);
			setYakklTokenDataCustomStorage(updatedTokens);
			return updatedTokens;
		});
	}

	function closeModal() {
		show = false;
	}
</script>

<Modal
	bind:show
	title="Token List"
	description="Manage your tokens"
	onClose={closeModal}
	{className}
>
	<div class="p-4">
		{#if tokens.length > 0}
			<!-- Token list with AccountListing-style cards -->
			<div class="space-y-3 mb-4 max-h-96 overflow-y-auto">
				<TokenList
					{tokens}
					onTokenSelect={handleTokenSelect}
					onTokenUpdate={handleTokenUpdate}
					onTokenDelete={handleTokenDelete}
				/>
			</div>
		{:else}
			<!-- Empty state with modern styling -->
			<div class="text-center py-12">
				<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
					<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-700 mb-2">No Custom Tokens</h3>
				<p class="text-gray-500 mb-6">Add custom tokens to manage them alongside your default tokens</p>
			</div>
		{/if}

		<!-- Action buttons and info -->
		<div class="border-t border-gray-200 pt-4">
			<button
				onclick={() => {
					showAddModal = true;
					show = false;
				}}
				class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				<span>Add Custom Token</span>
			</button>
			
			<div class="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="ml-2">
						<p class="text-xs text-green-800">
							Add ERC-20 tokens by contract address to track balances and make transfers
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</Modal>

<TokenForm bind:show={showAddModal} onSubmit={handleTokenAdd} />

<!-- TokensEnhanced.svelte -->
<script lang="ts">
	import {
		setYakklTokenDataCustomStorage,
		yakklCombinedTokenStore,
		yakklCurrentlySelectedStore,
		yakklTokenDataCustomStore,
		getSettings
	} from '$lib/common/stores';
	import { getInstances, type TokenData, type Settings } from '$lib/common';
	import { PlanType } from '$lib/common/types';
	import Modal from './Modal.svelte';
	import TokenListEnhanced from './TokenListEnhanced.svelte';
	import TokenForm from './TokenForm.svelte';
	import SimpleTooltip from './SimpleTooltip.svelte';
	import { onMount, onDestroy } from 'svelte';
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
	let settings: Settings | null = null;
	let isBasicMember = $state(true);
	let isRefreshing = $state(false);
	let lastRefreshTime = $state<Date | null>(null);
	let autoRefreshInterval: number | null = null;
	
	const BASIC_AUTO_REFRESH_INTERVAL_MS = 300000; // 5 minutes for Basic members
	const PRO_AUTO_REFRESH_INTERVAL_MS = 30000; // 30 seconds for Pro members

	// Load settings to check membership
	onMount(async () => {
		settings = await getSettings();
		isBasicMember = settings?.plan?.type === PlanType.BASIC_MEMBER;
		
		// Setup instances
		const instances = await getInstances();
		if (instances.length > 0) {
			provider = instances[1];
			tokenService = instances[3];
		}

		// Setup auto-refresh for all members (different intervals)
		startAutoRefresh();
	});

	onDestroy(() => {
		if (autoRefreshInterval) {
			clearInterval(autoRefreshInterval);
		}
	});

	// Subscribe to the combined token store for display
	$effect(() => {
		tokens = $yakklCombinedTokenStore; // Reactive combined store
	});

	// No cooldown needed since we have automatic refresh for all members

	function startAutoRefresh() {
		if (autoRefreshInterval) return;
		
		const interval = isBasicMember ? BASIC_AUTO_REFRESH_INTERVAL_MS : PRO_AUTO_REFRESH_INTERVAL_MS;
		
		autoRefreshInterval = setInterval(async () => {
			if (!isRefreshing) {
				await refreshTokenPrices(false);
			}
		}, interval) as unknown as number;
	}

	async function refreshTokenPrices(showLoading = true) {
		if (isRefreshing) return;
		
		if (showLoading) {
			isRefreshing = true;
		}

		try {
			// Here you would call your price update service
			// For now, we'll simulate the refresh
			log.info('Refreshing token prices...', false);
			
			// Simulate API call delay
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// In a real implementation, you would:
			// 1. Fetch updated prices from your price service
			// 2. Update the token store with new prices
			// 3. Update balances if needed
			
			lastRefreshTime = new Date();
		} catch (error) {
			log.error('Error refreshing token prices:', false, error);
		} finally {
			isRefreshing = false;
		}
	}

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
	title="All Tokens"
	description="View and manage your tokens"
	onClose={closeModal}
	{className}
>
	<div class="p-4">
		<!-- Header with auto-refresh status -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<h3 class="text-lg font-semibold text-gray-800">Token Portfolio</h3>
				<div class="flex items-center gap-1">
					<div class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
					<span class="text-xs text-gray-500">
						Auto-refresh {isBasicMember ? '(5min)' : '(live)'}
					</span>
				</div>
			</div>
			
			{#if isBasicMember}
				<SimpleTooltip content="Upgrade for real-time price updates and advanced analytics">
					<a
						href="#upgrade"
						class="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
					>
						<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
						Upgrade for live prices
					</a>
				</SimpleTooltip>
			{/if}
		</div>

		{#if tokens.length > 0}
			<!-- Enhanced token list with Basic vs Pro features -->
			<div class="space-y-3 mb-4 max-h-96 overflow-y-auto">
				<TokenListEnhanced
					{tokens}
					onTokenSelect={handleTokenSelect}
					onTokenUpdate={handleTokenUpdate}
					onTokenDelete={handleTokenDelete}
				/>
			</div>
			
			<!-- Token count -->
			<div class="text-sm text-gray-500 text-center mb-4">
				Showing all {tokens.length} token{tokens.length === 1 ? '' : 's'}
			</div>
		{:else}
			<!-- Empty state -->
			<div class="text-center py-12">
				<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
					<svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-700 mb-2">No Tokens Found</h3>
				<p class="text-gray-500 mb-6">Add tokens to start tracking your portfolio</p>
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
			
			{#if isBasicMember}
				<div class="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
					<div class="flex items-start">
						<div class="flex-shrink-0">
							<svg class="w-4 h-4 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-2">
							<p class="text-xs text-amber-800 font-medium">
								Manual refresh only - Upgrade to YAKKL Pro for:
							</p>
							<ul class="text-xs text-amber-700 mt-1 space-y-0.5">
								<li>• Automatic price updates with full analytics</li>
								<li>• Real-time portfolio tracking</li>
								<li>• Advanced token insights</li>
								<li>• Priority support</li>
							</ul>
						</div>
					</div>
				</div>
			{:else}
				<div class="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
							</svg>
						</div>
						<div class="ml-2">
							<p class="text-xs text-green-800">
								Enjoying automatic price updates and full token analytics
							</p>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</Modal>

<TokenForm bind:show={showAddModal} onSubmit={handleTokenAdd} />
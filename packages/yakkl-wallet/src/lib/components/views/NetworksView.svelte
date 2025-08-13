<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ViewCacheManager } from '$lib/managers/ViewCacheManager';
	import type { ViewUpdateNotification } from '$lib/managers/ViewCacheManager';
	import type { ChainDisplay } from '$lib/types';
	import { getNetworkStore } from '$lib/stores/network.store';
	import { log } from '$lib/common/logger-wrapper';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import { BigNumber } from '$lib/common/bignumber';

	// Props
	let { 
		onNetworkSelect = (network: ChainDisplay) => {},
		showActivity = true,
		className = ''
	} = $props();

	// State
	let networks = $state<ChainDisplay[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let selectedNetwork = $state<number | null>(null);
	let networkActivity = $state<Map<number, { txCount: number; lastActivity: Date }>>(new Map());
	
	// View cache manager instance
	let viewCacheManager: ViewCacheManager;
	const updateListenerId = `networks-view-${Math.random()}`;
	const networkStore = getNetworkStore();

	// Get network status
	function getNetworkStatus(chainId: number): 'active' | 'inactive' | 'error' {
		// This would be enhanced with actual network status checking
		if (chainId === 1 || chainId === 137 || chainId === 56) {
			return 'active';
		}
		return 'inactive';
	}

	// Get network color based on chain
	function getNetworkColor(chainId: number): string {
		const colors: Record<number, string> = {
			1: 'from-blue-500 to-blue-600',      // Ethereum
			137: 'from-purple-500 to-purple-600', // Polygon
			56: 'from-yellow-500 to-yellow-600',  // BSC
			43114: 'from-red-500 to-red-600',     // Avalanche
			42161: 'from-blue-400 to-blue-500',   // Arbitrum
			10: 'from-red-400 to-red-500',        // Optimism
		};
		return colors[chainId] || 'from-gray-500 to-gray-600';
	}

	// Get network icon
	function getNetworkIcon(chainId: number): string {
		const icons: Record<number, string> = {
			1: '⟠',      // Ethereum
			137: '🟣',   // Polygon
			56: '🟡',    // BSC
			43114: '🔺', // Avalanche
			42161: '🔵', // Arbitrum
			10: '🔴',    // Optimism
		};
		return icons[chainId] || '🔗';
	}

	// Load networks data
	async function loadNetworks() {
		try {
			isLoading = true;
			error = null;

			// Get networks from store
			const allNetworks = await networkStore.getAllNetworks();
			networks = allNetworks;

			// Load activity data for each network
			await loadNetworkActivity();

			log.info('[NetworksView] Loaded networks', false, {
				count: networks.length
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load networks';
			log.error('[NetworksView] Error loading networks', false, err);
		} finally {
			isLoading = false;
		}
	}

	// Load network activity data
	async function loadNetworkActivity() {
		const activity = new Map<number, { txCount: number; lastActivity: Date }>();
		
		for (const network of networks) {
			// Get transaction data for this network
			const txView = await viewCacheManager.getTransactionsView({ chainId: network.chainId });
			
			if (txView.data && txView.data.length > 0) {
				activity.set(network.chainId, {
					txCount: txView.data.length,
					lastActivity: new Date(txView.data[0].timestamp || Date.now())
				});
			}
		}
		
		networkActivity = activity;
	}

	// Handle view updates
	function handleViewUpdate(notification: ViewUpdateNotification) {
		if (notification.event === 'network-changed' || notification.viewType === 'all') {
			log.debug('[NetworksView] Received update notification', false, notification);
			loadNetworks();
		}
	}

	// Handle network selection
	function selectNetwork(network: ChainDisplay) {
		selectedNetwork = network.chainId;
		onNetworkSelect(network);
	}

	// Format gas price
	function formatGasPrice(gasPrice?: string | number): string {
		if (!gasPrice) return 'N/A';
		const gwei = new BigNumber(gasPrice).dividedBy(1e9);
		return `${gwei.toFixed(2)} Gwei`;
	}

	// Lifecycle
	onMount(async () => {
		viewCacheManager = ViewCacheManager.getInstance();
		viewCacheManager.registerUpdateListener(updateListenerId, handleViewUpdate);
		await loadNetworks();
	});

	onDestroy(() => {
		if (viewCacheManager) {
			viewCacheManager.unregisterUpdateListener(updateListenerId);
		}
	});
</script>

<div class="networks-view {className}">
	{#if isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="loading loading-spinner loading-lg"></div>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>{error}</span>
		</div>
	{:else if networks.length === 0}
		<div class="text-center p-8 text-gray-500 dark:text-gray-400">
			<svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
			</svg>
			<p class="text-lg font-medium mb-2">No networks configured</p>
			<p class="text-sm">Add networks to connect to different blockchains</p>
		</div>
	{:else}
		<!-- Networks Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each networks as network (network.chainId)}
				<button
					class="relative overflow-hidden rounded-lg border transition-all hover:shadow-lg {
						selectedNetwork === network.chainId
							? 'border-blue-500 ring-2 ring-blue-500/20'
							: 'border-gray-200 dark:border-gray-700'
					}"
					onclick={() => selectNetwork(network)}
				>
					<!-- Network Header with Gradient -->
					<div class="bg-gradient-to-r {getNetworkColor(network.chainId)} p-4 text-white">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-2">
								<span class="text-2xl">{getNetworkIcon(network.chainId)}</span>
								<div class="text-left">
									<h3 class="font-semibold text-lg">{network.name}</h3>
									<p class="text-sm opacity-90">Chain ID: {network.chainId}</p>
								</div>
							</div>
							{#if selectedNetwork === network.chainId}
								<div class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								</div>
							{/if}
						</div>
					</div>

					<!-- Network Details -->
					<div class="p-4 bg-white dark:bg-gray-800">
						<!-- Status Indicator -->
						<div class="flex items-center justify-between mb-3">
							<div class="flex items-center gap-2">
								{#if getNetworkStatus(network.chainId) === 'active'}
									<div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
									<span class="text-sm text-green-600 dark:text-green-400">Active</span>
								{:else if getNetworkStatus(network.chainId) === 'error'}
									<div class="w-2 h-2 rounded-full bg-red-500"></div>
									<span class="text-sm text-red-600 dark:text-red-400">Error</span>
								{:else}
									<div class="w-2 h-2 rounded-full bg-gray-400"></div>
									<span class="text-sm text-gray-600 dark:text-gray-400">Inactive</span>
								{/if}
							</div>
							{#if network.isTestnet}
								<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
									Testnet
								</span>
							{/if}
						</div>

						<!-- Network Info -->
						<div class="space-y-2 text-sm">
							<!-- RPC URL -->
							<div class="flex items-center justify-between">
								<span class="text-gray-600 dark:text-gray-400">RPC:</span>
								<SimpleTooltip text={network.rpcUrl}>
									<span class="text-gray-900 dark:text-gray-100 font-mono text-xs truncate max-w-[150px] block">
										{network.rpcUrl}
									</span>
								</SimpleTooltip>
							</div>

							<!-- Gas Price -->
							<div class="flex items-center justify-between">
								<span class="text-gray-600 dark:text-gray-400">Gas:</span>
								<span class="text-gray-900 dark:text-gray-100">
									{formatGasPrice(network.gasPrice)}
								</span>
							</div>

							<!-- Native Currency -->
							<div class="flex items-center justify-between">
								<span class="text-gray-600 dark:text-gray-400">Currency:</span>
								<span class="text-gray-900 dark:text-gray-100">
									{network.nativeCurrency?.symbol || 'ETH'}
								</span>
							</div>

							<!-- Activity Stats -->
							{#if showActivity && networkActivity.has(network.chainId)}
								{@const activity = networkActivity.get(network.chainId)}
								<div class="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
									<div class="flex items-center justify-between">
										<span class="text-gray-600 dark:text-gray-400">Transactions:</span>
										<span class="text-gray-900 dark:text-gray-100">{activity?.txCount || 0}</span>
									</div>
									{#if activity?.lastActivity}
										<div class="flex items-center justify-between mt-1">
											<span class="text-gray-600 dark:text-gray-400">Last Activity:</span>
											<span class="text-gray-900 dark:text-gray-100 text-xs">
												{activity.lastActivity.toLocaleDateString()}
											</span>
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Explorer Link -->
						{#if network.explorerUrl}
							<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
								<a
									href={network.explorerUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
									onclick={(e) => e.stopPropagation()}
								>
									<span>View Explorer</span>
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</a>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>

		<!-- Add Network Button -->
		<div class="mt-6 text-center">
			<button class="btn btn-outline btn-primary">
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Add Custom Network
			</button>
		</div>
	{/if}
</div>

<style>
	.networks-view {
		min-height: 200px;
	}
</style>
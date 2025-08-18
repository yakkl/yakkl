<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ViewCacheManager } from '$lib/managers/ViewCacheManager';
	import type { ViewCache, ViewUpdateNotification } from '$lib/managers/ViewCacheManager';
	import type { TokenDisplay } from '$lib/types';
	import { formatUnits } from '$lib/utilities/utilities';
	import { BigNumber } from '$lib/common/bignumber';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import ProtectedValue from '$lib/components/ProtectedValue.svelte';
	import { log } from '$lib/common/logger-wrapper';
	import { fade, fly } from 'svelte/transition';
	
	// Helper function to format balance values
	function formatBalance(value: string | BigNumber, decimals: number = 18, precision: number = 4, prefix: string = ''): string {
		try {
			const formatted = formatUnits(value.toString(), decimals);
			const num = parseFloat(formatted);
			if (isNaN(num)) return '0';
			return prefix + num.toFixed(precision);
		} catch {
			return prefix + '0';
		}
	}

	// Props
	let { 
		chainId = $bindable<number | undefined>(undefined),
		accountAddress = $bindable<string | undefined>(undefined),
		onTokenSelect = (token: TokenDisplay) => {},
		onQuickAction = (action: 'send' | 'swap' | 'details', token: TokenDisplay) => {},
		showQuickActions = true,
		className = ''
	} = $props();

	// State
	let tokens = $state<TokenDisplay[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let selectedToken = $state<string | null>(null);
	let searchQuery = $state('');
	let sortBy = $state<'name' | 'value' | 'price' | 'change'>('value');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let viewMode = $state<'grid' | 'list'>('list');
	
	// View cache manager instance
	let viewCacheManager: ViewCacheManager;
	const updateListenerId = `tokens-view-${Math.random()}`;

	// Filter and sort tokens
	let processedTokens = $derived.by(() => {
		let filtered = tokens;
		
		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(token => 
				token.symbol.toLowerCase().includes(query) ||
				token.name.toLowerCase().includes(query) ||
				token.address?.toLowerCase().includes(query)
			);
		}
		
		// Sort tokens
		const sorted = [...filtered].sort((a, b) => {
			let aVal: any, bVal: any;
			
			switch (sortBy) {
				case 'name':
					aVal = a.name.toLowerCase();
					bVal = b.name.toLowerCase();
					return sortOrder === 'asc' 
						? aVal.localeCompare(bVal) 
						: bVal.localeCompare(aVal);
						
				case 'value':
					aVal = typeof a.value === 'number' ? a.value : new BigNumber(a.value || 0).toNumber();
					bVal = typeof b.value === 'number' ? b.value : new BigNumber(b.value || 0).toNumber();
					break;
					
				case 'price':
					aVal = a.price || 0;
					bVal = b.price || 0;
					break;
					
				case 'change':
					aVal = a.change24h || 0;
					bVal = b.change24h || 0;
					break;
					
				default:
					aVal = 0;
					bVal = 0;
			}
			
			if (sortBy !== 'name') {
				return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
			}
			return 0;
		});
		
		return sorted;
	});

	// Calculate total value
	let totalValue = $derived.by(() => {
		return processedTokens.reduce((sum, token) => {
			const value = typeof token.value === 'number' 
				? token.value 
				: new BigNumber(token.value || 0).toNumber();
			return sum + value;
		}, 0);
	});

	// Load tokens data
	async function loadTokens() {
		try {
			isLoading = true;
			error = null;

			const viewCache = await viewCacheManager.getTokensView({ 
				chainId, 
				accountAddress 
			});
			
			tokens = viewCache.data || [];
			lastUpdated = new Date(viewCache.timestamp);

			log.info('[TokensView] Loaded tokens', false, {
				count: tokens.length,
				chainId,
				accountAddress,
				timestamp: lastUpdated
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load tokens';
			log.error('[TokensView] Error loading tokens', false, err);
		} finally {
			isLoading = false;
		}
	}

	// Handle view updates
	function handleViewUpdate(notification: ViewUpdateNotification) {
		if (notification.viewType === 'tokens' || notification.viewType === 'all') {
			log.debug('[TokensView] Received update notification', false, notification);
			loadTokens();
		}
	}

	// Handle token selection
	function selectToken(token: TokenDisplay) {
		selectedToken = token.address || token.symbol;
		onTokenSelect(token);
	}

	// Handle quick actions
	function handleQuickAction(action: 'send' | 'swap' | 'details', token: TokenDisplay, event: Event) {
		event.stopPropagation();
		onQuickAction(action, token);
	}

	// Format price change
	function formatPriceChange(change?: number): string {
		if (!change) return '0.00%';
		const sign = change >= 0 ? '+' : '';
		return `${sign}${change.toFixed(2)}%`;
	}

	// Get price change color
	function getPriceChangeColor(change?: number): string {
		if (!change) return 'text-gray-500';
		return change >= 0 ? 'text-green-500' : 'text-red-500';
	}

	// Toggle sort
	function toggleSort(field: typeof sortBy) {
		if (sortBy === field) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = field;
			sortOrder = 'desc';
		}
	}

	// Format token value
	function formatTokenValue(value: any): string {
		if (!value) return '$0.00';
		const numValue = typeof value === 'number' 
			? value 
			: new BigNumber(value).toNumber();
		
		if (numValue >= 1000000) {
			return `$${(numValue / 1000000).toFixed(2)}M`;
		} else if (numValue >= 1000) {
			return `$${(numValue / 1000).toFixed(2)}K`;
		}
		return `$${numValue.toFixed(2)}`;
	}

	// Lifecycle
	onMount(async () => {
		viewCacheManager = ViewCacheManager.getInstance();
		viewCacheManager.registerUpdateListener(updateListenerId, handleViewUpdate);
		await loadTokens();
	});

	onDestroy(() => {
		if (viewCacheManager) {
			viewCacheManager.unregisterUpdateListener(updateListenerId);
		}
	});

	// Watch for context changes
	$effect(() => {
		if (chainId !== undefined || accountAddress !== undefined) {
			loadTokens();
		}
	});
</script>

<div class="tokens-view {className}">
	<!-- Header with search and controls -->
	<div class="flex flex-col sm:flex-row gap-4 mb-6">
		<!-- Search -->
		<div class="flex-1">
			<div class="relative">
				<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search tokens..."
					class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		</div>

		<!-- View controls -->
		<div class="flex items-center gap-2">
			<!-- Sort dropdown -->
			<select
				bind:value={sortBy}
				class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
			>
				<option value="value">Sort by Value</option>
				<option value="name">Sort by Name</option>
				<option value="price">Sort by Price</option>
				<option value="change">Sort by 24h Change</option>
			</select>

			<!-- View mode toggle -->
			<div class="flex rounded-lg border border-gray-200 dark:border-gray-700">
				<button
					class="px-3 py-2 {viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800'}"
					onclick={() => viewMode = 'list'}
					aria-label="List view"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
				<button
					class="px-3 py-2 {viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800'}"
					onclick={() => viewMode = 'grid'}
					aria-label="Grid view"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
					</svg>
				</button>
			</div>
		</div>
	</div>

	<!-- Portfolio summary -->
	{#if !isLoading && processedTokens.length > 0}
		<div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm opacity-90">Total Portfolio Value</p>
					<p class="text-3xl font-bold">
						<ProtectedValue value={formatTokenValue(totalValue)} />
					</p>
				</div>
				<div class="text-right">
					<p class="text-sm opacity-90">{processedTokens.length} Tokens</p>
					{#if lastUpdated}
						<p class="text-xs opacity-70">Updated {lastUpdated.toLocaleTimeString()}</p>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Content -->
	{#if isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="loading loading-spinner loading-lg"></div>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>{error}</span>
		</div>
	{:else if processedTokens.length === 0}
		<div class="text-center p-8 text-gray-500 dark:text-gray-400">
			<svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
			</svg>
			<p class="text-lg font-medium mb-2">No tokens found</p>
			<p class="text-sm">
				{#if searchQuery}
					No tokens match your search
				{:else}
					Add tokens to your portfolio to see them here
				{/if}
			</p>
		</div>
	{:else if viewMode === 'list'}
		<!-- List view -->
		<div class="space-y-2">
			{#each processedTokens as token (token.address || token.symbol)}
				<button
					type="button"
					class="p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md w-full text-left {
						selectedToken === (token.address || token.symbol)
							? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
							: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
					}"
					onclick={() => selectToken(token)}
					aria-label="Select {token.name} token"
					in:fly={{ y: 20, duration: 300 }}
				>
					<div class="flex items-center justify-between">
						<!-- Token info -->
						<div class="flex items-center gap-3">
							{#if token.logo}
								<img src={token.logo} alt={token.symbol} class="w-10 h-10 rounded-full" />
							{:else}
								<div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
									<span class="text-xs font-bold">{token.symbol.slice(0, 2)}</span>
								</div>
							{/if}
							<div>
								<div class="font-medium text-gray-900 dark:text-gray-100">{token.symbol}</div>
								<div class="text-sm text-gray-600 dark:text-gray-400">{token.name}</div>
							</div>
						</div>

						<!-- Token details -->
						<div class="flex items-center gap-6">
							<!-- Quantity -->
							<div class="text-right">
								<div class="font-medium">
									<ProtectedValue value={formatBalance(token.quantity || '0', token.decimals || 18, 4)} />
								</div>
								<div class="text-sm text-gray-600 dark:text-gray-400">
									${token.price?.toFixed(2) || '0.00'}
								</div>
							</div>

							<!-- Value -->
							<div class="text-right">
								<div class="font-semibold">
									<ProtectedValue value={formatTokenValue(token.value)} />
								</div>
								<div class={`text-sm ${getPriceChangeColor(token.change24h)}`}>
									{formatPriceChange(token.change24h)}
								</div>
							</div>

							<!-- Quick actions -->
							{#if showQuickActions}
								<div class="flex items-center gap-1">
									<SimpleTooltip text="Send">
										<button
											class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
											onclick={(e) => handleQuickAction('send', token, e)}
											aria-label="Send {token.symbol}"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
											</svg>
										</button>
									</SimpleTooltip>
									<SimpleTooltip text="Swap">
										<button
											class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
											onclick={(e) => handleQuickAction('swap', token, e)}
											aria-label="Swap {token.symbol}"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
											</svg>
										</button>
									</SimpleTooltip>
									<SimpleTooltip text="Details">
										<button
											class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
											onclick={(e) => handleQuickAction('details', token, e)}
											aria-label="View {token.symbol} details"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</button>
									</SimpleTooltip>
								</div>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<!-- Grid view -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each processedTokens as token (token.address || token.symbol)}
				<div
					class="p-4 rounded-lg border transition-all cursor-pointer hover:shadow-lg {
						selectedToken === (token.address || token.symbol)
							? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
							: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
					}"
					onclick={() => selectToken(token)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectToken(token);
						}
					}}
					role="button"
					tabindex="0"
					aria-label="Select {token.name} token"
					in:fade={{ duration: 300 }}
				>
					<!-- Token header -->
					<div class="flex items-center gap-3 mb-4">
						{#if token.logo}
							<img src={token.logo} alt={token.symbol} class="w-12 h-12 rounded-full" />
						{:else}
							<div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
								<span class="text-sm font-bold">{token.symbol.slice(0, 2)}</span>
							</div>
						{/if}
						<div class="flex-1">
							<div class="font-semibold text-gray-900 dark:text-gray-100">{token.symbol}</div>
							<div class="text-xs text-gray-600 dark:text-gray-400 truncate">{token.name}</div>
						</div>
					</div>

					<!-- Token stats -->
					<div class="space-y-2">
						<div class="flex justify-between text-sm">
							<span class="text-gray-600 dark:text-gray-400">Balance:</span>
							<span class="font-medium">
								<ProtectedValue value={formatBalance(token.quantity || '0', token.decimals || 18, 4)} />
							</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-600 dark:text-gray-400">Price:</span>
							<span>${token.price?.toFixed(2) || '0.00'}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-600 dark:text-gray-400">Value:</span>
							<span class="font-semibold">
								<ProtectedValue value={formatTokenValue(token.value)} />
							</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-gray-600 dark:text-gray-400">24h:</span>
							<span class={getPriceChangeColor(token.change24h)}>
								{formatPriceChange(token.change24h)}
							</span>
						</div>
					</div>

					<!-- Quick actions -->
					{#if showQuickActions}
						<div class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
							<button
								class="flex-1 py-1.5 px-2 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
								onclick={(e) => handleQuickAction('send', token, e)}
							>
								Send
							</button>
							<button
								class="flex-1 py-1.5 px-2 text-xs rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
								onclick={(e) => handleQuickAction('swap', token, e)}
							>
								Swap
							</button>
							<button
								class="flex-1 py-1.5 px-2 text-xs rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
								onclick={(e) => handleQuickAction('details', token, e)}
							>
								Info
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tokens-view {
		min-height: 200px;
	}
</style>
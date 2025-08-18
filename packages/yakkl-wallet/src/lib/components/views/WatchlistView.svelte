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
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	// Props
	let { 
		chainId = $bindable<number | undefined>(undefined),
		onTokenSelect = (token: TokenDisplay) => {},
		onAddToken = () => {},
		onRemoveToken = (token: TokenDisplay) => {},
		showAddButton = true,
		className = ''
	} = $props();

	// Watchlist item with additional metadata
	interface WatchlistItem extends TokenDisplay {
		addedAt: Date;
		priceAlert?: {
			type: 'above' | 'below';
			value: number;
			triggered: boolean;
		};
		notes?: string;
	}

	// State
	let watchlist = $state<WatchlistItem[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let selectedToken = $state<string | null>(null);
	let searchQuery = $state('');
	let sortBy = $state<'name' | 'price' | 'change' | 'added'>('added');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let showPriceAlerts = $state(false);
	let editingNotes = $state<string | null>(null);
	
	// View cache manager instance
	let viewCacheManager: ViewCacheManager;
	const updateListenerId = `watchlist-view-${Math.random()}`;

	// Filter and sort watchlist
	let processedWatchlist = $derived.by(() => {
		let filtered = watchlist;
		
		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(item => 
				item.symbol.toLowerCase().includes(query) ||
				item.name.toLowerCase().includes(query) ||
				item.notes?.toLowerCase().includes(query)
			);
		}
		
		// Sort items
		const sorted = [...filtered].sort((a, b) => {
			let aVal: any, bVal: any;
			
			switch (sortBy) {
				case 'name':
					aVal = a.name.toLowerCase();
					bVal = b.name.toLowerCase();
					return sortOrder === 'asc' 
						? aVal.localeCompare(bVal) 
						: bVal.localeCompare(aVal);
					
				case 'price':
					aVal = a.price || 0;
					bVal = b.price || 0;
					break;
					
				case 'change':
					aVal = a.change24h || 0;
					bVal = b.change24h || 0;
					break;
					
				case 'added':
					aVal = a.addedAt.getTime();
					bVal = b.addedAt.getTime();
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

	// Calculate metrics
	let metrics = $derived.by(() => {
		const totalValue = processedWatchlist.reduce((sum, item) => {
			const value = typeof item.value === 'number' 
				? item.value 
				: new BigNumber(item.value || 0).toNumber();
			return sum + value;
		}, 0);

		const avgChange = processedWatchlist.length > 0
			? processedWatchlist.reduce((sum, item) => sum + (item.change24h || 0), 0) / processedWatchlist.length
			: 0;

		const gainers = processedWatchlist.filter(item => (item.change24h || 0) > 0).length;
		const losers = processedWatchlist.filter(item => (item.change24h || 0) < 0).length;

		const triggeredAlerts = processedWatchlist.filter(
			item => item.priceAlert && !item.priceAlert.triggered && checkPriceAlert(item)
		).length;

		return { totalValue, avgChange, gainers, losers, triggeredAlerts };
	});

	// Load watchlist data
	async function loadWatchlist() {
		try {
			isLoading = true;
			error = null;

			// Get watchlist from localStorage (or could be from ViewCacheManager)
			const stored = localStorage.getItem('yakkl_watchlist');
			if (stored) {
				const parsed = JSON.parse(stored);
				watchlist = parsed.map((item: any) => ({
					...item,
					addedAt: new Date(item.addedAt)
				}));
			}

			// Get latest token data from ViewCacheManager
			const viewCache = await viewCacheManager.getTokensView({ chainId });
			const allTokens = viewCache.data || [];
			
			// Update watchlist items with latest data
			watchlist = watchlist.map(watchItem => {
				const latestData = allTokens.find(
					token => token.address === watchItem.address || token.symbol === watchItem.symbol
				);
				if (latestData) {
					return {
						...watchItem,
						...latestData,
						addedAt: watchItem.addedAt,
						priceAlert: watchItem.priceAlert,
						notes: watchItem.notes
					};
				}
				return watchItem;
			});

			lastUpdated = new Date();
			saveWatchlist();

			log.info('[WatchlistView] Loaded watchlist', false, {
				count: watchlist.length,
				chainId,
				timestamp: lastUpdated
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load watchlist';
			log.error('[WatchlistView] Error loading watchlist', false, err);
		} finally {
			isLoading = false;
		}
	}

	// Save watchlist to localStorage
	function saveWatchlist() {
		const toSave = watchlist.map(item => ({
			symbol: item.symbol,
			name: item.name,
			address: item.address,
			logo: item.logo,
			addedAt: item.addedAt.toISOString(),
			priceAlert: item.priceAlert,
			notes: item.notes
		}));
		localStorage.setItem('yakkl_watchlist', JSON.stringify(toSave));
	}

	// Handle view updates
	function handleViewUpdate(notification: ViewUpdateNotification) {
		if (notification.viewType === 'tokens' || notification.viewType === 'all') {
			log.debug('[WatchlistView] Received update notification', false, notification);
			loadWatchlist();
		}
	}

	// Check if price alert is triggered
	function checkPriceAlert(item: WatchlistItem): boolean {
		if (!item.priceAlert || !item.price) return false;
		
		const { type, value } = item.priceAlert;
		if (type === 'above') {
			return item.price >= value;
		} else {
			return item.price <= value;
		}
	}

	// Handle token selection
	function selectToken(token: WatchlistItem) {
		selectedToken = token.address || token.symbol;
		onTokenSelect(token);
	}

	// Remove from watchlist
	function removeFromWatchlist(item: WatchlistItem, event: Event) {
		event.stopPropagation();
		watchlist = watchlist.filter(w => w.address !== item.address && w.symbol !== item.symbol);
		saveWatchlist();
		onRemoveToken(item);
	}

	// Set price alert
	function setPriceAlert(item: WatchlistItem, type: 'above' | 'below', value: number) {
		const index = watchlist.findIndex(w => w.address === item.address || w.symbol === item.symbol);
		if (index !== -1) {
			watchlist[index].priceAlert = { type, value, triggered: false };
			saveWatchlist();
		}
	}

	// Toggle notes editing
	function toggleNotesEdit(item: WatchlistItem) {
		editingNotes = editingNotes === item.symbol ? null : item.symbol;
	}

	// Save notes
	function saveNotes(item: WatchlistItem, notes: string) {
		const index = watchlist.findIndex(w => w.address === item.address || w.symbol === item.symbol);
		if (index !== -1) {
			watchlist[index].notes = notes;
			saveWatchlist();
		}
		editingNotes = null;
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

	// Format date
	function formatDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days} days ago`;
		if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
		return date.toLocaleDateString();
	}

	// Lifecycle
	onMount(async () => {
		viewCacheManager = ViewCacheManager.getInstance();
		viewCacheManager.registerUpdateListener(updateListenerId, handleViewUpdate);
		await loadWatchlist();
	});

	onDestroy(() => {
		if (viewCacheManager) {
			viewCacheManager.unregisterUpdateListener(updateListenerId);
		}
	});

	// Watch for context changes
	$effect(() => {
		if (chainId !== undefined) {
			loadWatchlist();
		}
	});
</script>

<div class="watchlist-view {className}">
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
					placeholder="Search watchlist..."
					class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		</div>

		<!-- Controls -->
		<div class="flex items-center gap-2">
			<!-- Sort dropdown -->
			<select
				bind:value={sortBy}
				class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
			>
				<option value="added">Recently Added</option>
				<option value="name">Name</option>
				<option value="price">Price</option>
				<option value="change">24h Change</option>
			</select>

			<!-- Toggle alerts -->
			<button
				class="px-3 py-2 rounded-lg border transition-colors {
					showPriceAlerts 
						? 'bg-blue-500 text-white border-blue-500' 
						: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
				}"
				onclick={() => showPriceAlerts = !showPriceAlerts}
				aria-label="Toggle price alerts"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
				</svg>
			</button>

			<!-- Add token button -->
			{#if showAddButton}
				<button
					class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2"
					onclick={onAddToken}
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Add Token
				</button>
			{/if}
		</div>
	</div>

	<!-- Metrics bar -->
	{#if !isLoading && processedWatchlist.length > 0}
		<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Value</p>
				<p class="text-lg font-semibold">
					<ProtectedValue value={formatTokenValue(metrics.totalValue)} />
				</p>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Change</p>
				<p class={`text-lg font-semibold ${getPriceChangeColor(metrics.avgChange)}`}>
					{formatPriceChange(metrics.avgChange)}
				</p>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Gainers</p>
				<p class="text-lg font-semibold text-green-500">{metrics.gainers}</p>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Losers</p>
				<p class="text-lg font-semibold text-red-500">{metrics.losers}</p>
			</div>
			{#if showPriceAlerts}
				<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Alerts</p>
					<p class="text-lg font-semibold text-yellow-500">{metrics.triggeredAlerts}</p>
				</div>
			{/if}
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
	{:else if processedWatchlist.length === 0}
		<div class="text-center p-8 text-gray-500 dark:text-gray-400">
			<svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
			</svg>
			<p class="text-lg font-medium mb-2">Your watchlist is empty</p>
			<p class="text-sm mb-4">
				{#if searchQuery}
					No tokens match your search
				{:else}
					Add tokens to track their performance
				{/if}
			</p>
			{#if showAddButton && !searchQuery}
				<button
					class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
					onclick={onAddToken}
				>
					Add Your First Token
				</button>
			{/if}
		</div>
	{:else}
		<!-- Watchlist items -->
		<div class="space-y-3">
			{#each processedWatchlist as item (item.address || item.symbol)}
				<button
					type="button"
					class="p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md w-full text-left {
						selectedToken === (item.address || item.symbol)
							? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
							: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
					}"
					onclick={() => selectToken(item)}
					aria-label="Select {item.name} token"
					in:fade={{ duration: 300 }}
					animate:flip={{ duration: 300 }}
				>
					<div class="flex items-start justify-between">
						<!-- Token info -->
						<div class="flex items-start gap-3 flex-1">
							{#if item.logo}
								<img src={item.logo} alt={item.symbol} class="w-10 h-10 rounded-full" />
							{:else}
								<div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
									<span class="text-xs font-bold">{item.symbol.slice(0, 2)}</span>
								</div>
							{/if}
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-medium text-gray-900 dark:text-gray-100">{item.symbol}</span>
									<span class="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
									{#if item.priceAlert && checkPriceAlert(item)}
										<span class="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300">
											Alert Triggered
										</span>
									{/if}
								</div>
								
								<!-- Price and change -->
								<div class="flex items-center gap-4 mb-2">
									<span class="text-lg font-semibold">${item.price?.toFixed(2) || '0.00'}</span>
									<span class={`text-sm ${getPriceChangeColor(item.change24h)}`}>
										{formatPriceChange(item.change24h)}
									</span>
								</div>

								<!-- Notes -->
								{#if editingNotes === item.symbol}
									<div class="mt-2" transition:slide>
										<input
											type="text"
											value={item.notes || ''}
											placeholder="Add notes..."
											class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
											onkeydown={(e) => {
												if (e.key === 'Enter') {
													saveNotes(item, e.currentTarget.value);
												}
											}}
											onblur={(e) => saveNotes(item, e.currentTarget.value)}
											onclick={(e) => e.stopPropagation()}
										/>
									</div>
								{:else if item.notes}
									<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.notes}</p>
								{/if}

								<!-- Price alert -->
								{#if showPriceAlerts && item.priceAlert}
									<div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
										Alert: {item.priceAlert.type === 'above' ? '↑' : '↓'} ${item.priceAlert.value.toFixed(2)}
									</div>
								{/if}

								<!-- Added date -->
								<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Added {formatDate(item.addedAt)}
								</div>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-1 ml-4">
							<SimpleTooltip text="Add/Edit Notes">
								<button
									class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
									onclick={(e) => {
										e.stopPropagation();
										toggleNotesEdit(item);
									}}
									aria-label="Add or edit notes for {item.symbol}"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>
							</SimpleTooltip>
							<SimpleTooltip text="Set Price Alert">
								<button
									class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
									onclick={(e) => {
										e.stopPropagation();
										// Open price alert modal
										const value = prompt(`Set alert when price goes ${item.price ? 'above/below' : 'to'}:`, item.price?.toString() || '0');
										if (value) {
											const type = parseFloat(value) > (item.price || 0) ? 'above' : 'below';
											setPriceAlert(item, type, parseFloat(value));
										}
									}}
									aria-label="Set price alert for {item.symbol}"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
									</svg>
								</button>
							</SimpleTooltip>
							<SimpleTooltip text="Remove from Watchlist">
								<button
									class="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
									onclick={(e) => removeFromWatchlist(item, e)}
									aria-label="Remove {item.symbol} from watchlist"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</SimpleTooltip>
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.watchlist-view {
		min-height: 200px;
	}
</style>
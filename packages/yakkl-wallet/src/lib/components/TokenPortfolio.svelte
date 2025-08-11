<script lang="ts">
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import MoreLess from './MoreLess.svelte';
	import { tokenStore, isMultiChainView } from '$lib/stores/token.store';
	import { canUseFeature } from '$lib/utils/features';
	import ProtectedValue from './ProtectedValue.svelte';
	import { CacheSyncManager } from '$lib/services/cache-sync.service';
	import { currentAccount } from '$lib/stores/account.store';
	import { currentChain } from '$lib/stores/chain.store';
	import { walletCacheStore } from '$lib/stores/wallet-cache.store';
	import { log } from '$lib/common/logger-wrapper';
	import { BigNumber } from '$lib/common/bignumber';
	import { BrowserAPIPortService } from '$lib/services/browser-api-port.service';

	let { tokens = [], className = '', maxRows = 6, loading = false } = $props();

	let expanded = $state(false);
	let sortBy = $state<'name' | 'value' | 'price' | 'quantity'>('value');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let multiChainView = $derived($isMultiChainView);
	let isRefreshing = $state(false);
	let lastRefreshTime = $state(0);
	let timeUntilNextRefresh = $state(0);

	// Rate limiting constants
	const REFRESH_COOLDOWN_MS = 5000; // 5 seconds between refreshes
	const MIN_TIME_BETWEEN_CLICKS = 1000; // 1 second minimum between button clicks

	// Timer to update timeUntilNextRefresh every second
	$effect(() => {
		const interval = setInterval(() => {
			const now = Date.now();
			const timeSinceLastRefresh = now - lastRefreshTime;
			if (timeSinceLastRefresh >= REFRESH_COOLDOWN_MS) {
				timeUntilNextRefresh = 0;
			} else {
				timeUntilNextRefresh = Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastRefresh) / 1000);
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	// Calculate total value of all tokens using BigNumber for precision
	let totalValue = $derived.by(() => {
		return tokens.reduce((sum, token) => {
			// Convert token value to number safely
			let value = 0;
			if (typeof token.value === 'number') {
				value = token.value;
			} else if (typeof token.value === 'string') {
				// Use BigNumber to handle the conversion
				const bn = new BigNumber(token.value || '0');
				value = bn.toNumber() || 0;
			}
			return sum + value;
		}, 0);
	});

	// Filter tokens with value > 0 and sort them
	let filteredAndSortedTokens = $derived.by(() => {
		// For debugging: show all tokens, not just those with value > 0
		// const filtered = tokens.filter(token => {
		//   const value = typeof token.value === 'number' ? token.value : parseFloat(token.value || '0');
		//   return value > 0;
		// });
		const filtered = tokens; // Show all tokens for now

		// Sort tokens
		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case 'name':
					const aName = a.symbol.toLowerCase();
					const bName = b.symbol.toLowerCase();
					return sortOrder === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);

				case 'value':
					// Use BigNumber for precise value comparison
					const aVal =
						typeof a.value === 'number' ? a.value : new BigNumber(a.value || '0').toNumber() || 0;
					const bVal =
						typeof b.value === 'number' ? b.value : new BigNumber(b.value || '0').toNumber() || 0;
					return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;

				case 'price':
					const aPrice = a.price || 0;
					const bPrice = b.price || 0;
					return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;

				case 'quantity':
					const aQty = a.qty || 0;
					const bQty = b.qty || 0;
					return sortOrder === 'asc' ? aQty - bQty : bQty - aQty;

				default:
					const aDefault =
						typeof a.value === 'number' ? a.value : new BigNumber(a.value || '0').toNumber() || 0;
					const bDefault =
						typeof b.value === 'number' ? b.value : new BigNumber(b.value || '0').toNumber() || 0;
					return sortOrder === 'asc' ? aDefault - bDefault : bDefault - aDefault;
			}
		});

		return sorted;
	});

	let visible = $derived(
		expanded ? filteredAndSortedTokens : filteredAndSortedTokens.slice(0, maxRows)
	);
	let hidden = $derived(expanded ? [] : filteredAndSortedTokens.slice(maxRows));

	// Debug effect
	$effect(() => {
		// Debug token values
		if (tokens.length > 0) {
			log.info('[TokenPortfolio] Debug tokens:', false, {
				tokenCount: tokens.length,
				filteredCount: filteredAndSortedTokens.length,
				firstToken: tokens[0],
				multiChainView,
				sortBy,
				sortOrder,
				tokens: tokens.map((t) => ({
					symbol: t.symbol,
					value: t.value,
					price: t.price,
					qty: t.qty
				}))
			});
		}
	});

	// Helper for long values
	function needsEllipsis(val: number | undefined) {
		return String(val ?? '').length > 9;
	}

	function formatValue(val: number | bigint | undefined): string {
		if (!val) return '$0.00';

		// Convert bigint (cents) to number (dollars) for display
		const numValue = typeof val === 'bigint' ? Number(val) / 100 : val;
		const absValue = Math.abs(numValue);

		if (absValue >= 1e12) {
			return `$${(numValue / 1e12).toFixed(1)}T+`;
		} else if (absValue >= 1e9) {
			return `$${(numValue / 1e9).toFixed(1)}B+`;
		} else if (absValue >= 1e6) {
			return `$${(numValue / 1e6).toFixed(1)}M+`;
		} else if (absValue >= 1e3) {
			return `$${(numValue / 1e3).toFixed(1)}K+`;
		}

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(numValue);
	}

	function formatPrice(price: number | undefined): string {
		if (!price) return '$0.00';

		const absPrice = Math.abs(price);
		if (absPrice >= 1e6) {
			return `$${(price / 1e6).toFixed(1)}M+`;
		} else if (absPrice >= 1e3) {
			return `$${(price / 1e3).toFixed(1)}K+`;
		} else if (absPrice < 0.01) {
			return '< $0.01';
		}

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: price < 1 ? 6 : 2
		}).format(price);
	}

	function formatValueFull(val: number | bigint | undefined): string {
		if (!val) return '$0.00';
		// Convert bigint (cents) to number (dollars) for display
		const numValue = typeof val === 'bigint' ? Number(val) / 100 : val;
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(numValue);
	}

	function getFullPriceDisplay(price: number | undefined): string {
		if (!price) return '$0.00000000';
		if (price < 0.00000001) {
			return `$${price.toExponential(8)}`;
		}
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 10
		}).format(price);
	}

	function toggleMultiChain() {
		tokenStore.toggleMultiChainView();

		// Load multi-network data if switching to multi-network view
		if (!multiChainView) {
			// Multi-chain tokens will be loaded by the store when toggled
			// Non-blocking refresh
			tokenStore.refresh().catch(error => {
				log.warn('[TokenPortfolio] Failed to refresh after toggle:', false, error);
			});
		}
	}

	function handleTokenClick(token: any) {
		// Dispatch a custom event for the parent to handle
		const event = new CustomEvent('tokenclick', {
			detail: { token },
			bubbles: true
		});

		// Find the component element and dispatch the event
		if (typeof document !== 'undefined') {
			const element = document.querySelector('.token-portfolio-container');
			element?.dispatchEvent(event);
		}
	}

	// Refresh function with rate limiting
	function handleRefresh() {
		const now = Date.now();

		// Check if we're within the cooldown period
		if (now - lastRefreshTime < MIN_TIME_BETWEEN_CLICKS) {
			log.info('[TokenPortfolio] Refresh blocked - too soon after last click', false);
			return;
		}

		// Check if a refresh is already in progress
		if (isRefreshing) {
			log.info('[TokenPortfolio] Refresh already in progress', false);
			return;
		}

		// Check if we're still in cooldown from last successful refresh
		if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
			const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - (now - lastRefreshTime)) / 1000);
			log.info(
				`[TokenPortfolio] Please wait ${remainingTime} seconds before refreshing again`,
				false
			);
			return;
		}

		isRefreshing = true;
		lastRefreshTime = now;

		log.info('[TokenPortfolio] Sending refresh request to background...', false);

		// Send refresh request to background service using BrowserAPIPortService
		const browserAPI = BrowserAPIPortService.getInstance() as any;
		if (browserAPI.runtimeSendMessage) {
			browserAPI.runtimeSendMessage({
				type: 'YAKKL_REFRESH_REQUEST',
				refreshType: 'all'
			}).then((response: any) => {
			if (response?.success) {
				log.info('[TokenPortfolio] Background refresh completed', false);
			} else {
				log.warn('[TokenPortfolio] Background refresh failed', false, response?.error);
				// Reset the cooldown on error to allow retry sooner
				lastRefreshTime = Date.now() - (REFRESH_COOLDOWN_MS - 2000); // Allow retry in 2 seconds
			}
			isRefreshing = false;
			}).catch((error: any) => {
				log.warn('[TokenPortfolio] Failed to send refresh request:', false, error);
				isRefreshing = false;
			});
		} else {
			log.warn('[TokenPortfolio] runtimeSendMessage not available', false);
			isRefreshing = false;
		}

		// Also trigger a non-blocking token store refresh
		tokenStore.refresh(true).then(() => {
			log.info('[TokenPortfolio] Token store refresh completed', false);
		}).catch(error => {
			log.warn('[TokenPortfolio] Token store refresh failed:', false, error);
		});
	}
</script>

<div
	class={`bg-white/70 dark:bg-zinc-800 p-4 rounded-2xl shadow space-y-2 relative z-10 token-portfolio-container ${className}`}
>
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Token Portfolio</div>
			<div class="flex items-center gap-2">
				{#if canUseFeature('multi_chain_portfolio')}
					<button
						onclick={toggleMultiChain}
						class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors {multiChainView
							? 'bg-indigo-600 text-white'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}"
						title={multiChainView
							? 'Switch to single network view'
							: 'Switch to multi-network view'}
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
						{multiChainView ? 'Multi-Network' : 'Single Network'}
					</button>
				{/if}

				<!-- Refresh Button -->
				<SimpleTooltip
					content={isRefreshing
						? 'Refreshing...'
						: timeUntilNextRefresh > 0
							? `Wait ${timeUntilNextRefresh}s`
							: 'Refresh token balances'}
					position="top"
				>
					<button
						onclick={handleRefresh}
						disabled={isRefreshing || timeUntilNextRefresh > 0}
						class="p-1.5 rounded-lg transition-all {isRefreshing || timeUntilNextRefresh > 0
							? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
						aria-label="Refresh tokens"
					>
						<svg
							class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</button>
				</SimpleTooltip>
			</div>
		</div>

		<!-- Sort controls -->
		{#if filteredAndSortedTokens.length > 0}
			<div class="flex items-center gap-2 text-xs">
				<span class="text-zinc-500 dark:text-zinc-400">Sort by:</span>
				<div class="flex gap-1">
					<button
						onclick={() => {
							sortBy = 'name';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'name'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
					<button
						onclick={() => {
							sortBy = 'value';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'value'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Value {sortBy === 'value' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
					<button
						onclick={() => {
							sortBy = 'price';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'price'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Price {sortBy === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
					<button
						onclick={() => {
							sortBy = 'quantity';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'quantity'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Qty {sortBy === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
				</div>
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="grid grid-cols-2 gap-3">
			{#each Array(4) as _}
				<div class="rounded-xl shadow bg-zinc-100 dark:bg-zinc-700 p-3 animate-pulse">
					<div class="w-8 h-8 mb-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto"></div>
					<div class="h-4 bg-zinc-300 dark:bg-zinc-600 rounded mt-2"></div>
					<div class="h-3 bg-zinc-300 dark:bg-zinc-600 rounded mt-1 w-3/4 mx-auto"></div>
					<div class="h-3 bg-zinc-300 dark:bg-zinc-600 rounded mt-1 w-1/2 mx-auto"></div>
				</div>
			{/each}
		</div>
	{:else if filteredAndSortedTokens.length === 0}
		<div class="text-center py-8 text-gray-500 dark:text-gray-400">
			<p>No tokens with value found</p>
			<p class="text-sm mt-2">
				{tokens.length > 0
					? `${tokens.length} tokens hidden (zero value)`
					: 'Add tokens to see them here'}
			</p>
			{#if multiChainView}
				<p class="text-xs mt-1 text-zinc-400">Viewing all networks</p>
			{/if}
		</div>
	{:else}
		<div
			class="grid grid-cols-2 gap-3 overflow-y-auto {expanded ? 'max-h-[400px]' : 'max-h-[300px]'}"
			style="scrollbar-width: thin;"
		>
			{#each visible as token}
				{@const isImagePath =
					token.icon &&
					(token.icon.startsWith('/') ||
						token.icon.startsWith('http') ||
						token.icon.includes('.svg') ||
						token.icon.includes('.png') ||
						token.icon.includes('.jpg') ||
						token.icon.includes('.jpeg') ||
						token.icon.includes('.gif') ||
						token.icon.includes('.webp'))}
				<button
					onclick={() => handleTokenClick(token)}
					class="rounded-xl shadow flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-700 p-3 transition hover:ring-2 hover:ring-indigo-400 dark:hover:ring-indigo-300 min-w-0 cursor-pointer w-full"
					title="Click to manage {token.symbol}"
				>
					{#if isImagePath}
						<!-- Image files (local or remote) -->
						<img
							src={token.icon}
							alt={token.symbol}
							class="w-8 h-8 mb-1 rounded-full"
							onerror={(e) => {
								(e.currentTarget as HTMLElement).style.display = 'none';
								(
									(e.currentTarget as HTMLElement).nextElementSibling as HTMLElement
								)?.style.setProperty('display', 'flex');
							}}
						/>
						<div
							class={`w-8 h-8 mb-1 rounded-full items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`}
							style="display:none;"
						>
							{token.symbol?.[0] || '?'}
						</div>
					{:else}
						<!-- Text/emoji icons or missing icons -->
						<div
							class={`w-8 h-8 mb-1 rounded-full flex items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`}
						>
							{token.icon || token.symbol?.[0] || '?'}
						</div>
					{/if}
					<div class="font-bold text-base text-center mt-1">{token.symbol}</div>
					<SimpleTooltip
						content={`${token.qty || 0} ${token.symbol}`}
						position="auto"
						maxWidth="200px"
					>
						<div
							class="text-xs text-zinc-400 dark:text-zinc-200 truncate max-w-[96px] text-center cursor-help mt-0.5"
						>
							<ProtectedValue
								value={needsEllipsis(token.qty)
									? `${token.qty}`.slice(0, 9) + '…'
									: String(token.qty || 0)}
								placeholder="****"
							/>
						</div>
					</SimpleTooltip>

					<!-- Market Price -->
					<SimpleTooltip
						content={getFullPriceDisplay(token.price)}
						position="auto"
						maxWidth="250px"
					>
						<div class="text-xs text-zinc-500 dark:text-zinc-400 text-center cursor-help">
							<ProtectedValue value={formatPrice(token.price)} placeholder="****" />
						</div>
					</SimpleTooltip>

					<!-- Total Value -->
					<SimpleTooltip content={formatValueFull(token.value)} position="auto" maxWidth="200px">
						<div
							class="text-zinc-600 dark:text-zinc-300 text-center cursor-help font-medium {formatValue(
								token.value
							).length > 8
								? 'text-xs'
								: 'text-sm'} {formatValue(token.value).length > 10
								? 'break-all'
								: 'truncate max-w-[96px]'}"
						>
							<ProtectedValue value={formatValue(token.value)} placeholder="*****" />
						</div>
					</SimpleTooltip>
					{#if token.change24h !== undefined}
						<div
							class="text-xs mt-0.5 font-medium {token.change24h >= 0
								? 'text-green-500'
								: 'text-red-500'}"
						>
							{token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
						</div>
					{/if}
				</button>
			{/each}
		</div>
		{#if hidden.length}
			<MoreLess
				count={hidden.length}
				text="more"
				lessText="less"
				{expanded}
				className="mt-2"
				onclick={() => (expanded = !expanded)}
			/>
		{/if}
	{/if}

	{#if filteredAndSortedTokens.length > 0}
		<!-- Value Footer -->
		<div class="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
			<div class="flex justify-between items-center">
				<span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Value:</span>
				<span class="text-sm font-bold text-zinc-800 dark:text-zinc-200">
					<ProtectedValue value={formatValue(totalValue)} placeholder="*****" />
				</span>
			</div>
		</div>
	{/if}
</div>

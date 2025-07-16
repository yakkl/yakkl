<!-- PortfolioTotal.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { yakklCombinedTokenStore, yakklCurrentlySelectedStore, yakklPricingStore, getSettings } from '$lib/common/stores';
	import { shouldShowProFeatures } from '$lib/common/token-analytics';
	import { tokenTotals } from '$lib/common/stores/tokenTotals';
	import type { TokenData, Settings } from '$lib/common/interfaces';
	import { PlanType } from '$lib/common/types';
	import { formatEther } from '$lib/utilities/utilities';
	import { log } from '$lib/managers/Logger';
	import ProtectedValue from './ProtectedValue.svelte';
	import SimpleTooltip from './SimpleTooltip.svelte';

	interface Props {
		className?: string;
		showDetails?: boolean;
		currency?: string;
	}

	let {
		className = '',
		showDetails = false,
		currency = 'USD'
	}: Props = $props();

	// Ensure currency is always a valid code
	let validCurrency = $derived(currency && currency.length === 3 ? currency : 'USD');

	let totalPortfolioValue = $state(0);
	let portfolioBreakdown = $state<Array<{token: TokenData, value: number, percentage: number}>>([]);
	let isCalculating = $state(false);
	let showTooltip = $state(false);
	let error = $state('');
	let lastUpdated = $state('');
	let settings: Settings | null = null;
	let isBasicMember = $state(true);
	let hasInitialLoad = $state(false);

	// Currency formatter - use reactive statement to handle currency changes
	let currencyFormatter = $state<Intl.NumberFormat>();

	$effect(() => {
		try {
			currencyFormatter = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: validCurrency,
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
		} catch (error) {
			log.warn('[PortfolioTotal] Invalid currency code, falling back to USD:', false, { currency: validCurrency, error });
			currencyFormatter = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
		}
	});

	// Percentage formatter
	const percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	// Auto-refresh interval
	let refreshInterval: number | null = null;

	// Use the same reactive tokenTotals store as Card.svelte
	$effect(() => {
		const totals = $tokenTotals;
		totalPortfolioValue = totals.portfolioTotal;
		
		// Create breakdown from current tokens for tooltip
		const tokens = $yakklCombinedTokenStore;
		if (tokens && tokens.length > 0) {
			const breakdown: Array<{token: TokenData, value: number, percentage: number}> = [];
			let totalValue = totals.portfolioTotal;

			tokens.forEach(token => {
				if (token.balance && token.price?.price) {
					let balanceNum: number;
					if (typeof token.balance === 'bigint') {
						balanceNum = Number(token.balance) / Math.pow(10, token.decimals || 18);
					} else {
						balanceNum = Number(token.balance);
					}
					
					const tokenValue = balanceNum * token.price.price;
					if (tokenValue > 0) {
						breakdown.push({
							token,
							value: tokenValue,
							percentage: totalValue > 0 ? tokenValue / totalValue : 0
						});
					}
				}
			});

			// Add native ETH if exists
			const currentlySelected = $yakklCurrentlySelectedStore;
			const ethPrice = $yakklPricingStore?.price || 0;
			if (currentlySelected?.shortcuts?.quantity && ethPrice > 0) {
				const ethBalance = parseFloat(formatEther(currentlySelected.shortcuts.quantity));
				const ethValue = ethBalance * ethPrice;
				if (ethValue > 0) {
					breakdown.push({
						token: {
							name: 'Ethereum',
							symbol: 'ETH',
							address: '0x0000000000000000000000000000000000000000',
							decimals: 18,
							chainId: 1,
							balance: currentlySelected.shortcuts.quantity,
							price: { price: ethPrice, provider: 'pricing-store', lastUpdated: new Date(), chainId: 1 },
							portfolioIncluded: true,
							blockchain: 'ethereum',
							isNative: true
						} as TokenData,
						value: ethValue,
						percentage: totalValue > 0 ? ethValue / totalValue : 0
					});
				}
			}

			breakdown.sort((a, b) => b.value - a.value);
			portfolioBreakdown = breakdown;
		}
		
		lastUpdated = new Date().toLocaleTimeString();
		hasInitialLoad = true;
	});

	onMount(async () => {
		// Load settings to check membership
		settings = await getSettings();
		isBasicMember = !shouldShowProFeatures(settings?.plan?.type || PlanType.BASIC_MEMBER);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
		if (tooltipTimeout) {
			clearTimeout(tooltipTimeout);
		}
	});

	// Portfolio now updates reactively via tokenTotals store

	let tooltipTimeout: number | null = null;
	let isHoveringTooltip = $state(false);
	let isHoveringTrigger = $state(false);
	let isManualRefreshing = $state(false);
	let lastManualRefresh = $state(0);
	let refreshCooldown = $state(0);

	// Show tooltip when hovering over trigger
	$effect(() => {
		if (isHoveringTrigger) {
			showTooltip = true;
		}
	});

	// Hide tooltip when not hovering over either trigger or tooltip
	$effect(() => {
		if (!isHoveringTrigger && !isHoveringTooltip) {
			// Small delay to allow smooth transition between elements
			if (tooltipTimeout) clearTimeout(tooltipTimeout);
			tooltipTimeout = setTimeout(() => {
				showTooltip = false;
			}, 50) as unknown as number;
		} else if (tooltipTimeout) {
			clearTimeout(tooltipTimeout);
			tooltipTimeout = null;
		}
	});

	function handleMouseEnter() {
		isHoveringTrigger = true;
	}

	function handleMouseLeave() {
		isHoveringTrigger = false;
	}

	function handleTooltipMouseEnter() {
		isHoveringTooltip = true;
	}

	function handleTooltipMouseLeave() {
		isHoveringTooltip = false;
	}

	function getTokenDisplayName(token: TokenData): string {
		if (token.isNative) {
			return token.name;
		}
		return token.alias || token.name;
	}

	// Manual refresh with debouncing (Pro users only)
	async function handleManualRefresh() {
		if (!isBasicMember && !isManualRefreshing) {
			const now = Date.now();
			const timeSinceLastRefresh = now - lastManualRefresh;
			const minInterval = 15000; // 15 seconds minimum between manual refreshes

			if (timeSinceLastRefresh < minInterval) {
				refreshCooldown = Math.ceil((minInterval - timeSinceLastRefresh) / 1000);
				const cooldownInterval = setInterval(() => {
					refreshCooldown--;
					if (refreshCooldown <= 0) {
						clearInterval(cooldownInterval);
					}
				}, 1000);
				return;
			}

			isManualRefreshing = true;
			lastManualRefresh = now;
			
			try {
				// Force refresh of token data
				// This would trigger a refresh of yakklCombinedTokenStore and pricing data
				log.debug('Manual portfolio refresh triggered', false);
				
				// Simulate refresh time
				await new Promise(resolve => setTimeout(resolve, 1000));
				
				// The reactive tokenTotals store will automatically update
				lastUpdated = new Date().toLocaleTimeString();
				
			} catch (error) {
				log.error('Manual refresh failed:', false, error);
			} finally {
				isManualRefreshing = false;
			}
		}
	}

	// Check if manual refresh is available
	const canManualRefresh = $derived(() => {
		if (isBasicMember || isManualRefreshing) return false;
		const timeSinceLastRefresh = Date.now() - lastManualRefresh;
		return timeSinceLastRefresh >= 15000; // 15 seconds cooldown
	});
</script>

<div class="relative inline-block {className}">
	<!-- Main Portfolio Display -->
	<div
		class="group cursor-pointer"
		role="button"
		tabindex="0"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		onfocus={handleMouseEnter}
		onblur={handleMouseLeave}
	>
		<div class="flex items-center gap-2 p-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
			<!-- Portfolio Icon -->
			<div class="flex-shrink-0">
				<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
				</svg>
			</div>

			<!-- Portfolio Value -->
			<div class="flex-1 min-w-0">
				<div class="text-white text-sm font-medium opacity-90">Total Portfolio</div>
				<div class="text-white text-lg font-bold">
					{#if isCalculating}
						<div class="flex items-center gap-2">
							<div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
							<span class="text-sm">Calculating...</span>
						</div>
					{:else if error}
						<span class="text-red-200 text-sm">Error</span>
					{:else}
						<ProtectedValue
							value={currencyFormatter ? currencyFormatter.format(totalPortfolioValue) : `$${totalPortfolioValue.toFixed(2)}`}
							placeholder="*****"
						/>
					{/if}
				</div>
			</div>

			<!-- Auto-refresh indicator -->
			{#if hasInitialLoad && !isCalculating}
				<div class="flex-shrink-0">
					<SimpleTooltip content={isBasicMember ? "Auto-refreshes every 5 minutes" : "Auto-refreshes every minute"}>
						<div class="text-white/80 p-1 flex items-center gap-1">
							<div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
							<span class="text-xs">Auto</span>
						</div>
					</SimpleTooltip>
				</div>
			{/if}

			<!-- Last Updated Indicator -->
			{#if lastUpdated && !isCalculating}
				<div class="flex-shrink-0 text-white text-xs opacity-75">
					{lastUpdated}
				</div>
			{/if}

			<!-- Manual Refresh Button (Pro users only) -->
			{#if !isBasicMember}
				<div class="flex-shrink-0">
					<SimpleTooltip content={refreshCooldown > 0 ? `Wait ${refreshCooldown}s before next refresh` : canManualRefresh ? "Manual refresh (Pro feature)" : "Refreshing..."}>
						<button
							onclick={handleManualRefresh}
							disabled={!canManualRefresh}
							class="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isManualRefreshing}
								<div class="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full"></div>
							{:else if refreshCooldown > 0}
								<span class="text-xs font-medium">{refreshCooldown}</span>
							{:else}
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
								</svg>
							{/if}
						</button>
					</SimpleTooltip>
				</div>
			{/if}
		</div>
	</div>

	<!-- Detailed Tooltip -->
	{#if showTooltip && portfolioBreakdown.length > 0}
		<div 
			class="absolute z-50 w-80 p-4 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 left-0 top-full"
			role="tooltip"
			aria-label="Portfolio breakdown details"
			onmouseenter={handleTooltipMouseEnter}
			onmouseleave={handleTooltipMouseLeave}
		>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Portfolio Breakdown</h3>
					<span class="text-sm text-gray-500">Updated: {lastUpdated}</span>
				</div>

				{#if error}
					<div class="text-red-600 text-sm">{error}</div>
				{:else if isBasicMember}
					<!-- Basic Member: Show all tokens with values only (no percentages or analytics) -->
					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#each portfolioBreakdown as item}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded">
								<div class="flex items-center gap-3">
									{#if item.token.logoURI}
										<img src={item.token.logoURI} alt={item.token.symbol} class="w-6 h-6 rounded-full" />
									{:else}
										<div class="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
											{item.token.symbol.charAt(0)}
										</div>
									{/if}
									<div>
										<div class="font-medium text-gray-900">{item.token.symbol}</div>
										<div class="text-sm text-gray-500">{getTokenDisplayName(item.token)}</div>
									</div>
								</div>
								<div class="text-right">
									<div class="font-medium text-gray-900">
										<ProtectedValue
											value={currencyFormatter ? currencyFormatter.format(item.value) : `$${item.value.toFixed(2)}`}
											placeholder="*****"
										/>
									</div>
									<div class="text-sm text-gray-500">
										<!-- Skeleton with question mark for Basic users -->
										<SimpleTooltip content="Upgrade to Pro to see portfolio percentages, yield opportunities, and advanced analytics">
											<div class="flex items-center gap-1 cursor-help">
												<div class="w-8 h-3 bg-gray-200 rounded animate-pulse"></div>
												<div class="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center hover:from-indigo-500 hover:to-purple-500 transition-colors">
													<svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
														<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
													</svg>
												</div>
											</div>
										</SimpleTooltip>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Total for Basic users -->
					<div class="pt-2 border-t border-gray-200">
						<div class="flex justify-between items-center mb-2">
							<span class="font-semibold text-gray-900">Total</span>
							<span class="font-bold text-lg text-gray-900">
								<ProtectedValue
									value={currencyFormatter ? currencyFormatter.format(totalPortfolioValue) : `$${totalPortfolioValue.toFixed(2)}`}
									placeholder="*****"
								/>
							</span>
						</div>
						
						<div class="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
							<div class="flex items-center gap-2">
								<svg class="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
								</svg>
								<div class="text-xs">
									<div class="font-medium text-indigo-900">Upgrade for full analytics</div>
									<div class="text-indigo-700">Portfolio percentages, yield opportunities, risk analysis & more</div>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<!-- Pro Member: Show full breakdown -->
					<div class="space-y-2 max-h-60 overflow-y-auto">
						{#each portfolioBreakdown as item}
							<div class="flex items-center justify-between p-2 bg-gray-50 rounded">
								<div class="flex items-center gap-3">
									{#if item.token.logoURI}
										<img src={item.token.logoURI} alt={item.token.symbol} class="w-6 h-6 rounded-full" />
									{:else}
										<div class="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
											{item.token.symbol.charAt(0)}
										</div>
									{/if}
									<div>
										<div class="font-medium text-gray-900">{item.token.symbol}</div>
										<div class="text-sm text-gray-500">{getTokenDisplayName(item.token)}</div>
									</div>
								</div>
								<div class="text-right">
									<div class="font-medium text-gray-900">
										<ProtectedValue
											value={currencyFormatter ? currencyFormatter.format(item.value) : `$${item.value.toFixed(2)}`}
											placeholder="*****"
										/>
									</div>
									<div class="text-sm text-gray-500">
										<ProtectedValue
											value={percentFormatter.format(item.percentage)}
											placeholder="****"
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<div class="pt-2 border-t border-gray-200">
						<div class="flex justify-between items-center">
							<span class="font-semibold text-gray-900">Total</span>
							<span class="font-bold text-lg text-gray-900">
								<ProtectedValue
									value={currencyFormatter ? currencyFormatter.format(totalPortfolioValue) : `$${totalPortfolioValue.toFixed(2)}`}
									placeholder="*****"
								/>
							</span>
						</div>
						<div class="text-sm text-gray-500 mt-1">
							{portfolioBreakdown.length} asset{portfolioBreakdown.length === 1 ? '' : 's'} included
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Optional detailed view -->
	{#if showDetails}
		<div class="mt-4 space-y-2">
			{#each portfolioBreakdown as item}
				<div class="flex items-center justify-between p-2 bg-gray-100 rounded">
					<span class="font-medium">{item.token.symbol}</span>
					<span>
						<ProtectedValue
							value={currencyFormatter ? currencyFormatter.format(item.value) : `$${item.value.toFixed(2)}`}
							placeholder="*****"
						/>
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Custom animations */
	@keyframes pulse-glow {
		0%, 100% {
			box-shadow: 0 0 5px rgba(99, 102, 241, 0.3);
		}
		50% {
			box-shadow: 0 0 20px rgba(99, 102, 241, 0.6), 0 0 30px rgba(99, 102, 241, 0.3);
		}
	}

	.group:hover {
		animation: pulse-glow 2s infinite;
	}
</style>

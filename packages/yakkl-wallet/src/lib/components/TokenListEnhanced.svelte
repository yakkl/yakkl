<!-- TokenListEnhanced.svelte - Membership-aware token display -->
<script lang="ts">
	import type { TokenData, Settings } from '$lib/common';
	import { PlanType } from '$lib/common/types';
	import { getSettings } from '$lib/common/stores';
	import { 
		toBasicAnalytics, 
		toProAnalytics, 
		shouldShowProFeatures,
		type BasicTokenAnalytics,
		type ProTokenAnalytics 
	} from '$lib/common/token-analytics';
	import TokenForm from './TokenForm.svelte';
	import Confirmation from './Confirmation.svelte';
	import EditControls from './EditControls.svelte';
	import SimpleTooltip from './SimpleTooltip.svelte';
	import { getTokenChange } from '$lib/utilities/utilities';
	import { onMount } from 'svelte';

	interface Props {
		tokens?: TokenData[];
		onTokenSelect?: (token: TokenData) => void;
		onTokenUpdate?: (token: TokenData) => void;
		onTokenDelete?: (token: TokenData) => void;
	}

	let {
		tokens = [],
		onTokenSelect = () => {},
		onTokenUpdate = () => {},
		onTokenDelete = () => {}
	}: Props = $props();

	let selectedToken: TokenData | null = $state(null);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let settings: Settings | null = $state(null);
	let isProUser = $state(false);

	// Currency formatter for USD values
	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	// Formatter for precise values (shows more decimals)
	const preciseFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 8
	});

	// Percentage formatter
	const percentFormatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	onMount(async () => {
		settings = await getSettings();
		isProUser = shouldShowProFeatures(settings?.plan?.type || PlanType.BASIC_MEMBER);
	});

	function handleEdit(token: TokenData) {
		selectedToken = token;
		showEditModal = true;
	}

	function handleDelete(token: TokenData) {
		if (token?.customDefault === 'custom') {
			selectedToken = token;
			showDeleteModal = true;
		}
	}

	function confirmDelete() {
		if (selectedToken && selectedToken?.customDefault === 'custom') {
			onTokenDelete(selectedToken);
			showDeleteModal = false;
			selectedToken = null;
		}
	}

	function getAnalyticsData(token: TokenData) {
		return isProUser ? toProAnalytics(token) : toBasicAnalytics(token);
	}

	function formatLargeNumber(value: number): string {
		if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
		if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
		if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
		return currencyFormatter.format(value);
	}

	function getRiskColor(score: number): string {
		if (score <= 3) return 'text-green-600 bg-green-100';
		if (score <= 6) return 'text-yellow-600 bg-yellow-100';
		return 'text-red-600 bg-red-100';
	}

	function getRiskLevel(score: number): string {
		if (score <= 3) return 'Low';
		if (score <= 6) return 'Medium';
		return 'High';
	}
</script>

<ul class="overflow-hidden">
	{#each tokens as token}
		{@const analytics = getAnalyticsData(token)}
		<li class="mb-3 relative overflow-hidden">
			<button
				class="w-full flex items-start rounded-lg p-3 transition-colors duration-200 overflow-hidden {token?.customDefault === 'custom'
					? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
					: token?.sidepanel
						? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
						: 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}"
				onclick={() => onTokenSelect(token)}
			>
				<div
					class="w-6 h-6 flex items-center justify-center rounded-full {token?.customDefault === 'custom'
						? 'bg-emerald-500'
						: token?.sidepanel
							? 'bg-blue-500'
							: 'bg-gray-500'} text-white mr-3 shrink-0"
				>
					{#if token?.logoURI}
						<img src={token.logoURI} alt={token.symbol} class="w-6 h-6 rounded-full" />
					{:else if token?.customDefault === 'custom'}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
						</svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clip-rule="evenodd" />
						</svg>
					{/if}
				</div>
				
				<div class="flex-1 min-w-0 overflow-hidden">
					<div class="flex items-center justify-between mb-1">
						<div class="flex items-center space-x-2">
							<h3 class="text-sm font-semibold text-gray-800">
								{token?.customDefault === 'custom' ? 'CUSTOM TOKEN' : 'COMMON TOKEN'}
							</h3>
							{#if token?.sidepanel}
								<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Visible</span>
							{/if}
							{#if token?.customDefault === 'custom'}
								<span class="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">Custom</span>
							{/if}
							{#if !isProUser}
								<SimpleTooltip content="Upgrade to Pro for advanced analytics">
									<span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full cursor-help">Basic</span>
								</SimpleTooltip>
							{/if}
						</div>
					</div>
					
					<!-- Token Name and Symbol -->
					<p class="text-sm font-medium text-gray-700 truncate mb-1" title={token.name}>
						{token.name} ({token.symbol})
					</p>
					
					<!-- Basic Info - Shown to all users -->
					<div class="flex items-center space-x-4 mb-2">
						{#if analytics.balance}
							{@const rawBalance = typeof analytics.balance === 'bigint' ? Number(analytics.balance) / Math.pow(10, analytics.decimals || 18) : Number(analytics.balance)}
							{@const balanceNumber = isNaN(rawBalance) ? 0 : rawBalance}
							{@const balanceValue = analytics.value}
							<SimpleTooltip content={`${balanceNumber.toFixed(8)} ${analytics.symbol} ≈ ${preciseFormatter.format(balanceValue)}`}>
								<span class="text-xs text-gray-600 font-medium cursor-help" title="Token Balance">
									Balance: {balanceNumber.toFixed(4)} {balanceValue > 0 ? `≈ ${currencyFormatter.format(balanceValue)}` : ''}
								</span>
							</SimpleTooltip>
						{/if}
						
						{#if analytics.currentPrice > 0}
							<SimpleTooltip content={preciseFormatter.format(analytics.currentPrice)}>
								<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full cursor-help">
									{analytics.currentPrice < 0.01 ? '~< $0.01' : currencyFormatter.format(analytics.currentPrice)}
								</span>
							</SimpleTooltip>
						{/if}
					</div>

					<!-- Pro Features - Advanced Analytics -->
					{#if isProUser && 'priceChange24h' in analytics}
						{@const proData = analytics as ProTokenAnalytics}
						<div class="space-y-2 mb-2">
							<!-- Price Changes -->
							<div class="flex items-center space-x-2">
								<span class="text-xs px-2 py-1 rounded-full {proData.priceChange24h >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
									24h: {proData.priceChange24h >= 0 ? '+' : ''}{proData.priceChange24h.toFixed(2)}%
								</span>
								<span class="text-xs px-2 py-1 rounded-full {proData.priceChange7d >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
									7d: {proData.priceChange7d >= 0 ? '+' : ''}{proData.priceChange7d.toFixed(2)}%
								</span>
							</div>
							
							<!-- Market Data -->
							<div class="flex items-center space-x-2 text-xs text-gray-500">
								<span title="Market Cap">MC: {formatLargeNumber(proData.marketCap)}</span>
								<span title="24h Volume">Vol: {formatLargeNumber(proData.volume24h)}</span>
								<span title="Risk Score" class="px-2 py-1 rounded-full {getRiskColor(proData.riskScore)}">
									Risk: {getRiskLevel(proData.riskScore)}
								</span>
							</div>

							<!-- Technical Indicators -->
							<div class="flex items-center space-x-2 text-xs">
								<span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-full" title="RSI">
									RSI: {proData.technicalIndicators.rsi.toFixed(0)}
								</span>
								{#if proData.yieldOpportunities.length > 0}
									<SimpleTooltip content={`${proData.yieldOpportunities.length} yield opportunities available`}>
										<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full cursor-help">
											Max APY: {Math.max(...proData.yieldOpportunities.map(y => y.apy)).toFixed(1)}%
										</span>
									</SimpleTooltip>
								{/if}
							</div>

							<!-- Social Sentiment -->
							<div class="flex items-center space-x-2 text-xs">
								<span class="px-2 py-1 rounded-full {proData.socialSentiment.score > 0 ? 'bg-green-100 text-green-700' : proData.socialSentiment.score < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}">
									Sentiment: {proData.socialSentiment.score > 0 ? 'Positive' : proData.socialSentiment.score < 0 ? 'Negative' : 'Neutral'}
								</span>
								<span class="text-gray-500" title="Mentions in 24h">
									{proData.socialSentiment.mentions24h} mentions
								</span>
							</div>
						</div>
					{:else if token.change}
						<!-- Basic users still see basic price change -->
						{@const percentageValue = getTokenChange(token.change, '24h')}
						{#if percentageValue !== null}
							<div class="mb-2">
								<span class="text-xs px-2 py-1 rounded-full {percentageValue >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
									24h: {percentageValue >= 0 ? '+' : ''}{percentageValue.toFixed(2)}%
								</span>
							</div>
						{/if}
					{/if}

					<!-- Address -->
					<p class="text-xs text-gray-500 font-mono truncate mb-2" title={token.address}>
						{token.address}
					</p>

					<!-- Decimals Badge -->
					{#if token.decimals}
						<div class="flex items-center space-x-2">
							<span class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
								{token.decimals} decimals
							</span>
						</div>
					{/if}

					<!-- Pro Feature Badges -->
					{#if !isProUser}
						<div class="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
							<div class="text-xs text-amber-800">
								<span class="font-medium">🚀 Pro Insights Available:</span>
								Advanced analytics, yield opportunities, risk analysis, and more
							</div>
						</div>
					{/if}
				</div>
			</button>
			
			<EditControls
				onCopy={() => navigator.clipboard.writeText(token.address)}
				onEdit={() => handleEdit(token)}
				onDelete={() => handleDelete(token)}
				controls={token?.customDefault === 'custom' ? ['copy', 'edit', 'delete'] : ['copy', 'edit']}
				hasBalance={token.balance && Number(token.balance) > 0}
			/>
		</li>
	{/each}
</ul>

<TokenForm bind:show={showEditModal} token={selectedToken} onSubmit={onTokenUpdate} />

<Confirmation
	bind:show={showDeleteModal}
	onConfirm={confirmDelete}
	title="Delete Token"
	message="Are you sure you want to delete this token? This action cannot be undone."
/>
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import Icon from '$lib/components/Icon.svelte';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import OrbitalTokenView from './OrbitalTokenView.svelte';
	import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
	import type { Chain } from '$lib/common';
	
	// View mode types
	type ViewMode = 'list' | 'grid' | 'orbital' | 'card';
	
	// Props
	let {
		tokens = [],
		chain = null as Chain | null,
		viewMode = $bindable<ViewMode>('grid'),
		onTokenClick = (token: any) => {},
		showValues = true,
		loading = false,
		className = ''
	} = $props<{
		tokens?: any[];
		chain?: Chain | null;
		viewMode?: ViewMode;
		onTokenClick?: (token: any) => void;
		showValues?: boolean;
		loading?: boolean;
		className?: string;
	}>();
	
	// View mode configurations
	const viewModes: Array<{ mode: ViewMode; icon: string; label: string }> = [
		{ mode: 'list', icon: 'list', label: 'List View' },
		{ mode: 'grid', icon: 'grid', label: 'Grid View' },
		{ mode: 'orbital', icon: 'globe', label: 'Orbital View' },
		{ mode: 'card', icon: 'credit-card', label: 'Card View' }
	];
	
	// Format value for display
	function formatValue(value: any): string {
		if (!value) return '$0.00';
		const numValue = value && typeof value === 'number' 
			? value 
			: (value ? BigNumberishUtils.toNumber(value) : 0);
		if (numValue < 0.01) return '<$0.01';
		return `$${numValue.toLocaleString('en-US', { 
			minimumFractionDigits: 2, 
			maximumFractionDigits: 2 
		})}`;
	}
	
	// Format balance
	function formatBalance(balance: any, decimals = 18): string {
		if (!balance) return '0';
		const rawBalance = balance && typeof balance === 'number' 
			? balance 
			: (balance ? BigNumberishUtils.toNumber(balance) : 0);
		const numBalance = rawBalance / Math.pow(10, decimals);
		if (numBalance < 0.0001) return '<0.0001';
		if (numBalance < 1) {
			return numBalance.toFixed(4);
		}
		return numBalance.toLocaleString('en-US', { 
			minimumFractionDigits: 2, 
			maximumFractionDigits: 4 
		});
	}
	
	// Calculate price change percentage
	function calculatePriceChange(token: any): number {
		// This would normally come from the token data
		// For now, return a random value for demonstration
		return Math.random() * 20 - 10; // -10% to +10%
	}
</script>

<div class="token-view-modes {className}">
	<!-- View Mode Selector -->
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
			Tokens ({tokens.length})
		</h3>
		
		<div class="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
			{#each viewModes as mode}
				<SimpleTooltip text={mode.label} position="top">
					<button
						onclick={() => viewMode = mode.mode}
						class="p-2 rounded transition-all duration-200 {viewMode === mode.mode 
							? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' 
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}"
						aria-label={mode.label}
					>
						<Icon name={mode.icon} className="w-4 h-4" />
					</button>
				</SimpleTooltip>
			{/each}
		</div>
	</div>
	
	<!-- Loading State -->
	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if tokens.length === 0}
		<!-- Empty State -->
		<div class="text-center py-12">
			<Icon name="inbox" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
			<p class="text-gray-600 dark:text-gray-400">No tokens found</p>
		</div>
	{:else}
		<!-- View Modes -->
		{#if viewMode === 'list'}
			<!-- List View -->
			<div class="space-y-1" transition:fade={{ duration: 200 }}>
				{#each tokens as token}
					<button
						onclick={() => onTokenClick(token)}
						class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
					>
						<!-- Token Icon -->
						<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center flex-shrink-0">
							{#if token.logo}
								<img src={token.logo} alt={token.symbol} class="w-8 h-8 rounded-full" />
							{:else}
								<span class="text-white font-bold text-sm">{token.symbol.slice(0, 3)}</span>
							{/if}
						</div>
						
						<!-- Token Info -->
						<div class="flex-1 text-left">
							<div class="font-medium text-gray-900 dark:text-gray-100">
								{token.symbol}
							</div>
							<div class="text-sm text-gray-600 dark:text-gray-400">
								{token.name || token.symbol}
							</div>
						</div>
						
						<!-- Balance & Value -->
						{#if showValues}
							<div class="text-right">
								<div class="font-medium text-gray-900 dark:text-gray-100">
									{formatValue(token.value)}
								</div>
								<div class="text-sm text-gray-600 dark:text-gray-400">
									{formatBalance(token.balance, token.decimals)} {token.symbol}
								</div>
							</div>
						{/if}
						
						<!-- Price Change -->
						{@const change = calculatePriceChange(token)}
						<div class="text-right ml-2">
							<div class={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
								{change >= 0 ? '+' : ''}{change.toFixed(2)}%
							</div>
						</div>
					</button>
				{/each}
			</div>
			
		{:else if viewMode === 'grid'}
			<!-- Grid View -->
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" transition:fade={{ duration: 200 }}>
				{#each tokens as token}
					<button
						onclick={() => onTokenClick(token)}
						class="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 hover:scale-105"
					>
						<!-- Token Icon -->
						<div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center mx-auto mb-3">
							{#if token.logo}
								<img src={token.logo} alt={token.symbol} class="w-10 h-10 rounded-full" />
							{:else}
								<span class="text-white font-bold">{token.symbol.slice(0, 3)}</span>
							{/if}
						</div>
						
						<!-- Token Info -->
						<div class="text-center">
							<div class="font-medium text-gray-900 dark:text-gray-100">
								{token.symbol}
							</div>
							<div class="text-xs text-gray-600 dark:text-gray-400 truncate">
								{token.name || token.symbol}
							</div>
						</div>
						
						<!-- Value -->
						{#if showValues}
							<div class="mt-3 text-center">
								<div class="font-semibold text-gray-900 dark:text-gray-100">
									{formatValue(token.value)}
								</div>
								<div class="text-xs text-gray-600 dark:text-gray-400">
									{formatBalance(token.balance, token.decimals)}
								</div>
							</div>
						{/if}
						
						<!-- Price Change -->
						{@const change = calculatePriceChange(token)}
						<div class="mt-2 text-center">
							<span class={`text-xs font-medium px-2 py-1 rounded-full ${
								change >= 0 
									? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
									: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
							}`}>
								{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
							</span>
						</div>
					</button>
				{/each}
			</div>
			
		{:else if viewMode === 'orbital'}
			<!-- Orbital View -->
			<div transition:fade={{ duration: 200 }}>
				<OrbitalTokenView
					{tokens}
					{chain}
					onTokenClick={onTokenClick}
					{showValues}
				/>
			</div>
			
		{:else if viewMode === 'card'}
			<!-- Card View -->
			<div class="space-y-3" transition:fade={{ duration: 200 }}>
				{#each tokens.slice(0, 5) as token, index}
					<div
						class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
						onclick={() => onTokenClick(token)}
						transition:scale={{ duration: 200, delay: index * 50 }}
					>
						<!-- Background Pattern -->
						<div class="absolute inset-0 opacity-10">
							<div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23fff" fill-opacity="0.3"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
						</div>
						
						<!-- Content -->
						<div class="relative z-10">
							<div class="flex items-start justify-between mb-4">
								<div class="flex items-center gap-3">
									<div class="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
										{#if token.logo}
											<img src={token.logo} alt={token.symbol} class="w-10 h-10 rounded-full" />
										{:else}
											<span class="font-bold text-lg">{token.symbol.slice(0, 3)}</span>
										{/if}
									</div>
									<div>
										<div class="font-bold text-lg">{token.symbol}</div>
										<div class="text-sm opacity-80">{token.name || token.symbol}</div>
									</div>
								</div>
								
								<!-- Price Change Badge -->
								{@const change = calculatePriceChange(token)}
								<div class={`px-3 py-1 rounded-full text-sm font-medium ${
									change >= 0 
										? 'bg-green-400/20 text-green-100' 
										: 'bg-red-400/20 text-red-100'
								}`}>
									{change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
								</div>
							</div>
							
							{#if showValues}
								<div class="space-y-2">
									<div>
										<div class="text-sm opacity-80">Balance</div>
										<div class="text-xl font-bold">
											{formatBalance(token.balance, token.decimals)} {token.symbol}
										</div>
									</div>
									<div>
										<div class="text-sm opacity-80">Value</div>
										<div class="text-2xl font-bold">
											{formatValue(token.value)}
										</div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}
				
				{#if tokens.length > 5}
					<button
						class="w-full p-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
					>
						View all {tokens.length} tokens →
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	/* Smooth transitions between views */
	.token-view-modes :global(*) {
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Card hover effects */
	.token-view-modes :global(.hover\:scale-105:hover) {
		transform: scale(1.05);
	}
	
	.token-view-modes :global(.hover\:scale-\[1\.02\]:hover) {
		transform: scale(1.02);
	}
</style>
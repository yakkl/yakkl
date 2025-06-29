<script lang="ts">
	// svelte-ignore options_renamed_ssr_dom
	import ViewControls from './ViewControls.svelte';
	import TokenGridView from './TokenGridView.svelte';
	import TokenChartsView from './TokenChartsView.svelte';
	import TokenNewsTradingView from './TokenNewsTradingView.svelte';
	import TokenTechnicalView from './TokenTechnicalView.svelte';
	import TokenSymbolView from './TokenSymbolView.svelte';
	import type { TokenData } from '$lib/common/interfaces';
	import { log } from '$lib/common/logger-wrapper';
	import { yakklCombinedTokenStore } from '$lib/common/stores';
	import LoadingState from './LoadingState.svelte';
	import { onMount } from 'svelte';
	import { sessionInitialized } from '$lib/common/stores';
	import TokenSymbolOverviewView from './TokenSymbolOverviewView.svelte';
	import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';

	let tokens = $state<TokenData[]>([]);
	let sortedTokens = $state<TokenData[]>([]);
	let currentView = $state('grid');
	let sortBy = $state('name');
	let isLoading = $state(false); // This should only be true during initial load
	let isInitialized = $state(false);

	// Reactive store subscription - immediate to show any available data
	$effect.root(() => {
		const unsubscribe = yakklCombinedTokenStore.subscribe((updatedTokens = []) => {
			tokens = updatedTokens;
			handleSortChange(sortBy);
		});

		return () => {
			unsubscribe();
		};
	});

	onMount(() => {
		// Always start loading when component mounts
		if (!$sessionInitialized) {
			isLoading = true;
			const timerManager = UnifiedTimerManager.getInstance();

			timerManager.addTimeout(
				'token-views-loading',
				() => {
					isLoading = false;
					sessionInitialized.set(true); // Set to true for current session only

					// Initialize store subscription after loading is complete
					setTimeout(() => {
						isInitialized = true;
					}, 500);
				},
				3000
			);
			timerManager.startTimeout('token-views-loading');

			return () => {
				timerManager.stopTimeout('token-views-loading');
				timerManager.removeTimeout('token-views-loading');
			};
		} else {
			// If session is already initialized, enable subscription immediately
			setTimeout(() => {
				isInitialized = true;
			}, 500);
		}
	});

	// Separate effect for sorting - immediate to show any available data
	$effect(() => {
		if (tokens.length > 0) {
			sortedTokens = [...tokens].sort((a, b) => {
				if (sortBy === 'name') return a.name.localeCompare(b.name);
				if (sortBy === 'price') return (b.price?.price ?? 0) - (a.price?.price ?? 0);
				if (sortBy === 'value') return (b.value ?? 0) - (a.value ?? 0);
				return 0;
			});
		}
	});

	// Simplified sort handler
	function handleSortChange(criteria: string) {
		sortBy = criteria;
	}

	// Change the current view
	function handleViewChange(view: string) {
		currentView = view;
	}

	// Print handler - basic stub for now. Need to format for print within each view.
	function handlePrint() {
		alert('Printing is in limited release. Soon to be available to all!');
	}
</script>

<div class="w-full h-full mt-1">
	<!-- Header Section -->
	<div class="flex justify-between items-center px-2 py-1">
		<h2 class="text-lg font-bold text-gray-300">Token Portfolio</h2>
		<ViewControls
			onSortChange={handleSortChange}
			onViewChange={handleViewChange}
			onPrint={handlePrint}
		/>
	</div>

	<!-- Dynamic Views -->
	<div class="relative rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 shadow-lg h-[400px]">
		{#if isLoading && !$sessionInitialized}
			<LoadingState message="Analyzing Tokens..." />
		{/if}

		{#if currentView === 'grid'}
			<TokenGridView
				tokens={sortedTokens}
				onTokenClick={(token) => log.info('Clicked:', false, token)}
			/>
			<!-- default onTokenClick for future -->
		{:else if currentView === 'chart'}
			<TokenChartsView />
		{:else if currentView === 'chartAdvanced'}
			<TokenSymbolOverviewView />
		{:else if currentView === 'news'}
			<TokenNewsTradingView />
		{:else if currentView === 'analysis'}
			<TokenTechnicalView symbol="COINBASE:ETHUSD" />
		{:else if currentView === 'symbol'}
			{#each sortedTokens as token}
				<TokenSymbolView symbol={`COINBASE:${token.symbol.toUpperCase()}USD`} />
			{/each}
		{/if}
	</div>
</div>

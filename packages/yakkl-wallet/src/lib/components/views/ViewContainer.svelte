<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ViewCacheManager } from '$lib/managers/ViewCacheManager';
	import type { ViewUpdateNotification } from '$lib/managers/ViewCacheManager';
	import AccountsView from './AccountsView.svelte';
	import TokensView from './TokensView.svelte';
	import TransactionsView from './TransactionsView.svelte';
	import WatchlistView from './WatchlistView.svelte';
	import NetworksView from './NetworksView.svelte';
	import { selectedNetwork } from '$lib/stores/network.store';
	import { currentAccount } from '$lib/stores/account.store';
	import { log } from '$lib/common/logger-wrapper';
	import { fade, slide } from 'svelte/transition';
	import { cubicInOut } from 'svelte/easing';

	// View types
	type ViewType = 'dashboard' | 'accounts' | 'tokens' | 'transactions' | 'watchlist' | 'networks' | 'settings';

	// Props
	let { 
		defaultView = 'dashboard' as ViewType,
		showHeader = true,
		showTabs = true,
		className = '',
		onViewChange = (view: ViewType) => {}
	} = $props();

	// State
	let currentView = $state<ViewType>(defaultView);
	let isRefreshing = $state(false);
	let lastRefresh = $state<Date | null>(null);
	let viewHistory = $state<ViewType[]>([defaultView]);
	let splitView = $state(false);
	let secondaryView = $state<ViewType | null>(null);
	let viewPreferences = $state<Record<ViewType, any>>({
		dashboard: {},
		accounts: { showBalances: true },
		tokens: { viewMode: 'list', sortBy: 'value' },
		transactions: { limit: 50, showFilters: true },
		watchlist: { showPriceAlerts: false },
		networks: { showTestnets: false },
		settings: {}
	});

	// View cache manager
	let viewCacheManager: ViewCacheManager;
	const updateListenerId = `view-container-${Math.random()}`;

	// Current network and account from stores
	let chainId = $derived($selectedNetwork?.chainId);
	let accountAddress = $derived($currentAccount?.address);

	// View metadata
	const viewMeta = {
		dashboard: { 
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
			label: 'Dashboard',
			color: 'blue'
		},
		accounts: {
			icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
			label: 'Accounts',
			color: 'purple'
		},
		tokens: {
			icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
			label: 'Tokens',
			color: 'green'
		},
		transactions: {
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
			label: 'Transactions',
			color: 'yellow'
		},
		watchlist: {
			icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
			label: 'Watchlist',
			color: 'red'
		},
		networks: {
			icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
			label: 'Networks',
			color: 'indigo'
		},
		settings: {
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
			label: 'Settings',
			color: 'gray'
		}
	};

	// Handle view change
	function switchView(view: ViewType) {
		if (view === currentView) return;
		
		// Add to history
		viewHistory = [...viewHistory, view];
		if (viewHistory.length > 10) {
			viewHistory = viewHistory.slice(-10);
		}
		
		// Save preference
		saveViewPreference(currentView);
		
		// Switch view
		currentView = view;
		onViewChange(view);
		
		log.info('[ViewContainer] Switched view', false, { from: viewHistory[viewHistory.length - 2], to: view });
	}

	// Go back in view history
	function goBack() {
		if (viewHistory.length > 1) {
			viewHistory = viewHistory.slice(0, -1);
			currentView = viewHistory[viewHistory.length - 1];
			onViewChange(currentView);
		}
	}

	// Toggle split view
	function toggleSplitView() {
		splitView = !splitView;
		if (splitView && !secondaryView) {
			secondaryView = 'transactions';
		} else if (!splitView) {
			secondaryView = null;
		}
	}

	// Set secondary view
	function setSecondaryView(view: ViewType) {
		if (view === currentView) return;
		secondaryView = view;
	}

	// Save view preferences
	function saveViewPreference(view: ViewType) {
		const prefs = { ...viewPreferences };
		localStorage.setItem('yakkl_view_preferences', JSON.stringify(prefs));
	}

	// Load view preferences
	function loadViewPreferences() {
		const stored = localStorage.getItem('yakkl_view_preferences');
		if (stored) {
			try {
				viewPreferences = JSON.parse(stored);
			} catch (error) {
				log.error('[ViewContainer] Failed to load view preferences', false, error);
			}
		}
	}

	// Refresh all views
	async function refreshAllViews() {
		try {
			isRefreshing = true;
			await viewCacheManager.forceRefreshAllViews();
			lastRefresh = new Date();
			log.info('[ViewContainer] Refreshed all views');
		} catch (error) {
			log.error('[ViewContainer] Failed to refresh views', false, error);
		} finally {
			isRefreshing = false;
		}
	}

	// Handle view updates
	function handleViewUpdate(notification: ViewUpdateNotification) {
		log.debug('[ViewContainer] Received update notification', false, notification);
		lastRefresh = new Date();
	}

	// Handle keyboard shortcuts
	function handleKeyboard(event: KeyboardEvent) {
		// Alt + number to switch views
		if (event.altKey && event.key >= '1' && event.key <= '6') {
			const views: ViewType[] = ['dashboard', 'accounts', 'tokens', 'transactions', 'watchlist', 'networks'];
			const index = parseInt(event.key) - 1;
			if (views[index]) {
				switchView(views[index]);
			}
		}
		
		// Alt + R to refresh
		if (event.altKey && event.key === 'r') {
			event.preventDefault();
			refreshAllViews();
		}
		
		// Alt + S for split view
		if (event.altKey && event.key === 's') {
			event.preventDefault();
			toggleSplitView();
		}
		
		// Alt + Left to go back
		if (event.altKey && event.key === 'ArrowLeft') {
			event.preventDefault();
			goBack();
		}
	}

	// Dashboard component (inline for now)
	function DashboardView(props: any) {
		return {
			// This would be a proper dashboard component
			// For now, just a placeholder
		};
	}

	// Settings component (inline for now)
	function SettingsView(props: any) {
		return {
			// This would be a proper settings component
			// For now, just a placeholder
		};
	}

	// Lifecycle
	onMount(() => {
		viewCacheManager = ViewCacheManager.getInstance();
		viewCacheManager.registerUpdateListener(updateListenerId, handleViewUpdate);
		loadViewPreferences();
		
		// Add keyboard listener
		window.addEventListener('keydown', handleKeyboard);
		
		log.info('[ViewContainer] Mounted', false, { defaultView, splitView });
	});

	onDestroy(() => {
		if (viewCacheManager) {
			viewCacheManager.unregisterUpdateListener(updateListenerId);
		}
		window.removeEventListener('keydown', handleKeyboard);
	});

	// Get view component
	function getViewComponent(view: ViewType) {
		switch (view) {
			case 'accounts':
				return AccountsView;
			case 'tokens':
				return TokensView;
			case 'transactions':
				return TransactionsView;
			case 'watchlist':
				return WatchlistView;
			case 'networks':
				return NetworksView;
			case 'dashboard':
			case 'settings':
			default:
				return null;
		}
	}
</script>

<div class="view-container {className}">
	{#if showHeader}
		<!-- Header -->
		<div class="view-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
			<div class="flex items-center justify-between">
				<!-- View title and breadcrumb -->
				<div class="flex items-center gap-3">
					{#if viewHistory.length > 1}
						<button
							class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
							onclick={goBack}
							title="Go back (Alt+←)"
					aria-label="Go back to previous view"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
					{/if}
					
					<div class="flex items-center gap-2">
						<svg class="w-6 h-6 text-{viewMeta[currentView].color}-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={viewMeta[currentView].icon} />
						</svg>
						<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
							{viewMeta[currentView].label}
						</h2>
					</div>
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2">
					<!-- Split view toggle -->
					<button
						class="p-2 rounded-lg transition-colors {
							splitView 
								? 'bg-blue-500 text-white' 
								: 'hover:bg-gray-100 dark:hover:bg-gray-700'
						}"
						onclick={toggleSplitView}
						title="Toggle split view (Alt+S)"
						aria-label="Toggle split view"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
						</svg>
					</button>

					<!-- Refresh button -->
					<button
						class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors {
							isRefreshing ? 'animate-spin' : ''
						}"
						onclick={refreshAllViews}
						disabled={isRefreshing}
						title="Refresh all views (Alt+R)"
						aria-label="Refresh all views"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</button>

					{#if lastRefresh}
						<span class="text-xs text-gray-500 dark:text-gray-400">
							Updated {lastRefresh.toLocaleTimeString()}
						</span>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if showTabs}
		<!-- Tab navigation -->
		<div class="view-tabs bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
			<div class="flex items-center gap-1 px-4 py-2 overflow-x-auto">
				{#each Object.entries(viewMeta) as [view, meta]}
					<button
						class="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap {
							currentView === view
								? `bg-${meta.color}-500 text-white`
								: 'hover:bg-gray-200 dark:hover:bg-gray-700'
						}"
						onclick={() => switchView(view as ViewType)}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={meta.icon} />
						</svg>
						<span class="text-sm font-medium">{meta.label}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- View content -->
	<div class="view-content flex-1 overflow-hidden">
		{#if splitView}
			<!-- Split view layout -->
			<div class="flex h-full">
				<!-- Primary view -->
				<div class="flex-1 overflow-auto border-r border-gray-200 dark:border-gray-700">
					<div class="p-4">
						{#if currentView === 'dashboard'}
							<div class="text-center p-8 text-gray-500">
								<p>Dashboard View (Coming Soon)</p>
							</div>
						{:else if currentView === 'settings'}
							<div class="text-center p-8 text-gray-500">
								<p>Settings View (Coming Soon)</p>
							</div>
						{:else if currentView === 'accounts'}
							<AccountsView
								{chainId}
								onAccountSelect={(account) => log.info('Account selected', false, account)}
								{...viewPreferences.accounts}
							/>
						{:else if currentView === 'tokens'}
							<TokensView
								{chainId}
								{accountAddress}
								onTokenSelect={(token) => log.info('Token selected', false, token)}
								{...viewPreferences.tokens}
							/>
						{:else if currentView === 'transactions'}
							<TransactionsView
								{chainId}
								{accountAddress}
								onTransactionSelect={(tx) => log.info('Transaction selected', false, tx)}
								{...viewPreferences.transactions}
							/>
						{:else if currentView === 'watchlist'}
							<WatchlistView
								{chainId}
								onTokenSelect={(token) => log.info('Watchlist token selected', false, token)}
								{...viewPreferences.watchlist}
							/>
						{:else if currentView === 'networks'}
							<NetworksView
								onNetworkSelect={(network) => log.info('Network selected', false, network)}
								{...viewPreferences.networks}
							/>
						{/if}
					</div>
				</div>

				<!-- Secondary view -->
				<div class="w-1/3 min-w-[300px] max-w-[500px] overflow-auto bg-gray-50 dark:bg-gray-900">
					<!-- Secondary view selector -->
					<div class="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
						<select
							class="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
							bind:value={secondaryView}
						>
							{#each Object.entries(viewMeta) as [view, meta]}
								{#if view !== currentView}
									<option value={view}>{meta.label}</option>
								{/if}
							{/each}
						</select>
					</div>

					<!-- Secondary view content -->
					<div class="p-4">
						{#if secondaryView === 'transactions'}
							<TransactionsView
								{chainId}
								{accountAddress}
								showFilters={false}
								limit={20}
								className="compact"
							/>
						{:else if secondaryView === 'tokens'}
							<TokensView
								{chainId}
								{accountAddress}
								showQuickActions={false}
								className="compact"
							/>
						{:else if secondaryView === 'watchlist'}
							<WatchlistView
								{chainId}
								showAddButton={false}
								className="compact"
							/>
						{:else if secondaryView === 'accounts'}
							<AccountsView
								{chainId}
								showBalances={false}
								className="compact"
							/>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<!-- Single view layout -->
			<div class="p-4 h-full overflow-auto" in:fade={{ duration: 200, easing: cubicInOut }}>
				{#if currentView === 'dashboard'}
					<div class="text-center p-8 text-gray-500">
						<p>Dashboard View (Coming Soon)</p>
					</div>
				{:else if currentView === 'settings'}
					<div class="text-center p-8 text-gray-500">
						<p>Settings View (Coming Soon)</p>
					</div>
				{:else if currentView === 'accounts'}
					<AccountsView
						{chainId}
						onAccountSelect={(account) => log.info('Account selected', false, account)}
						{...viewPreferences.accounts}
					/>
				{:else if currentView === 'tokens'}
					<TokensView
						{chainId}
						{accountAddress}
						onTokenSelect={(token) => log.info('Token selected', false, token)}
						{...viewPreferences.tokens}
					/>
				{:else if currentView === 'transactions'}
					<TransactionsView
						{chainId}
						{accountAddress}
						onTransactionSelect={(tx) => log.info('Transaction selected', false, tx)}
						{...viewPreferences.transactions}
					/>
				{:else if currentView === 'watchlist'}
					<WatchlistView
						{chainId}
						onTokenSelect={(token) => log.info('Watchlist token selected', false, token)}
						{...viewPreferences.watchlist}
					/>
				{:else if currentView === 'networks'}
					<NetworksView
						onNetworkSelect={(network) => log.info('Network selected', false, network)}
						{...viewPreferences.networks}
					/>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Keyboard shortcuts hint -->
	<div class="absolute bottom-4 right-4 text-xs text-gray-400 dark:text-gray-600">
		Alt+1-6: Switch views | Alt+R: Refresh | Alt+S: Split view
	</div>
</div>

<style>
	.view-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		position: relative;
	}

	.view-tabs::-webkit-scrollbar {
		height: 4px;
	}

	.view-tabs::-webkit-scrollbar-track {
		background: transparent;
	}

	.view-tabs::-webkit-scrollbar-thumb {
		background: #888;
		border-radius: 2px;
	}

	.compact :global(.tokens-view),
	.compact :global(.transactions-view),
	.compact :global(.watchlist-view),
	.compact :global(.accounts-view) {
		font-size: 0.875rem;
	}

	.compact :global(.p-4) {
		padding: 0.75rem;
	}

	.compact :global(.gap-4) {
		gap: 0.5rem;
	}
</style>
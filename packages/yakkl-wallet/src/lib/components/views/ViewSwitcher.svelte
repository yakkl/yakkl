<script lang="ts">
	import { viewStore, currentView, viewHistory, isRefreshing, viewStats } from '$lib/stores/view.store';
	import type { ViewType } from '$lib/stores/view.store';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';

	// Props
	let {
		position = 'bottom-right' as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left',
		showStats = true,
		compact = false,
		className = ''
	} = $props();

	// State
	let isOpen = $state(false);
	let showQuickSwitch = $state(false);
	let quickSwitchQuery = $state('');

	// View metadata
	const views: Record<ViewType, { icon: string; label: string; color: string; shortcut: string }> = {
		dashboard: {
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
			label: 'Dashboard',
			color: 'blue',
			shortcut: '1'
		},
		accounts: {
			icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
			label: 'Accounts',
			color: 'purple',
			shortcut: '2'
		},
		tokens: {
			icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
			label: 'Tokens',
			color: 'green',
			shortcut: '3'
		},
		transactions: {
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
			label: 'Transactions',
			color: 'yellow',
			shortcut: '4'
		},
		watchlist: {
			icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
			label: 'Watchlist',
			color: 'red',
			shortcut: '5'
		},
		networks: {
			icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
			label: 'Networks',
			color: 'indigo',
			shortcut: '6'
		},
		settings: {
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
			label: 'Settings',
			color: 'gray',
			shortcut: '7'
		}
	};

	// Filtered views for quick switch
	let filteredViews = $derived.by(() => {
		if (!quickSwitchQuery) return Object.entries(views);
		
		const query = quickSwitchQuery.toLowerCase();
		return Object.entries(views).filter(([_, meta]) =>
			meta.label.toLowerCase().includes(query)
		);
	});

	// Position classes
	let positionClass = $derived.by(() => {
		switch (position) {
			case 'bottom-right': return 'bottom-4 right-4';
			case 'bottom-left': return 'bottom-4 left-4';
			case 'top-right': return 'top-4 right-4';
			case 'top-left': return 'top-4 left-4';
		}
	});

	// Handle view switch
	function switchToView(view: ViewType) {
		viewStore.switchView(view);
		isOpen = false;
		showQuickSwitch = false;
		quickSwitchQuery = '';
	}

	// Handle keyboard shortcuts
	function handleKeyboard(event: KeyboardEvent) {
		// Cmd/Ctrl + K for quick switch
		if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
			event.preventDefault();
			showQuickSwitch = !showQuickSwitch;
			if (showQuickSwitch) {
				isOpen = false;
			}
		}
		
		// Escape to close
		if (event.key === 'Escape') {
			isOpen = false;
			showQuickSwitch = false;
			quickSwitchQuery = '';
		}
		
		// Alt + number shortcuts
		if (event.altKey && event.key >= '1' && event.key <= '7') {
			const viewList = Object.keys(views) as ViewType[];
			const index = parseInt(event.key) - 1;
			if (viewList[index]) {
				switchToView(viewList[index]);
			}
		}
	}

	// Toggle menu
	function toggleMenu() {
		isOpen = !isOpen;
		if (isOpen) {
			showQuickSwitch = false;
		}
	}

	// Handle click outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.view-switcher')) {
			isOpen = false;
			showQuickSwitch = false;
		}
	}

	// Lifecycle
	$effect(() => {
		window.addEventListener('keydown', handleKeyboard);
		document.addEventListener('click', handleClickOutside);
		
		return () => {
			window.removeEventListener('keydown', handleKeyboard);
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="view-switcher fixed {positionClass} z-50 {className}">
	<!-- Quick Switch Modal -->
	{#if showQuickSwitch}
		<div 
			class="absolute bottom-full mb-2 right-0 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
			transition:scale={{ duration: 200, easing: cubicOut }}
		>
			<!-- Search input -->
			<div class="p-3 border-b border-gray-200 dark:border-gray-700">
				<input
					type="text"
					bind:value={quickSwitchQuery}
					placeholder="Search views... (⌘K)"
					class="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			
			<!-- View list -->
			<div class="max-h-64 overflow-y-auto">
				{#each filteredViews as [view, meta]}
					<button
						class="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors {
							$currentView === view ? 'bg-blue-50 dark:bg-blue-900/20' : ''
						}"
						onclick={() => switchToView(view as ViewType)}
					>
						<div class="w-8 h-8 rounded-lg bg-{meta.color}-100 dark:bg-{meta.color}-900/20 flex items-center justify-center">
							<svg class="w-5 h-5 text-{meta.color}-600 dark:text-{meta.color}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={meta.icon} />
							</svg>
						</div>
						<span class="flex-1 text-left font-medium">{meta.label}</span>
						<kbd class="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700">Alt+{meta.shortcut}</kbd>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Expanded Menu -->
	{#if isOpen && !compact}
		<div 
			class="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
			transition:scale={{ duration: 200, easing: cubicOut }}
		>
			<!-- Stats -->
			{#if showStats}
				<div class="p-4 border-b border-gray-200 dark:border-gray-700">
					<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Stats</h3>
					<div class="grid grid-cols-2 gap-2 text-xs">
						<div class="flex justify-between">
							<span class="text-gray-500">Accounts:</span>
							<span class="font-medium">{$viewStats.totalAccounts}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-500">Tokens:</span>
							<span class="font-medium">{$viewStats.totalTokens}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-500">Transactions:</span>
							<span class="font-medium">{$viewStats.totalTransactions}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-500">Pending:</span>
							<span class="font-medium text-yellow-600">{$viewStats.pendingTransactions}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- View Grid -->
			<div class="p-3 grid grid-cols-3 gap-2">
				{#each Object.entries(views) as [view, meta]}
					<SimpleTooltip text="{meta.label} (Alt+{meta.shortcut})">
						<button
							class="p-3 rounded-lg transition-all hover:scale-105 {
								$currentView === view
									? `bg-${meta.color}-500 text-white`
									: 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
							}"
							onclick={() => switchToView(view as ViewType)}
						>
							<svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={meta.icon} />
							</svg>
							<span class="text-xs mt-1 block">{meta.label}</span>
						</button>
					</SimpleTooltip>
				{/each}
			</div>

			<!-- Recent History -->
			{#if $viewHistory.length > 1}
				<div class="p-3 border-t border-gray-200 dark:border-gray-700">
					<h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Recent</h3>
					<div class="flex gap-1">
						{#each $viewHistory.slice(-5).reverse() as view, i}
							{#if i > 0 && view !== $currentView}
								<button
									class="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
									onclick={() => switchToView(view)}
								>
									{views[view].label}
								</button>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			<!-- Actions -->
			<div class="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
				<button
					class="flex-1 px-3 py-1.5 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
					onclick={() => viewStore.refreshAllViews()}
					disabled={$isRefreshing}
				>
					{$isRefreshing ? 'Refreshing...' : 'Refresh All'}
				</button>
				<button
					class="flex-1 px-3 py-1.5 text-xs rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
					onclick={() => viewStore.toggleSplitView()}
				>
					Split View
				</button>
			</div>
		</div>
	{/if}

	<!-- Compact Menu -->
	{#if isOpen && compact}
		<div 
			class="absolute bottom-full mb-2 right-0 flex flex-col gap-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2"
			transition:scale={{ duration: 200, easing: cubicOut }}
		>
			{#each Object.entries(views) as [view, meta]}
				<SimpleTooltip text="{meta.label} (Alt+{meta.shortcut})" position="left">
					<button
						class="p-2 rounded-lg transition-all {
							$currentView === view
								? `bg-${meta.color}-500 text-white`
								: 'hover:bg-gray-100 dark:hover:bg-gray-700'
						}"
						onclick={() => switchToView(view as ViewType)}
						aria-label="Switch to {meta.label} view"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={meta.icon} />
						</svg>
					</button>
				</SimpleTooltip>
			{/each}
		</div>
	{/if}

	<!-- Main Button -->
	<button
		class="relative p-3 rounded-full shadow-lg transition-all hover:scale-110 {
			isOpen || showQuickSwitch
				? 'bg-blue-600 text-white'
				: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
		}"
		onclick={toggleMenu}
		aria-label="Open view switcher menu"
	>
		<!-- Current view icon -->
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={views[$currentView].icon} />
		</svg>

		<!-- Refresh indicator -->
		{#if $isRefreshing}
			<div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
		{/if}

		<!-- Notification badge -->
		{#if $viewStats.pendingTransactions > 0}
			<div class="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
				{$viewStats.pendingTransactions}
			</div>
		{/if}
	</button>

	<!-- Keyboard hint -->
	{#if !isOpen && !showQuickSwitch}
		<div 
			class="absolute bottom-full mb-2 right-0 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
		>
			⌘K for quick switch
		</div>
	{/if}
</div>

<style>
	.view-switcher {
		/* Ensure it stays on top */
		z-index: 9999;
	}
</style>
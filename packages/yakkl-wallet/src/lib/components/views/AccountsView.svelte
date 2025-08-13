<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ViewCacheManager } from '$lib/managers/ViewCacheManager';
	import type { ViewCache, ViewUpdateNotification } from '$lib/managers/ViewCacheManager';
	import type { YakklAccount } from '$lib/common/interfaces';
	import { formatEther, formatUnits } from '$lib/utilities/utilities';
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

	// Props
	let { 
		chainId = $bindable<number | undefined>(undefined),
		onAccountSelect = (account: YakklAccount) => {},
		showBalances = true,
		className = ''
	} = $props();

	// State
	let accounts = $state<YakklAccount[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let selectedAccount = $state<string | null>(null);
	
	// View cache manager instance
	let viewCacheManager: ViewCacheManager;
	const updateListenerId = `accounts-view-${Math.random()}`;

	// Reactive filtering
	let filteredAccounts = $derived.by(() => {
		if (!chainId) return accounts;
		
		// Filter accounts that have activity on the selected chain
		return accounts.filter(account => {
			// This will be enhanced when we have proper chain-specific data
			return true; // For now, show all accounts
		});
	});

	// Calculate total portfolio value
	let totalValue = $derived.by(() => {
		return filteredAccounts.reduce((sum, account) => {
			const balance = account.balance || '0';
			const bn = new BigNumber(balance);
			return sum.plus(bn);
		}, new BigNumber(0));
	});

	// Load accounts data
	async function loadAccounts() {
		try {
			isLoading = true;
			error = null;

			const viewCache = await viewCacheManager.getAccountsView({ chainId });
			accounts = viewCache.data || [];
			lastUpdated = new Date(viewCache.timestamp);

			log.info('[AccountsView] Loaded accounts', false, {
				count: accounts.length,
				chainId,
				timestamp: lastUpdated
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load accounts';
			log.error('[AccountsView] Error loading accounts', false, err);
		} finally {
			isLoading = false;
		}
	}

	// Handle view updates
	function handleViewUpdate(notification: ViewUpdateNotification) {
		if (notification.viewType === 'accounts' || notification.viewType === 'all') {
			log.debug('[AccountsView] Received update notification', false, notification);
			loadAccounts();
		}
	}

	// Handle account selection
	function selectAccount(account: YakklAccount) {
		selectedAccount = account.address;
		onAccountSelect(account);
	}

	// Format address for display
	function formatAddress(address: string): string {
		if (!address) return '';
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}

	// Get account type label
	function getAccountTypeLabel(account: YakklAccount): string {
		if (account.type === 'primary') return 'Primary';
		if (account.type === 'derived') return 'Derived';
		if (account.type === 'imported') return 'Imported';
		if (account.type === 'watch') return 'Watch Only';
		return 'Account';
	}

	// Get account type color
	function getAccountTypeColor(account: YakklAccount): string {
		if (account.type === 'primary') return 'text-blue-600 dark:text-blue-400';
		if (account.type === 'derived') return 'text-green-600 dark:text-green-400';
		if (account.type === 'imported') return 'text-purple-600 dark:text-purple-400';
		if (account.type === 'watch') return 'text-gray-600 dark:text-gray-400';
		return 'text-gray-600 dark:text-gray-400';
	}

	// Lifecycle
	onMount(async () => {
		viewCacheManager = ViewCacheManager.getInstance();
		viewCacheManager.registerUpdateListener(updateListenerId, handleViewUpdate);
		await loadAccounts();
	});

	onDestroy(() => {
		if (viewCacheManager) {
			viewCacheManager.unregisterUpdateListener(updateListenerId);
		}
	});

	// Watch for chain changes
	$effect(() => {
		if (chainId !== undefined) {
			loadAccounts();
		}
	});
</script>

<div class="accounts-view {className}">
	{#if isLoading}
		<div class="flex items-center justify-center p-8">
			<div class="loading loading-spinner loading-lg"></div>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span>{error}</span>
		</div>
	{:else if filteredAccounts.length === 0}
		<div class="text-center p-8 text-gray-500 dark:text-gray-400">
			<svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
			</svg>
			<p class="text-lg font-medium mb-2">No accounts found</p>
			<p class="text-sm">
				{#if chainId}
					No accounts have activity on this network
				{:else}
					Create or import an account to get started
				{/if}
			</p>
		</div>
	{:else}
		<!-- Portfolio Summary -->
		{#if showBalances}
			<div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-6 text-white">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-lg font-medium">Total Portfolio Value</h3>
					{#if lastUpdated}
						<SimpleTooltip text={`Last updated: ${lastUpdated.toLocaleTimeString()}`}>
							<svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</SimpleTooltip>
					{/if}
				</div>
				<div class="text-3xl font-bold">
					<ProtectedValue value={formatBalance(totalValue.toString(), 18, 2, '$')} />
				</div>
				<div class="text-sm opacity-90 mt-1">
					{filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
					{#if chainId}
						on this network
					{/if}
				</div>
			</div>
		{/if}

		<!-- Accounts List -->
		<div class="space-y-3">
			{#each filteredAccounts as account (account.address)}
				<button
					class="w-full text-left p-4 rounded-lg border transition-all hover:shadow-md {
						selectedAccount === account.address
							? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
							: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
					}"
					onclick={() => selectAccount(account)}
				>
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<!-- Account Name and Type -->
							<div class="flex items-center gap-2 mb-1">
								<span class="font-medium text-gray-900 dark:text-gray-100">
									{account.name || 'Account'}
								</span>
								<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 {getAccountTypeColor(account)}">
									{getAccountTypeLabel(account)}
								</span>
							</div>

							<!-- Address -->
							<div class="flex items-center gap-2 mb-2">
								<span class="text-sm text-gray-600 dark:text-gray-400 font-mono">
									{formatAddress(account.address)}
								</span>
								<span
									class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
									onclick={(e) => {
										e.stopPropagation();
										navigator.clipboard.writeText(account.address);
									}}
									role="button"
									tabindex="0"
									onkeypress={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.stopPropagation();
											navigator.clipboard.writeText(account.address);
										}
									}}
								>
									Copy
								</span>
							</div>

							<!-- Account Balance -->
							{#if showBalances && account.balance}
								<div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
									<ProtectedValue value={formatBalance(account.balance, 18, 4)} />
									<span class="text-sm text-gray-500 dark:text-gray-400 ml-1">ETH</span>
								</div>
							{/if}

							<!-- Additional Metadata -->
							{#if account.derivationPath}
								<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
									Path: {account.derivationPath}
								</div>
							{/if}
						</div>

						<!-- Action Button -->
						<div class="ml-4">
							{#if selectedAccount === account.address}
								<div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
									</svg>
								</div>
							{:else}
								<div class="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
							{/if}
						</div>
					</div>

					<!-- Tags -->
					{#if account.tags && account.tags.length > 0}
						<div class="flex flex-wrap gap-1 mt-2">
							{#each account.tags as tag}
								<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
									{tag}
								</span>
							{/each}
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.accounts-view {
		min-height: 200px;
	}
</style>
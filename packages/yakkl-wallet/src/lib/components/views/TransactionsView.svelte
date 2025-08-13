<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ViewCacheManager } from '$lib/managers/ViewCacheManager';
	import type { ViewCache, ViewUpdateNotification } from '$lib/managers/ViewCacheManager';
	import type { TransactionDisplay } from '$lib/types';
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

	// Props
	let { 
		chainId = $bindable<number | undefined>(undefined),
		accountAddress = $bindable<string | undefined>(undefined),
		onTransactionSelect = (tx: TransactionDisplay) => {},
		onViewDetails = (tx: TransactionDisplay) => {},
		showFilters = true,
		limit = 50,
		className = ''
	} = $props();

	// State
	let transactions = $state<TransactionDisplay[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let lastUpdated = $state<Date | null>(null);
	let selectedTransaction = $state<string | null>(null);
	let searchQuery = $state('');
	let filterType = $state<'all' | 'sent' | 'received' | 'contract' | 'swap' | 'failed'>('all');
	let filterStatus = $state<'all' | 'pending' | 'confirmed' | 'failed'>('all');
	let dateRange = $state<'all' | 'today' | 'week' | 'month' | 'year'>('all');
	let expandedTx = $state<string | null>(null);
	
	// View cache manager instance
	let viewCacheManager: ViewCacheManager;
	const updateListenerId = `transactions-view-${Math.random()}`;

	// Filter and process transactions
	let processedTransactions = $derived.by(() => {
		let filtered = transactions;
		
		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(tx => 
				tx.hash.toLowerCase().includes(query) ||
				tx.from?.toLowerCase().includes(query) ||
				tx.to?.toLowerCase().includes(query) ||
				tx.methodId?.toLowerCase().includes(query) ||
				tx.functionName?.toLowerCase().includes(query)
			);
		}
		
		// Type filter
		if (filterType !== 'all') {
			filtered = filtered.filter(tx => {
				switch (filterType) {
					case 'sent':
						return tx.from?.toLowerCase() === accountAddress?.toLowerCase();
					case 'received':
						return tx.to?.toLowerCase() === accountAddress?.toLowerCase();
					case 'contract':
						return tx.type === 'contract';
					case 'swap':
						return tx.type === 'swap' || tx.functionName?.toLowerCase().includes('swap');
					case 'failed':
						return tx.status === 'failed';
					default:
						return true;
				}
			});
		}
		
		// Status filter
		if (filterStatus !== 'all') {
			filtered = filtered.filter(tx => tx.status === filterStatus);
		}
		
		// Date range filter
		if (dateRange !== 'all') {
			const now = Date.now();
			const ranges = {
				today: 24 * 60 * 60 * 1000,
				week: 7 * 24 * 60 * 60 * 1000,
				month: 30 * 24 * 60 * 60 * 1000,
				year: 365 * 24 * 60 * 60 * 1000
			};
			const rangeMs = ranges[dateRange];
			filtered = filtered.filter(tx => {
				const txTime = tx.timestamp ? new Date(tx.timestamp).getTime() : 0;
				return now - txTime <= rangeMs;
			});
		}
		
		// Limit results
		return filtered.slice(0, limit);
	});

	// Calculate statistics
	let stats = $derived.by(() => {
		const total = processedTransactions.length;
		const pending = processedTransactions.filter(tx => tx.status === 'pending').length;
		const failed = processedTransactions.filter(tx => tx.status === 'failed').length;
		
		const totalValue = processedTransactions.reduce((sum, tx) => {
			const value = typeof tx.value === 'string' 
				? new BigNumber(tx.value).toNumber() 
				: tx.value || 0;
			return sum + value;
		}, 0);
		
		const totalFees = processedTransactions.reduce((sum, tx) => {
			// Calculate fee from gas and gasPrice if available
			if (tx.gas && tx.gasPrice) {
				const gas = new BigNumber(tx.gas);
				const gasPrice = new BigNumber(tx.gasPrice);
				const fee = gas.multipliedBy(gasPrice).dividedBy(1e9).toNumber(); // Convert to Gwei
				return sum + fee;
			}
			return sum;
		}, 0);
		
		return { total, pending, failed, totalValue, totalFees };
	});

	// Load transactions data
	async function loadTransactions() {
		try {
			isLoading = true;
			error = null;

			const viewCache = await viewCacheManager.getTransactionsView({ 
				chainId, 
				accountAddress 
			});
			
			transactions = viewCache.data || [];
			lastUpdated = new Date(viewCache.timestamp);

			log.info('[TransactionsView] Loaded transactions', false, {
				count: transactions.length,
				chainId,
				accountAddress,
				timestamp: lastUpdated
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load transactions';
			log.error('[TransactionsView] Error loading transactions', false, err);
		} finally {
			isLoading = false;
		}
	}

	// Handle view updates
	function handleViewUpdate(notification: ViewUpdateNotification) {
		if (notification.viewType === 'transactions' || notification.viewType === 'all') {
			log.debug('[TransactionsView] Received update notification', false, notification);
			loadTransactions();
		}
	}

	// Handle transaction selection
	function selectTransaction(tx: TransactionDisplay) {
		selectedTransaction = tx.hash;
		onTransactionSelect(tx);
	}

	// Toggle transaction expansion
	function toggleExpanded(tx: TransactionDisplay) {
		expandedTx = expandedTx === tx.hash ? null : tx.hash;
	}

	// Format transaction hash
	function formatHash(hash: string): string {
		if (!hash) return '';
		return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
	}

	// Format address
	function formatAddress(address: string): string {
		if (!address) return '';
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	}

	// Format timestamp
	function formatTimestamp(timestamp?: string | Date): string {
		if (!timestamp) return 'Pending';
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		
		if (diff < 60000) return 'Just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
		if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
		
		return date.toLocaleDateString();
	}

	// Get transaction type icon
	function getTransactionIcon(tx: TransactionDisplay): string {
		if (tx.type === 'swap' || tx.functionName?.toLowerCase().includes('swap')) {
			return 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4';
		}
		if (tx.from?.toLowerCase() === accountAddress?.toLowerCase()) {
			return 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8';
		}
		if (tx.to?.toLowerCase() === accountAddress?.toLowerCase()) {
			return 'M19 14l-7 7m0 0l-7-7m7 7V3';
		}
		if (tx.type === 'contract') {
			return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
		}
		return 'M13 10V3L4 14h7v7l9-11h-7z';
	}

	// Get transaction type label
	function getTransactionType(tx: TransactionDisplay): string {
		if (tx.functionName) return tx.functionName;
		if (tx.type === 'swap') return 'Swap';
		if (tx.type === 'contract') return 'Contract';
		if (tx.from?.toLowerCase() === accountAddress?.toLowerCase()) return 'Sent';
		if (tx.to?.toLowerCase() === accountAddress?.toLowerCase()) return 'Received';
		return 'Transaction';
	}

	// Get status color
	function getStatusColor(status?: string): string {
		switch (status) {
			case 'confirmed': return 'text-green-500';
			case 'pending': return 'text-yellow-500';
			case 'failed': return 'text-red-500';
			default: return 'text-gray-500';
		}
	}

	// Get status badge
	function getStatusBadge(status?: string): string {
		switch (status) {
			case 'confirmed': return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
			case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
			case 'failed': return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
			default: return 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
		}
	}

	// Format value
	function formatValue(value: any, decimals = 18): string {
		if (!value) return '0';
		const bn = typeof value === 'string' ? new BigNumber(value) : new BigNumber(value.toString());
		const formatted = formatBalance(bn.toString(), decimals, 6);
		return formatted;
	}

	// Lifecycle
	onMount(async () => {
		viewCacheManager = ViewCacheManager.getInstance();
		viewCacheManager.registerUpdateListener(updateListenerId, handleViewUpdate);
		await loadTransactions();
	});

	onDestroy(() => {
		if (viewCacheManager) {
			viewCacheManager.unregisterUpdateListener(updateListenerId);
		}
	});

	// Watch for context changes
	$effect(() => {
		if (chainId !== undefined || accountAddress !== undefined) {
			loadTransactions();
		}
	});
</script>

<div class="transactions-view {className}">
	<!-- Header with filters -->
	{#if showFilters}
		<div class="flex flex-col lg:flex-row gap-4 mb-6">
			<!-- Search -->
			<div class="flex-1">
				<div class="relative">
					<svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search by hash, address, or method..."
						class="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>

			<!-- Filters -->
			<div class="flex gap-2">
				<select
					bind:value={filterType}
					class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
				>
					<option value="all">All Types</option>
					<option value="sent">Sent</option>
					<option value="received">Received</option>
					<option value="contract">Contract</option>
					<option value="swap">Swaps</option>
					<option value="failed">Failed</option>
				</select>

				<select
					bind:value={filterStatus}
					class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
				>
					<option value="all">All Status</option>
					<option value="pending">Pending</option>
					<option value="confirmed">Confirmed</option>
					<option value="failed">Failed</option>
				</select>

				<select
					bind:value={dateRange}
					class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
				>
					<option value="all">All Time</option>
					<option value="today">Today</option>
					<option value="week">This Week</option>
					<option value="month">This Month</option>
					<option value="year">This Year</option>
				</select>
			</div>
		</div>
	{/if}

	<!-- Statistics bar -->
	{#if !isLoading && processedTransactions.length > 0}
		<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
				<p class="text-lg font-semibold">{stats.total}</p>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Pending</p>
				<p class="text-lg font-semibold text-yellow-500">{stats.pending}</p>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Failed</p>
				<p class="text-lg font-semibold text-red-500">{stats.failed}</p>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Value</p>
				<p class="text-lg font-semibold">
					<ProtectedValue value={`${formatValue(stats.totalValue)} ETH`} />
				</p>
			</div>
			<div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Fees</p>
				<p class="text-lg font-semibold">
					<ProtectedValue value={`${formatValue(stats.totalFees, 9)} Gwei`} />
				</p>
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
	{:else if processedTransactions.length === 0}
		<div class="text-center p-8 text-gray-500 dark:text-gray-400">
			<svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
			</svg>
			<p class="text-lg font-medium mb-2">No transactions found</p>
			<p class="text-sm">
				{#if searchQuery || filterType !== 'all' || filterStatus !== 'all'}
					No transactions match your filters
				{:else}
					Your transaction history will appear here
				{/if}
			</p>
		</div>
	{:else}
		<!-- Transactions list -->
		<div class="space-y-2">
			{#each processedTransactions as tx (tx.hash)}
				<div
					class="rounded-lg border transition-all {
						selectedTransaction === tx.hash
							? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
							: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
					}"
					in:fade={{ duration: 300 }}
				>
					<!-- Transaction header -->
					<button
						class="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
						onclick={() => selectTransaction(tx)}
					>
						<div class="flex items-center justify-between">
							<!-- Left side: icon, type, addresses -->
							<div class="flex items-center gap-3 flex-1">
								<!-- Icon -->
								<div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
									<svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTransactionIcon(tx)} />
									</svg>
								</div>

								<!-- Transaction details -->
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-1">
										<span class="font-medium text-gray-900 dark:text-gray-100">
											{getTransactionType(tx)}
										</span>
										<span class={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(tx.status)}`}>
											{tx.status || 'pending'}
										</span>
										{#if tx.blockNumber}
											<span class="text-xs text-gray-500 dark:text-gray-400">
												Block #{tx.blockNumber}
											</span>
										{/if}
									</div>
									<div class="text-sm text-gray-600 dark:text-gray-400">
										{#if tx.from}
											From: {formatAddress(tx.from)}
										{/if}
										{#if tx.to}
											→ To: {formatAddress(tx.to)}
										{/if}
									</div>
								</div>
							</div>

							<!-- Right side: value, time, actions -->
							<div class="flex items-center gap-4">
								<!-- Value -->
								<div class="text-right">
									<div class="font-semibold text-gray-900 dark:text-gray-100">
										<ProtectedValue value={`${formatValue(tx.value)} ETH`} />
									</div>
									{#if tx.gas && tx.gasPrice}
										<div class="text-xs text-gray-500 dark:text-gray-400">
											Fee: {formatValue(new BigNumber(tx.gas).multipliedBy(tx.gasPrice).toString(), 18)} ETH
										</div>
									{/if}
								</div>

								<!-- Timestamp -->
								<div class="text-sm text-gray-500 dark:text-gray-400">
									{formatTimestamp(tx.timestamp)}
								</div>

								<!-- Expand button -->
								<span
									class="inline-block p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
									onclick={(e) => {
										e.stopPropagation();
										toggleExpanded(tx);
									}}
									role="button"
									tabindex="0"
									onkeypress={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.stopPropagation();
											toggleExpanded(tx);
										}
									}}
								>
									<svg 
										class="w-5 h-5 transition-transform {expandedTx === tx.hash ? 'rotate-180' : ''}" 
										fill="none" 
										stroke="currentColor" 
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</span>
							</div>
						</div>
					</button>

					<!-- Expanded details -->
					{#if expandedTx === tx.hash}
						<div class="border-t border-gray-200 dark:border-gray-700 p-4" transition:slide>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
								<!-- Transaction hash -->
								<div>
									<p class="text-gray-500 dark:text-gray-400 mb-1">Transaction Hash</p>
									<div class="flex items-center gap-2">
										<span class="font-mono text-gray-900 dark:text-gray-100">{formatHash(tx.hash)}</span>
										<button
											class="text-blue-600 dark:text-blue-400 hover:text-blue-700"
											onclick={() => navigator.clipboard.writeText(tx.hash)}
										>
											Copy
										</button>
										<button
											class="text-blue-600 dark:text-blue-400 hover:text-blue-700"
											onclick={() => onViewDetails(tx)}
										>
											View
										</button>
									</div>
								</div>

								<!-- Gas info -->
								{#if tx.gasUsed}
									<div>
										<p class="text-gray-500 dark:text-gray-400 mb-1">Gas Used</p>
										<p class="font-mono text-gray-900 dark:text-gray-100">
											{tx.gasUsed} / {tx.gas || 'N/A'}
										</p>
									</div>
								{/if}

								<!-- Nonce -->
								{#if tx.nonce !== undefined}
									<div>
										<p class="text-gray-500 dark:text-gray-400 mb-1">Nonce</p>
										<p class="font-mono text-gray-900 dark:text-gray-100">{tx.nonce}</p>
									</div>
								{/if}

								<!-- Function Name -->
								{#if tx.functionName}
									<div class="md:col-span-2">
										<p class="text-gray-500 dark:text-gray-400 mb-1">Function</p>
										<p class="text-gray-900 dark:text-gray-100">{tx.functionName}</p>
									</div>
								{/if}

								<!-- Method ID -->
								{#if tx.methodId && tx.methodId !== '0x'}
									<div class="md:col-span-2">
										<p class="text-gray-500 dark:text-gray-400 mb-1">Method ID</p>
										<p class="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
											{tx.methodId}
										</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Load more -->
		{#if transactions.length > limit}
			<div class="text-center mt-6">
				<button
					class="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
					onclick={() => limit += 50}
				>
					Load More
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.transactions-view {
		min-height: 200px;
	}
</style>
<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import BackButton from '../components/BackButton.svelte';

	// Filter and search state
	let searchQuery = $state('');
	let selectedFilter = $state('all');
	let selectedTimeframe = $state('all');
	let showFilters = $state(false);

	// Mock transaction data
	let allTransactions = $state([
		{
			id: '0x1234...5678',
			type: 'send',
			asset: { symbol: 'ETH', icon: '⟐' },
			amount: '-0.05',
			value: '-$116.25',
			to: '0x742d35...890a',
			toName: 'Alice.eth',
			status: 'confirmed',
			timestamp: new Date('2024-01-15T14:30:00'),
			gasUsed: '$2.34',
			isPositive: false
		},
		{
			id: '0x2345...6789',
			type: 'receive',
			asset: { symbol: 'USDT', icon: '₮' },
			amount: '+100.00',
			value: '+$100.00',
			from: '0x851d45...890b',
			fromName: 'Bob',
			status: 'confirmed',
			timestamp: new Date('2024-01-14T09:15:00'),
			gasUsed: '$1.85',
			isPositive: true
		},
		{
			id: '0x3456...789a',
			type: 'swap',
			asset: { symbol: 'ETH', icon: '⟐' },
			toAsset: { symbol: 'PEPE', icon: '🐸' },
			amount: '-0.01',
			toAmount: '+1000',
			value: '~$23.20',
			status: 'confirmed',
			timestamp: new Date('2024-01-13T16:45:00'),
			gasUsed: '$3.12',
			isPositive: null
		},
		{
			id: '0x4567...89ab',
			type: 'send',
			asset: { symbol: 'USDC', icon: '💵' },
			amount: '-25.50',
			value: '-$25.50',
			to: '0x962e56...890c',
			toName: 'Charlie.eth',
			status: 'pending',
			timestamp: new Date('2024-01-12T11:20:00'),
			gasUsed: '$1.95',
			isPositive: false
		},
		{
			id: '0x5678...9abc',
			type: 'receive',
			asset: { symbol: 'ETH', icon: '⟐' },
			amount: '+0.025',
			value: '+$58.00',
			from: '0x073f42...123d',
			fromName: 'DeFi Protocol',
			status: 'confirmed',
			timestamp: new Date('2024-01-11T08:30:00'),
			gasUsed: '$2.10',
			isPositive: true
		}
	]);

	let filteredTransactions = $derived(() => {
		let filtered = allTransactions;

		// Filter by type
		if (selectedFilter !== 'all') {
			filtered = filtered.filter(tx => tx.type === selectedFilter);
		}

		// Filter by timeframe
		if (selectedTimeframe !== 'all') {
			const now = new Date();
			const timeframes = {
				'1d': 1,
				'7d': 7,
				'30d': 30,
				'90d': 90
			};
			const days = timeframes[selectedTimeframe];
			if (days) {
				const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
				filtered = filtered.filter(tx => tx.timestamp > cutoff);
			}
		}

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(tx => 
				tx.id.toLowerCase().includes(query) ||
				tx.asset.symbol.toLowerCase().includes(query) ||
				tx.toName?.toLowerCase().includes(query) ||
				tx.fromName?.toLowerCase().includes(query) ||
				tx.to?.toLowerCase().includes(query) ||
				tx.from?.toLowerCase().includes(query)
			);
		}

		return filtered;
	});

	function getTransactionIcon(type: string) {
		switch (type) {
			case 'send':
				return {
					icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
					color: 'text-primary-600',
					bg: 'bg-primary-100'
				};
			case 'receive':
				return {
					icon: 'M7 16l-4-4m0 0l4-4m-4 4h18',
					color: 'text-success-600',
					bg: 'bg-success-100'
				};
			case 'swap':
				return {
					icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
					color: 'text-warning-600',
					bg: 'bg-warning-100'
				};
			default:
				return {
					icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
					color: 'text-text-muted',
					bg: 'bg-border-light'
				};
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'confirmed':
				return 'text-success bg-success-50';
			case 'pending':
				return 'text-warning bg-warning-50';
			case 'failed':
				return 'text-danger bg-danger-50';
			default:
				return 'text-text-muted bg-border-light';
		}
	}

	function formatTime(date: Date) {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor(diff / (1000 * 60));

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'Just now';
	}

	function viewTransactionDetail(transaction: any) {
		console.log('View transaction:', transaction.id);
		// TODO: Navigate to transaction detail page
	}

	function goBack() {
		goto('/new-wallet');
	}
</script>

<svelte:head>
	<title>Transaction History - YAKKL Smart Wallet</title>
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<Header />
	
	<main class="flex-1 overflow-auto">
		<!-- Header Section -->
		<div class="p-4 space-y-4">
			<div class="flex items-center space-x-4">
				<BackButton onclick={goBack} />
				<div>
					<h1 class="text-xl font-semibold text-text-primary">Transaction History</h1>
					<p class="text-sm text-text-muted">{filteredTransactions.length} transactions</p>
				</div>
			</div>

			<!-- Search Bar -->
			<div class="relative">
				<input
					bind:value={searchQuery}
					placeholder="Search transactions..."
					class="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-card text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
				/>
				<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>

			<!-- Filter Toggle -->
			<button
				onclick={() => showFilters = !showFilters}
				class="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-surface-elevated rounded-card transition-all text-sm font-medium text-text-primary"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
				</svg>
				<span>Filters</span>
				<svg class="w-4 h-4 transition-transform {showFilters ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			<!-- Filters Panel -->
			{#if showFilters}
				<div 
					class="bg-surface rounded-card p-4 border border-border space-y-4"
					in:fly={{ y: -10, duration: 200 }}
					out:fly={{ y: -10, duration: 150 }}
				>
					<!-- Transaction Type Filter -->
					<div class="space-y-2">
						<label class="text-sm font-medium text-text-primary">Transaction Type</label>
						<div class="grid grid-cols-4 gap-2">
							<button
								onclick={() => selectedFilter = 'all'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								All
							</button>
							<button
								onclick={() => selectedFilter = 'send'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedFilter === 'send' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								Send
							</button>
							<button
								onclick={() => selectedFilter = 'receive'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedFilter === 'receive' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								Receive
							</button>
							<button
								onclick={() => selectedFilter = 'swap'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedFilter === 'swap' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								Swap
							</button>
						</div>
					</div>

					<!-- Timeframe Filter -->
					<div class="space-y-2">
						<label class="text-sm font-medium text-text-primary">Timeframe</label>
						<div class="grid grid-cols-5 gap-2">
							<button
								onclick={() => selectedTimeframe = 'all'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedTimeframe === 'all' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								All
							</button>
							<button
								onclick={() => selectedTimeframe = '1d'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedTimeframe === '1d' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								1D
							</button>
							<button
								onclick={() => selectedTimeframe = '7d'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedTimeframe === '7d' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								7D
							</button>
							<button
								onclick={() => selectedTimeframe = '30d'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedTimeframe === '30d' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								30D
							</button>
							<button
								onclick={() => selectedTimeframe = '90d'}
								class="py-2 text-sm font-medium rounded-button transition-all {selectedTimeframe === '90d' ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
							>
								90D
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Transaction List -->
		<div class="px-4 space-y-3">
			{#if filteredTransactions.length === 0}
				<div class="text-center py-12">
					<svg class="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
					</svg>
					<p class="text-text-muted text-lg font-medium mb-2">No transactions found</p>
					<p class="text-text-muted text-sm">Try adjusting your search or filters</p>
				</div>
			{:else}
				{#each filteredTransactions as transaction (transaction.id)}
					<button
						onclick={() => viewTransactionDetail(transaction)}
						class="w-full bg-surface hover:bg-surface-elevated rounded-card p-4 transition-all group"
						in:fly={{ y: 10, duration: 200 }}
					>
						<div class="flex items-center space-x-3">
							<!-- Transaction Type Icon -->
							<div class="w-12 h-12 {getTransactionIcon(transaction.type).bg} rounded-full flex items-center justify-center flex-shrink-0">
								<svg class="w-5 h-5 {getTransactionIcon(transaction.type).color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getTransactionIcon(transaction.type).icon} />
								</svg>
							</div>

							<!-- Transaction Details -->
							<div class="flex-1 text-left">
								<div class="flex items-center space-x-2 mb-1">
									<p class="font-medium text-text-primary capitalize">
										{transaction.type}
										{#if transaction.type === 'swap'}
											{transaction.asset.symbol} → {transaction.toAsset?.symbol}
										{:else}
											{transaction.asset.symbol}
										{/if}
									</p>
									<span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(transaction.status)}">
										{transaction.status}
									</span>
								</div>
								
								<div class="flex items-center space-x-1 text-sm text-text-muted">
									{#if transaction.type === 'send' && transaction.toName}
										<span>to {transaction.toName}</span>
									{:else if transaction.type === 'receive' && transaction.fromName}
										<span>from {transaction.fromName}</span>
									{:else if transaction.type === 'send' && transaction.to}
										<span>to {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}</span>
									{:else if transaction.type === 'receive' && transaction.from}
										<span>from {transaction.from.slice(0, 6)}...{transaction.from.slice(-4)}</span>
									{/if}
									<span>•</span>
									<span>{formatTime(transaction.timestamp)}</span>
								</div>
							</div>

							<!-- Amount and Value -->
							<div class="text-right">
								<p class="font-medium {
									transaction.isPositive === true ? 'text-success' : 
									transaction.isPositive === false ? 'text-danger' : 
									'text-text-primary'
								}">
									{#if transaction.type === 'swap'}
										{transaction.amount} {transaction.asset.symbol}
									{:else}
										{transaction.amount} {transaction.asset.symbol}
									{/if}
								</p>
								<p class="text-sm text-text-muted">{transaction.value}</p>
							</div>

							<!-- Chevron -->
							<svg class="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Load More -->
		{#if filteredTransactions.length > 0}
			<div class="p-4">
				<button class="w-full py-3 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors">
					Load More Transactions
				</button>
			</div>
		{/if}
	</main>
</div>
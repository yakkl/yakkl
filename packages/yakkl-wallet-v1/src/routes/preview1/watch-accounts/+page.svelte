<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import BackButton from '../components/BackButton.svelte';

	// Watch accounts state
	let watchedAccounts = $state([
		{
			id: '1',
			name: 'Vitalik.eth',
			address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
			network: 'Ethereum',
			balance: '1,247.32 ETH',
			value: '$2,890,432.18',
			tags: ['whale', 'founder'],
			isFollowing: true,
			lastActivity: new Date('2024-01-15T14:30:00'),
			notes: 'Ethereum co-founder, interesting moves'
		},
		{
			id: '2',
			name: 'Whale Wallet #1',
			address: '0x742d35Cc6635C0532925a3b8D400e12345678',
			network: 'Ethereum',
			balance: '15,432.89 ETH',
			value: '$35,742,156.43',
			tags: ['whale', 'defi'],
			isFollowing: false,
			lastActivity: new Date('2024-01-14T09:15:00'),
			notes: 'Large DeFi movements, copy trading opportunity'
		},
		{
			id: '3',
			name: 'ARB Accumulator',
			address: '0x851d45Cc6635C0532925a3b8D400e12345679',
			network: 'Arbitrum',
			balance: '245,678.12 ARB',
			value: '$487,523.67',
			tags: ['arbitrum', 'accumulation'],
			isFollowing: true,
			lastActivity: new Date('2024-01-13T16:45:00'),
			notes: 'Accumulating ARB tokens consistently'
		}
	]);

	let showAddModal = $state(false);
	let newAccount = $state({
		name: '',
		address: '',
		network: 'ethereum',
		tags: '',
		notes: ''
	});

	let searchQuery = $state('');
	let selectedFilter = $state('all');
	let showSocialFeatures = $state(false);

	// Available networks
	let networks = $state([
		{ value: 'ethereum', label: 'Ethereum', icon: '⟐' },
		{ value: 'arbitrum', label: 'Arbitrum', icon: '🔷' },
		{ value: 'polygon', label: 'Polygon', icon: '💜' },
		{ value: 'optimism', label: 'Optimism', icon: '🔴' }
	]);

	let filteredAccounts = $derived(() => {
		let filtered = watchedAccounts;

		// Filter by following status
		if (selectedFilter === 'following') {
			filtered = filtered.filter(acc => acc.isFollowing);
		}

		// Filter by search query
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(acc => 
				acc.name.toLowerCase().includes(query) ||
				acc.address.toLowerCase().includes(query) ||
				acc.tags.some(tag => tag.toLowerCase().includes(query))
			);
		}

		return filtered;
	});

	function addNewAccount() {
		if (!newAccount.name || !newAccount.address) return;

		const account = {
			id: Date.now().toString(),
			name: newAccount.name,
			address: newAccount.address,
			network: newAccount.network,
			balance: 'Loading...',
			value: 'Loading...',
			tags: newAccount.tags.split(',').map(tag => tag.trim()).filter(Boolean),
			isFollowing: true,
			lastActivity: new Date(),
			notes: newAccount.notes
		};

		watchedAccounts = [...watchedAccounts, account];
		
		// Reset form
		newAccount = {
			name: '',
			address: '',
			network: 'ethereum',
			tags: '',
			notes: ''
		};
		showAddModal = false;

		// TODO: Fetch actual balance and data
		console.log('Added new watch account:', account);
	}

	function toggleFollow(accountId: string) {
		watchedAccounts = watchedAccounts.map(acc => 
			acc.id === accountId 
				? { ...acc, isFollowing: !acc.isFollowing }
				: acc
		);
	}

	function removeAccount(accountId: string) {
		if (confirm('Remove this account from your watch list?')) {
			watchedAccounts = watchedAccounts.filter(acc => acc.id !== accountId);
		}
	}

	function copyTrade(account: any) {
		console.log('Copy trading:', account.name);
		// TODO: Implement copy trading feature
		alert(`Copy trading feature for ${account.name} coming soon!`);
	}

	function viewAccountDetail(account: any) {
		console.log('View account detail:', account);
		// TODO: Navigate to detailed account view
	}

	function formatTime(date: Date) {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor(diff / (1000 * 60 * 60));

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		return 'Recently';
	}

	function goBack() {
		goto('/new-wallet');
	}
</script>

<svelte:head>
	<title>Watch Accounts - YAKKL Smart Wallet</title>
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<Header />
	
	<main class="flex-1 overflow-auto">
		<!-- Header Section -->
		<div class="p-4 space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<BackButton onclick={goBack} />
					<div>
						<h1 class="text-xl font-semibold text-text-primary flex items-center gap-2">
							Watch Accounts
							<span class="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-800 rounded-full">PRO</span>
						</h1>
						<p class="text-sm text-text-muted">Track whale movements and social intelligence</p>
					</div>
				</div>
				
				<button
					onclick={() => showAddModal = true}
					class="p-2 bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
					aria-label="Add new watch account"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
					</svg>
				</button>
			</div>

			<!-- Search and Filters -->
			<div class="space-y-3">
				<div class="relative">
					<input
						bind:value={searchQuery}
						placeholder="Search accounts, addresses, or tags..."
						class="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-card text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
					/>
					<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</div>

				<div class="flex items-center space-x-3">
					<div class="flex bg-surface rounded-card p-1 border border-border">
						<button
							onclick={() => selectedFilter = 'all'}
							class="px-3 py-1 text-sm font-medium rounded transition-all {selectedFilter === 'all' ? 'bg-primary-500 text-white' : 'text-text-secondary hover:text-text-primary'}"
						>
							All
						</button>
						<button
							onclick={() => selectedFilter = 'following'}
							class="px-3 py-1 text-sm font-medium rounded transition-all {selectedFilter === 'following' ? 'bg-primary-500 text-white' : 'text-text-secondary hover:text-text-primary'}"
						>
							Following
						</button>
					</div>

					<button
						onclick={() => showSocialFeatures = !showSocialFeatures}
						class="px-3 py-2 bg-surface hover:bg-surface-elevated rounded-card transition-colors text-sm font-medium text-text-primary border border-border"
					>
						Social Intelligence
					</button>
				</div>
			</div>

			<!-- Social Intelligence Panel -->
			{#if showSocialFeatures}
				<div 
					class="bg-surface rounded-card p-4 border border-border space-y-3"
					in:slide={{ duration: 200 }}
					out:slide={{ duration: 150 }}
				>
					<h3 class="font-medium text-text-primary">Social Intelligence</h3>
					<div class="grid grid-cols-2 gap-3">
						<div class="bg-background rounded-button p-3 text-center">
							<p class="text-lg font-bold text-success">+23.5%</p>
							<p class="text-xs text-text-muted">Whale Performance</p>
						</div>
						<div class="bg-background rounded-button p-3 text-center">
							<p class="text-lg font-bold text-primary-500">47</p>
							<p class="text-xs text-text-muted">Active Signals</p>
						</div>
					</div>
					<button class="w-full py-2 text-sm text-primary-500 hover:text-primary-600 transition-colors">
						View Detailed Analytics
					</button>
				</div>
			{/if}
		</div>

		<!-- Watch List -->
		<div class="px-4 space-y-3">
			{#if filteredAccounts.length === 0}
				<div class="text-center py-12">
					<svg class="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
					</svg>
					<p class="text-text-muted text-lg font-medium mb-2">No accounts found</p>
					<p class="text-text-muted text-sm mb-4">Start watching whale movements and smart money</p>
					<button
						onclick={() => showAddModal = true}
						class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-card transition-colors"
					>
						Add First Account
					</button>
				</div>
			{:else}
				{#each filteredAccounts as account (account.id)}
					<div 
						class="bg-surface rounded-card p-4 border border-border hover:bg-surface-elevated transition-all group"
						in:fly={{ y: 10, duration: 200 }}
					>
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1">
								<div class="flex items-center space-x-2 mb-1">
									<h3 class="font-medium text-text-primary">{account.name}</h3>
									{#if account.isFollowing}
										<svg class="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
									{/if}
								</div>
								
								<p class="text-sm text-text-muted font-mono mb-2">
									{account.address.slice(0, 6)}...{account.address.slice(-4)}
								</p>
								
								<div class="flex items-center space-x-2 mb-2">
									<span class="px-2 py-1 text-xs font-medium bg-border text-text-muted rounded-full">
										{account.network}
									</span>
									{#each account.tags as tag}
										<span class="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
											{tag}
										</span>
									{/each}
								</div>

								{#if account.notes}
									<p class="text-sm text-text-secondary italic">{account.notes}</p>
								{/if}
							</div>

							<div class="text-right">
								<p class="font-medium text-text-primary">{account.balance}</p>
								<p class="text-sm text-text-muted">{account.value}</p>
								<p class="text-xs text-text-muted">{formatTime(account.lastActivity)}</p>
							</div>
						</div>

						<!-- Action Buttons -->
						<div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<button
								onclick={() => toggleFollow(account.id)}
								class="px-3 py-1 text-xs font-medium rounded-button transition-all {account.isFollowing ? 'bg-primary-500 text-white hover:bg-primary-600' : 'bg-border text-text-secondary hover:bg-surface'}"
							>
								{account.isFollowing ? 'Following' : 'Follow'}
							</button>

							<button
								onclick={() => copyTrade(account)}
								class="px-3 py-1 text-xs font-medium bg-success-100 text-success-700 rounded-button hover:bg-success-200 transition-colors"
							>
								Copy Trade
							</button>

							<button
								onclick={() => viewAccountDetail(account)}
								class="px-3 py-1 text-xs font-medium bg-surface hover:bg-background rounded-button transition-colors text-text-secondary"
							>
								Details
							</button>

							<button
								onclick={() => removeAccount(account.id)}
								class="p-1 text-text-muted hover:text-danger transition-colors"
								aria-label="Remove account"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Bottom Spacing -->
		<div class="h-4"></div>
	</main>
</div>

<!-- Add Account Modal -->
{#if showAddModal}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
		onclick={() => showAddModal = false}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
	>
		<div 
			class="bg-surface-elevated rounded-card p-6 w-full max-w-md"
			onclick={(e) => e.stopPropagation()}
			in:fly={{ y: 50, duration: 200 }}
			out:fly={{ y: 50, duration: 150 }}
		>
			<h3 class="text-lg font-semibold text-text-primary mb-4">Add Watch Account</h3>
			
			<div class="space-y-4">
				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Account Name</label>
					<input
						bind:value={newAccount.name}
						placeholder="e.g., Vitalik.eth or Whale #1"
						class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					/>
				</div>

				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Address</label>
					<input
						bind:value={newAccount.address}
						placeholder="0x... or ENS name"
						class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					/>
				</div>

				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Network</label>
					<select
						bind:value={newAccount.network}
						class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500"
					>
						{#each networks as network}
							<option value={network.value}>{network.icon} {network.label}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Tags (comma separated)</label>
					<input
						bind:value={newAccount.tags}
						placeholder="whale, defi, accumulation"
						class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					/>
				</div>

				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Notes (optional)</label>
					<textarea
						bind:value={newAccount.notes}
						placeholder="Why are you watching this account?"
						rows="2"
						class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
					></textarea>
				</div>
			</div>

			<div class="flex space-x-3 mt-6">
				<button
					onclick={() => showAddModal = false}
					class="flex-1 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={addNewAccount}
					disabled={!newAccount.name || !newAccount.address}
					class="flex-1 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-border disabled:text-text-muted text-white font-medium rounded-button transition-all disabled:cursor-not-allowed"
				>
					Add Account
				</button>
			</div>
		</div>
	</div>
{/if}
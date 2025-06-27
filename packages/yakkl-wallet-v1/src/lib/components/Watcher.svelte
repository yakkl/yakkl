<!-- Watcher.svelte - Advanced Portfolio Tracking & Social Intelligence -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { log } from '$lib/managers/Logger';
	import SimpleTooltip from './SimpleTooltip.svelte';
	import Modal from './Modal.svelte';

	interface Props {
		show: boolean;
		onClose: () => void;
		onComplete?: () => void;
	}

	let { show = $bindable(), onClose, onComplete }: Props = $props();

	// Watch account data structure
	interface WatchAccount {
		id: string;
		address: string;
		alias: string;
		blockchain: string;
		accountType: 'personal' | 'exchange' | 'whale' | 'institution' | 'contract';
		category?: string;
		tags: string[];
		balance?: number;
		portfolioValue?: number;
		lastActivity?: Date;
		socialScore?: number;
		isActive: boolean;
		createdAt: Date;
		notifications: {
			largeTransactions: boolean;
			balanceChanges: boolean;
			socialActivity: boolean;
		};
	}

	// Social intelligence data
	interface SocialIntelligence {
		followersCount: number;
		tradingActivity: 'low' | 'medium' | 'high' | 'whale';
		reputationScore: number;
		recentTransactions: {
			amount: number;
			direction: 'in' | 'out';
			timestamp: Date;
			significance: 'normal' | 'notable' | 'major';
		}[];
		influenceMetrics: {
			copyTraders: number;
			portfolioMirrors: number;
			socialMentions: number;
		};
	}

	// Component state
	let watchAccounts = $state<WatchAccount[]>([]);
	let selectedAccount = $state<WatchAccount | null>(null);
	let socialData = $state<Map<string, SocialIntelligence>>(new Map());
	let activeTab = $state<'accounts' | 'analytics' | 'social' | 'alerts'>('accounts');
	let isLoading = $state(false);
	let error = $state('');

	// Form state for adding new watch account
	let newAccountForm = $state({
		address: '',
		alias: '',
		blockchain: 'ethereum',
		accountType: 'personal' as WatchAccount['accountType'],
		category: '',
		tags: [] as string[],
		notifications: {
			largeTransactions: true,
			balanceChanges: false,
			socialActivity: false
		}
	});

	// Available blockchains for watching
	const supportedBlockchains = [
		{ id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
		{ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
		{ id: 'polygon', name: 'Polygon', symbol: 'MATIC' },
		{ id: 'arbitrum', name: 'Arbitrum', symbol: 'ARB' },
		{ id: 'optimism', name: 'Optimism', symbol: 'OP' }
	];

	// Account type definitions with descriptions
	const accountTypes = [
		{ 
			id: 'personal', 
			name: 'Personal Account', 
			description: 'Individual wallet addresses you want to track',
			icon: '👤'
		},
		{ 
			id: 'exchange', 
			name: 'Exchange Account', 
			description: 'Centralized exchange accounts for portfolio tracking',
			icon: '🏦'
		},
		{ 
			id: 'whale', 
			name: 'Whale Watching', 
			description: 'High-value accounts for social trading intelligence',
			icon: '🐋'
		},
		{ 
			id: 'institution', 
			name: 'Institutional', 
			description: 'Corporate or institutional wallet addresses',
			icon: '🏢'
		},
		{ 
			id: 'contract', 
			name: 'Smart Contract', 
			description: 'DeFi protocols and smart contract addresses',
			icon: '📜'
		}
	];

	onMount(async () => {
		await loadWatchAccounts();
	});

	async function loadWatchAccounts() {
		try {
			isLoading = true;
			// TODO: Load from storage/API
			// For now, using mock data
			await new Promise(resolve => setTimeout(resolve, 500)); // Simulate loading
			
			watchAccounts = [
				{
					id: '1',
					address: '0x742d35cc6129c6532c742fc9d2c1b1e7c15b4c85',
					alias: 'Vitalik Buterin',
					blockchain: 'ethereum',
					accountType: 'whale',
					category: 'Influencer',
					tags: ['ethereum', 'founder', 'whale'],
					balance: 2500000,
					portfolioValue: 125000000,
					lastActivity: new Date(Date.now() - 3600000),
					socialScore: 95,
					isActive: true,
					createdAt: new Date(Date.now() - 86400000 * 7),
					notifications: {
						largeTransactions: true,
						balanceChanges: false,
						socialActivity: true
					}
				}
			];

			// Load social intelligence data
			socialData.set('1', {
				followersCount: 5200000,
				tradingActivity: 'whale',
				reputationScore: 98,
				recentTransactions: [
					{
						amount: 1500000,
						direction: 'out',
						timestamp: new Date(Date.now() - 3600000),
						significance: 'major'
					}
				],
				influenceMetrics: {
					copyTraders: 15000,
					portfolioMirrors: 8500,
					socialMentions: 125000
				}
			});

		} catch (err) {
			error = 'Failed to load watch accounts';
			log.error('Error loading watch accounts:', false, err);
		} finally {
			isLoading = false;
		}
	}

	async function addWatchAccount() {
		try {
			if (!newAccountForm.address || !newAccountForm.alias) {
				error = 'Address and alias are required';
				return;
			}

			const newAccount: WatchAccount = {
				id: Date.now().toString(),
				...newAccountForm,
				tags: newAccountForm.tags.filter(tag => tag.trim()),
				balance: 0,
				portfolioValue: 0,
				lastActivity: new Date(),
				socialScore: 0,
				isActive: true,
				createdAt: new Date()
			};

			watchAccounts = [...watchAccounts, newAccount];

			// Reset form
			newAccountForm = {
				address: '',
				alias: '',
				blockchain: 'ethereum',
				accountType: 'personal',
				category: '',
				tags: [],
				notifications: {
					largeTransactions: true,
					balanceChanges: false,
					socialActivity: false
				}
			};

			// TODO: Save to storage/API
			log.info('Added new watch account:', false, newAccount);

		} catch (err) {
			error = 'Failed to add watch account';
			log.error('Error adding watch account:', false, err);
		}
	}

	function removeWatchAccount(accountId: string) {
		watchAccounts = watchAccounts.filter(acc => acc.id !== accountId);
		if (selectedAccount?.id === accountId) {
			selectedAccount = null;
		}
		// TODO: Update storage/API
	}

	function selectAccount(account: WatchAccount) {
		selectedAccount = account;
		activeTab = 'analytics';
	}

	function addTag(tag: string) {
		if (tag.trim() && !newAccountForm.tags.includes(tag.trim())) {
			newAccountForm.tags = [...newAccountForm.tags, tag.trim()];
		}
	}

	function removeTag(index: number) {
		newAccountForm.tags = newAccountForm.tags.filter((_, i) => i !== index);
	}

	function formatBalance(value: number): string {
		if (value >= 1000000) {
			return `$${(value / 1000000).toFixed(2)}M`;
		}
		if (value >= 1000) {
			return `$${(value / 1000).toFixed(1)}K`;
		}
		return `$${value.toFixed(2)}`;
	}

	function getAccountTypeInfo(type: string) {
		return accountTypes.find(t => t.id === type) || accountTypes[0];
	}

	function getActivityColor(activity: string): string {
		switch (activity) {
			case 'whale': return 'text-purple-600 bg-purple-100';
			case 'high': return 'text-red-600 bg-red-100';
			case 'medium': return 'text-orange-600 bg-orange-100';
			case 'low': return 'text-green-600 bg-green-100';
			default: return 'text-gray-600 bg-gray-100';
		}
	}

	function handleClose() {
		error = '';
		selectedAccount = null;
		activeTab = 'accounts';
		onClose();
	}

	function handleComplete() {
		onComplete?.();
		handleClose();
	}
</script>

{#if show}
	<Modal 
		title="Watcher - Portfolio Tracking & Social Intelligence" 
		show={true} 
		onClose={handleClose}
		size="xl"
	>
		{#snippet body()}
			<div class="flex h-[600px]">
				<!-- Sidebar Navigation -->
				<div class="w-48 bg-gray-50 border-r border-gray-200 p-4">
					<nav class="space-y-2">
						<button
							onclick={() => activeTab = 'accounts'}
							class="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors {activeTab === 'accounts' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
						>
							📋 Watch Accounts
						</button>
						<button
							onclick={() => activeTab = 'analytics'}
							class="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors {activeTab === 'analytics' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
							disabled={!selectedAccount}
						>
							📊 Analytics
						</button>
						<button
							onclick={() => activeTab = 'social'}
							class="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors {activeTab === 'social' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
							disabled={!selectedAccount}
						>
							🌐 Social Intel
						</button>
						<button
							onclick={() => activeTab = 'alerts'}
							class="w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors {activeTab === 'alerts' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}"
						>
							🔔 Alerts
						</button>
					</nav>
				</div>

				<!-- Main Content -->
				<div class="flex-1 p-6">
					{#if error}
						<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
							<p class="text-red-700 text-sm">{error}</p>
							<button 
								onclick={() => error = ''}
								class="text-red-600 hover:text-red-800 text-xs underline mt-1"
							>
								Dismiss
							</button>
						</div>
					{/if}

					{#if activeTab === 'accounts'}
						<!-- Watch Accounts Management -->
						<div class="space-y-6">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-semibold text-gray-900">Watch Accounts</h3>
								<span class="text-sm text-gray-500">{watchAccounts.length} accounts</span>
							</div>

							<!-- Add New Account Form -->
							<div class="bg-gray-50 p-4 rounded-lg">
								<h4 class="font-medium text-gray-900 mb-3">Add New Watch Account</h4>
								<div class="grid grid-cols-2 gap-4">
									<div>
										<label for="watcher-address" class="block text-sm font-medium text-gray-700 mb-1">Address</label>
										<input
											id="watcher-address"
											bind:value={newAccountForm.address}
											type="text"
											placeholder="0x... or wallet address"
											class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label for="watcher-alias" class="block text-sm font-medium text-gray-700 mb-1">Alias</label>
										<input
											id="watcher-alias"
											bind:value={newAccountForm.alias}
											type="text"
											placeholder="Display name"
											class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										/>
									</div>
									<div>
										<label for="watcher-blockchain" class="block text-sm font-medium text-gray-700 mb-1">Blockchain</label>
										<select
											id="watcher-blockchain"
											bind:value={newAccountForm.blockchain}
											class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										>
											{#each supportedBlockchains as blockchain}
												<option value={blockchain.id}>{blockchain.name} ({blockchain.symbol})</option>
											{/each}
										</select>
									</div>
									<div>
										<label for="watcher-account-type" class="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
										<select
											id="watcher-account-type"
											bind:value={newAccountForm.accountType}
											class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										>
											{#each accountTypes as type}
												<option value={type.id}>{type.icon} {type.name}</option>
											{/each}
										</select>
									</div>
								</div>
								<div class="mt-4 flex gap-2">
									<input
										id="watcher-tags"
										type="text"
										placeholder="Add tags (press Enter)"
										aria-label="Add tags for the watch account"
										class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addTag(e.currentTarget.value);
												e.currentTarget.value = '';
											}
										}}
									/>
									<button
										onclick={addWatchAccount}
										class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
									>
										Add Account
									</button>
								</div>
								{#if newAccountForm.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each newAccountForm.tags as tag, index}
											<span class="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
												{tag}
												<button onclick={() => removeTag(index)} class="text-indigo-500 hover:text-indigo-700">×</button>
											</span>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Watch Accounts List -->
							<div class="space-y-3">
								{#if isLoading}
									<div class="flex justify-center py-8">
										<div class="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
									</div>
								{:else if watchAccounts.length === 0}
									<div class="text-center py-8 text-gray-500">
										<p>No watch accounts added yet</p>
										<p class="text-sm">Add accounts above to start tracking portfolios and social activity</p>
									</div>
								{:else}
									{#each watchAccounts as account}
										<div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-3">
													<div class="text-2xl">{getAccountTypeInfo(account.accountType).icon}</div>
													<div>
														<div class="font-medium text-gray-900">{account.alias}</div>
														<div class="text-sm text-gray-500 font-mono">{account.address.slice(0, 10)}...{account.address.slice(-8)}</div>
														<div class="flex items-center gap-2 mt-1">
															<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{account.blockchain}</span>
															<span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{getAccountTypeInfo(account.accountType).name}</span>
															{#each account.tags as tag}
																<span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">{tag}</span>
															{/each}
														</div>
													</div>
												</div>
												<div class="text-right">
													{#if account.portfolioValue}
														<div class="font-semibold text-gray-900">{formatBalance(account.portfolioValue)}</div>
													{/if}
													{#if account.socialScore}
														<div class="text-sm text-gray-500">Social: {account.socialScore}/100</div>
													{/if}
													<div class="flex gap-2 mt-2">
														<SimpleTooltip content="View analytics">
															<button
																onclick={() => selectAccount(account)}
																class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-xs hover:bg-indigo-200"
															>
																Analyze
															</button>
														</SimpleTooltip>
														<SimpleTooltip content="Remove account">
															<button
																onclick={() => removeWatchAccount(account.id)}
																class="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
															>
																Remove
															</button>
														</SimpleTooltip>
													</div>
												</div>
											</div>
										</div>
									{/each}
								{/if}
							</div>
						</div>

					{:else if activeTab === 'analytics' && selectedAccount}
						<!-- Analytics View -->
						<div class="space-y-6">
							<div class="flex items-center gap-3">
								<button
									onclick={() => activeTab = 'accounts'}
									class="text-indigo-600 hover:text-indigo-800"
								>
									← Back
								</button>
								<h3 class="text-lg font-semibold text-gray-900">Analytics: {selectedAccount.alias}</h3>
							</div>

							<div class="grid grid-cols-3 gap-4">
								<div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
									<div class="text-sm opacity-90">Portfolio Value</div>
									<div class="text-2xl font-bold">{formatBalance(selectedAccount.portfolioValue || 0)}</div>
								</div>
								<div class="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
									<div class="text-sm opacity-90">Social Score</div>
									<div class="text-2xl font-bold">{selectedAccount.socialScore || 0}/100</div>
								</div>
								<div class="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
									<div class="text-sm opacity-90">Account Type</div>
									<div class="text-lg font-semibold">{getAccountTypeInfo(selectedAccount.accountType).name}</div>
								</div>
							</div>

							<div class="text-center py-12 text-gray-500">
								<p>📊 Advanced portfolio analytics coming soon</p>
								<p class="text-sm">Balance trends, transaction analysis, and performance metrics</p>
							</div>
						</div>

					{:else if activeTab === 'social' && selectedAccount}
						<!-- Social Intelligence View -->
						<div class="space-y-6">
							<div class="flex items-center gap-3">
								<button
									onclick={() => activeTab = 'accounts'}
									class="text-indigo-600 hover:text-indigo-800"
								>
									← Back
								</button>
								<h3 class="text-lg font-semibold text-gray-900">Social Intelligence: {selectedAccount.alias}</h3>
							</div>

							{#if socialData.has(selectedAccount.id)}
								{@const social = socialData.get(selectedAccount.id)}
								<div class="grid grid-cols-2 gap-6">
									<div class="space-y-4">
										<div class="bg-white border border-gray-200 rounded-lg p-4">
											<h4 class="font-medium text-gray-900 mb-3">Influence Metrics</h4>
											<div class="space-y-2">
												<div class="flex justify-between">
													<span class="text-sm text-gray-600">Copy Traders</span>
													<span class="font-medium">{social.influenceMetrics.copyTraders.toLocaleString()}</span>
												</div>
												<div class="flex justify-between">
													<span class="text-sm text-gray-600">Portfolio Mirrors</span>
													<span class="font-medium">{social.influenceMetrics.portfolioMirrors.toLocaleString()}</span>
												</div>
												<div class="flex justify-between">
													<span class="text-sm text-gray-600">Social Mentions</span>
													<span class="font-medium">{social.influenceMetrics.socialMentions.toLocaleString()}</span>
												</div>
											</div>
										</div>

										<div class="bg-white border border-gray-200 rounded-lg p-4">
											<h4 class="font-medium text-gray-900 mb-3">Trading Activity</h4>
											<div class="flex items-center gap-2">
												<span class="px-2 py-1 rounded text-sm font-medium {getActivityColor(social.tradingActivity)}">
													{social.tradingActivity.toUpperCase()}
												</span>
												<span class="text-sm text-gray-600">activity level</span>
											</div>
											<div class="mt-2">
												<span class="text-sm text-gray-600">Reputation Score: </span>
												<span class="font-medium">{social.reputationScore}/100</span>
											</div>
										</div>
									</div>

									<div class="space-y-4">
										<div class="bg-white border border-gray-200 rounded-lg p-4">
											<h4 class="font-medium text-gray-900 mb-3">Recent Activity</h4>
											<div class="space-y-3">
												{#each social.recentTransactions as tx}
													<div class="flex items-center justify-between p-2 bg-gray-50 rounded">
														<div class="flex items-center gap-2">
															<span class="text-lg">{tx.direction === 'in' ? '📈' : '📉'}</span>
															<div>
																<div class="font-medium text-sm">{formatBalance(tx.amount)}</div>
																<div class="text-xs text-gray-500">{tx.timestamp.toLocaleTimeString()}</div>
															</div>
														</div>
														<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
															{tx.significance}
														</span>
													</div>
												{/each}
											</div>
										</div>
									</div>
								</div>
							{:else}
								<div class="text-center py-12 text-gray-500">
									<p>🌐 Social intelligence data not available</p>
									<p class="text-sm">Connect social data sources to see influence metrics</p>
								</div>
							{/if}
						</div>

					{:else if activeTab === 'alerts'}
						<!-- Alerts Configuration -->
						<div class="space-y-6">
							<h3 class="text-lg font-semibold text-gray-900">Alert Configuration</h3>
							
							<div class="text-center py-12 text-gray-500">
								<p>🔔 Smart alerts coming soon</p>
								<p class="text-sm">Large transactions, social activity, and portfolio changes</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/snippet}

		{#snippet footer()}
			<div class="flex justify-between">
				<div class="text-sm text-gray-500">
					{#if activeTab === 'accounts'}
						Pro feature: Advanced portfolio tracking & social intelligence
					{:else if selectedAccount}
						Analyzing: {selectedAccount.alias}
					{/if}
				</div>
				<div class="flex gap-3">
					<button
						onclick={handleClose}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
					>
						Close
					</button>
					{#if activeTab === 'accounts'}
						<button
							onclick={handleComplete}
							class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Save Changes
						</button>
					{/if}
				</div>
			</div>
		{/snippet}
	</Modal>
{/if}
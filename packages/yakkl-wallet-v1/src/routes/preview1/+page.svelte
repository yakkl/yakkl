<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import Header from './components/Header.svelte';
	import BalanceCard from './components/BalanceCard.svelte';
	import ActionButtons from './components/ActionButtons.svelte';
	import AssetList from './components/AssetList.svelte';
	import RecentActivity from './components/RecentActivity.svelte';
	import ThemeToggle from './components/ThemeToggle.svelte';

	// Mock data - in real app this would come from stores
	let totalBalance = $state('$1,229.82');
	let balanceChange = $state('+$42.18 (+3.55%)');
	let isPositiveChange = $state(true);
	let isLoading = $state(true);

	let assets = $state([
		{
			symbol: 'ETH',
			name: 'Ethereum',
			balance: '0.1736',
			value: '$40.28',
			change: '+2.1%',
			isPositive: true,
			icon: '⟐'
		},
		{
			symbol: 'PEPE',
			name: 'Pepe',
			balance: '1,432.37',
			value: '$432.37',
			change: '-1.2%',
			isPositive: false,
			icon: '🐸'
		},
		{
			symbol: 'USDT',
			name: 'Tether USD',
			balance: '297.92',
			value: '$297.92',
			change: '+0.1%',
			isPositive: true,
			icon: '₮'
		}
	]);

	let recentActivity = $state([
		{
			type: 'send',
			description: 'Sent ETH to 0x123...',
			amount: '-$50.00',
			time: '2 hours ago',
			isPositive: false
		},
		{
			type: 'receive',
			description: 'Received USDT',
			amount: '+$100.00',
			time: '1 day ago',
			isPositive: true
		},
		{
			type: 'swap',
			description: 'Swapped ETH → PEPE',
			amount: '~$25.00',
			time: '2 days ago',
			isPositive: null
		}
	]);

	onMount(() => {
		// Simulate loading delay
		setTimeout(() => {
			isLoading = false;
		}, 500);
	});
</script>

<svelte:head>
	<title>YAKKL Smart Wallet</title>
	<meta name="description" content="Your secure multi-chain crypto wallet" />
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<!-- Header -->
	<Header />

	<!-- Main Content -->
	<main class="flex-1 overflow-auto px-4 py-6 space-y-6">
		{#if isLoading}
			<!-- Loading State -->
			<div class="space-y-6 animate-fade-in">
				<div class="bg-surface rounded-card p-6 animate-pulse">
					<div class="h-8 bg-border rounded w-1/3 mb-2"></div>
					<div class="h-6 bg-border rounded w-1/4"></div>
				</div>
				<div class="grid grid-cols-3 gap-3">
					{#each [1, 2, 3] as _}
						<div class="bg-surface rounded-button p-4 animate-pulse">
							<div class="h-4 bg-border rounded w-full"></div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<!-- Balance Card -->
			<div in:fly={{ y: 20, duration: 400, delay: 100 }}>
				<BalanceCard
					{totalBalance}
					{balanceChange}
					{isPositiveChange}
				/>
			</div>

			<!-- Action Buttons -->
			<div in:fly={{ y: 20, duration: 400, delay: 200 }}>
				<ActionButtons />
			</div>

			<!-- Assets -->
			<div in:fly={{ y: 20, duration: 400, delay: 300 }}>
				<AssetList {assets} />
			</div>

			<!-- Recent Activity -->
			<div in:fly={{ y: 20, duration: 400, delay: 400 }}>
				<RecentActivity activities={recentActivity} />
			</div>
		{/if}
	</main>

	<!-- Floating Theme Toggle for Development -->
	<div class="fixed bottom-4 right-4 z-50">
		<ThemeToggle />
	</div>
</div>

<style>
	:global(.new-wallet) {
		/* Override any parent styles */
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
	}
</style>
<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Asset {
		symbol: string;
		name: string;
		balance: string;
		value: string;
		change: string;
		isPositive: boolean;
		icon: string;
	}

	const props = $props<{
		assets: Asset[];
	}>();

	let showAll = $state(false);
	let displayedAssets = $derived(showAll ? props.assets : props.assets.slice(0, 3));

	function toggleShowAll() {
		showAll = !showAll;
	}

	function handleAssetClick(asset: Asset) {
		console.log('Asset clicked:', asset.symbol);
		// TODO: Navigate to asset detail page
	}
</script>

<div class="bg-surface rounded-card p-4 shadow-card">
	<div class="flex items-center justify-between mb-4">
		<h3 class="font-medium text-text-primary">My Assets</h3>
		<span class="text-sm text-text-muted">{props.assets.length} tokens</span>
	</div>

	<div class="space-y-2">
		{#each displayedAssets as asset, index (asset.symbol)}
			<button
				onclick={() => handleAssetClick(asset)}
				class="w-full flex items-center justify-between p-3 rounded-button hover:bg-background transition-all duration-200 group"
				in:fly={{ y: 10, duration: 200, delay: index * 50 }}
			>
				<div class="flex items-center space-x-3">
					<div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg">
						{asset.icon}
					</div>
					<div class="text-left">
						<div class="flex items-center space-x-2">
							<span class="font-medium text-text-primary">{asset.symbol}</span>
							<span class="text-xs text-text-muted">{asset.name}</span>
						</div>
						<span class="text-sm text-text-secondary">{asset.balance}</span>
					</div>
				</div>

				<div class="text-right">
					<div class="font-medium text-text-primary">{asset.value}</div>
					<div class="text-sm {asset.isPositive ? 'text-success' : 'text-danger'}">
						{asset.change}
					</div>
				</div>

				<!-- Chevron -->
				<svg class="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		{/each}
	</div>

	{#if props.assets.length > 3}
		<button
			onclick={toggleShowAll}
			class="w-full mt-3 py-2 text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
		>
			{showAll ? 'Show Less' : `View All (${props.assets.length - 3} more)`}
		</button>
	{/if}
</div>
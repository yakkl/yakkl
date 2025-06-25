<script lang="ts">
	import { fade } from 'svelte/transition';

	const props = $props<{
		totalBalance: string;
		balanceChange: string;
		isPositiveChange: boolean;
	}>();

	let isBalanceVisible = $state(true);

	function toggleBalanceVisibility() {
		isBalanceVisible = !isBalanceVisible;
	}
</script>

<div class="bg-surface rounded-card p-6 shadow-card hover:shadow-card-hover transition-all duration-200">
	<div class="flex items-center justify-between mb-2">
		<h2 class="text-sm font-medium text-text-secondary">Total Portfolio</h2>
		<button
			onclick={toggleBalanceVisibility}
			class="p-1.5 rounded-button hover:bg-background transition-colors"
			aria-label={isBalanceVisible ? 'Hide balance' : 'Show balance'}
		>
			{#if isBalanceVisible}
				<svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
				</svg>
			{:else}
				<svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
				</svg>
			{/if}
		</button>
	</div>

	<div class="space-y-1">
		{#if isBalanceVisible}
			<div in:fade={{ duration: 200 }}>
				<h3 class="text-3xl font-bold text-text-primary">{props.totalBalance}</h3>
				<p class="text-sm font-medium {props.isPositiveChange ? 'text-success' : 'text-danger'}">
					{props.balanceChange}
				</p>
			</div>
		{:else}
			<div in:fade={{ duration: 200 }}>
				<h3 class="text-3xl font-bold text-text-primary">••••••</h3>
				<p class="text-sm font-medium text-text-muted">••••••</p>
			</div>
		{/if}
	</div>

	<!-- Performance indicators -->
	<div class="flex items-center justify-between mt-4 pt-4 border-t border-border-light">
		<div class="flex items-center space-x-4 text-xs">
			<div class="flex items-center space-x-1">
				<div class="w-2 h-2 bg-success rounded-full"></div>
				<span class="text-text-muted">24h</span>
			</div>
			<div class="flex items-center space-x-1">
				<div class="w-2 h-2 bg-warning rounded-full"></div>
				<span class="text-text-muted">7d</span>
			</div>
			<div class="flex items-center space-x-1">
				<div class="w-2 h-2 bg-primary-500 rounded-full"></div>
				<span class="text-text-muted">30d</span>
			</div>
		</div>
		
		<button class="text-xs text-primary-500 hover:text-primary-600 transition-colors font-medium">
			View Details
		</button>
	</div>
</div>
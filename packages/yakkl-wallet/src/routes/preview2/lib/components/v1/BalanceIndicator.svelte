<!-- BalanceIndicator.svelte - Shows balance with loading/error states -->
<script lang="ts">
	import SkeletonBalance from './SkeletonBalance.svelte';
	import ProtectedValue from './ProtectedValue.svelte';

	interface Props {
		isLoading?: boolean;
		loadingError?: string | null;
		isCached?: boolean;
		isStale?: boolean;
		lastUpdated?: Date | null;
		quantityFormatted?: string;
		totalValueFormatted?: string;
		onRetry?: () => void;
	}

	let {
		isLoading = false,
		loadingError = null,
		isCached = false,
		isStale = false,
		lastUpdated = null,
		quantityFormatted = '',
		totalValueFormatted = '',
		onRetry = () => {}
	}: Props = $props();

	function formatLastUpdated(date: Date | null): string {
		if (!date) return '';
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));

		if (diffMins < 1) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;

		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	}
</script>

<div class="mt-2 space-y-1">
	<!-- Balance row -->
	<div class="flex items-center justify-between">
		{#if isLoading && !isCached}
			<SkeletonBalance showLabel={false} className="h-4" />
		{:else if loadingError}
			<div class="flex items-center space-x-1">
				<span class="text-xs text-red-500">Error loading</span>
				<button class="text-xs text-blue-500 hover:text-blue-700 underline" onclick={onRetry}>
					Retry
				</button>
			</div>
			<span class="text-xs text-gray-400">--</span>
		{:else}
			<div class="flex items-center space-x-1">
				<span class="text-sm font-semibold text-gray-900">
					<ProtectedValue value={`${quantityFormatted} ETH`} placeholder="******* ETH" />
				</span>
				{#if isLoading}
					<div
						class="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"
					></div>
				{:else if isStale}
					<div title="Data may be outdated">
						<svg class="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				{:else if isCached}
					<div title="Cached data">
						<svg class="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				{/if}
			</div>
			<span class="text-sm font-semibold text-gray-900">
				<ProtectedValue value={totalValueFormatted} placeholder="*****" />
			</span>
		{/if}
	</div>

	<!-- Last updated info (only show if we have timestamp) -->
	{#if lastUpdated && (isStale || isCached)}
		<div class="flex justify-end">
			<span class="text-xs text-gray-400" title="Last updated: {lastUpdated.toLocaleString()}">
				Updated {formatLastUpdated(lastUpdated)}
			</span>
		</div>
	{/if}
</div>

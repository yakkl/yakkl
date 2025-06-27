<!-- SkeletonBalance.svelte - Loading placeholder for balance data -->
<script lang="ts">
	interface Props {
		className?: string;
		showLabel?: boolean;
	}

	let { className = '', showLabel = true }: Props = $props();
</script>

<div class="animate-pulse {className}">
	{#if showLabel}
		<div class="h-3 bg-gray-200 rounded w-16 mb-1"></div>
	{/if}
	<div class="h-4 bg-gray-300 rounded w-20"></div>
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>

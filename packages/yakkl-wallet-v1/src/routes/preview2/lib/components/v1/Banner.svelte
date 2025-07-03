<!-- File: src/lib/components/Banner.svelte -->
<script lang="ts">
	let {
		title = 'Welcome to YAKKL',
		message = 'Your secure crypto wallet',
		ctaText = 'UPGRADE',
		onCallToAction = null
	} = $props<{
		title?: string;
		message?: string;
		ctaText?: string;
		onCallToAction?: ((index: number) => void) | null;
	}>();
</script>

<div class="bg-primary text-primary-content p-4">
	<div class="flex justify-between items-center">
		<div>
			<h2 class="text-lg font-bold">{title}</h2>
			<p class="text-sm">{message}</p>
		</div>
		{#if onCallToAction}
			<button onclick={onCallToAction} class="btn btn-secondary btn-sm">
				{ctaText}
			</button>
		{/if}
	</div>
</div>

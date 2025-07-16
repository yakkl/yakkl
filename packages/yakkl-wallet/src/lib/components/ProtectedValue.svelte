<script lang="ts">
	import { visibilityStore } from '$lib/common/stores/visibilityStore';
	import { get } from 'svelte/store';

	const { value, placeholder = '**********' } = $props<{
		value: string;
		placeholder?: string;
	}>();

	// Initialize with current store value
	let visible = $state(get(visibilityStore));

	$effect(() => {
		const unsubscribe = visibilityStore.subscribe((value) => {
			visible = value;
		});

		return unsubscribe;
	});
</script>

<span>
	{#if visible}
		{value}
	{:else}
		{placeholder}
	{/if}
</span>

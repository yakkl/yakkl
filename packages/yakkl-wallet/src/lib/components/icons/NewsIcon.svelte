<!-- File: src/lib/components/icons/NewsIcon.svelte -->
<script lang="ts">
	let { className = '' } = $props<{
		className?: string;
	}>();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={className}
>
	<path
		d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"
	/>
	<path d="M18 14h-8" />
	<path d="M18 18h-8" />
	<path d="M18 10h-8" />
</svg>

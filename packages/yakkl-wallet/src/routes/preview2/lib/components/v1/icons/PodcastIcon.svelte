<!-- File: src/lib/components/icons/PodcastIcon.svelte -->
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
	<circle cx="12" cy="11" r="1" />
	<path d="M11 17a1 1 0 0 1 2 0c0 .5-.34 3-.5 4.5a.5.5 0 0 1-1 0c-.16-1.5-.5-4-.5-4.5Z" />
	<path d="M8 14a5 5 0 1 1 8 0" />
	<path d="M17 18.5a9 9 0 1 0-10 0" />
</svg>

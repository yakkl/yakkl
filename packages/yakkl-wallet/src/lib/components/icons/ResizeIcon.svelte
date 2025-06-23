<!-- File: src/lib/components/icons/ResizeIcon.svelte -->
<script lang="ts">
	interface Props {
		className?: string;
	}

	let { className = '' }: Props = $props();
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
	<path d="M21 3L3 21" />
	<path d="M21 21L3 3" />
	<path d="M21 15L15 21" />
	<path d="M9 3L3 9" />
</svg>

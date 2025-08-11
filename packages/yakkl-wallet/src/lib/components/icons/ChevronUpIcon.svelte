<!-- File: src/lib/components/icons/ChevronUpIcon.svelte -->
<script lang="ts">
	interface Props {
		size?: number;
		stroke?: string;
		className?: string;
	}

	let { size = 24, stroke = 'currentColor', className = '' }: Props = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	fill="none"
	viewBox="0 0 24 24"
	stroke-width="1.5"
	{stroke}
	width={size}
	height={size}
	class="{className}"
>
	<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
</svg>

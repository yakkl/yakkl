<script lang="ts">
	const props = $props<{
		onclick?: () => void;
		label?: string;
	}>();
</script>

<button
	onclick={props.onclick}
	class="p-2 rounded-full hover:bg-surface transition-colors group"
	aria-label={props.label || 'Go back'}
>
	<svg 
		class="w-6 h-6 text-text-secondary group-hover:text-text-primary transition-colors" 
		fill="none" 
		stroke="currentColor" 
		viewBox="0 0 24 24"
	>
		<path 
			stroke-linecap="round" 
			stroke-linejoin="round" 
			stroke-width="2" 
			d="M15 19l-7-7 7-7" 
		/>
	</svg>
</button>
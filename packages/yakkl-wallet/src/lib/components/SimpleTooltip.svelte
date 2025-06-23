<script lang="ts">
	const {
		content = '',
		position = 'top',
		children
	} = $props<{
		content: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		children?: any;
	}>();
</script>

<span class="relative group inline-block">
	{@render children()}

	<span
		class={`absolute z-10 px-2 py-1 rounded bg-zinc-900 text-zinc-100 text-xs opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap
      ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
      ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
      ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
      ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
    `}
	>
		{content}
	</span>
</span>

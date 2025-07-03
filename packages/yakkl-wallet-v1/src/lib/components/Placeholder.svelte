<!-- Placeholder.svelte -->
<script lang="ts">
	let {
		text = '',
		anchorTop = false,
		centerHorizontal = true,
		centerVertical = false,
		className = '',
		showBorderTop = true
	} = $props<{
		text?: string;
		anchorTop?: boolean;
		centerHorizontal?: boolean;
		centerVertical?: boolean;
		className?: string;
		showBorderTop?: boolean;
	}>();
</script>

<div
	class="
    {anchorTop ? 'sticky top-0' : ''}
    {centerHorizontal ? 'flex justify-center' : ''}
    {centerVertical ? 'flex items-center min-h-full' : ''}
    w-full
    px-4
    py-3
    text-center
    text-sm
    text-zinc-600
    dark:text-zinc-400
    {showBorderTop ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}
    {className}
  "
>
	<p>{text}</p>
</div>

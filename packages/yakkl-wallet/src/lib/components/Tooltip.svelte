<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils.js';

	interface Props {
		content: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
		alignOffset?: number;
		triggerClass?: string;
		contentClass?: string;
		children?: any;
	}

	let {
		content,
		side = 'top',
		align = 'center',
		sideOffset = 4,
		alignOffset = 0,
		triggerClass = '',
		contentClass = '',
		children
	}: Props = $props();

	// Default styles for the tooltip content
	const defaultContentClass = 'bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900';
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class={triggerClass}>
			{@render children()}
		</Tooltip.Trigger>
		<Tooltip.Content
			{side}
			{align}
			{sideOffset}
			{alignOffset}
			class={cn(defaultContentClass, contentClass)}
		>
			{content}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>

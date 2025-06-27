<!-- GenericFooter.svelte -->
<script lang="ts">
	type FooterVariant = 'default' | 'warning' | 'success' | 'info';

	let {
		text = '',
		buttonText = '',
		onAction = () => {},
		variant = 'default' as FooterVariant,
		className = ''
	} = $props<{
		text?: string;
		buttonText?: string;
		onAction?: () => void;
		variant?: FooterVariant;
		className?: string;
	}>();

	const variantClasses: Record<FooterVariant, string> = {
		default: 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300',
		warning: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
		success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
		info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
	};

	$effect(() => {
		// Ensure variant is always a valid FooterVariant
		if (!Object.keys(variantClasses).includes(variant)) {
			variant = 'default';
		}
	});
</script>

<div
	class="flex items-center justify-between {variantClasses[variant as FooterVariant]} {className}"
>
	<p class="text-sm">{text}</p>
	{#if buttonText}
		<button
			class="px-4 py-2 text-sm font-medium rounded-lg transition-colors
        {variant === 'default' &&
				'bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100'}
        {variant === 'warning' &&
				'bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-900 dark:text-yellow-100'}
        {variant === 'success' &&
				'bg-green-200 hover:bg-green-300 dark:bg-green-800 dark:hover:bg-green-700 text-green-900 dark:text-green-100'}
        {variant === 'info' &&
				'bg-blue-200 hover:bg-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700 text-blue-900 dark:text-blue-100'}"
			onclick={onAction}
		>
			{buttonText}
		</button>
	{/if}
</div>

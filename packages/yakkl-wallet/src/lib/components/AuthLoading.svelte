<!-- AuthLoading.svelte -->
<script lang="ts">
	interface Props {
		show?: boolean;
		message?: string;
		className?: string;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'spinner' | 'dots' | 'pulse';
	}

	let {
		show = true,
		message = 'Loading...',
		className = '',
		size = 'md',
		variant = 'spinner'
	}: Props = $props();

	const sizeClasses = $derived(
		{
			sm: 'h-4 w-4',
			md: 'h-6 w-6',
			lg: 'h-8 w-8'
		}[size]
	);
</script>

{#if show}
	<div class="flex flex-col items-center justify-center p-4 {className}">
		{#if variant === 'spinner'}
			<div
				class="animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 {sizeClasses}"
			></div>
		{:else if variant === 'dots'}
			<div class="flex space-x-1">
				<div class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
				<div
					class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
					style="animation-delay: 0.1s"
				></div>
				<div
					class="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
					style="animation-delay: 0.2s"
				></div>
			</div>
		{:else if variant === 'pulse'}
			<div class="bg-indigo-600 rounded-full {sizeClasses} animate-pulse"></div>
		{/if}

		{#if message}
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">{message}</p>
		{/if}
	</div>
{/if}

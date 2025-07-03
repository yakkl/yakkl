<!-- AuthError.svelte -->
<script lang="ts">
	interface Props {
		error: string | Error | null;
		onRetry?: () => void;
		onDismiss?: () => void;
		className?: string;
		showIcon?: boolean;
	}

	let { error, onRetry, onDismiss, className = '', showIcon = true }: Props = $props();

	const errorMessage = $derived(
		error instanceof Error ? error.message : error || 'An error occurred'
	);

	const isNetworkError = $derived(
		errorMessage.toLowerCase().includes('network') ||
			errorMessage.toLowerCase().includes('connection') ||
			errorMessage.toLowerCase().includes('timeout')
	);

	const isAuthError = $derived(
		errorMessage.toLowerCase().includes('credential') ||
			errorMessage.toLowerCase().includes('authentication') ||
			errorMessage.toLowerCase().includes('unauthorized')
	);
</script>

{#if error}
	<div class="rounded-md bg-red-50 dark:bg-red-900/20 p-4 mt-4 {className}">
		<div class="flex">
			{#if showIcon}
				<div class="flex-shrink-0">
					<svg
						class="h-5 w-5 text-red-400"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
			<div class="ml-3 flex-1">
				<h3 class="text-sm font-medium text-red-800 dark:text-red-200">
					{#if isNetworkError}
						Connection Error
					{:else if isAuthError}
						Authentication Error
					{:else}
						Error
					{/if}
				</h3>
				<div class="mt-2 text-sm text-red-700 dark:text-red-300">
					<p>{errorMessage}</p>

					{#if isNetworkError}
						<p class="mt-1 text-xs">Please check your internet connection and try again.</p>
					{:else if isAuthError}
						<p class="mt-1 text-xs">Please verify your credentials and try again.</p>
					{/if}
				</div>
			</div>
			<div class="ml-auto pl-3 flex gap-2">
				{#if onRetry}
					<button
						onclick={onRetry}
						class="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors"
						aria-label="Retry action"
					>
						Retry
					</button>
				{/if}
				{#if onDismiss}
					<button
						onclick={onDismiss}
						class="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
						aria-label="Dismiss error"
					>
						Dismiss
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

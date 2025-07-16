<script lang="ts">
	interface Props {
		show?: boolean;
		title?: string;
		description?: string;
		className?: string;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		onCancel?: () => void;
		onClose?: () => void;
		preventClose?: boolean; // Prevents closing via background click or X button
	}

	// Use `let` for props that are mutable
	let {
		show = $bindable(false), // Two-way binding
		title = '',
		description = '',
		className = '',
		children,
		footer,
		onCancel = () => {
			show = false;
		}, // Default handlers
		onClose = () => {
			show = false;
		},
		preventClose = false
	}: Props = $props();

	// Handle close with preventClose check
	function handleClose() {
		if (!preventClose) {
			onClose();
		}
	}
</script>

{#if show}
	<div class="fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center z-[899] {className}" aria-modal="true">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-50" onclick={handleClose}></div>

		<!-- Modal container -->
		<div
			class="bg-surface-light dark:bg-surface-dark text-primary-light dark:text-primary-dark rounded-lg shadow-lg w-full max-w-md mx-4 z-10 max-h-[80%] flex flex-col overflow-hidden"
		>
			<!-- Modal header -->
			<div class="p-4 relative overflow-hidden">
				{#if !preventClose}
					<button
						class="absolute top-4 right-4 text-2xl font-bold hover:text-primary-light dark:hover:text-primary-dark focus:outline-none"
						onclick={handleClose}
					>
						&times;
					</button>
				{/if}
				{#if description}
					<h2
						class="text-2xl font-bold mb-4 text-primary-light dark:text-primary-dark truncate pr-8"
						{title}
					>
						{title}
					</h2>
					<p class="text-sm mb-2 text-secondary-light dark:text-secondary-dark">
						{description}
					</p>
				{:else}
					<h2
						class="text-2xl font-bold mb-2 text-primary-light dark:text-primary-dark truncate pr-8"
						{title}
					>
						{title}
					</h2>
				{/if}
			</div>

			<!-- Modal body content -->
			<div class="flex-1 overflow-y-auto overflow-x-hidden px-4">
				{@render children?.()}
			</div>

			<!-- Modal footer -->
			<div
				class="px-6 py-3 rounded-b-lg border-t border-neutral-light dark:border-neutral-dark bg-surface-light dark:bg-surface-dark text-primary-light dark:text-primary-dark overflow-hidden"
			>
				{@render footer?.()}
			</div>
		</div>
	</div>
{/if}

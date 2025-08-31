<!-- ConfirmLogout.svelte -->
<script lang="ts">
	import Modal from '@yakkl/ui/src/components/Modal.svelte';

	interface Props {
		show: boolean;
		title?: string;
		message?: string;
		rejectText?: string;
		confirmText?: string;
		className?: string;
		onConfirm?: (dontShowAgain: boolean) => void;
		onCancel?: () => void;
	}

	let {
		show = $bindable(false),
		title = 'Confirm Logout',
		message = 'Are you sure you want to logout? This will lock your wallet and you will need to enter your password again.',
		rejectText = 'Cancel',
		confirmText = 'Logout',
		className = 'z-[999]',
		onConfirm = () => {},
		onCancel = () => {
			show = false;
		}
	}: Props = $props();

	let dontShowAgain = $state(false);

	function handleConfirm() {
		onConfirm(dontShowAgain);
		show = false;
	}

	function handleCancel() {
		onCancel();
		show = false;
	}
</script>

<Modal bind:show {title} {className}>
	<div class="p-6">
		<div class="flex items-center mb-4">
			<div class="flex-shrink-0">
				<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
				</svg>
			</div>
			<div class="ml-3">
				<p class="text-sm text-gray-600 dark:text-gray-300">{message}</p>
			</div>
		</div>

		<!-- Don't show again checkbox -->
		<div class="mb-4">
			<label class="flex items-center">
				<input 
					type="checkbox" 
					bind:checked={dontShowAgain}
					class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
				/>
				<span class="ml-2 text-sm text-gray-600 dark:text-gray-300">
					Don't show this confirmation next time
				</span>
			</label>
		</div>

		<div class="flex justify-end space-x-3">
			<button
				type="button"
				class="yakkl-btn-secondary"
				onclick={handleCancel}
			>
				{rejectText}
			</button>
			<button
				type="button"
				class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
				onclick={handleConfirm}
			>
				{confirmText}
			</button>
		</div>
	</div>
</Modal>
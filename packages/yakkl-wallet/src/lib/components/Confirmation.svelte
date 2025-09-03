<!-- Confirmation.svelte -->
<script lang="ts">
	import Modal from '@yakkl/ui/src/components/Modal.svelte';

	interface Props {
		show: boolean;
		title?: string;
		message?: string;
		rejectText?: string;
		confirmText?: string;
		className?: string;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let {
		show = $bindable(false),
		title = 'Confirm',
		message = 'Are you sure you want to continue?',
		rejectText = 'Cancel',
		confirmText = 'Confirm',
		className = 'z-[999]',
		onConfirm = () => {},
		onCancel = () => {
			show = false;
		}
	}: Props = $props();

	function handleConfirm() {
		onConfirm();
		show = false; // Ensure modal closes after confirm
	}

	function handleCancel() {
		onCancel();
		show = false; // Ensure modal closes after cancel
	}
</script>

<Modal bind:show {title} {className}>
	<div class="p-6">
		<p class="text-sm text-gray-500">{message}</p>
		<div class="mt-4 flex justify-end">
			<button
				type="button"
				class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
				onclick={handleCancel}>{rejectText}</button
			>
			<button
				type="button"
				class="ml-2 rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
				onclick={handleConfirm}>{confirmText}</button
			>
		</div>
	</div>
</Modal>

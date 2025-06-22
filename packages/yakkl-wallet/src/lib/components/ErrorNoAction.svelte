<script lang="ts">
	import Modal from './Modal.svelte';

	interface Props {
		show: boolean;
		value: string;
		title?: string;
		className?: string;
		onClose?: () => void;
	}

	// Destructure props correctly
	let {
		show = $bindable(false),
		title = 'ERROR!',
		value = 'An error occurred',
		className = 'z-[999]',
		onClose = $bindable(() => {
			show = false;
		})
	}: Props = $props();
</script>

<Modal bind:show {title} {className}>
	<div class="p-6">
		<p class="text-sm text-gray-500">{value}</p>
		<div class="mt-4 flex justify-end">
			<button
				type="button"
				class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
				onclick={onClose}>Close</button
			>
		</div>
	</div>
</Modal>

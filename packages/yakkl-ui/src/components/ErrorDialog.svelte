<script lang="ts">
	import Modal from './Modal.svelte';

	interface Props {
		show: boolean;
		title?: string;
		message: string;
		className?: string;
		onClose?: () => void;
	}

	let {
		show = $bindable(false),
		title = 'Error',
		message = 'An error occurred',
		className = '',
		onClose = () => {
			show = false;
		}
	}: Props = $props();
</script>

<Modal bind:show {title} className="z-[999] {className}">
	<div class="p-6">
		<div class="flex items-center mb-4">
			<svg class="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="text-gray-700 dark:text-gray-300">{message}</p>
		</div>
		<div class="flex justify-end">
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 
					   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
				onclick={onClose}
			>
				Close
			</button>
		</div>
	</div>
</Modal>
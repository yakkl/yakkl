<script lang="ts">
	import Modal from '@yakkl/ui/src/components/Modal.svelte';
	import { browser_ext } from '$lib/common/environment';

	interface Props {
		show: boolean;
		title?: string;
		message?: string;
		context?: 'sidepanel' | 'wallet' | 'popup';
		openWallet?: () => void;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let {
		show = $bindable(false),
		title = 'Registration Required',
		message = 'You need to register your YAKKL wallet before proceeding.',
		context = 'wallet',
		openWallet,
		onConfirm,
		onCancel
	}: Props = $props();

	function handleConfirm() {
		if (onConfirm) {
			onConfirm();
		} else if (context === 'sidepanel' && openWallet) {
			openWallet();
		} else if (context === 'sidepanel') {
			browser_ext.runtime.sendMessage({ type: 'popout' });
		}
		show = false;
	}

	function handleCancel() {
		if (onCancel) onCancel();
		show = false;
	}
</script>

<Modal bind:show {title} className="z-[700]">
	<div class="p-6 space-y-4">
		<p class="text-base">{message}</p>
		<p class="text-sm text-gray-600">
			{#if context === 'sidepanel'}
				Would you like to open the wallet to complete registration?
			{:else}
				Please complete the registration process to continue.
			{/if}
		</p>

		<div class="flex justify-end gap-4 mt-6">
			<button
				onclick={handleCancel}
				class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
			>
				Cancel
			</button>
			<button
				onclick={handleConfirm}
				class="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
			>
				{context === 'sidepanel' ? 'Open Wallet' : 'Continue'}
			</button>
		</div>
	</div>
</Modal>

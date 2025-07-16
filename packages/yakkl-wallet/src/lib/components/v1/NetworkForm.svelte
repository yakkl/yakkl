<script lang="ts">
	import { log } from '$lib/common/logger-wrapper';

	// NOTE: WIP - Adding a network form to the wallet

	const props = $props<{
		network?: any;
		onSave?: (network: any) => void;
		onCancel?: () => void;
	}>();

	let chainId = $state(props.network?.chainId || '');
	let name = $state(props.network?.name || '');
	let symbol = $state(props.network?.symbol || '');
	let decimals = $state(props.network?.decimals || 18);
	let blockchain = $state(props.network?.blockchain || '');
	let type = $state(props.network?.type || 'mainnet');
	let explorer = $state(props.network?.explorer || '');

	const isEdit = $derived(!!props.network);

	function handleSubmit() {
		try {
			const newNetwork = {
				chainId,
				name,
				symbol,
				decimals,
				blockchain,
				type,
				explorer
			};
			props.onSave?.(newNetwork);
		} catch (error) {
			log.error('Error saving network', false, error);
		}
	}
</script>

<div class="flex flex-col space-y-4">
	<div class="text-center">
		<h2 class="text-xl font-semibold">{isEdit ? 'Edit Network' : 'Add Network'}</h2>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-4"
	>
		<div class="space-y-2">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="block text-sm font-medium text-gray-700">Chain ID</label>
			<input
				type="text"
				bind:value={chainId}
				class="w-full px-3 py-2 border border-gray-300 rounded-md"
				required
			/>
		</div>

		<div class="space-y-2">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="block text-sm font-medium text-gray-700">Network Name</label>
			<input
				type="text"
				bind:value={name}
				class="w-full px-3 py-2 border border-gray-300 rounded-md"
				required
			/>
		</div>

		<div class="space-y-2">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="block text-sm font-medium text-gray-700">Symbol</label>
			<input
				type="text"
				bind:value={symbol}
				class="w-full px-3 py-2 border border-gray-300 rounded-md"
				required
			/>
		</div>

		<div class="space-y-2">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="block text-sm font-medium text-gray-700">Decimals</label>
			<input
				type="number"
				bind:value={decimals}
				class="w-full px-3 py-2 border border-gray-300 rounded-md"
				required
			/>
		</div>

		<div class="space-y-2">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="block text-sm font-medium text-gray-700">Blockchain</label>
			<input
				type="text"
				bind:value={blockchain}
				class="w-full px-3 py-2 border border-gray-300 rounded-md"
				required
			/>
		</div>

		<div class="space-y-2">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="block text-sm font-medium text-gray-700">Type</label>
			<select bind:value={type} class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
				<option value="mainnet">Mainnet</option>
				<option value="test">Testnet</option>
			</select>
		</div>

		<div class="space-y-2">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="block text-sm font-medium text-gray-700">Explorer URL</label>
			<input
				type="url"
				bind:value={explorer}
				class="w-full px-3 py-2 border border-gray-300 rounded-md"
				required
			/>
		</div>

		<div class="flex justify-end space-x-2">
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
				onclick={props.onCancel}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
			>
				{isEdit ? 'Save Changes' : 'Add Network'}
			</button>
		</div>
	</form>
</div>

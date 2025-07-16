<!-- Import.svelte -->
<script lang="ts">
	import ImportOption from './ImportOption.svelte';
	// import ImportPhrase from './ImportPhrase.svelte';
	// import ImportPrivateKey from './ImportPrivateKey.svelte';

	interface Props {
		show?: boolean;
		onCancel?: () => void;
		onComplete?: (imported: string) => void;
	}

	let {
		show = $bindable(false),
		onCancel = () => {
			show = false;
		},
		onComplete = (imported: string) => {
			show = false;
		}
	}: Props = $props();

	function handleImportComplete() {
		onComplete('Account imported successfully');
	}

	function handleImportCancel() {
		onCancel();
	}
</script>

<ImportOption
	bind:show
	onComplete={handleImportComplete}
	onCancel={handleImportCancel}
/>

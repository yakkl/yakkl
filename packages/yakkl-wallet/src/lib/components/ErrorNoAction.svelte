<script lang="ts">
	import ErrorDialog from '@yakkl/ui/src/components/ErrorDialog.svelte';

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
		className = '',
		onClose = $bindable(() => {
			show = false;
		})
	}: Props = $props();
</script>

<ErrorDialog 
	bind:show 
	{title}
	message={value}
	{className}
	{onClose}
/>

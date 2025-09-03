<script lang="ts">
	import FailureDialog from '@yakkl/ui/src/components/FailureDialog.svelte';

	interface Props {
		show: boolean;
		title?: string;
		content?: string;
		rejectText?: string;
		className?: string;
		onReject?: () => void;
	}

	let {
		show = $bindable(false),
		title = 'Failed!',
		content = 'An error has occurred.',
		rejectText = 'Close',
		className = '',
		onReject = () => {
			show = false;
		}
	}: Props = $props();
</script>

<FailureDialog 
	bind:show 
	{title} 
	message={content}
	buttonText={rejectText}
	{className}
	onClose={onReject}
/>

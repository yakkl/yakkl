<!-- WatchList.svelte - Legacy wrapper for new Watcher component -->
<script lang="ts">
	import Watcher from './Watcher.svelte';

	interface Props {
		show?: boolean;
		onClose?: () => void;
		onComplete?: () => void;
	}

	let {
		show = $bindable(false),
		onClose = () => (show = false),
		onComplete = () => {}
	}: Props = $props();
</script>

<!-- Use the new advanced Watcher component -->
<Watcher
	bind:show={show}
	onClose={onClose}
	onComplete={onComplete}
/>
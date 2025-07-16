<!-- File: src/routes/(sidepanel)/+layout@.svelte -->
<!-- This breaks out of parent layout hierarchy -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser_ext } from '$lib/common/environment';
	import { log } from '$lib/common/logger-wrapper';
	import { initializeUiContext } from '$lib/common/messaging';
	import TrialCountdown from '$lib/components/TrialCountdown.svelte';
	import { modal, modalName } from '$lib/common/stores/modal';
	import Upgrade from '$lib/components/Upgrade.svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	onMount(async () => {
		try {
			log.debug('+layout@.svelte (sidepanel level) - onMount');

			if (browser_ext) {
				// Initialize UI context but explicitly mark as sidepanel (non-protected)
				await initializeUiContext(browser_ext, 'sidepanel');
				log.info('Sidepanel initialized - no idle protection enabled');
			}
		} catch (error) {
			log.error('+layout@.svelte (sidepanel level) - onMount:', false, error);
		}
	});
</script>

<!-- Sidepanel layout - no idle management needed -->
<div class="w-full h-screen relative overflow-hidden">
	<!-- Fixed watermark logo in the background -->
	<div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
		<img src="/images/logoBullFav128x128.png" class="w-44 h-44 opacity-10 dark:opacity-15" alt="logo" />
	</div>

	<!-- Main content -->
	<main class="relative z-10 w-full h-full">
		{@render children?.()}
	</main>
</div>

<TrialCountdown />
<Upgrade
	show={$modal && $modalName === 'upgrade'}
	onClose={() => {
		// Always close modal when upgrade closes
		modal.set(false);
		modalName.set(null);
		// Force state reset with a small delay
		setTimeout(() => {
			modal.set(false);
			modalName.set(null);
		}, 10);
	}}
	onCancel={() => {
		// Always close modal when upgrade cancels
		modal.set(false);
		modalName.set(null);
		// Force state reset with a small delay
		setTimeout(() => {
			modal.set(false);
			modalName.set(null);
		}, 10);
	}}
/>

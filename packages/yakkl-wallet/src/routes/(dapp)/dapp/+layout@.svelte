<script lang="ts">
	import { blockContextMenu, blockWindowResize } from '$lib/utilities';
	import { DEFAULT_POPUP_WIDTH, DEFAULT_POPUP_HEIGHT } from '$lib/common';
	import { browserSvelte } from '$lib/common/environment';
	import SecurityWarningEnhanced from '$lib/components/SecurityWarningEnhanced.svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

  if (typeof window !== 'undefined') {
	if (!process.env.DEV_MODE) {
		if (browserSvelte) {
			blockContextMenu(); // Could setup svelte:body like below with svelte if statement
			blockWindowResize(DEFAULT_POPUP_WIDTH, DEFAULT_POPUP_HEIGHT);
		}
	} else {
		if (browserSvelte) {
			blockWindowResize(DEFAULT_POPUP_WIDTH, DEFAULT_POPUP_HEIGHT);
		}
	}
  }
</script>

<SecurityWarningEnhanced />

<div
	class="print:hidden bg-base-100 m-2 rounded-xl border border-gray-900 overflow-scroll justify-center flex"
>
	{@render children?.()}
</div>

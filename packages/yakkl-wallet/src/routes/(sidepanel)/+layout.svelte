<!-- File: src/routes/(sidepanel)/+layout.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { browserSvelte, browser_ext } from "$lib/common/environment";
  import { log } from '$lib/common/logger-wrapper';
  import { initializeUiContext } from '$lib/common/messaging';
	import TrialCountdown from "$lib/components/TrialCountdown.svelte";
	import { modal, modalName } from "$lib/common/stores/modal";
	import Upgrade from "$lib/components/Upgrade.svelte";

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  onMount(async () => {
    try {
      log.debug('+layout.svelte (sidepanel level) - onMount');

      if (browser_ext) {
        // Initialize UI context but explicitly mark as sidepanel (non-protected)
        await initializeUiContext(browser_ext, 'sidepanel');
        log.info('Sidepanel initialized - no idle protection enabled');
      }
    } catch (error) {
      log.error('+layout.svelte (sidepanel level) - onMount:', false, error);
    }
  });
</script>

<!-- Sidepanel layout - no idle management needed -->
<main class="w-full h-screen">
  {@render children?.()}
</main>

<TrialCountdown />
<Upgrade show={$modal && $modalName === 'upgrade'} />

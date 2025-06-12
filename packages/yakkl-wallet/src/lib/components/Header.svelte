<script lang="ts">
  import { onMount } from 'svelte';
  import { identicon } from '$lib/utilities';
  import { getYakklCurrentlySelected } from '$lib/common/stores';
  import { safeLogout } from '$lib/common/safeNavigate';
  import { ExtensionContext } from '$lib/common/shared/BrowserAccessor';
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { BrowserAccessor } from '$lib/common/shared/BrowserAccessor';
  import Share from '$lib/components/Share.svelte';
  import ImageBar from '$lib/components/ImageBar.svelte';
  import PlanBadge from '$lib/components/PlanBadge.svelte';
	import OffcanvasMainMenu from './OffcanvasMainMenu.svelte';
	import GraduationCapButton from './icons/GraduationCapButton.svelte';
  import { log } from '$lib/plugins/Logger';
	import SimpleTooltip from './SimpleTooltip.svelte';
	import OffcanvasProfileMenu from './OffcanvasProfileMenu.svelte';
	import Avatar from './Avatar.svelte';

  let browserContext: ExtensionContext;
  let address = '';
  let imageSRC = '';
  let browserAccessor = BrowserAccessor.getInstance();

  onMount(async () => {
    try {
      browserContext = await browserAccessor.getContext();
      const current = await getYakklCurrentlySelected();
      address = current.shortcuts.address;
      imageSRC = identicon(address || 'default');
    } catch(e) {
      log.warn(e);
    }
  });

  function handlePopout() {
    if (browserSvelte) {
      browser_ext.runtime.sendMessage({ type: 'popout' });
      safeLogout();
    }
  }

</script>

<ImageBar>
  <nav class="grid grid-cols-[1fr,2fr,1fr] items-center w-full py-2 px-2 gap-0">
    <!-- Left Icon -->
    <div class="flex items-center justify-start gap-4">
      <SimpleTooltip content="Open the main menu" position="right">
        <a data-bs-toggle="offcanvas" href="#offcanvasMainMenu" aria-controls="offcanvasMainMenu" role="button" aria-label="Menu">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-7 h-7 fill-gray-100 hover:fill-gray-400">
            <path fill-rule="evenodd" d="M3 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.25zm0 4.5A.75.75 0 013.75 9h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 9.75zm0 4.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
          </svg>
        </a>
      </SimpleTooltip>
      <SimpleTooltip content="YAKKL University" position="bottom">
        <GraduationCapButton />
      </SimpleTooltip>
    </div>

    <!-- Center Badge -->
    <div class="flex items-center justify-center">
      <PlanBadge />
    </div>

    <!-- Right Icons -->
    <div class="flex items-center justify-end gap-4">
      <Share />
      {#if browserContext === ExtensionContext.SIDEPANEL}
        <button onclick={handlePopout} aria-label="Popout">
          <!-- popout icon -->
        </button>
      {:else}
        <SimpleTooltip content="Open the profile menu" position="bottom">
          <a data-bs-toggle="offcanvas" href="#offcanvasProfileMenu" aria-controls="offcanvasProfileMenu" role="button" aria-label="Menu">
            <Avatar url={imageSRC} ariaLabel="Profile" className="w-8 h-8 rounded-full ring-2 ring-offset-1" />
          </a>
        </SimpleTooltip>
      {/if}
    </div>
  </nav>
</ImageBar>

<OffcanvasMainMenu />

<OffcanvasProfileMenu />

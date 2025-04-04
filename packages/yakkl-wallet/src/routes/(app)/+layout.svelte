<script lang="ts">
	import { onMount } from "svelte";
  import { sessionInitialized } from "$lib/common/stores";
  import { DEFAULT_POPUP_HEIGHT, DEFAULT_TITLE, DEFAULT_POPUP_WIDTH, PATH_LOGIN, PATH_REGISTER, PATH_LEGAL, PATH_LOCK, PATH_LOGOUT } from '$lib/common';
  import Header from '$components/Header.svelte';
  import Footer from '$components/Footer.svelte';
  import { blockContextMenu, blockWindowResize } from '$lib/utilities';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import { browserSvelte } from "$lib/common/environment";
  import { log } from '$plugins/Logger';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const EXCLUDED_PATHS = [PATH_LOGIN, PATH_REGISTER, PATH_LEGAL, PATH_LOCK, PATH_LOGOUT, '/', '/index.html'];

  // UI State
  let popupWidth: number = $state(DEFAULT_POPUP_WIDTH);
  let popupHeight: number = DEFAULT_POPUP_HEIGHT;
  let title: string = $state(DEFAULT_TITLE);
  let contextMenu: boolean = $state(false);
  let resize: boolean = $state(false);
  let error: boolean = $state(false);
  let errorValue: string = $state('');
  let maxHeightClass: string = $state('max-h-[448px]');

  // Effect: Handle Internet Connection Status
  $effect(() => {
    if (browserSvelte && !navigator.onLine) {
      log.warn('Internet connection is offline');
      errorValue = 'It appears your Internet connection is offline. YAKKL needs access to the Internet to obtain current market prices and gas fees. A number of areas will either not function or work in a limited capacity. Thank you!';
      error = true;
    } else {
      error = false;
    }
  });

  // Effect: Manage Debug Mode and Blocking Features
  $effect(() => {
    if (process.env.DEV_MODE) {
      contextMenu = true;
      resize = true;
    }

    if (!contextMenu) blockContextMenu();
    if (!resize) blockWindowResize(popupWidth, popupHeight);
  });

  onMount(async () => {
    // Reset session initialization state when app first loads
    sessionInitialized.set(false);
  });

</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<ErrorNoAction bind:show={error} title="Error" value={errorValue} />

<div id="wrapper" class="w-[{popupWidth}px] rounded-lg flex flex-col">
  <Header containerWidth={popupWidth} />

  <div class="min-h-[40rem] mx-2">
    <div class="relative mt-1">
      <main class="p-2 {maxHeightClass} rounded-xl bg-base-100 overflow-scroll border-2 border-stone-700 border-r-stone-700/75 border-b-slate-700/75">
        {@render children?.()}
      </main>
    </div>
  </div>

  <Footer containerWidth={popupWidth.toString()} />
</div>


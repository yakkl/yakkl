<script lang="ts">
  import { onMount } from 'svelte';
	import { initializeBrowserAPI } from '$lib/browser-polyfill-wrapper';
  import '../app.css';

  let { children } = $props();

  onMount(async () => {
    initializeBrowserAPI();
  });
</script>

{@render children?.()}

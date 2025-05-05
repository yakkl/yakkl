<script lang="ts">
  import { onMount } from 'svelte';
	import { initializeBrowserAPI } from '$lib/browser-polyfill-wrapper';
  import '../app.css';
	import { browser_ext } from '$lib/common/environment';
	import { sessionToken, sessionExpiresAt, storeSessionToken } from '$lib/common/auth/session';

	import { get } from 'svelte/store';
	import { log } from '$lib/plugins/Logger';

  let { children } = $props();

  onMount(async () => {
    browser_ext.runtime.onMessage.addListener((message: any): any => {
      if (message?.type === 'SESSION_TOKEN_BROADCAST') {
        storeSessionToken(message.token, message.expiresAt);
        log.info('[Layout] Session token set:', false, {sessionToken, sessionExpiresAt}, get(sessionToken), get(sessionExpiresAt));
      }
      return false;
    });
    initializeBrowserAPI();
  });
</script>

{@render children?.()}

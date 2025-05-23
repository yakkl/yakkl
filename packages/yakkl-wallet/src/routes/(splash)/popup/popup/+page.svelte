<script lang="ts">
  import { browser_ext } from '$lib/common/environment';
  import { onDestroy, onMount } from 'svelte';
  import { YAKKL_SPLASH, NUM_OF_SPLASH_IMAGES } from '$lib/common/constants';
  import { wait } from '$lib/common/utils';
  import { log } from '$lib/common/logger-wrapper';
  import type { Runtime } from 'webextension-polyfill';

  type RuntimePort = Runtime.Port;

  let port: RuntimePort;
  let isPortDisconnected = false;

  onMount(async () => {
    try {

      log.info("YAKKL: Splash: Attempting to connect to background script...");

      if (!browser_ext) {
        log.warn("Browser extension API is unavailable.");
        return;
      }

      port = browser_ext.runtime.connect({name: YAKKL_SPLASH});
      if (port) {
        log.debug("YAKKL: Splash: Port connected.");

        isPortDisconnected = false;

        port.onMessage.addListener((m: any) => {
          if (m.popup === "YAKKL: Launched") {
            window.close(); // Close this splash window
          }
        });

        port.onDisconnect.addListener(() => {
          isPortDisconnected = true;
          log.info("Port has been disconnected.");
        });
      } else {
        log.info("YAKKL: Splash: Port is trying again in 2 seconds...");
        await wait(2000);

        port = browser_ext.runtime.connect({name: YAKKL_SPLASH});
        if (port) {
          port.onMessage.addListener((m: any) => {
            if (m.popup === "YAKKL: Launched") {
              port.disconnect();
              window.close();
            }
          });

          port.onDisconnect.addListener(() => {
            isPortDisconnected = true;
            log.info("Port has been disconnected.");
          });
        } else {
          browser_ext.runtime.reload();
        }
      }

      browser_ext.alarms.create('yakkl-splash-alarm', { when: Date.now() + 2000 });
      browser_ext.alarms.onAlarm.addListener((m: any) => {
        if (port && !isPortDisconnected) port.postMessage({ popup: "YAKKL: Splash" });
      });
    } catch (e) {
      log.error(e);
    }
  });

  onDestroy(() => {
    try {
      if (port) {
        port.disconnect();
      }
    } catch (e) {
      log.error(e);
    }
  });

  function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }
</script>

<img src="/images/splash_{getRandomInt(NUM_OF_SPLASH_IMAGES)}.png" alt="Splash page with logo">

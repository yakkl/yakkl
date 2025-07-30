<!-- // In popup/+page.svelte
<script lang="ts">
  import { browser_ext } from '$lib/common/environment';
  import { onDestroy, onMount } from 'svelte';
  import { YAKKL_SPLASH, NUM_OF_SPLASH_IMAGES } from '$lib/common/constants';
  import { wait } from '$lib/common/utils';
  import { log } from '$lib/common/logger-wrapper';
  import type { Runtime } from '$lib/types/browser-types';

  type RuntimePort = Runtime.Port;

  let port: RuntimePort | null = null;
  let isPortDisconnected = true;
  let connectionAttempts = 0;
  const MAX_ATTEMPTS = 3;
  let errorMessage = '';

  async function attemptConnection() {
    if (!browser_ext) {
      errorMessage = "Browser extension API is unavailable.";
      log.warn(errorMessage);
      return false;
    }

    try {
      connectionAttempts++;
      log.info(`Attempting connection (${connectionAttempts}/${MAX_ATTEMPTS})...`);

      port = browser_ext.runtime.connect({name: YAKKL_SPLASH});

      if (port) {
        isPortDisconnected = false;

        port.onMessage.addListener((m: any) => {
          if (m.popup === "YAKKL: Launched") {
            window.close(); // Close this splash window
          }
        });

        port.onDisconnect.addListener(() => {
          const error = browser_ext?.runtime.lastError;
          isPortDisconnected = true;
          log.info("Port disconnected:", false, error?.message);
          // Don't retry here - this is normal disconnection
        });

        return true;
      }
    } catch (error) {
      log.error("Connection error:", false, error);
      errorMessage = "Failed to establish connection to background script.";
    }

    return false;
  }

  onMount(async () => {
    try {
      // First attempt
      let connected = await attemptConnection();

      // Retry logic
      while (!connected && connectionAttempts < MAX_ATTEMPTS) {
        log.info(`Connection failed, retrying in ${connectionAttempts * 1000}ms...`);
        await wait(connectionAttempts * 1000); // Increasing backoff
        connected = await attemptConnection();
      }

      // If still not connected after max attempts
      if (!connected) {
        log.error(`Failed to connect after ${MAX_ATTEMPTS} attempts`);
        errorMessage = `Failed to connect after ${MAX_ATTEMPTS} attempts. Try reloading the extension.`;
        return;
      }

      // Set up alarm only if connected
      browser_ext?.alarms.create('yakkl-splash-alarm', { when: Date.now() + 2000 });
      browser_ext?.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'yakkl-splash-alarm' && port && !isPortDisconnected) {
          try {
            port.postMessage({ popup: "YAKKL: Splash" });
          } catch (e) {
            log.error("Error posting message:", false, e);
          }
        }
      });
    } catch (e) {
      log.error("Splash initialization error:", false, e);
      errorMessage = "Failed to initialize splash screen.";
    }
  });

  onDestroy(() => {
    try {
      if (port && !isPortDisconnected) {
        port.disconnect();
      }
      browser_ext?.alarms.clear('yakkl-splash-alarm');
    } catch (e) {
      log.error("Cleanup error:", false, e);
    }
  });

  function getRandomInt(max: number) {
    return Math.floor(Math.random() * max);
  }
</script>

<div class="splash-container">
  <img src="/images/splash_{getRandomInt(NUM_OF_SPLASH_IMAGES)}.png" alt="Splash page with logo">

  {#if errorMessage}
    <div class="error-message">
      {errorMessage}
    </div>
  {/if}
</div>

<style>
  .splash-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .error-message {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: rgba(255, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-size: 12px;
  }
</style> -->

<script lang="ts">
	import { browser_ext } from '$lib/common/environment';
	import { onDestroy, onMount } from 'svelte';
	import { YAKKL_SPLASH, NUM_OF_SPLASH_IMAGES } from '$lib/common/constants';
	import { wait } from '$lib/common/utils';
	import { log } from '$lib/common/logger-wrapper';
	import type { Runtime } from 'webextension-polyfill';

	// type RuntimePort = Runtime.Port;

	let port: Runtime.Port;
	let isPortDisconnected = false;

	onMount(async () => {
		try {
			log.info('YAKKL: Splash: Attempting to connect to background script...');

			if (!browser_ext) {
				log.warn('Browser extension API is unavailable.');
				return;
			}

			port = browser_ext.runtime.connect({ name: YAKKL_SPLASH });
			if (port) {
				log.debug('YAKKL: Splash: Port connected.');

				isPortDisconnected = false;

				port.onMessage.addListener((m: any) => {
					if (m.popup === 'YAKKL: Launched') {
						window.close(); // Close this splash window
					}
				});

				port.onDisconnect.addListener(() => {
					isPortDisconnected = true;
					log.info('Port has been disconnected.');
				});
			} else {
				log.info('YAKKL: Splash: Port is trying again in 2 seconds...');
				await wait(2000);

				port = browser_ext.runtime.connect({ name: YAKKL_SPLASH });
				if (port) {
					port.onMessage.addListener((m: any) => {
						if (m.popup === 'YAKKL: Launched') {
							port.disconnect();
							window.close();
						}
					});

					port.onDisconnect.addListener(() => {
						isPortDisconnected = true;
						log.info('Port has been disconnected.');
					});
				} else {
					browser_ext.runtime.reload();
				}
			}

			browser_ext.alarms.create('yakkl-splash-alarm', { when: Date.now() + 2000 });
			browser_ext.alarms.onAlarm.addListener((m: any) => {
				if (port && !isPortDisconnected) port.postMessage({ popup: 'YAKKL: Splash' });
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

<img src="/images/splash_{getRandomInt(NUM_OF_SPLASH_IMAGES)}.png" alt="Splash page with logo" />

<!-- <script lang="ts">
  import { browserSvelte, browser_ext } from '$lib/common/environment';
  import {onDestroy, onMount} from 'svelte';
  import { YAKKL_SPLASH, NUM_OF_SPLASH_IMAGES } from '$lib/common/constants';
	import { wait } from '$lib/common/utils';
  import { log } from '$lib/common/logger-wrapper';

  // Splash size should be maximum default browser extension size.
  // Note: May want to look into providing a communications window for the user to see what is going on if we need to provide them with an important message.
  import type { Runtime } from '$lib/types/browser-types';

  type RuntimePort = Runtime.Port;

  let port: RuntimePort;
  let isPortDisconnected = false;

  onMount(async () => {
    try {
      if (browserSvelte) {
        port = browser_ext.runtime.connect({name: YAKKL_SPLASH});
        if (port) {
          isPortDisconnected = false; // Mark port as connected ??

          port.onMessage.addListener((m: any) => {
            if (m.popup === "YAKKL: Launched") {
              window.close(); // Close this splash window
            }
          });

          port.onDisconnect.addListener(() => {
            isPortDisconnected = true; // Mark port as disconnected
            log.info("Port has been disconnected.");
          });
        } else {
          log.info("YAKKL: Splash: Port is trying again in 2 seconds...");
          await wait(2000);

          // Try one more time
          port = browser_ext.runtime.connect({name: YAKKL_SPLASH});
          if (port) {
            port.onMessage.addListener((m: any) => {
              if (m.popup === "YAKKL: Launched") {
                port.disconnect();
                window.close(); // Close this splash window
              }
            });

            port.onDisconnect.addListener(() => {
              isPortDisconnected = true; // Mark port as disconnected
              log.info("Port has been disconnected.");
            });
          } else {
            browser_ext.runtime.reload(); // Reload the extension. This will exit it and apply any pending updates.
          }
        }

        browser_ext.alarms.create('yakkl-splash-alarm', {when: Date.now() + 2000}); // Change this number to reflect how much time we want the user to see the splash screen
        browser_ext.alarms.onAlarm.addListener((m: any) => {
          if (port && !isPortDisconnected) port.postMessage({popup: "YAKKL: Splash"}); // Fire when the timer ends - goes to the background.ts
        });
      }
    } catch (e) {
      log.error(e);
    }
  });


  onDestroy( () => {
    try {
      if (browserSvelte) {
        browser_ext.alarms.clearAll();
        isPortDisconnected = true;
        if (port) {
          port.disconnect();
        }
      }
    } catch (e) {
      log.error(e);
    }
  });


  function getRandomInt(max: number) {
    try {
      return Math.floor(Math.random() * max);
    } catch (e) {
      return 0;
    }
  }

</script>

<img src="/images/splash_{getRandomInt(NUM_OF_SPLASH_IMAGES)}.png" alt="Splash page with logo">
 -->

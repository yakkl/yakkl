import { log } from "$lib/managers/Logger";

// This script runs in a restricted environment
window.addEventListener("message", (event) => {
    if (event.origin !== (process.env.DEV_MODE ? import.meta.env.VITE_CHROME_DEV_ID : import.meta.env.VITE_CHROME_PROD_ID)) {
      log.info("<><><><> Sandbox - YAKKL event ignored:", event.data, event);
      return;
    }
    log.info("<><><><> Sandbox - Third party event received:", event.data, event);
});

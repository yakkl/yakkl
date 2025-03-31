// export const ssr = false;

import { log } from '$plugins/Logger';
import { cleanup, initializeUIConnection } from '$lib/common/stores/connectionStore';
import { get } from 'svelte/store';
import { activeTabUIStore } from '$lib/common/stores';
import type { GetActiveTabResponse } from '$lib/common/interfaces';
import { isServerSide } from '$lib/common/utils';
import { getBrowserExt } from '$lib/browser-polyfill-wrapper';
import { getObjectFromLocalStorage } from '$lib/common/storage';


export async function load() {
  if (isServerSide()) {
    log.info("+layout.ts is running in SSR, skipping browser_ext usage.");
    return {}; // Prevents execution during SSR
  }

  try {
    log.debug('/+layout.ts - Initializing UI connection...');

    await initializeUIConnection();
    const activeTab = get(activeTabUIStore);
    if (!activeTab) {
      const ext = getBrowserExt();
      if (ext) {
        try {
          const response = await ext.runtime.sendMessage({ type: 'getActiveTab' }) as GetActiveTabResponse;
          if (response?.activeTab) {
            activeTabUIStore.set(response.activeTab);
          } else {
            log.debug('No active tab found, getting from local storage:', false, await getObjectFromLocalStorage('activeTabBackground'));
          }
          log.debug('Active tab:', false, activeTab, response, activeTabUIStore);
        } catch (error) {
          log.error("Failed to initialize UI connection:", false, error);
        }
      } else {
        log.warn("browser_ext is not available.");
      }
    }
  } catch (error) {
    log.error('Failed to initialize UI connection:', false, error);
  }

  return {
    destroy() {
      cleanup();
    }
  };

  // Monitor if below is needed any longer...
  // export const load: Load = async ({ parent }) => {
  //   log.info("App layout.ts: Waiting for parent...");
  //   const parentData = await parent();

  //   return { ...parentData }; // Merges parent data with this layout's data
  // };
}

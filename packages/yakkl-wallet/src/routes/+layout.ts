// Top-level +layout.ts
export const prerender = true; // Must be here to create files. Do NOT use ssr = false because this will keep routes from working well

import { YAKKL_INTERNAL } from '$lib/common/constants';
import { isServerSide, wait } from '$lib/common/utils';
import type { Runtime } from 'webextension-polyfill';
import { handleLockDown } from '$lib/common/handlers';
import { log } from '$plugins/Logger';
import { initializeBrowserAPI } from '$lib/browser-polyfill-wrapper';
// Import but don't use at module level
import { browser_ext, isClient } from '$lib/common/environment';

let port: Runtime.Port | undefined;

// Function to connect port - will only run in browser context during load
async function connectPort(): Promise<boolean> {
  if (!browser_ext) {
    return false;
  }

  try {
    port = browser_ext.runtime.connect({ name: YAKKL_INTERNAL });
    if (port) {
      port.onDisconnect.addListener(async (event) => {
        handleLockDown();
        port = undefined;
        if (event?.error) {
          log.error("Port disconnect:", false, event.error?.message);
        }
      });
      return true;
    }
  } catch (error) {
    log.error('Port connection failed:', false, error);
  }
  return false;
}

// This function will only be called during load, not during SSR
async function initializeExtension() {
  try {
    let connected = await connectPort();
    if (!connected) {
      log.info('Port connection failed, retrying in 1 second...');
      await wait(1000);
      connected = await connectPort();
    }
  } catch (error) {
    log.error('Extension initialization failed:', false, error);
  }
}

// Move the initialization to the load function to prevent SSR issues
export const load = async () => {
  // Skip extension initialization during SSR
  if (isServerSide()) {
    return {};
  }

  try {
    // Initialize the browser API
    const browser = initializeBrowserAPI();
    // Only proceed with extension initialization if we have a browser API
    if (browser) {
      await initializeExtension();
    }
  } catch (error) {
    log.error("Error initializing extension:", false, error);
  }
  return {};
};


// Helper for layout port connection to avoid webextension-polyfill import
// This prevents module resolution errors in the browser context

import { YAKKL_INTERNAL } from '$lib/common/constants';
import { handleLockDown } from '$lib/common/handlers';
import { log } from '$lib/common/logger-wrapper';
import { browser_ext } from '$lib/common/environment';
import type { RuntimePort } from '$contexts/background/extensions/chrome/background';

/**
 * Connect to the background script port
 * Returns the port or undefined if connection fails
 */
export async function connectLayoutPort(): Promise<RuntimePort | undefined> {
  if (!browser_ext) {
    return undefined;
  }

  // Temporarily suppress console errors from browser-polyfill
  const originalConsoleError = console.error;
  let errorSuppressed = false;

  console.error = (...args: any[]) => {
    // Check if this is the specific error we want to suppress
    const errorStr = args.join(' ');
    if (errorStr.includes('Could not establish connection') ||
        errorStr.includes('Receiving end does not exist')) {
      errorSuppressed = true;
      return; // Suppress this specific error
    }
    // Let other errors through
    originalConsoleError.apply(console, args);
  };

  try {
    const port = browser_ext.runtime.connect({ name: YAKKL_INTERNAL }) as RuntimePort;

    // Restore console.error
    console.error = originalConsoleError;

    if (port) {
      port.onDisconnect.addListener(async (event: RuntimePort) => {
        handleLockDown();
        if (event?.error) {
          log.error('Port disconnect:', false, event.error?.message);
        }
      });
      return port;
    }
  } catch (error) {
    // Restore console.error
    console.error = originalConsoleError;

    // Silently handle the connection error if it's the "Receiving end does not exist" error
    // This can happen during extension reload or when background script isn't ready yet
    if (error instanceof Error && error.message?.includes('Receiving end does not exist')) {
      log.debug('Background script not ready yet, port connection will be retried');
    } else if (!errorSuppressed) {
      log.error('Port connection failed:', false, error);
    }
  }
  return undefined;
}

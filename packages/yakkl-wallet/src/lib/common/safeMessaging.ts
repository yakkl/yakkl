// Safe messaging utility to suppress "Receiving end does not exist" errors
import { log } from '$lib/common/logger-wrapper';
import { browser_ext } from '$lib/common/environment';
import browser from '$lib/browser-polyfill-wrapper';

export async function sendToExtensionUI(message: any): Promise<void> {
  try {
    if (!browser_ext) {
      if (browser.runtime.lastError) {
        log.warn('Browser runtime last error', false, browser.runtime.lastError);
        return;
      }
      await browser.runtime.sendMessage(message);
    } else {
      if (browser_ext.runtime.lastError) {
        log.warn('Browser runtime last error', false, browser_ext.runtime.lastError);
        return;
      }
      await browser_ext.runtime.sendMessage(message);
    }
  } catch (error: any) {
    // Suppress "Receiving end does not exist" errors
    if (error?.message?.includes('Receiving end does not exist')) {
      log.debug('Extension UI not available', false, { message: message.type });
    } else {
      log.error('Failed to send message to extension UI', false, error);
    }
  }
}

export async function safeTabsSendMessage(tabId: number, message: any): Promise<void> {
  try {
    if (!browser_ext) {
      log.warn('Browser tabs API not available');
      return;
    }

    if (!browser_ext?.tabs?.sendMessage) {
      log.warn('Browser tabs API not available');
      return;
    }

    await browser_ext.tabs.sendMessage(tabId, message);
  } catch (error: any) {
    // Suppress "Receiving end does not exist" errors
    if (error?.message?.includes('Receiving end does not exist')) {
      log.debug('Tab not available', false, { tabId, message: message.type });
    } else {
      log.error('Failed to send message to tab', false, { tabId, error });
    }
  }
}

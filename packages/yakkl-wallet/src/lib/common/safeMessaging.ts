// Safe messaging utility to suppress "Receiving end does not exist" errors
import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';

/**
 * Safely send a message from background context with error suppression
 * This is used when the background needs to notify UI components that may or may not exist
 */
export async function safeSendMessage(message: any): Promise<void> {
  try {
    // Try to send to all tabs and extension pages
    const tabs = await browser.tabs.query({});
    
    // Send to each tab's content script if it exists
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, message).catch(() => {
          // Silently ignore - tab might not have content script
        });
      }
    }
    
    // Also try runtime.sendMessage for extension pages (popup, options, etc)
    // but suppress the error since they might not exist
    browser.runtime.sendMessage(message).catch(() => {
      // Expected error when no receivers exist - suppress it
    });
  } catch (error) {
    // Log only if it's not the expected "no receiver" error
    if (error instanceof Error && !error.message.includes('Receiving end does not exist')) {
      log.debug('Error in safeSendMessage:', false, error);
    }
  }
}

/**
 * Send a message only to extension UI contexts (not content scripts)
 */
export async function sendToExtensionUI(message: any): Promise<void> {
  try {
    // This will only reach extension pages like popup, options, sidepanel
    await browser.runtime.sendMessage(message);
  } catch (error) {
    // Suppress "Receiving end does not exist" errors
    if (error instanceof Error && !error.message.includes('Receiving end does not exist')) {
      log.debug('Error sending to extension UI:', false, error);
    }
  }
}

/**
 * Wrap a sendMessage call to suppress common errors
 */
export function suppressMessageError(promise: Promise<any>): Promise<any> {
  return promise.catch((error): any => {
    // Only log if it's not a "no receiver" error
    if (error instanceof Error && !error.message.includes('Receiving end does not exist')) {
      log.debug('Message send error:', false, error);
    }
    return null;
  });
}
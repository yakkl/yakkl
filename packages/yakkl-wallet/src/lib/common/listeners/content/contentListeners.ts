// listeners/contentListeners.ts
import { ListenerManager } from '$lib/plugins/ListenerManager';
import browser from 'webextension-polyfill';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { log } from '$lib/plugins/Logger';

// NOTE: Only for background

const browser_ext = browser;

export const contentListenerManager = new ListenerManager();

// Register contentListenerManager globally
globalListenerManager.registerContext('content', contentListenerManager);

function handleMessageFromDapp(message: any, sender: any, sendResponse: any) {
  log.info('Message from dapp:', message);
}

export function addContentListeners() {
  // log.info('Adding content listeners...');
  contentListenerManager.add(browser_ext.runtime.onMessage, handleMessageFromDapp);
}

export function removeContentListeners() {
  // log.info('Removing content listeners...');
  contentListenerManager.removeAll();
}

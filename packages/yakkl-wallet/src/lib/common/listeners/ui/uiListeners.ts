// listeners/uiListeners.ts
import { ListenerManager } from '$lib/plugins/ListenerManager';
import { browser_ext, isBrowserEnv } from '$lib/common/environment'; // UI context only
import type { Runtime } from 'webextension-polyfill';  // Correct Type Import
import { goto } from '$app/navigation';
import { startCheckPrices, stopCheckPrices } from '$lib/tokens/prices';
import { PATH_LOGOUT } from '$lib/common/constants';
import { handleLockDown } from '$lib/common/handlers';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { log } from '$plugins/Logger';
import { NotificationService } from '$lib/common/notifications';
import { activeTabUIStore } from '$lib/common/stores';

export const uiListenerManager = new ListenerManager();

// Register uiListenerManager globally
globalListenerManager.registerContext('ui', uiListenerManager);

export async function handleOnActiveTabUIChanged(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<boolean | void>  {
  try {
    log.debug('handleOnActiveTabUIChanged:', false, message);

    switch(message.type) {
      case 'setActiveTab': {
        try {
          activeTabUIStore.set(message.activeTab);
          log.debug('<<<<<<<<<<<<<< Active tabs UI:', false, message.activeTab);
          sendResponse({ success: true }); // GetActiveTabResponse format
        } catch (error) {
          log.error('Error on active tab change:', true, error);
          sendResponse({ success: false, error: error });
        }
        return true; // Keep this line to signal async sendResponse
      }
    }
  } catch (error: any) {
    log.error('Error handling setActiveTab message:', true, error);
    if (isBrowserEnv()) sendResponse({ success: false, error: error?.message || 'Unknown error occurred.' });
    return true; // Indicate asynchronous response
  }
}

// Centralized message handler function - This is only a fallback from the old way of doing things but will continue to work
export async function handleOnMessageForExtension(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<boolean | void>  {
  try {
    if (!browser_ext) return true;

    switch(message.type) {
      case 'lockdown': {
        await browser_ext.runtime.sendMessage({type: 'stopPricingChecks'});
        await handleLockDown();  // Correct function call
        sendResponse({ success: true, message: 'Lockdown initiated.' });
        await NotificationService.sendSecurityAlert('YAKKL Wallet locked due to inactivity. \nTo prevent unauthorized transactions, your wallet has been locked and logged out.', {contextMessage: 'Click extension icon to relaunch'});
        goto(PATH_LOGOUT);
        return true;  // return type - asynchronous
      }
      case 'lockdownImminent': {
        sendResponse({ success: true, message: 'Imminent lockdown notification sent.' });
        await NotificationService.sendSecurityAlert('YAKKL Lockdown Imminent. \nFor your protection, YAKKL will be locked soon.', {contextMessage: 'Use YAKKL before timeout to stop lockdown'});
        return true;  // return type - asynchronous
      }
      default: {
        sendResponse({ success: false, message: 'Unhandled message type' });
        return true;
      }
    }

  } catch (e: any) {
    log.error('Error handling message:', e);
    if (isBrowserEnv()) sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
    return true; // Indicate asynchronous response
  }
}

// Message handler for starting and stopping price checks. This is primarily sent by active, idle, locked states.
export async function handleOnMessageForPricing(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<boolean | void>  {
  if (!browser_ext) return true;
  try {
    switch(message.type) {
      case 'startPricingChecks': {
        startCheckPrices();
        sendResponse({ success: true, message: 'Price checks initiated.' });
        return true;  // return type - asynchronous
      }
      case 'stopPricingChecks': {
        stopCheckPrices();
        sendResponse({ success: true, message: 'Stop price checks initiated.' });
        return true;  // return type - asynchronous
      }
    }
  } catch (e: any) {
    log.error('Error handling message:', e);
    if (isBrowserEnv()) sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
    return true; // Indicate asynchronous response
  }
}

// function handleButtonClick(event: Event) {
//   log.info('Button clicked:', event.target);
// }

// function handlePopupMessage(message: any, sender: any, sendResponse: any) {
//   log.info('Popup message received:', message);
// }

export function addUIListeners() {
  if (!browser_ext) return;
  uiListenerManager.add(browser_ext.runtime.onMessage, handleOnActiveTabUIChanged);
  uiListenerManager.add(browser_ext.runtime.onMessage, handleOnMessageForExtension);
  uiListenerManager.add(browser_ext.runtime.onMessage, handleOnMessageForPricing);
}

export function removeUIListeners() {
  uiListenerManager.removeAll();
}

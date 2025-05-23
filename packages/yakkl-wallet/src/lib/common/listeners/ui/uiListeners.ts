// listeners/uiListeners.ts
import { ListenerManager } from '$lib/plugins/ListenerManager';
import { browser_ext, isBrowserEnv } from '$lib/common/environment'; // UI context only
import type { Runtime } from 'webextension-polyfill';  // Correct Type Import
import { startCheckPrices, stopCheckPrices } from '$lib/tokens/prices';
import { handleLockDown } from '$lib/common/handlers';
import { globalListenerManager } from '$lib/plugins/GlobalListenerManager';
import { log } from '$lib/common/logger-wrapper';
import { NotificationService } from '$lib/common/notifications';
import { activeTabUIStore } from '$lib/common/stores';
import { addWindowListeners, removeWindowListeners } from './windowListeners';
import { safeLogout } from '$lib/common/safeNavigate';

export const uiListenerManager = new ListenerManager('ui');

// Register uiListenerManager globally
globalListenerManager.registerContext('ui', uiListenerManager);

export async function handleOnActiveTabUIChanged(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<any> {
  try {
    if (!browser_ext) return undefined;
    switch(message.type) {
      case 'setActiveTab': {
        try {
          activeTabUIStore.set(message.activeTab);
          sendResponse({ success: true });
        } catch (error) {
          log.error('Error on active tab change:', true, error);
          sendResponse({ success: false, error: error });
        }
        return true; // Indicate asynchronous response
      }
      default: {
        return false; // Let other listeners handle it
      }
    }
  } catch (error: any) {
    log.error('Error handling setActiveTab message:', true, error);
    if (isBrowserEnv()) sendResponse({ success: false, error: error?.message || 'Unknown error occurred.' });
    return true; // Indicate asynchronous response
  }
}

// Centralized message handler function
export async function handleOnMessageForExtension(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<any> {
  try {
    if (!browser_ext) return undefined;

    log.info('>>>>>>>>>>>>>>>>>>>  ----  handleOnMessageForExtension - message:', false, message.type);

    switch(message.type) {
      case 'lockdown': {
        try {
          log.info('handleOnMessageForExtension - lockdown:', false, message);

          // Execute all preliminary operations
          await Promise.all([
            browser_ext.runtime.sendMessage({type: 'stopPricingChecks'}),
            handleLockDown()
          ]);

          // Send notification
          await NotificationService.sendSecurityAlert(
            'YAKKL Wallet locked due to inactivity. \nTo prevent unauthorized transactions, your wallet has been locked and logged out.',
            {contextMessage: 'Click extension icon to relaunch'}
          );

          // Send the response before logout
          sendResponse({ success: true, message: 'Lockdown initiated.' });

          // Delay logout slightly to ensure response is sent
          setTimeout(() => safeLogout(), 50);
          // goto(PATH_LOGOUT);

          // Return true to indicate we're using the sendResponse callback
          return true;
        } catch (error: any) {
          log.error('Lockdown failed:', false, error);
          sendResponse({ success: false, error: error.message || 'Lockdown failed' });
          return true;
        }
      }
      case 'lockdownImminent': {
        try {
          log.info('--------------------------------');
          log.info('[uiListeners] - handleOnMessageForExtension - lockdownImminent:', false, message);
          log.info('--------------------------------');

          await NotificationService.sendLockdownWarning(message?.delayMs || 30000, {contextMessage: 'Use YAKKL before timeout to stop lockdown'});
          sendResponse({ success: true, message: 'Imminent lockdown notification sent.' });
          return true;
        } catch (error: any) {
          log.error('Lockdown imminent failed:', false, error);
          sendResponse({ success: false, error: error.message || 'Lockdown imminent failed' });
          return true;
        }
      }
      default: {
        return false; // Let other listeners handle it
      }
    }
  } catch (e: any) {
    log.error('Error handling message:', e);
    if (isBrowserEnv()) sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
    return true; // Indicate asynchronous response
  }
}

// Message handler for pricing checks
export async function handleOnMessageForPricing(
  message: any,
  sender: Runtime.MessageSender,
  sendResponse: (response?: any) => void
): Promise<any> {
  if (!browser_ext) return undefined;

  try {
    switch(message.type) {
      case 'startPricingChecks': {
        startCheckPrices();
        sendResponse({ success: true, message: 'Price checks initiated.' });
        return true;
      }
      case 'stopPricingChecks': {
        stopCheckPrices();
        sendResponse({ success: true, message: 'Stop price checks initiated.' });
        return true;
      }
      default: {
        return false; // Let other listeners handle it
      }
    }
  } catch (e: any) {
    log.error('Error handling message:', e);
    if (isBrowserEnv()) sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
    return true; // Indicate asynchronous response
  }
}

export function addUIListeners() {
  if (!browser_ext) return;
  uiListenerManager.add(browser_ext.runtime.onMessage, handleOnActiveTabUIChanged);
  uiListenerManager.add(browser_ext.runtime.onMessage, handleOnMessageForExtension);
  uiListenerManager.add(browser_ext.runtime.onMessage, handleOnMessageForPricing);

  addWindowListeners();
}

export function removeUIListeners() {
  if (!browser_ext) return;
  uiListenerManager.removeAll();
  removeWindowListeners();
}

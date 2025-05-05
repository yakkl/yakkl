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
import { addWindowListeners, removeWindowListeners } from './windowListeners';
import { safeLogout, safeNavigate } from '$lib/common/safeNavigate';

export const uiListenerManager = new ListenerManager('ui');

// Register uiListenerManager globally
globalListenerManager.registerContext('ui', uiListenerManager);

// export async function handleOnActiveTabUIChanged(
//   message: any,
//   sender: Runtime.MessageSender,
//   sendResponse: (response?: any) => void
// ): Promise<boolean | void>  {
//   try {
//     switch(message.type) {
//       case 'setActiveTab': {
//         try {
//           activeTabUIStore.set(message.activeTab);
//           sendResponse({ success: true }); // GetActiveTabResponse format
//         } catch (error) {
//           log.error('Error on active tab change:', true, error);
//           sendResponse({ success: false, error: error });
//         }
//         return true; // Keep this line to signal async sendResponse
//       }
//       default: {
//         return false;
//       }
//     }
//   } catch (error: any) {
//     log.error('Error handling setActiveTab message:', true, error);
//     if (isBrowserEnv()) sendResponse({ success: false, error: error?.message || 'Unknown error occurred.' });
//     return true; // Indicate asynchronous response
//   }
// }

// // Centralized message handler function - This is only a fallback from the old way of doing things but will continue to work
// export async function handleOnMessageForExtension(
//   message: any,
//   sender: Runtime.MessageSender,
//   sendResponse: (response?: any) => void
// ): Promise<boolean | void>  {
//   try {
//     if (!browser_ext) return true;
//     switch(message.type) {
//       case 'lockdown': {
//         await browser_ext.runtime.sendMessage({type: 'stopPricingChecks'});
//         await handleLockDown();  // Correct function call
//         await NotificationService.sendSecurityAlert('YAKKL Wallet locked due to inactivity. \nTo prevent unauthorized transactions, your wallet has been locked and logged out.', {contextMessage: 'Click extension icon to relaunch'});
//         sendResponse({ success: true, message: 'Lockdown initiated.' });
//         // Allow microtask queue to flush before navigating
//         safeLogout();
//         return true;  // return type - asynchronous
//       }
//       case 'lockdownImminent': {
//         await NotificationService.sendSecurityAlert('YAKKL Lockdown Imminent. \nFor your protection, YAKKL will be locked soon.', {contextMessage: 'Use YAKKL before timeout to stop lockdown'});
//         sendResponse({ success: true, message: 'Imminent lockdown notification sent.' });
//         return true;  // return type - asynchronous
//       }
//       default: {
//         return false;
//       }
//     }

//   } catch (e: any) {
//     log.error('Error handling message:', e);
//     if (isBrowserEnv()) sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
//     return true; // Indicate asynchronous response
//   }
// }

// // Message handler for starting and stopping price checks. This is primarily sent by active, idle, locked states.
// export async function handleOnMessageForPricing(
//   message: any,
//   sender: Runtime.MessageSender,
//   sendResponse: (response?: any) => void
// ): Promise<boolean | void>  {
//   if (!browser_ext) return true;
//   try {
//     switch(message.type) {
//       case 'startPricingChecks': {
//         startCheckPrices();
//         sendResponse({ success: true, message: 'Price checks initiated.' });
//         return true;  // return type - asynchronous
//       }
//       case 'stopPricingChecks': {
//         stopCheckPrices();
//         sendResponse({ success: true, message: 'Stop price checks initiated.' });
//         return true;  // return type - asynchronous
//       }
//       default: {
//         return false;
//       }
//     }
//   } catch (e: any) {
//     log.error('Error handling message:', e);
//     if (isBrowserEnv()) sendResponse({ success: false, error: e?.message || 'Unknown error occurred.' });
//     return true; // Indicate asynchronous response
//   }
// }

export async function handleOnActiveTabUIChanged(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    switch(message.type) {
      case 'setActiveTab': {
        try {
          activeTabUIStore.set(message.activeTab);
          return { success: true };
        } catch (error) {
          log.error('Error on active tab change:', true, error);
          return { success: false, error: error };
        }
      }
      default: {
        return undefined; // Let other listeners handle it
      }
    }
  } catch (error: any) {
    log.error('Error handling setActiveTab message:', true, error);
    return { success: false, error: error?.message || 'Unknown error occurred.' };
  }
}

// Centralized message handler function
export async function handleOnMessageForExtension(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    if (!browser_ext) return undefined;

    switch(message.type) {
      case 'lockdown': {
        await browser_ext.runtime.sendMessage({type: 'stopPricingChecks'});
        await handleLockDown();
        await NotificationService.sendSecurityAlert('YAKKL Wallet locked due to inactivity. \nTo prevent unauthorized transactions, your wallet has been locked and logged out.', {contextMessage: 'Click extension icon to relaunch'});

        // Schedule logout to happen after response is sent
        setTimeout(() => safeLogout(), 0);

        return { success: true, message: 'Lockdown initiated.' };
      }
      case 'lockdownImminent': {
        await NotificationService.sendSecurityAlert('YAKKL Lockdown Imminent. \nFor your protection, YAKKL will be locked soon.', {contextMessage: 'Use YAKKL before timeout to stop lockdown'});
        return { success: true, message: 'Imminent lockdown notification sent.' };
      }
      default: {
        return undefined; // Let other listeners handle it
      }
    }
  } catch (e: any) {
    log.error('Error handling message:', e);
    return { success: false, error: e?.message || 'Unknown error occurred.' };
  }
}

// Message handler for pricing checks
export async function handleOnMessageForPricing(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  if (!browser_ext) return undefined;

  try {
    switch(message.type) {
      case 'startPricingChecks': {
        startCheckPrices();
        return { success: true, message: 'Price checks initiated.' };
      }
      case 'stopPricingChecks': {
        stopCheckPrices();
        return { success: true, message: 'Stop price checks initiated.' };
      }
      default: {
        return undefined; // Let other listeners handle it
      }
    }
  } catch (e: any) {
    log.error('Error handling message:', e);
    return { success: false, error: e?.message || 'Unknown error occurred.' };
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
  uiListenerManager.removeAll();
  removeWindowListeners();
}

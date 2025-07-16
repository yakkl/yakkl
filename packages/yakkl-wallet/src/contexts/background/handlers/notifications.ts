import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';
import { sendToExtensionUI } from '$lib/common/safeMessaging';

export const notificationsHandlers = new Map<string, MessageHandlerFunc>([
  ['notifications.create', async (payload): Promise<MessageResponse> => {
    try {
      const { notificationId, options } = payload;
      const id = await browser.notifications.create(notificationId, options);
      return { success: true, data: id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['notifications.clear', async (payload): Promise<MessageResponse> => {
    try {
      const { notificationId } = payload;
      const wasCleared = await browser.notifications.clear(notificationId);
      return { success: true, data: wasCleared };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['notifications.getAll', async (): Promise<MessageResponse> => {
    try {
      const notifications = await browser.notifications.getAll();
      return { success: true, data: notifications };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['notifications.update', async (payload): Promise<MessageResponse> => {
    try {
      const { notificationId, options } = payload;
      // Note: notifications.update might not be available in all browsers
      if ('update' in browser.notifications) {
        const wasUpdated = await (browser.notifications as any).update(notificationId, options);
        return { success: true, data: wasUpdated };
      } else {
        // Fallback: clear and recreate
        await browser.notifications.clear(notificationId);
        await browser.notifications.create(notificationId, options);
        return { success: true, data: true };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);

browser.notifications.onClicked.addListener((notificationId) => {
  sendToExtensionUI({
    type: 'notifications.clicked',
    response: { success: true, data: { notificationId } }
  });
});

browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  sendToExtensionUI({
    type: 'notifications.buttonClicked',
    response: { success: true, data: { notificationId, buttonIndex } }
  });
});

browser.notifications.onClosed.addListener((notificationId, byUser) => {
  sendToExtensionUI({
    type: 'notifications.closed',
    response: { success: true, data: { notificationId, byUser } }
  });
});
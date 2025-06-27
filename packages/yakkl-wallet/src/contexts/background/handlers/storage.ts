import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';

export const storageHandlers = new Map<string, MessageHandlerFunc>([
  ['storage.get', async (payload): Promise<MessageResponse> => {
    try {
      const { keys } = payload || {};
      const data = await browser.storage.local.get(keys);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['storage.set', async (payload): Promise<MessageResponse> => {
    try {
      const { items } = payload;
      await browser.storage.local.set(items);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['storage.remove', async (payload): Promise<MessageResponse> => {
    try {
      const { keys } = payload;
      await browser.storage.local.remove(keys);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['storage.clear', async (): Promise<MessageResponse> => {
    try {
      await browser.storage.local.clear();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    browser.runtime.sendMessage({
      type: 'storage.changed',
      response: { success: true, data: changes }
    });
  }
});
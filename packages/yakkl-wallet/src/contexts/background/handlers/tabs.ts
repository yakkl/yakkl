import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';

export const tabsHandlers = new Map<string, MessageHandlerFunc>([
  ['tabs.get', async (payload): Promise<MessageResponse> => {
    try {
      const { tabId } = payload;
      const tab = await browser.tabs.get(tabId);
      return { success: true, data: tab };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['tabs.query', async (payload): Promise<MessageResponse> => {
    try {
      const tabs = await browser.tabs.query(payload || {});
      return { success: true, data: tabs };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['tabs.create', async (payload): Promise<MessageResponse> => {
    try {
      const tab = await browser.tabs.create(payload || {});
      return { success: true, data: tab };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['tabs.update', async (payload): Promise<MessageResponse> => {
    try {
      const { tabId, updateProperties } = payload;
      const tab = await browser.tabs.update(tabId, updateProperties);
      return { success: true, data: tab };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['tabs.remove', async (payload): Promise<MessageResponse> => {
    try {
      const { tabIds } = payload;
      await browser.tabs.remove(tabIds);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['tabs.getCurrent', async (): Promise<MessageResponse> => {
    try {
      const tab = await browser.tabs.getCurrent();
      return { success: true, data: tab };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);
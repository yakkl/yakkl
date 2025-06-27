import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';

export const windowsHandlers = new Map<string, MessageHandlerFunc>([
  ['windows.get', async (payload): Promise<MessageResponse> => {
    try {
      const { windowId, getInfo } = payload;
      const window = await browser.windows.get(windowId, getInfo);
      return { success: true, data: window };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['windows.getCurrent', async (payload): Promise<MessageResponse> => {
    try {
      const { getInfo } = payload || {};
      const window = await browser.windows.getCurrent(getInfo);
      return { success: true, data: window };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['windows.getAll', async (payload): Promise<MessageResponse> => {
    try {
      const { getInfo } = payload || {};
      const windows = await browser.windows.getAll(getInfo);
      return { success: true, data: windows };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['windows.create', async (payload): Promise<MessageResponse> => {
    try {
      const window = await browser.windows.create(payload);
      return { success: true, data: window };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['windows.update', async (payload): Promise<MessageResponse> => {
    try {
      const { windowId, updateInfo } = payload;
      const window = await browser.windows.update(windowId, updateInfo);
      return { success: true, data: window };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }],

  ['windows.remove', async (payload): Promise<MessageResponse> => {
    try {
      const { windowId } = payload;
      await browser.windows.remove(windowId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }]
]);